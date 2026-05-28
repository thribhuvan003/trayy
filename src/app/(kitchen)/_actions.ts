"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { requireTenantContext, requireTenantContextForJob, resolveTenant } from "@/lib/tenant";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/get-user";
import { randomOtp } from "@/lib/utils";
import { initiateRefundForOrder } from "@/app/(student)/_actions";
import { logger } from "@/lib/logging";
import { tenantRateLimit } from "@/lib/rate-limit/tenant";

type Outcome = { ok: true } | { ok: false; error: string };

import type { ResolvedTenant } from "@/lib/tenant";
import type { CurrentUser } from "@/lib/auth/get-user";

type Ctx =
  | { ok: false; error: string }
  | { ok: true; tenant: ResolvedTenant; user: CurrentUser };

async function staffContext(): Promise<Ctx> {
  // Use the standardized production-grade tenant context helper.
  // This guarantees fail-fast behavior, rich structured logging, and
  // consistent enforcement of the "one login = own dedicated system" contract
  // (as validated by the Multi-Tenant Isolation Architect).
  let tenantCtx;
  try {
    tenantCtx = await requireTenantContext();
  } catch (e) {
    logger.error("kitchen staffContext failed to acquire tenant context", e);
    return { ok: false, error: "Tenant context invalid" };
  }

  const user = await requireRole(["kitchen_staff", "canteen_admin", "super_admin"]);
  if (!user) return { ok: false, error: "Not authorised" };

  logger.info("kitchen staff context established", {
    tenant_id: tenantCtx.tenant.id,
    slug: tenantCtx.tenant.slug,
    user_id: user.id,
  });

  return { ok: true, tenant: tenantCtx.tenant, user };
}

// Append-only Realtime log. Insert via the un-typed channel because the
// generated Database type isn't aware of the order_events table yet.
async function emitOrderEvent(
  admin: ReturnType<typeof getAdminClient>,
  row: { order_id: string; tenant_id: string; event_type: string; payload?: Record<string, unknown> }
) {
  await (admin.from("order_events") as unknown as {
    insert: (r: typeof row) => Promise<unknown>;
  }).insert(row);
}

export async function markPreparing(orderId: string): Promise<Outcome> {
  const ctx = await staffContext();
  if (!ctx.ok) return ctx;

  // Per-tenant rate limiting for kitchen actions (protects against accidental or malicious spam during rush)
  const rate = await tenantRateLimit(ctx.tenant.id, "kitchen_action", ctx.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many actions — slow down a little" };
  }

  const admin = getAdminClient(ctx.tenant.id);
  const { data: cur } = await admin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle<{ status: string }>();
  if (!cur) return { ok: false, error: "Order not found" };
  if (cur.status !== "placed") return { ok: false, error: `Cannot start an order in "${cur.status}"` };

  const start = Date.now();

  // P0-5 FIX: CAS guard on UPDATE — reject if order is no longer "placed".
  // Without this, a student cancel completing between the kitchen read and write
  // silently overwrites "cancelled_by_kitchen" with "preparing" — food made for refunded order.
  const { data: casResult } = await admin.from("orders")
    .update({ status: "preparing" })
    .eq("id", orderId)
    .eq("tenant_id", ctx.tenant.id)
    .eq("status", "placed")
    .select("id");
  if (!casResult || casResult.length === 0) {
    return { ok: false, error: "Order status changed before kitchen could start it — refresh the board" };
  }
  await admin.from("order_status_logs").insert({
    tenant_id: ctx.tenant.id,
    order_id: orderId,
    from_status: "placed",
    to_status: "preparing",
    actor_user_id: ctx.user.id,
  });
  await admin.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.user.id,
    action: "order.preparing",
    target_type: "order",
    target_id: orderId,
  });
  await emitOrderEvent(admin, {
    order_id: orderId,
    tenant_id: ctx.tenant.id,
    event_type: "preparing",
    payload: { actor: "kitchen" },
  });

  // High-signal structured log for real production debugging (BlackRock/HFT level)
  logger.info("kitchen status transition", {
    tenant_id: ctx.tenant.id,
    order_id: orderId,
    from: "placed",
    to: "preparing",
    actor_user_id: ctx.user.id,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${ctx.tenant.slug}/kitchen`);
  return { ok: true };
}

export async function markReady(orderId: string): Promise<Outcome> {
  const ctx = await staffContext();
  if (!ctx.ok) return ctx;

  const admin = getAdminClient(ctx.tenant.id);
  const { data: cur } = await admin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle<{ status: string }>();
  if (!cur) return { ok: false, error: "Order not found" };
  if (cur.status !== "preparing") return { ok: false, error: `Cannot mark ready from "${cur.status}"` };

  const start = Date.now();
  const otp = randomOtp();
  const hash = await bcrypt.hash(otp, 10);

  // OTP plaintext lives in pickup_secrets (RLS denies all PostgREST access;
  // only readable through read_my_pickup_otp SECURITY DEFINER for the owner).
  // The customer's note in orders.notes is preserved untouched.
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await admin
    .from("orders")
    .update({ status: "ready", otp_hash: hash, ready_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("tenant_id", ctx.tenant.id);
  await admin.from("pickup_secrets").upsert(
    { order_id: orderId, tenant_id: ctx.tenant.id, otp_plain: otp, expires_at: expiresAt },
    { onConflict: "order_id" }
  );
  await admin.from("order_status_logs").insert({
    tenant_id: ctx.tenant.id,
    order_id: orderId,
    from_status: "preparing",
    to_status: "ready",
    actor_user_id: ctx.user.id,
    note: "OTP issued",
  });
  await admin.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.user.id,
    action: "order.ready",
    target_type: "order",
    target_id: orderId,
  });
  await emitOrderEvent(admin, {
    order_id: orderId,
    tenant_id: ctx.tenant.id,
    event_type: "ready",
    payload: { actor: "kitchen" },
  });

  logger.info("kitchen status transition", {
    tenant_id: ctx.tenant.id,
    order_id: orderId,
    from: "preparing",
    to: "ready",
    actor_user_id: ctx.user.id,
    latency_ms: Date.now() - start,
    has_otp: true,
  });

  revalidatePath(`/c/${ctx.tenant.slug}/kitchen`);
  return { ok: true };
}

export async function verifyAndCollect(
  orderId: string,
  otp: string
): Promise<{ ok: boolean; error?: string; locked?: boolean; attemptsLeft?: number }> {
  const ctx = await staffContext();
  if (!ctx.ok) return ctx;

  // Per-tenant rate limiting on the critical handover step (prevents abuse or accidental spam during busy periods)
  const rate = await tenantRateLimit(ctx.tenant.id, "kitchen_action", ctx.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many attempts — please slow down" };
  }

  const admin = getAdminClient(ctx.tenant.id);
  const { data: cur } = await admin
    .from("orders")
    .select("status, otp_hash, otp_attempts")
    .eq("id", orderId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle<{ status: string; otp_hash: string | null; otp_attempts: number }>();
  if (!cur || !cur.otp_hash) return { ok: false, error: "Order not ready for pickup" };
  if (cur.status !== "ready") return { ok: false, error: `Order is "${cur.status}"` };
  if (cur.otp_attempts >= 3) return { ok: false, error: "Locked — ask an admin to unlock", locked: true };

  // P1-6 FIX: Enforce OTP expiry server-side.
  // pickup_secrets.expires_at was stored but never checked — an OTP presented
  // 31+ minutes after issuance was still accepted.
  const { data: secret } = await admin
    .from("pickup_secrets")
    .select("expires_at")
    .eq("order_id", orderId)
    .maybeSingle<{ expires_at: string }>();
  if (secret && secret.expires_at && new Date(secret.expires_at) < new Date()) {
    return { ok: false, error: "OTP has expired — tap Ready again to issue a new code" };
  }

  const start = Date.now();

  const ok = await bcrypt.compare(otp, cur.otp_hash);
  if (!ok) {
    // Optimistic locking: only increment if otp_attempts hasn't changed since
    // our read. Prevents TOCTOU race where two concurrent wrong submissions both
    // pass the >= 3 check before either increments the counter.
    const { data: atomicUpdate } = await admin
      .from("orders")
      .update({ otp_attempts: cur.otp_attempts + 1 })
      .eq("id", orderId)
      .eq("tenant_id", ctx.tenant.id)
      .eq("otp_attempts", cur.otp_attempts) // optimistic lock
      .select("otp_attempts");

    if (!atomicUpdate || atomicUpdate.length === 0) {
      // Concurrent update won the race — return a safe "try again" signal.
      return { ok: false, error: "Try again", attemptsLeft: 0 };
    }

    const left = 3 - (cur.otp_attempts + 1);

    logger.warn("kitchen OTP verification failed", {
      tenant_id: ctx.tenant.id,
      order_id: orderId,
      attempts: cur.otp_attempts + 1,
      latency_ms: Date.now() - start,
    });

    return { ok: false, error: "Wrong code", attemptsLeft: Math.max(0, left) };
  }

  await admin
    .from("orders")
    .update({ status: "collected", collected_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("tenant_id", ctx.tenant.id);
  // Plaintext OTP cleared. ON DELETE CASCADE from orders also covers it.
  await admin.from("pickup_secrets").delete().eq("order_id", orderId);
  await admin.from("order_status_logs").insert({
    tenant_id: ctx.tenant.id,
    order_id: orderId,
    from_status: "ready",
    to_status: "collected",
    actor_user_id: ctx.user.id,
    note: "OTP verified",
  });
  await admin.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.user.id,
    action: "order.collected",
    target_type: "order",
    target_id: orderId,
  });
  await emitOrderEvent(admin, {
    order_id: orderId,
    tenant_id: ctx.tenant.id,
    event_type: "collected",
    payload: { actor: "kitchen" },
  });

  logger.info("kitchen order collected (OTP verified)", {
    tenant_id: ctx.tenant.id,
    order_id: orderId,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${ctx.tenant.slug}/kitchen`);
  return { ok: true };
}

// Mark a menu item sold out (86) or back in stock from kitchen board.
// Accepts the item's UUID to avoid ambiguity when two items share the same name.
export async function markItemSoldOut(
  itemId: string,
  inStock: boolean
): Promise<{ ok: boolean; error?: string; itemId?: string }> {
  const ctx = await staffContext();
  if (!ctx.ok) return ctx;

  const admin = getAdminClient(ctx.tenant.id);

  // Verify the item belongs to this tenant and is live before updating.
  // itemId is always a UUID from board.tsx (Priority 3 fix). The eq("id") filter
  // is safe because PostgreSQL will reject a non-UUID string before querying.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
  const query = admin
    .from("menu_items")
    .select("id, name")
    .eq("tenant_id", ctx.tenant.id)
    .eq("status", "live");
  // UUID path (normal): look up by PK. Name path (last-resort fallback): look up by name.
  const { data: item } = await (isUuid ? query.eq("id", itemId) : query.eq("name", itemId))
    .maybeSingle<{ id: string; name: string }>();

  if (!item) return { ok: false, error: "Item not found" };

  // P1-8 FIX: When restocking (inStock = true), also reset stock_qty to null.
  // If the item was auto-marked OOS when stock_qty hit 0, it would appear
  // orderable in the student menu but fail at checkout (qty check sees 0).
  // null = unlimited — the admin can set a precise qty from the admin menu page.
  const updatePayload = inStock
    ? { in_stock: true, stock_qty: null as unknown as number }
    : { in_stock: false };

  const { error: updateErr } = await admin
    .from("menu_items")
    .update(updatePayload)
    .eq("id", item.id)
    .eq("tenant_id", ctx.tenant.id);

  if (updateErr) return { ok: false, error: updateErr.message };

  await admin.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.user.id,
    action: inStock ? "menu.86_undo" : "menu.86",
    target_type: "menu_item",
    target_id: item.id,
    meta: { name: item.name },
  });

  // Emit a menu_item_86 event so kitchen Realtime subscribers pick it up.
  // Prefer the oldest active order as the anchor; fall back to a dummy UUID
  // when the board is empty (menu ops can happen between service periods).
  const DUMMY_ORDER_ID = "00000000-0000-0000-0000-000000000000";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: activeOrder } = await admin
    .from("orders")
    .select("id")
    .eq("tenant_id", ctx.tenant.id)
    .in("status", ["placed", "preparing", "ready"])
    .gte("placed_at", today.toISOString())
    .order("placed_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  await emitOrderEvent(admin, {
    order_id: activeOrder?.id ?? DUMMY_ORDER_ID,
    tenant_id: ctx.tenant.id,
    event_type: "menu_item_86",
    payload: { name: item.name, in_stock: inStock },
  });

  revalidatePath(`/c/${ctx.tenant.slug}/menu`);
  revalidatePath(`/c/${ctx.tenant.slug}/kitchen`);
  return { ok: true, itemId: item.id };
}

// ── Walk-in Orders (cash counter flow, like KFC) ─────────────────────────────
// Kitchen staff creates an order for a walk-in customer who pays at the counter.
// Bypasses the UPI payment flow: order is immediately "placed" (already paid or cash).
// Staff searches/selects items from the live menu, sets qty, and confirms.
export async function createWalkInOrder(opts: {
  items: { itemId: string; qty: number }[];
  customerName?: string;
  orderType: "takeaway" | "dine_in";
  tableLabel?: string;
  paymentMethod: "cash";
}): Promise<{ ok: boolean; error?: string; orderId?: string; shortCode?: string }> {
  const ctx = await staffContext();
  if (!ctx.ok) return ctx;

  const rate = await tenantRateLimit(ctx.tenant.id, "kitchen_action", ctx.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many actions — slow down a little" };
  }

  if (!opts.items || opts.items.length === 0) {
    return { ok: false, error: "Add at least one item" };
  }

  const admin = getAdminClient(ctx.tenant.id);

  // Validate every item — must be live + in_stock for this tenant (server-side, no client trust)
  const ids = opts.items.map((i) => i.itemId);
  const { data: menuItems } = await admin
    .from("menu_items")
    .select("id, name, price_paise, diet, status, in_stock")
    .eq("tenant_id", ctx.tenant.id)
    .in("id", ids)
    .returns<{ id: string; name: string; price_paise: number; diet: "veg" | "nonveg" | "egg"; status: string; in_stock: boolean }[]>();

  if (!menuItems || menuItems.length !== ids.length) {
    return { ok: false, error: "One or more items not found" };
  }

  const itemMap = new Map(menuItems.map((m) => [m.id, m]));
  let total = 0;
  const validated: { item: typeof menuItems[0]; qty: number }[] = [];

  for (const req of opts.items) {
    const item = itemMap.get(req.itemId);
    if (!item) return { ok: false, error: "Item not found" };
    if (item.status !== "live") return { ok: false, error: `${item.name} is not available` };
    if (!item.in_stock) return { ok: false, error: `${item.name} is sold out` };
    if (req.qty < 1 || req.qty > 20) return { ok: false, error: "Qty must be 1–20 per item" };
    total += item.price_paise * req.qty;
    validated.push({ item, qty: req.qty });
  }

  const start = Date.now();

  // Assign short code
  // Generate sequential short code in JS to bypass database RPC permission restrictions
  let codeData = "T-2401";
  const { data: lastOrders, error: lastOrdersErr } = await admin
    .from("orders")
    .select("short_code")
    .eq("tenant_id", ctx.tenant.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!lastOrdersErr && lastOrders && lastOrders.length > 0) {
    const lastCode = lastOrders[0].short_code;
    const match = lastCode.match(/^T-(\d+)$/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      codeData = `T-${String(nextNum).padStart(4, "0")}`;
    }
  }

  // Create order directly as "placed" — cash collected at counter
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      tenant_id: ctx.tenant.id,
      user_id: null,
      short_code: codeData as string,
      status: "placed",
      total_paise: total,
      order_type: opts.orderType,
      table_label: opts.tableLabel ?? null,
      customer_name: opts.customerName?.trim() || "Walk-in",
      notes: "walk-in",
    })
    .select("id, short_code")
    .single<{ id: string; short_code: string }>();

  if (orderErr || !order) return { ok: false, error: orderErr?.message ?? "Could not create order" };

  await admin.from("order_items").insert(
    validated.map((v) => ({
      tenant_id: ctx.tenant.id,
      order_id: order.id,
      menu_item_id: v.item.id,
      name_snapshot: v.item.name,
      price_paise_snapshot: v.item.price_paise,
      diet_snapshot: v.item.diet,
      qty: v.qty,
    }))
  );

  await admin.from("payments").insert({
    tenant_id: ctx.tenant.id,
    order_id: order.id,
    amount_paise: total,
    status: "captured",
    raw_event_id: `walkin:${order.id}`,
  });

  await admin.from("order_status_logs").insert({
    tenant_id: ctx.tenant.id,
    order_id: order.id,
    from_status: null,
    to_status: "placed",
    actor_user_id: ctx.user.id,
    note: "Walk-in cash order created by kitchen staff",
  });

  await admin.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.user.id,
    action: "order.walkin_created",
    target_type: "order",
    target_id: order.id,
    meta: { total_paise: total, items: validated.length, payment_method: opts.paymentMethod },
  });

  await emitOrderEvent(admin, {
    order_id: order.id,
    tenant_id: ctx.tenant.id,
    event_type: "status_changed",
    payload: { from: null, to: "placed", source: "walkin_counter" },
  });

  logger.info("kitchen walk-in order created", {
    tenant_id: ctx.tenant.id,
    order_id: order.id,
    short_code: order.short_code,
    total_paise: total,
    items: validated.length,
    actor_user_id: ctx.user.id,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${ctx.tenant.slug}/kitchen`);
  revalidatePath(`/c/${ctx.tenant.slug}/admin/orders`);
  return { ok: true, orderId: order.id, shortCode: order.short_code };
}

// ── Staff PIN login ───────────────────────────────────────────────────────────
// Called from the PIN kiosk (staff-select page). Uses the RPC which is
// SECURITY DEFINER — bcrypt compare + lockout happen in Postgres, not here.
// On success a signed cookie is written; on failure the error is returned to
// the client so it can show attempts remaining or the lockout countdown.
export async function verifyStaffPinAction(
  p_user_id: string,
  p_pin: string
): Promise<{ ok: boolean; error?: string; locked?: boolean; lockedUntil?: string }> {
  // Production-grade tenant context for staff PIN login (kitchen staff on cheap tablets during rush).
  // Guarantees the PIN verification and subsequent kitchen board are scoped to the correct canteen only.
  const { tenant } = await requireTenantContext();

  // requireRole is skipped here — staff-select is accessed before PIN auth.
  // We use the admin client so the RPC call succeeds regardless of the calling
  // user's session (shared-tablet scenario where the device has a service session).
  const admin = getAdminClient(tenant.id);

  // Fetch lockout state before calling RPC so we can return a lockedUntil
  // timestamp for the countdown UI.
  const { data: profile } = await admin
    .from("staff_profiles")
    .select("locked_until, is_active")
    .eq("user_id", p_user_id)
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .maybeSingle<{ locked_until: string | null; is_active: boolean }>();

  if (!profile) return { ok: false, error: "Staff member not found" };

  if (profile.locked_until && new Date(profile.locked_until) > new Date()) {
    return { ok: false, locked: true, lockedUntil: profile.locked_until, error: "Account locked" };
  }

  const { data: verified, error: rpcError } = await admin.rpc("verify_staff_pin", {
    p_tenant_id: tenant.id,
    p_user_id,
    p_pin,
  });

  if (rpcError) return { ok: false, error: rpcError.message };

  if (!verified) {
    // Re-fetch to get updated locked_until after the failed attempt.
    const { data: refreshed } = await admin
      .from("staff_profiles")
      .select("locked_until, pin_attempt_count")
      .eq("user_id", p_user_id)
      .eq("tenant_id", tenant.id)
      .maybeSingle<{ locked_until: string | null; pin_attempt_count: number }>();

    if (refreshed?.locked_until && new Date(refreshed.locked_until) > new Date()) {
      return {
        ok: false,
        locked: true,
        lockedUntil: refreshed.locked_until,
        error: "Too many wrong PINs — locked for 10 minutes",
      };
    }

    const attemptsUsed = refreshed?.pin_attempt_count ?? 1;
    const attemptsLeft = Math.max(0, 5 - attemptsUsed);
    return {
      ok: false,
      error: attemptsLeft > 0 ? `Wrong PIN — ${attemptsLeft} attempt${attemptsLeft !== 1 ? "s" : ""} left` : "Wrong PIN",
    };
  }

  // Success — write the 8-hour staff session cookie scoped to this tenant so a
  // staff member from canteen-A cannot access canteen-B's kitchen board.
  const cookieStore = await cookies();
  cookieStore.set(`kitchen_staff_id_${tenant.id}`, p_user_id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 hours in seconds
    secure: process.env.NODE_ENV === "production",
  });

  return { ok: true };
}


export async function rejectOrder(orderId: string, reason: string): Promise<Outcome> {
  const ctx = await staffContext();
  if (!ctx.ok) return ctx;
  const admin = getAdminClient(ctx.tenant.id);
  const { data: cur } = await admin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle<{ status: string }>();
  if (!cur) return { ok: false, error: "Order not found" };
  if (["collected", "rejected", "expired"].includes(cur.status)) {
    return { ok: false, error: `Cannot reject a "${cur.status}" order` };
  }

  await admin.from("orders").update({ status: "rejected" }).eq("id", orderId).eq("tenant_id", ctx.tenant.id);
  // Initiate the refund and only mark the payment refunded if it succeeds.
  // The reconcile cron sweeps rejected orders with captured payments as a safety net.
  void initiateRefundForOrder(orderId, ctx.tenant.id).catch(() => {});
  await admin.from("order_status_logs").insert({
    tenant_id: ctx.tenant.id,
    order_id: orderId,
    from_status: cur.status as "placed" | "preparing" | "ready",
    to_status: "rejected",
    actor_user_id: ctx.user.id,
    note: reason.slice(0, 200),
  });
  await admin.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.user.id,
    action: "order.rejected",
    target_type: "order",
    target_id: orderId,
    meta: { reason: reason.slice(0, 200) },
  });
  await emitOrderEvent(admin, {
    order_id: orderId,
    tenant_id: ctx.tenant.id,
    event_type: "rejected",
    payload: { actor: "kitchen", reason: reason.slice(0, 200) },
  });
  revalidatePath(`/c/${ctx.tenant.slug}/kitchen`);
  return { ok: true };
}

/**
 * 5-second "I made a mistake" undo for status advances.
 * Only allows safe backward transitions that kitchen staff commonly fat-finger:
 *   preparing → placed   (tapped "Start" on wrong ticket)
 *   ready → preparing    (tapped "Ready" too soon)
 * Always writes full audit trail via order_status_logs + audit_logs + order_events
 * so nothing is ever silent. Reuses staffContext + emitOrderEvent exactly like all other ops.
 */
export async function revertStatus(
  orderId: string,
  toStatus: "placed" | "preparing"
): Promise<Outcome> {
  const ctx = await staffContext();
  if (!ctx.ok) return ctx;

  const admin = getAdminClient(ctx.tenant.id);
  const { data: cur } = await admin
    .from("orders")
    .select("status, ready_at")
    .eq("id", orderId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle<{ status: string; ready_at: string | null }>();
  if (!cur) return { ok: false, error: "Order not found" };

  const isValidRevert =
    (cur.status === "preparing" && toStatus === "placed") ||
    (cur.status === "ready" && toStatus === "preparing");
  if (!isValidRevert) {
    return { ok: false, error: `Cannot undo from "${cur.status}" to "${toStatus}"` };
  }

  // P0-6 FIX: Enforce the 5-second undo window server-side.
  // The client timer is cosmetic only — a delayed request on flaky Wi-Fi
  // could arrive minutes later and revert an already-handed-out order.
  // Check order_status_logs for the most recent forward transition timestamp.
  const { data: lastTransition } = await admin
    .from("order_status_logs")
    .select("created_at")
    .eq("order_id", orderId)
    .eq("tenant_id", ctx.tenant.id)
    .eq("to_status", cur.status as "placed" | "preparing" | "ready") // the transition we're trying to undo
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string }>();

  if (!lastTransition) return { ok: false, error: "No transition record found — cannot undo" };

  const transitionAgeMs = Date.now() - new Date(lastTransition.created_at).getTime();
  if (transitionAgeMs > 10_000) {
    return { ok: false, error: "Undo window has closed (10 seconds). Contact admin to adjust." };
  }

  // Perform the revert (typed explicitly to satisfy strict Supabase update types)
  if (toStatus === "placed") {
    await admin.from("orders").update({ status: "placed", ready_at: null }).eq("id", orderId).eq("tenant_id", ctx.tenant.id);
  } else {
    await admin.from("orders").update({ status: "preparing" }).eq("id", orderId).eq("tenant_id", ctx.tenant.id);
  }

  // Clean up secrets if backing out of ready (harmless to leave otp_hash; next Ready will overwrite)
  if (cur.status === "ready" && toStatus === "preparing") {
    await admin.from("pickup_secrets").delete().eq("order_id", orderId);
  }

  // Full paper trail — identical pattern to mark*/reject
  await admin.from("order_status_logs").insert({
    tenant_id: ctx.tenant.id,
    order_id: orderId,
    from_status: cur.status as "placed" | "preparing" | "ready",
    to_status: toStatus,
    actor_user_id: ctx.user.id,
    note: "staff undo (5s mistake window)",
  });
  await admin.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.user.id,
    action: "order.revert",
    target_type: "order",
    target_id: orderId,
    meta: { from: cur.status, to: toStatus, window: "5s" },
  });
  await emitOrderEvent(admin, {
    order_id: orderId,
    tenant_id: ctx.tenant.id,
    event_type: "reverted",
    payload: { actor: "kitchen", from: cur.status, to: toStatus, reason: "5s undo" },
  });

  revalidatePath(`/c/${ctx.tenant.slug}/kitchen`);
  return { ok: true };
}
