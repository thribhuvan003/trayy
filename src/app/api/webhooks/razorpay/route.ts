import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { getAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging";
import { notifyAdminNewOrder } from "@/lib/notifications/sms";

type RazorpayEvent = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        amount?: number;
        notes?: Record<string, string>;
      };
    };
  };
  created_at?: number;
};

type AdminClient = ReturnType<typeof getAdminClient>;

type WebhookDlqEntry = {
  tenant_id: string | null;
  razorpay_event: string;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  payload: RazorpayEvent;
  error_message: string;
  error_stack?: string;
};

async function persistToDlq(admin: AdminClient, entry: WebhookDlqEntry): Promise<boolean> {
  try {
    const { error } = await admin.from("webhook_dlq" as any).insert(entry as any);
    if (error) {
      logger.error("CRITICAL: failed to write to webhook_dlq", error, {
        razorpay_event: entry.razorpay_event,
        razorpay_payment_id: entry.razorpay_payment_id,
        razorpay_order_id: entry.razorpay_order_id,
      });
      return false;
    }
    return true;
  } catch (error) {
    logger.error("CRITICAL: failed to write to webhook_dlq", error, {
      razorpay_event: entry.razorpay_event,
      razorpay_payment_id: entry.razorpay_payment_id,
      razorpay_order_id: entry.razorpay_order_id,
    });
    return false;
  }
}

function retryableFailure(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 503 });
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  if (!env.RAZORPAY_WEBHOOK_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error("webhook misconfigured", null, { latency_ms: Date.now() - start });
    return retryableFailure("Not configured");
  }

  const sig = req.headers.get("x-razorpay-signature");
  if (!sig) {
    logger.warn("webhook missing signature");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const raw = await req.text();

  if (!verifyWebhookSignature(raw, sig)) {
    logger.error("webhook invalid signature", null, { latency_ms: Date.now() - start });
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  let body: RazorpayEvent;
  try {
    body = JSON.parse(raw) as RazorpayEvent;
  } catch {
    logger.error("webhook bad JSON", null, { latency_ms: Date.now() - start });
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }

  const payment = body.payload?.payment?.entity;
  if (!payment?.order_id) {
    // Events outside the payment lifecycle do not carry a payment order id and
    // are intentionally ignored. A lifecycle event without one cannot be
    // processed, so preserve it before acknowledging.
    if (body.event === "payment.captured" || body.event === "payment.failed") {
      const admin = getAdminClient();
      const stored = await persistToDlq(admin, {
        tenant_id: null,
        razorpay_event: body.event,
        razorpay_payment_id: payment?.id,
        payload: body,
        error_message: "Payment lifecycle event missing Razorpay order id",
      });
      if (!stored) return retryableFailure("Webhook not durably recorded");
      return NextResponse.json({ ok: true, dlq: true });
    }
    return NextResponse.json({ ok: true, skipped: true });
  }

  const tenantSlug = payment.notes?.tenant;
  const tenantOrderId = payment.notes?.order;

  if (!tenantSlug || !tenantOrderId) {
    logger.warn("webhook payment missing tenant/order notes", {
      event: body.event,
      razorpay_payment_id: payment.id,
      latency_ms: Date.now() - start,
    });
    if (body.event === "payment.captured" || body.event === "payment.failed") {
      const admin = getAdminClient();
      const stored = await persistToDlq(admin, {
        tenant_id: null,
        razorpay_event: body.event,
        razorpay_payment_id: payment.id,
        razorpay_order_id: payment.order_id,
        payload: body,
        error_message: "Payment lifecycle event missing tenant/order notes",
      });
      if (!stored) return retryableFailure("Webhook not durably recorded");
      return NextResponse.json({ ok: true, dlq: true });
    }
    return NextResponse.json({ ok: true, skipped: true });
  }

  const log = logger.withContext({
    tenant_slug: tenantSlug,
    order_id: tenantOrderId,
    razorpay_order_id: payment.order_id,
    razorpay_payment_id: payment.id,
    event: body.event,
  });

  log.info("razorpay webhook received");

  const admin = getAdminClient();
  // The signature is deterministic for an identical raw delivery, unlike
  // Date.now(). This keeps DB-level raw-event deduplication stable even when
  // Razorpay omits created_at.
  const eventId = `${body.event}:${payment.id ?? "x"}:${body.created_at ?? sig}`;

  const { data: orderRow, error: orderLookupError } = await admin
    .from("orders")
    .select("id, tenant_id, status")
    .eq("id", tenantOrderId)
    .maybeSingle<{ id: string; tenant_id: string; status: string }>();

  if (orderLookupError) {
    const stored = await persistToDlq(admin, {
      tenant_id: null,
      razorpay_event: body.event,
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      payload: body,
      error_message: `Order lookup failed: ${String(orderLookupError)}`,
    });
    if (!stored) return retryableFailure("Webhook not processed or durably recorded");
    log.warn("webhook order lookup failed — queued to DLQ");
    return NextResponse.json({ ok: true, dlq: true });
  }

  if (!orderRow) {
    // Webhook arrived before the order row was visible (race with placeOrder).
    // This is a real scenario in the checklist. We DLQ it for visibility and let
    // the existing reconcile cron (with the same guards) catch it later.
    const stored = await persistToDlq(admin, {
      tenant_id: null,
      razorpay_event: body.event,
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      payload: body,
      error_message: "Order row not found at webhook processing time",
    });
    if (!stored) return retryableFailure("Webhook not processed or durably recorded");
    log.warn("webhook order not found — queued to DLQ (reconcile safety net active)");
    return NextResponse.json({ ok: true, dlq: true });
  }

  const adminScoped = getAdminClient(orderRow.tenant_id);
  const tenantLog = log.withContext({ tenant_id: orderRow.tenant_id, order_id: orderRow.id });

  try {
    if (body.event === "payment.captured") {
      if (payment.status !== "captured") {
        throw new Error(`payment.captured carried unexpected status: ${String(payment.status)}`);
      }
      // Use the DB-level row-locked capture function (FOR UPDATE) to guarantee atomicity
      // even under thundering-herd webhook retries and concurrent reconcile runs.
      const { data: captureResult, error: captureErr } = await (adminScoped as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: unknown }>;
      }).rpc("safe_capture_payment", {
        p_order_id: orderRow.id,
        p_tenant_id: orderRow.tenant_id,
        p_razorpay_pid: payment.id ?? null,
        p_razorpay_oid: payment.order_id,
        p_amount_paise: payment.amount ?? 0,
        p_raw_event_id: eventId,
      });

      if (captureErr) {
        tenantLog.error("safe_capture_payment rpc failed", captureErr);
        throw captureErr;
      }

      if (captureResult === "amount_mismatch") {
        // Priority 2: Paid amount < order total. Log and DLQ for manual review.
        // Never flip the order to 'placed' on an underpayment.
        tenantLog.error("AMOUNT MISMATCH — webhook capture rejected", null, {
          razorpay_amount: payment.amount,
          order_id: orderRow.id,
          latency_ms: Date.now() - start,
        });
        const stored = await persistToDlq(admin, {
          tenant_id: orderRow.tenant_id,
          razorpay_event: body.event,
          razorpay_payment_id: payment.id,
          razorpay_order_id: payment.order_id,
          payload: body,
          error_message: `Amount mismatch: received ${payment.amount} paise`,
        });
        if (!stored) throw new Error("Amount mismatch was not durably recorded");
        return NextResponse.json({ ok: true, dlq: true });
      } else if (captureResult === "captured") {
        tenantLog.info("order transitioned via webhook (row-locked capture)", { result: captureResult, latency_ms: Date.now() - start });
        // Await the notification attempt so a serverless invocation cannot end
        // before the provider request is dispatched. Notification failure never
        // changes the already-committed payment result.
        await Promise.allSettled([
          notifyAdminNewOrder(orderRow.id, orderRow.tenant_id),
        ]);
      } else if (captureResult === "already_captured") {
        tenantLog.info("webhook capture no-op", { result: captureResult });
      } else {
        throw new Error(`Unexpected safe_capture_payment result: ${String(captureResult)}`);
      }
    } else if (body.event === "payment.authorized") {
      // Authorization is not settlement. Wait for payment.captured (or the
      // reconciliation job) before placing the order in the kitchen queue.
      tenantLog.info("payment authorized; waiting for capture");
    } else if (body.event === "payment.failed") {
      if (payment.status !== "failed") {
        throw new Error(`payment.failed carried unexpected status: ${String(payment.status)}`);
      }
      const { data: failResult, error: failErr } = await (adminScoped as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: unknown }>;
      }).rpc("safe_fail_payment", {
        p_order_id:     orderRow.id,
        p_tenant_id:    orderRow.tenant_id,
        p_razorpay_oid: payment.order_id,
      });

      if (failErr) {
        tenantLog.error("safe_fail_payment rpc failed", failErr);
        throw failErr;
      }

      if (failResult === "failed") {
        tenantLog.info("order transitioned to payment_failed via webhook (atomic)", { latency_ms: Date.now() - start });
      } else if (failResult === "already_processed") {
        tenantLog.info("payment.failed no-op (guard or prior path won the race)", { result: failResult });
      } else {
        throw new Error(`Unexpected safe_fail_payment result: ${String(failResult)}`);
      }
    }

    tenantLog.info("webhook processed successfully", { latency_ms: Date.now() - start });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // A transient processing error is acknowledged only after the full signed
    // payload is durably queued. If both processing and storage fail, return a
    // retryable response so Razorpay redelivers instead of losing the payment.
    tenantLog.error("webhook processing error — DLQ entry created", err);
    const stored = await persistToDlq(admin, {
      tenant_id: orderRow.tenant_id,
      razorpay_event: body.event,
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      payload: body,
      error_message: err instanceof Error ? err.message : String(err),
      error_stack: err instanceof Error ? err.stack : undefined,
    });
    if (!stored) return retryableFailure("Webhook not processed or durably recorded");
    return NextResponse.json({ ok: true, dlq: true });
  }
}
