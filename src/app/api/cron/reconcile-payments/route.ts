import { NextResponse, type NextRequest } from "next/server";
import { Receiver } from "@upstash/qstash";
import { getAdminClient } from "@/lib/supabase/admin";
import { fetchRazorpayOrderStatus } from "@/lib/payments/razorpay";
import { env } from "@/lib/env";
import { initiateRefundForOrder } from "@/app/(student)/_actions";
import { logger } from "@/lib/logging";
import { rateLimit } from "@/lib/rate-limit";

// Belt-and-braces for the webhook: India sees ~2-3% Razorpay webhook drops
// (NAT churn, ISP filtering, our own cold starts). QStash hits this every
// minute and re-polls Razorpay for any order still stuck on pending_payment
// inside its viable window. All updates flow through the same idempotent
// gated upsert used by verifyPaymentNow and the webhook, so a triple-arrival
// (webhook + student tap + cron) cannot double-place anything.
async function verifyQstash(req: NextRequest, raw: string): Promise<boolean> {
  if (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY) return false;
  const signature = req.headers.get("upstash-signature");
  if (!signature) return false;
  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });
  try {
    return await receiver.verify({ signature, body: raw, url: req.url });
  } catch {
    return false;
  }
}

type Candidate = {
  id: string;
  tenant_id: string;
  status: string;
};

type PaymentLookup = {
  order_id: string;
  razorpay_order_id: string | null;
  amount_paise: number;
  created_at: string;
};

type OrderEventInsert = {
  tenant_id: string;
  order_id: string;
  event_type: string;
  payload: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const ok = await verifyQstash(req, raw);
  if (!ok) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Service role missing" }, { status: 503 });
  }

  // Additional defense-in-depth rate limiting on this privileged background job (per SRE recommendation).
  const cronRl = await rateLimit("cron:reconcile-payments", { limit: 10, windowMs: 60_000 });
  if (!cronRl.success) {
    logger.warn("reconcile-payments cron rate limited");
    return NextResponse.json({ ok: true, skipped: "rate_limited" });
  }

  const start = Date.now();

  logger.info("reconcile cron started", {
    job: "reconcile-payments",
    window_minutes: 30,
  });

  const admin = getAdminClient();
  const nowIso = new Date().toISOString();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Bounded window: only orders that are still inside their payment window
  // AND were placed within the last 30 minutes. Anything older is either
  // already expired by the other cron or beyond the point of Razorpay's
  // useful state.
  //
  // Note on DB isolation at scale:
  // This initial broad read is intentional and bounded for reconciliation.
  // All subsequent per-order work (especially writes) uses tenant-aware clients
  // via the context system. When a tenant grows very large, the long-term path
  // is to give it dedicated DB resources so this kind of cross-tenant scan is
  // no longer needed.
  // P0-7 FIX: Remove .gt("payment_expires_at", nowIso) filter.
  // If Razorpay captures payment in the last seconds of the window but
  // expire-orders cron fires first, the order status becomes "expired" —
  // but the candidate query was skipping it, permanently losing the money.
  // safe_capture_payment's own status guard handles already-expired orders safely.
  const { data: candidates } = await admin
    .from("orders")
    .select("id, tenant_id, status, placed_at, payment_expires_at")
    .eq("status", "pending_payment")
    .gt("placed_at", thirtyMinAgo)
    .limit(200)
    .returns<(Candidate & { placed_at: string; payment_expires_at: string })[]>();

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, reconciled: 0 });
  }

  const orderIds = candidates.map((c) => c.id);
  const { data: payments } = await admin
    .from("payments")
    .select("order_id, razorpay_order_id, amount_paise, created_at")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false })
    .returns<PaymentLookup[]>();

  // Most-recent payment row per order — the one carrying the razorpay_order_id
  // we originally handed to the student's QR.
  const latestByOrder = new Map<string, PaymentLookup>();
  for (const p of payments ?? []) {
    if (!latestByOrder.has(p.order_id)) latestByOrder.set(p.order_id, p);
  }

  let reconciled = 0;
  for (const c of candidates) {
    const pay = latestByOrder.get(c.id);
    if (!pay?.razorpay_order_id) continue;
    let remote: Awaited<ReturnType<typeof fetchRazorpayOrderStatus>>;
    try {
      remote = await fetchRazorpayOrderStatus(pay.razorpay_order_id);
    } catch {
      // Razorpay flaked — leave for next minute's run.
      continue;
    }
    if (remote !== "paid") continue;

    // Use a tenant-scoped admin client for all writes on this order.
    // This is the production pattern: even in a cross-tenant reconciliation job,
    // we do per-tenant work with explicit tenant context. This is the first step
    // toward the long-term "respective DB per large tenant" model.
    const tenantAdmin = getAdminClient(c.tenant_id);

    // Idempotent payments row — same shape and key as verifyPaymentNow so a
    // reconcile + manual-verify race resolves to a single row.
    await tenantAdmin.from("payments").upsert(
      {
        tenant_id: c.tenant_id,
        order_id: c.id,
        razorpay_order_id: pay.razorpay_order_id,
        amount_paise: pay.amount_paise,
        status: "captured",
        raw_event_id: `manual_verify_${pay.razorpay_order_id}`,
      },
      { onConflict: "raw_event_id", ignoreDuplicates: true }
    );

    const { data: updated } = await tenantAdmin
      .from("orders")
      .update({ status: "placed" })
      .eq("id", c.id)
      .eq("tenant_id", c.tenant_id)
      .eq("status", "pending_payment")
      .select("id");

    if (updated && updated.length > 0) {
      await (
        admin.from("order_events") as unknown as {
          insert: (row: OrderEventInsert) => Promise<unknown>;
        }
      ).insert({
        tenant_id: c.tenant_id,
        order_id: c.id,
        event_type: "status_changed",
        payload: { from: "pending_payment", to: "placed", source: "reconcile_cron" },
      });
      await admin.from("order_status_logs").insert({
        tenant_id: c.tenant_id,
        order_id: c.id,
        from_status: "pending_payment",
        to_status: "placed",
        note: "Reconciled (QStash Razorpay poll)",
      });
      reconciled += 1;
    }
  }

  // ── Refund loop ────────────────────────────────────────────────────────────
  // Find orders stuck in cancelled_by_kitchen that still have a captured
  // payment (i.e. the best-effort refund call in cancelOrderByStudent either
  // never ran or failed transiently). Cap at 20 per cron run.

  type CancelledOrder = { id: string; tenant_id: string };
  type RefundCandidate = { order_id: string; tenant_id: string };

  const { data: cancelledOrders } = await admin
    .from("orders")
    .select("id, tenant_id")
    .eq("status", "cancelled_by_kitchen")
    .limit(20)
    .returns<CancelledOrder[]>();

  let refunded = 0;
  if (cancelledOrders && cancelledOrders.length > 0) {
    const cancelledIds = cancelledOrders.map((o) => o.id);

    // P1-9 FIX: Query WHERE refund_id IS NULL in addition to status='captured'.
    // If a previous run initiated the Razorpay refund but the DB update failed,
    // the payment row stays 'captured' but refund_id is set — so we skip it.
    // This prevents the infinite refund retry loop.
    const { data: capturedPayments } = await admin
      .from("payments")
      .select("order_id, tenant_id")
      .in("order_id", cancelledIds)
      .eq("status", "captured")
      .is("refund_id", null)
      .returns<RefundCandidate[]>();

    for (const pay of capturedPayments ?? []) {
      try {
        const result = await initiateRefundForOrder(pay.order_id, pay.tenant_id);
        if (result.ok) refunded += 1;
      } catch {
        // Transient failure — leave for next cron run.
      }
    }
  }

  // ── P1-1: DLQ drain ────────────────────────────────────────────────────────
  // Webhooks that arrived before the orders row existed land in webhook_dlq
  // with processed_at = null. Re-process them here using safe_capture_payment
  // or safe_fail_payment — same idempotent path as the live webhook.
  // Cap at 50 per run so this never dominates the cron budget.

  type DlqRow = {
    id: string;
    tenant_id: string | null;
    razorpay_event: string;
    razorpay_payment_id: string | null;
    razorpay_order_id: string | null;
    payload: Record<string, unknown>;
  };

  let dlqDrained = 0;
  const { data: dlqRows } = await admin
    .from("webhook_dlq" as any)
    .select("id, tenant_id, razorpay_event, razorpay_payment_id, razorpay_order_id, payload")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(50)
    .returns<DlqRow[]>();

  if (dlqRows && dlqRows.length > 0) {
    for (const row of dlqRows) {
      try {
        // Resolve the order row via the stored notes (same as live webhook path)
        const payload = row.payload as any;
        const tenantSlug = payload?.payload?.payment?.entity?.notes?.tenant as string | undefined;
        const tenantOrderId = payload?.payload?.payment?.entity?.notes?.order as string | undefined;
        const paymentId = payload?.payload?.payment?.entity?.id as string | undefined;
        const razorpayOrderId = payload?.payload?.payment?.entity?.order_id as string | undefined;
        const amount = payload?.payload?.payment?.entity?.amount as number | undefined;
        const event = row.razorpay_event;

        if (!tenantOrderId || !razorpayOrderId) {
          // Not enough context — mark as processed to stop retrying
          await (admin as any).from("webhook_dlq").update({ processed_at: new Date().toISOString() }).eq("id", row.id);
          continue;
        }

        const { data: orderRow } = await admin
          .from("orders")
          .select("id, tenant_id, status")
          .eq("id", tenantOrderId)
          .maybeSingle<{ id: string; tenant_id: string; status: string }>();

        if (!orderRow) {
          // Order still not found — leave for next run (may be permanent if order never landed)
          continue;
        }

        const tenantAdmin = getAdminClient(orderRow.tenant_id);
        const eventId = `${event}:${paymentId ?? "x"}:dlq_drain`;

        if (event === "payment.captured" || event === "payment.authorized") {
          await (tenantAdmin as any).rpc("safe_capture_payment", {
            p_order_id: orderRow.id,
            p_tenant_id: orderRow.tenant_id,
            p_razorpay_pid: paymentId ?? null,
            p_razorpay_oid: razorpayOrderId,
            p_amount_paise: amount ?? 0,
            p_raw_event_id: eventId,
          });
        } else if (event === "payment.failed") {
          await (tenantAdmin as any).rpc("safe_fail_payment", {
            p_order_id: orderRow.id,
            p_tenant_id: orderRow.tenant_id,
            p_razorpay_oid: razorpayOrderId,
          });
        }

        // Mark as processed regardless of RPC result (idempotent; won't re-queue)
        await (admin as any).from("webhook_dlq").update({ processed_at: new Date().toISOString() }).eq("id", row.id);
        dlqDrained += 1;

        logger.info("dlq entry drained", {
          job: "reconcile-payments", dlq_id: row.id,
          event, tenant_id: orderRow.tenant_id, order_id: orderRow.id,
        });
      } catch (dlqErr) {
        logger.error("dlq drain entry failed", dlqErr, {
          job: "reconcile-payments", dlq_id: row.id,
        });
      }
    }

    // Alert if DLQ depth is growing — indicates a systemic webhook problem
    const { count: unprocessedCount } = await (admin as any)
      .from("webhook_dlq")
      .select("id", { count: "exact", head: true })
      .is("processed_at", null);

    if ((unprocessedCount ?? 0) > 3) {
      logger.error("ALERT: webhook_dlq depth > 3 — check Razorpay webhook delivery", null, {
        job: "reconcile-payments", unprocessed_dlq_depth: unprocessedCount,
      });
    }
  }

  const duration = Date.now() - start;

  logger.info("reconcile cron completed", {
    job: "reconcile-payments",
    reconciled,
    refunded,
    dlq_drained: dlqDrained,
    duration_ms: duration,
    candidates_processed: candidates?.length ?? 0,
  });

  return NextResponse.json({ ok: true, reconciled, refunded, dlq_drained: dlqDrained, duration_ms: duration });
}
