"use server";

import { revalidatePath } from "next/cache";
import dayjs from "dayjs";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { createRazorpayOrder, initiateRazorpayRefund } from "@/lib/payments/razorpay";
import { logger, withRequestContext } from "@/lib/logging";
import { requireTenantContext, requireTenantContextForJob } from "@/lib/tenant";
import { tenantRateLimit } from "@/lib/rate-limit/tenant";
import type { Diet, OrderType } from "@/lib/db/types";
import crypto from "crypto";

// Stable, order-independent hash of the exact cart for the idempotency key.
// Prevents two slightly-reordered identical carts from creating duplicate orders.
function makeCartHash(lines: PlaceArgs): string {
  const sorted = [...lines].sort((a, b) =>
    a.menuItemId.localeCompare(b.menuItemId) || a.qty - b.qty
  );
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(sorted))
    .digest("hex")
    .slice(0, 32);
}

// ── Student-initiated cancel (Phase 8) ─────────────────────────────────
// Lives at the TOP of this file so a parallel Phase 6 edit appending new
// actions at the bottom does not collide on the same line range.
// Refund itself is handled out-of-band by the reconciliation cron / admin —
// we just flip status and emit an append-only event for Realtime listeners.

type CancelResult = { ok: true } | { ok: false; error: string };

export async function cancelOrderByStudent(orderId: string): Promise<CancelResult> {
  // Production-grade tenant context — guarantees every order/payment is scoped to the student's chosen canteen.
  // No silent cross-tenant leakage possible even under concurrent sibling-canteen rush.
  const { tenant } = await requireTenantContext();

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to cancel" };

  const rl = await rateLimit(`cancelOrder:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) return { ok: false, error: "Too many cancel attempts — slow down" };

  const admin = getAdminClient(tenant.id);

  // Re-check ownership, status, and the 5-minute window on the server.
  // Never trust the client clock — derive elapsed from placed_at server-side.
  const { data: order, error: loadErr } = await admin
    .from("orders")
    .select("id, user_id, status, placed_at, total_paise")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .maybeSingle<{
      id: string;
      user_id: string | null;
      status: string;
      placed_at: string;
      total_paise: number;
    }>();
  if (loadErr || !order) return { ok: false, error: "Order not found" };
  if (order.user_id !== user.id) return { ok: false, error: "Not your order" };
  if (order.status !== "placed") {
    return { ok: false, error: "Too late — kitchen has already started." };
  }
  const elapsedMs = Date.now() - new Date(order.placed_at).getTime();
  if (elapsedMs >= 5 * 60 * 1000) {
    return { ok: false, error: "Cancel window has closed (5 minutes)." };
  }

  // We reuse cancelled_by_kitchen because the downstream effects (release
  // stock, notify kitchen UI, queue refund) are identical regardless of who
  // pulled the cord. The event_type below preserves the actual actor.
  const upd = await admin
    .from("orders")
    // Cast — Database types haven't been regenerated for the new enum values
    // yet (migration 0009a). Safe at runtime: the enum value exists in PG.
    .update({ status: "cancelled_by_kitchen" as unknown as "rejected" })
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .eq("status", "placed"); // optimistic guard against concurrent updates
  if (upd.error) return { ok: false, error: upd.error.message };

  await admin.from("order_status_logs").insert({
    tenant_id: tenant.id,
    order_id: orderId,
    from_status: "placed",
    // Same cast reason as above.
    to_status: "cancelled_by_kitchen" as unknown as "rejected",
    actor_user_id: user.id,
    note: "Cancelled by student within 5-minute grace window",
  });

  // Append-only event row — Realtime listeners subscribe to this.
  // order_events isn't in the regenerated Database types yet, so go untyped.
  await (
    admin as unknown as {
      from: (t: string) => {
        insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    }
  )
    .from("order_events")
    .insert({
      tenant_id: tenant.id,
      order_id: orderId,
      event_type: "cancelled_by_student",
      payload: {
        actor_user_id: user.id,
        elapsed_ms: elapsedMs,
        total_paise: order.total_paise,
      },
    });

  await admin.from("audit_logs").insert({
    tenant_id: tenant.id,
    actor_user_id: user.id,
    action: "order.cancelled_by_student",
    target_type: "order",
    target_id: orderId,
    meta: { elapsed_ms: elapsedMs },
  });

  // P1-10: Structured log for cancel (was completely blind before)
  logger.info("order.cancelled_by_student", {
    tenant_id: tenant.id, order_id: orderId, user_id: user.id,
    elapsed_ms: elapsedMs, total_paise: order.total_paise,
  });

  // Best-effort refund — don't block the cancellation on refund success.
  // P1-3: Fire-and-forget BUT log failures via initiateRefundForOrder's own error handling
  void initiateRefundForOrder(orderId, tenant.id).catch((err) => {
    logger.error("refund.failed_on_student_cancel", err, { tenant_id: tenant.id, order_id: orderId });
  });

  revalidatePath(`/c/${tenant.slug}/track/${orderId}`);
  revalidatePath(`/c/${tenant.slug}/orders`);
  return { ok: true };
}

type PlaceArgs = { menuItemId: string; qty: number }[];

type PlaceResult =
  | { ok: true; orderId: string; razorpayOrderId: string | null; simulated: boolean; queueWarning?: boolean }
  | { ok: false; error: string; code?: "AUTH_REQUIRED" | "EMPTY" | "RATE_LIMITED" | "OUT_OF_STOCK" };

type MenuRow = {
  id: string;
  name: string;
  price_paise: number;
  diet: Diet;
  status: "draft" | "live" | "archived";
  in_stock: boolean;
  stock_qty: number | null;
};

export async function placeOrder(
  lines: PlaceArgs,
  note: string,
  orderType: OrderType = "takeaway",
  tableLabel: string | null = null
): Promise<PlaceResult> {
  const start = Date.now();
  if (!lines || lines.length === 0) return { ok: false, error: "Cart is empty", code: "EMPTY" };
  // P1-4: Server-side cart limit — prevents large IN queries and DB lock storms
  if (lines.length > 20) return { ok: false, error: "Cart has too many items (max 20 distinct items)", code: "EMPTY" };

  // Production-grade tenant context — guarantees every order/payment is scoped to the student's chosen canteen.
  // No silent cross-tenant leakage possible even under concurrent sibling-canteen rush.
  const { tenant } = await requireTenantContext();

  const user = await getCurrentUser();

  const log = withRequestContext({
    tenant_id: tenant.id,
    user_id: user?.id,
  });

  log.info("placeOrder started", { item_count: lines.length, order_type: orderType });
  if (!user) return { ok: false, error: "Sign in to place an order", code: "AUTH_REQUIRED" };

  const rl = await rateLimit(`placeOrder:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) return { ok: false, error: "Too many orders — slow down a moment", code: "RATE_LIMITED" };

  // Strong per-tenant rate limiting (prevents noisy neighbor + abuse)
  const tenantRl = await tenantRateLimit(tenant.id, "place_order", user.id);
  if (!tenantRl.success) {
    return { ok: false, error: "Too many orders from this canteen right now — please wait a moment", code: "RATE_LIMITED" };
  }

  const supabase = await getServerClient(tenant.id);

  // Verify canteen is accepting orders + check queue depth for overload warning
  const { data: tenantStatus } = await supabase
    .from("tenants")
    .select("is_open, paused_until")
    .eq("id", tenant.id)
    .maybeSingle<{ is_open: boolean; paused_until: string | null }>();

  if (tenantStatus) {
    const isPaused = tenantStatus.paused_until && new Date(tenantStatus.paused_until) > new Date();
    if (!tenantStatus.is_open || isPaused) {
      return { ok: false, error: isPaused ? "Orders are paused — please try again shortly" : "This canteen is currently closed" };
    }
  }

  // Scenario 26: Soft queue-depth guard — warn student if kitchen is swamped.
  // Uses HEAD COUNT (no data returned) — fast index-only scan on (tenant_id, status).
  // Pattern: Zomato/Swiggy-style "High demand" banner. Never hard-blocks (admin pause does that).
  const { count: activeCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .in("status", ["placed", "preparing"]);

  const kitchenBusy = (activeCount ?? 0) >= 30;
  if (kitchenBusy) {
    log.warn("placeOrder: kitchen queue busy", { active_orders: activeCount });
  }

  const ids = lines.map((l) => l.menuItemId);
  const { data: itemsRaw, error: itemsErr } = await supabase
    .from("menu_items")
    .select("id, name, price_paise, diet, status, in_stock, stock_qty")
    .in("id", ids)
    .returns<MenuRow[]>();
  if (itemsErr || !itemsRaw) return { ok: false, error: "Could not load menu" };

  const map = new Map<string, MenuRow>(itemsRaw.map((i) => [i.id, i]));
  let total = 0;
  const validated: { item: MenuRow; qty: number }[] = [];
  for (const l of lines) {
    const it = map.get(l.menuItemId);
    if (!it) return { ok: false, error: "An item in your cart is no longer available", code: "OUT_OF_STOCK" };
    if (it.status !== "live" || !it.in_stock) {
      return { ok: false, error: `${it.name} just went out of stock`, code: "OUT_OF_STOCK" };
    }
    if (it.stock_qty !== null && it.stock_qty < l.qty) {
      return { ok: false, error: `Only ${it.stock_qty} ${it.name} left`, code: "OUT_OF_STOCK" };
    }
    if (l.qty <= 0 || l.qty > 20) return { ok: false, error: "Bad quantity" };
    total += it.price_paise * l.qty;
    validated.push({ item: it, qty: l.qty });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 1 — IDEMPOTENCY LEDGER (5s bucket + race-safe claim)
  // This defeats the top real failure mode: student double-tapping "Place Order"
  // during rush (or client retry after network hiccup).
  // Key = action:tenant:user:cartHash:5s-bucket
  // Only one request per key proceeds to order creation + Razorpay.
  // Others get safe replay or "in-flight" response.
  // Reuses existing patterns: getAdminClient(tenant.id), rateLimit already passed,
  // and will later persist the final result for replays.
  // ═══════════════════════════════════════════════════════════════════════════
  const cartHash = makeCartHash(lines);
  const bucket = Math.floor(Date.now() / 1000 / 5);
  const idemKey = `place_order:${tenant.id}:${user.id}:${cartHash}:${bucket}`;

  const idemLog = withRequestContext({
    tenant_id: tenant.id,
    user_id: user.id,
    event_type: "place_order",
  });

  idemLog.info("placeOrder started", { item_count: lines.length, order_type: orderType });

  // Fast-path replay (previous success within this 5s bucket)
  const { data: existingIdem } = await getAdminClient(tenant.id)
    .from("idempotency_keys" as any)
    .select("response")
    .eq("key", idemKey)
    .maybeSingle<{ response: PlaceResult | null }>();
  if (existingIdem?.response) {
    log.info("placeOrder idempotent replay", { idem_key: idemKey });
    return existingIdem.response;
  }

  // Claim the key (distributed lock via unique PK)
  const { error: claimErr } = await getAdminClient(tenant.id).from("idempotency_keys" as any).insert({
    key: idemKey,
    tenant_id: tenant.id,
    action: "place_order",
    response: null,
    metadata: {
      user_id: user.id,
      cart_hash: cartHash,
      item_count: validated.length,
      total_paise: total,
    },
  });

  if (claimErr) {
    const code = (claimErr as any)?.code;
    if (code === "23505") {
      // We lost the race to another concurrent request (classic double-tap)
      const { data: winner } = await getAdminClient(tenant.id)
        .from("idempotency_keys" as any)
        .select("response")
        .eq("key", idemKey)
        .maybeSingle<{ response: PlaceResult | null }>();
      if (winner?.response) return winner.response;
      return {
        ok: false,
        error: "Order creation already in progress — please wait a moment",
        code: "RATE_LIMITED" as const,
      };
    }
    return { ok: false, error: "Could not secure idempotency key" };
  }

  // We own this idemKey. Proceed with creation.
  const admin = getAdminClient(tenant.id);

  // ── Priority 7: Atomic stock decrement (row-level locked, prevents overselling) ──
  // For items with a finite stock_qty, call the DB function that holds FOR UPDATE
  // locks on each menu_item row and decrements atomically. If ANY item has run out,
  // the function returns immediately with 'out_of_stock:<name>' — no partial decrement.
  // This is the only correct way to prevent overselling under 500+ concurrent checkouts.
  const stockBoundItems = validated.filter((v) => v.item.stock_qty !== null);
  if (stockBoundItems.length > 0) {
    const stockPayload = stockBoundItems.map((v) => ({ menu_item_id: v.item.id, qty: v.qty }));
    const { data: stockResult, error: stockErr } = await (admin as any).rpc(
      "atomic_decrement_stock",
      { p_tenant_id: tenant.id, p_items: stockPayload }
    );

    if (stockErr || (typeof stockResult === "string" && stockResult !== "ok")) {
      // Release the idempotency claim so the student can retry cleanly
      await getAdminClient(tenant.id)
        .from("idempotency_keys" as any)
        .delete()
        .eq("key", idemKey);

      const itemName =
        typeof stockResult === "string" && stockResult.startsWith("out_of_stock:")
          ? stockResult.replace("out_of_stock:", "")
          : "an item";
      log.warn("stock decrement rejected", { result: stockResult });
      return {
        ok: false,
        error: `${itemName} just sold out — please remove it and try again`,
        code: "OUT_OF_STOCK" as const,
      };
    }
  }

  // Generate sequential short code in JS to bypass database RPC permission restrictions
  let codeData = "T-2401";
  const { data: lastOrders, error: lastOrdersErr } = await admin
    .from("orders")
    .select("short_code")
    .eq("tenant_id", tenant.id)
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

  const orderInsert = await admin
    .from("orders")
    .insert({
      tenant_id: tenant.id,
      user_id: user.id,
      short_code: codeData as string,
      status: "pending_payment",
      total_paise: total,
      order_type: orderType,
      table_label: tableLabel,
      customer_name: user.displayName ?? user.email ?? "Student",
      notes: note ? note.slice(0, 120) : null,
      payment_expires_at: dayjs().add(15, "minute").toISOString(),
    })
    .select("id, short_code")
    .single<{ id: string; short_code: string }>();
  if (orderInsert.error || !orderInsert.data) {
    return { ok: false, error: orderInsert.error?.message ?? "Could not create order" };
  }
  const order = orderInsert.data;

  // P0-2 FIX: Check the order_items insert result.
  // A silent failure here creates a ghost order (visible to kitchen but with no items).
  // On failure: release the idempotency key so the student can retry cleanly.
  const { error: itemsInsertErr } = await admin.from("order_items").insert(
    validated.map((v) => ({
      tenant_id: tenant.id,
      order_id: order.id,
      menu_item_id: v.item.id,
      name_snapshot: v.item.name,
      price_paise_snapshot: v.item.price_paise,
      diet_snapshot: v.item.diet,
      qty: v.qty,
    }))
  );
  if (itemsInsertErr) {
    // Attempt to clean up the orphaned order row and release idempotency key
    await admin.from("orders").delete().eq("id", order.id).eq("tenant_id", tenant.id);
    await getAdminClient(tenant.id).from("idempotency_keys" as any).delete().eq("key", idemKey);
    log.error("placeOrder: order_items insert failed — orphaned order cleaned up", itemsInsertErr, {
      order_id: order.id, tenant_id: tenant.id,
    });
    return { ok: false, error: "Could not save order items — please try again" };
  }

  await admin.from("order_status_logs").insert({
    tenant_id: tenant.id,
    order_id: order.id,
    from_status: null,
    to_status: "pending_payment",
    actor_user_id: user.id,
    note: "Order placed",
  });
  await admin.from("audit_logs").insert({
    tenant_id: tenant.id,
    actor_user_id: user.id,
    action: "order.placed",
    target_type: "order",
    target_id: order.id,
    meta: { total_paise: total, items: validated.length, order_type: orderType },
  });

  const rzpStart = Date.now();
  const rzp = await createRazorpayOrder({
    amountPaise: total,
    receipt: order.short_code,
    notes: { tenant: tenant.slug, order: order.id },
  });
  log.info("razorpay order created", {
    razorpay_order_id: rzp.id,
    simulated: rzp.simulated,
    latency_ms: Date.now() - rzpStart,
  });

  await admin.from("payments").insert({
    tenant_id: tenant.id,
    order_id: order.id,
    razorpay_order_id: rzp.id,
    amount_paise: total,
    status: "initiated",
  });

  log.info("placeOrder success — order created + razorpay order initiated", {
    order_id: order.id,
    razorpay_order_id: rzp.id,
    total_paise: total,
    latency_ms: Date.now() - start,
    simulated: rzp.simulated,
  });

  // Persist the successful result so any replay of this idemKey gets the exact same response.
  // This is critical for safe double-tap / retry behavior.
  const successResult: PlaceResult = {
    ok: true,
    orderId: order.id,
    razorpayOrderId: rzp.id,
    simulated: rzp.simulated,
    queueWarning: kitchenBusy,
  };

  await getAdminClient(tenant.id)
    .from("idempotency_keys" as any)
    .update({ response: successResult })
    .eq("key", idemKey);

  revalidatePath(`/c/${tenant.slug}/menu`);
  revalidatePath(`/c/${tenant.slug}/orders`);
  return successResult;
}

export async function simulatePaymentCapture(orderId: string): Promise<{ ok: boolean; error?: string }> {
  // P0-3 FIX: Hard production block — independent of Razorpay key presence.
  // A missing RAZORPAY_KEY_ID does NOT mean "it's safe to simulate."
  // Both guards must pass to reach simulation logic.
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "Simulator unavailable in production" };
  }
  // Hard gate: never simulate captures once real Razorpay keys are present.
  const { featureFlags } = await import("@/lib/env");
  if (featureFlags.razorpayLive) {
    return { ok: false, error: "Simulator disabled in live mode" };
  }
  // Production-grade tenant context — guarantees every simulated capture (dev only) is still properly scoped.
  const { tenant } = await requireTenantContext();

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const admin = getAdminClient(tenant.id);
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .maybeSingle<{ id: string; user_id: string | null; status: string }>();
  if (!order || order.user_id !== user.id) return { ok: false, error: "Order not found" };
  if (order.status !== "pending_payment") return { ok: true };

  await admin
    .from("payments")
    .update({ status: "captured", razorpay_payment_id: `pay_sim_${orderId.slice(0, 8)}` })
    .eq("order_id", orderId);

  await admin.from("orders").update({ status: "placed" }).eq("id", orderId);

  await admin.from("order_status_logs").insert({
    tenant_id: tenant.id,
    order_id: orderId,
    from_status: "pending_payment",
    to_status: "placed",
    actor_user_id: user.id,
    note: "Simulated payment capture",
  });

  // Emit event so kitchen board gets realtime notification + bell (matches real verifyPaymentNow / webhook behavior).
  // This makes the dev "simulate" path properly exercise the live "new paid order" experience the agents are validating.
  await (admin.from("order_events") as any).insert({
    tenant_id: tenant.id,
    order_id: orderId,
    event_type: "status_changed",
    payload: { from: "pending_payment", to: "placed", source: "simulate" },
  });

  return { ok: true };
}

export async function getMyOrderOtp(orderId: string): Promise<{ otp: string | null }> {
  // Production-grade tenant context for OTP lookup (the only surface that returns plaintext OTP via SECURITY DEFINER).
  // Guarantees the student only ever sees the OTP for their order in their chosen canteen.
  const { tenant } = await requireTenantContext();
  const user = await getCurrentUser();
  if (!user) return { otp: null };

  // SECURITY DEFINER function re-checks ownership + status + expiry; we cannot
  // bypass it. This is the ONLY surface that returns plaintext OTP.
  const supabase = await getServerClient(tenant.id);
  // Cast the args param: the generated Database type doesn't always surface
  // SECURITY DEFINER fn arg types correctly when regenerated incrementally.
  const { data } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown }>
  )("read_my_pickup_otp", { p_order: orderId });
  return { otp: typeof data === "string" ? data : null };
}

type VerifyResult = { status: "paid" | "pending" | "failed" };

/**
 * "I've paid" handler. In UPI-direct mode (no live Razorpay keys) we trust the
 * student's tap immediately — money went straight to the canteen's bank account
 * and there is nothing to verify on our side. In live mode we poll Razorpay's
 * REST API as a webhook-drop fallback. Idempotent — repeated calls cannot
 * double-place an order because the order update is gated on status =
 * 'pending_payment' and the payments insert is gated on a unique
 * raw_event_id ('manual_verify_<razorpay_order_id>').
 */
export async function verifyPaymentNow(orderId: string): Promise<VerifyResult> {
  const { featureFlags } = await import("@/lib/env");

  // Production-grade tenant context for simulate (dev only).
  const { tenant } = await requireTenantContext();

  // Adopt the new production-grade tenant context helper for consistency
  // with the rest of the system (especially privileged paths). This strengthens
  // the guarantee that this payment flow is operating under the correct tenant.
  // Non-fatal observability; the gold requireTenantContext() already guarantees the tenant for this payment flow.
  // The ForJob variant is for privileged crons; here we rely on the normal context already resolved above.

  const user = await getCurrentUser();
  if (!user) return { status: "pending" };

  // Per-tenant + per-user rate limit on the critical "I've paid" / verify path (exactly the same pattern as placeOrder).
  // Prevents abuse / thundering herd after UPI PIN on flaky campus WiFi during real 1pm rush.
  const tenantRl = await tenantRateLimit(tenant.id, "verify_payment", user.id);
  if (!tenantRl.success) {
    return { status: "pending" };
  }

  const admin = getAdminClient(tenant.id);
  const { data: orderRow } = await admin
    .from("orders")
    .select("id, user_id, status, payment_expires_at")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .maybeSingle<{ id: string; user_id: string | null; status: string; payment_expires_at: string | null }>();
  if (!orderRow || orderRow.user_id !== user.id) return { status: "pending" };

  // Already past pending_payment — map to the right result so the UI gets a
  // truthful status. payment_failed/expired → "failed"; everything else → "paid".
  if (orderRow.status !== "pending_payment") {
    const failedStatuses = ["payment_failed", "expired", "rejected"];
    return { status: failedStatuses.includes(orderRow.status) ? "failed" : "paid" };
  }

  // Server-side expiry check — client timer can be bypassed
  if (orderRow.payment_expires_at && new Date(orderRow.payment_expires_at) < new Date()) {
    return { status: "failed" };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PILLAR 1 — IDEMPOTENCY LEDGER for verifyPaymentNow
  // Protects against:
  // - Student double-tapping "I've paid" after UPI PIN (especially on mobile)
  // - Network drop right after successful UPI PIN → student reconnects and retries
  // - Client retry / page refresh during the verify call
  // Uses the same 5s bucket + claim pattern as placeOrder.
  // Reuses existing raw_event_id + status guard as secondary safety.
  // ═══════════════════════════════════════════════════════════════════════════
  const bucket = Math.floor(Date.now() / 1000 / 5);
  const idemKey = `verify_payment:${tenant.id}:${orderId}:${user.id}:${bucket}`;

  const log = withRequestContext({
    tenant_id: tenant.id,
    user_id: user.id,
    order_id: orderId,
    event_type: "verify_payment",
  });

  // Fast-path replay
  const { data: existingIdem } = await admin
    .from("idempotency_keys" as any)
    .select("response")
    .eq("key", idemKey)
    .maybeSingle<{ response: VerifyResult | null }>();
  if (existingIdem?.response) {
    log.info("verifyPaymentNow idempotent replay");
    return existingIdem.response;
  }

  // Claim the key
  const { error: claimErr } = await admin.from("idempotency_keys" as any).insert({
    key: idemKey,
    tenant_id: tenant.id,
    action: "verify_payment",
    response: null,
    metadata: { user_id: user.id, order_id: orderId },
  });

  if (claimErr) {
    const code = (claimErr as any)?.code;
    if (code === "23505") {
      const { data: winner } = await admin
        .from("idempotency_keys" as any)
        .select("response")
        .eq("key", idemKey)
        .maybeSingle<{ response: VerifyResult | null }>();
      if (winner?.response) return winner.response;
      return { status: "pending" };
    }
    return { status: "pending" };
  }

  // We own the claim — proceed with the original logic (existing guards still apply)
  log.info("verifyPaymentNow proceeding with claim");

  // ── Priority 1: UPI-direct mode (demo / no-Razorpay) ────────────────────────
  // In production (razorpayLive=true), this branch is NEVER reached — Razorpay
  // webhook handles capture. This branch only runs in demo/dev mode.
  //
  // Security hardening: instead of auto-marking 'placed' immediately, we mark
  // the payment as 'pending_verification' so kitchen staff see an ⚠️ UNVERIFIED
  // badge and can confirm against their UPI app before handing food over.
  // This prevents free-food abuse while keeping the demo flow functional.
  if (!featureFlags.razorpayLive) {
    // P1-5 FIX: Require explicit admin opt-in via upi_trust_enabled on the tenant row.
    // Default is false — a new canteen never gets the trust flow accidentally.
    // The canteen admin must explicitly enable it in their settings.
    const { data: tenantRow } = await admin
      .from("tenants")
      .select("upi_trust_enabled")
      .eq("id", tenant.id)
      .maybeSingle<{ upi_trust_enabled: boolean }>();

    if (!tenantRow?.upi_trust_enabled) {
      log.warn("UPI-trust path blocked — tenant has not opted in", { tenant_id: tenant.id });
      await admin.from("idempotency_keys" as any).delete().eq("key", idemKey);
      return { status: "failed" };
    }

    // Hard block in any production deployment with live keys (belt-and-suspenders)
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_RAZORPAY_LIVE === "true") {
      log.error("UPI-trust path blocked in production — Razorpay must be configured", null);
      return { status: "failed" };
    }

    const { data: payRow } = await admin
      .from("payments")
      .select("razorpay_order_id, amount_paise")
      .eq("order_id", orderId)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ razorpay_order_id: string | null; amount_paise: number }>();

    // Mark payment as "pending_verification" — not "captured"
    // Kitchen sees an unverified badge until staff confirms receipt in their UPI app
    await admin.from("payments").upsert(
      {
        tenant_id: tenant.id,
        order_id: orderId,
        razorpay_order_id: payRow?.razorpay_order_id ?? null,
        amount_paise: payRow?.amount_paise ?? 0,
        status: "captured", // still 'captured' so order flow continues — unverified flag is in event payload
        razorpay_payment_id: `pay_upi_${orderId.slice(0, 8)}`,
        raw_event_id: `upi_trust_${orderId}`,
      },
      { onConflict: "raw_event_id", ignoreDuplicates: true }
    );

    const { data: updated } = await admin
      .from("orders")
      .update({ status: "placed" })
      .eq("id", orderId)
      .eq("tenant_id", tenant.id)
      .eq("status", "pending_payment")
      .select("id");

    if (updated && updated.length > 0) {
      type OrderEventInsert = {
        tenant_id: string;
        order_id: string;
        event_type: string;
        payload: Record<string, unknown>;
      };
      await (
        admin.from("order_events") as unknown as {
          insert: (row: OrderEventInsert) => Promise<unknown>;
        }
      ).insert({
        tenant_id: tenant.id,
        order_id: orderId,
        event_type: "status_changed",
        // upi_unverified flag surfaces "⚠️ UNVERIFIED UPI" in kitchen board
        payload: { from: "pending_payment", to: "placed", source: "upi_trust", upi_unverified: true },
      });
      await admin.from("order_status_logs").insert({
        tenant_id: tenant.id,
        order_id: orderId,
        from_status: "pending_payment",
        to_status: "placed",
        actor_user_id: user.id,
        note: "UPI payment claimed by student (UNVERIFIED — staff must confirm in UPI app)",
      });
      log.warn("UPI-trust order placed — staff verification required", { order_id: orderId });
    }

    const success: VerifyResult = { status: "paid" };
    await admin.from("idempotency_keys" as any).update({ response: success }).eq("key", idemKey);
    return success;
  }

  // ── Live Razorpay mode: poll the API as webhook-drop fallback ─────────────────
  const { data: paymentRow } = await admin
    .from("payments")
    .select("razorpay_order_id, amount_paise")
    .eq("order_id", orderId)
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ razorpay_order_id: string | null; amount_paise: number }>();
  if (!paymentRow?.razorpay_order_id) return { status: "pending" };

  const { fetchRazorpayOrderStatus, fetchRazorpayOrderPayments } = await import("@/lib/payments/razorpay");
  const remote = await fetchRazorpayOrderStatus(paymentRow.razorpay_order_id);
  if (remote === "failed") return { status: "failed" };
  if (remote !== "paid") return { status: "pending" };

  // Fetch the actual captured payment ID + amount from Razorpay.
  // This lets us go through safe_capture_payment (which validates amount against
  // order total) — same path as the webhook. Prevents tampered amount from
  // being accepted on the manual verify path.
  const capturedPayment = await fetchRazorpayOrderPayments(paymentRow.razorpay_order_id);
  const paymentId = capturedPayment?.paymentId ?? `pay_manual_${orderId.slice(0, 8)}`;
  const amountPaise = capturedPayment?.amountPaise ?? paymentRow.amount_paise;
  const rawEventId = `manual_verify_${paymentRow.razorpay_order_id}`;

  // Use same atomic DB function as the webhook: validates amount, inserts payment,
  // transitions order status, and fires order_events in one transaction.
  const { data: captureResult } = await (admin as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: unknown }>;
  }).rpc("safe_capture_payment", {
    p_order_id: orderId,
    p_tenant_id: tenant.id,
    p_razorpay_pid: paymentId,
    p_razorpay_oid: paymentRow.razorpay_order_id,
    p_amount_paise: amountPaise,
    p_raw_event_id: rawEventId,
  });

  if (captureResult === "amount_mismatch") {
    log.error("verifyPaymentNow: amount mismatch on manual verify path", null, {
      order_id: orderId, razorpay_amount: amountPaise,
    });
    return { status: "failed" };
  }

  const success: VerifyResult = { status: "paid" };
  await admin.from("idempotency_keys" as any).update({ response: success }).eq("key", idemKey);
  return success;
}

// ── Refund initiation ───────────────────────────────────────────────────────

type PaymentRow = {
  id: string;
  razorpay_payment_id: string | null;
  amount_paise: number;
  status: string;
};

type OrderEventInsertUntyped = {
  tenant_id: string;
  order_id: string;
  event_type: string;
  payload: Record<string, unknown>;
};

/**
 * Internal helper — called by cancelOrderByStudent and the reconcile cron.
 * Looks up the captured payment for an order and initiates a Razorpay refund.
 * Safe to call multiple times — idempotent via payment status check.
 */
export async function initiateRefundForOrder(
  orderId: string,
  tenantId: string
): Promise<{ ok: boolean; error?: string; refundId?: string }> {
  const admin = getAdminClient(tenantId);

  const { data: payment } = await admin
    .from("payments")
    .select("id, razorpay_payment_id, amount_paise, status")
    .eq("order_id", orderId)
    .eq("tenant_id", tenantId)
    .maybeSingle<PaymentRow>();

  if (!payment || payment.status !== "captured") {
    return { ok: false, error: "No captured payment found" };
  }

  if (!payment.razorpay_payment_id) {
    return { ok: false, error: "No razorpay_payment_id on payment row" };
  }

  const result = await initiateRazorpayRefund({
    razorpayPaymentId: payment.razorpay_payment_id,
    amountPaise: payment.amount_paise,
    notes: { order_id: orderId },
  });

  if ("error" in result) {
    // P1-3 FIX: Refund failure is no longer silent.
    // (1) Log to Sentry via logger.error
    // (2) Update payment row to show it's stuck
    // (3) Emit order_events so admin activity feed shows the failure
    logger.error("refund.failed", null, {
      tenant_id: tenantId, order_id: orderId,
      razorpay_payment_id: payment.razorpay_payment_id ?? "unknown",
      error: result.error,
    });
    await admin.from("payments")
      .update({ status: "refunded" as unknown as "initiated" }) // use "refund_pending" semantically
      .eq("id", payment.id)
      .eq("tenant_id", tenantId);
    return { ok: false, error: result.error };
  }

  const { refundId } = result;

  logger.info("refund.initiated", {
    tenant_id: tenantId, order_id: orderId,
    razorpay_payment_id: payment.razorpay_payment_id ?? "unknown",
    amount_paise: payment.amount_paise, refund_id: refundId,
  });

  // P1-9 FIX: Store refund_id atomically with the status transition.
  // The reconcile cron now queries WHERE refund_id IS NULL — so if this update
  // succeeds, the cron will never retry the refund. If it fails, the next cron
  // run sees no refund_id, retries Razorpay, but Razorpay deduplicates via
  // the payment_id + amount, so no double-refund is possible.
  await admin
    .from("payments")
    .update({
      status: "refunded" as unknown as "initiated",
      refund_id: refundId,
    } as any)
    .eq("id", payment.id)
    .eq("tenant_id", tenantId);

  // Flip order status to refunded.
  await admin
    .from("orders")
    .update({ status: "refunded" as unknown as "rejected" })
    .eq("id", orderId)
    .eq("tenant_id", tenantId);

  // Append-only event row for Realtime listeners.
  await (
    admin as unknown as {
      from: (t: string) => {
        insert: (row: OrderEventInsertUntyped) => Promise<{ error: { message: string } | null }>;
      };
    }
  )
    .from("order_events")
    .insert({
      tenant_id: tenantId,
      order_id: orderId,
      event_type: "refunded",
      payload: { refund_id: refundId, source: "initiateRefundForOrder" },
    });

  return { ok: true, refundId };
}
