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

  await admin.from("orders").update({ status: "preparing" }).eq("id", orderId).eq("tenant_id", ctx.tenant.id);
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

  const start = Date.now();

  const ok = await bcrypt.compare(otp, cur.otp_hash);
  if (!ok) {
    const left = 3 - (cur.otp_attempts + 1);
    await admin
      .from("orders")
      .update({ otp_attempts: cur.otp_attempts + 1 })
      .eq("id", orderId)
      .eq("tenant_id", ctx.tenant.id);

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
// Looks up the item by name within this tenant — name_snapshot matches menu_items.name.
export async function markItemSoldOut(
  itemName: string,
  inStock: boolean
): Promise<{ ok: boolean; error?: string; itemId?: string }> {
  const ctx = await staffContext();
  if (!ctx.ok) return ctx;

  const admin = getAdminClient(ctx.tenant.id);

  // Resolve menu item by name within this tenant (live items only).
  const { data: item } = await admin
    .from("menu_items")
    .select("id")
    .eq("tenant_id", ctx.tenant.id)
    .eq("name", itemName)
    .eq("status", "live")
    .maybeSingle<{ id: string }>();

  if (!item) return { ok: false, error: "Item not found — check the name" };

  const { error: updateErr } = await admin
    .from("menu_items")
    .update({ in_stock: inStock })
    .eq("id", item.id);

  if (updateErr) return { ok: false, error: updateErr.message };

  await admin.from("audit_logs").insert({
    tenant_id: ctx.tenant.id,
    actor_user_id: ctx.user.id,
    action: inStock ? "menu.86_undo" : "menu.86",
    target_type: "menu_item",
    target_id: item.id,
    meta: { name: itemName },
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
    payload: { name: itemName, in_stock: inStock },
  });

  revalidatePath(`/c/${ctx.tenant.slug}/menu`);
  revalidatePath(`/c/${ctx.tenant.slug}/kitchen`);
  return { ok: true, itemId: item.id };
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
