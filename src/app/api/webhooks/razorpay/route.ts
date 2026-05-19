import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { getAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

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

export async function POST(req: NextRequest) {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "Not configured" }, { status: 503 });
  }
  const sig = req.headers.get("x-razorpay-signature");
  if (!sig) return NextResponse.json({ ok: false }, { status: 400 });
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, sig)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }
  let body: RazorpayEvent;
  try {
    body = JSON.parse(raw) as RazorpayEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad JSON" }, { status: 400 });
  }
  const payment = body.payload?.payment?.entity;
  if (!payment?.order_id) return NextResponse.json({ ok: true, skipped: true });

  const tenantSlug = payment.notes?.tenant;
  const tenantOrderId = payment.notes?.order;
  if (!tenantSlug || !tenantOrderId) {
    console.warn("[razorpay] webhook payment missing notes", { event: body.event, payment_id: payment.id });
    return NextResponse.json({ ok: true, skipped: true });
  }

  const admin = getAdminClient();
  const eventId = `${body.event}:${payment.id ?? "x"}:${body.created_at ?? Date.now()}`;

  // Look up the order; idempotent on raw_event_id.
  const { data: orderRow } = await admin
    .from("orders")
    .select("id, tenant_id, status")
    .eq("id", tenantOrderId)
    .maybeSingle<{ id: string; tenant_id: string; status: string }>();
  if (!orderRow) return NextResponse.json({ ok: true, skipped: true });

  if (body.event === "payment.captured" || payment.status === "captured") {
    // Idempotent — duplicate webhooks share the same eventId and get
    // silently dropped by the raw_event_id unique constraint.
    const { error: dupe } = await admin.from("payments").upsert(
      {
        tenant_id: orderRow.tenant_id,
        order_id: orderRow.id,
        razorpay_order_id: payment.order_id,
        razorpay_payment_id: payment.id ?? null,
        amount_paise: payment.amount ?? 0,
        status: "captured",
        raw_event_id: eventId,
      },
      { onConflict: "raw_event_id", ignoreDuplicates: true }
    );
    if (dupe) return NextResponse.json({ ok: false, error: dupe.message }, { status: 500 });

    // Gated update — duplicate webhooks (or manual verify racing the webhook)
    // can't re-transition a row past pending_payment.
    const { data: updated } = await admin
      .from("orders")
      .update({ status: "placed" })
      .eq("id", orderRow.id)
      .eq("tenant_id", orderRow.tenant_id)
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
        tenant_id: orderRow.tenant_id,
        order_id: orderRow.id,
        event_type: "status_changed",
        payload: { from: "pending_payment", to: "placed", source: "razorpay_webhook" },
      });
      await admin.from("order_status_logs").insert({
        tenant_id: orderRow.tenant_id,
        order_id: orderRow.id,
        from_status: "pending_payment",
        to_status: "placed",
        note: "Razorpay captured",
      });
    }
  } else if (body.event === "payment.failed") {
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("razorpay_order_id", payment.order_id)
      .eq("tenant_id", orderRow.tenant_id);
  }

  return NextResponse.json({ ok: true });
}
