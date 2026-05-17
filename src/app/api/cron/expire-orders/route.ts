import { NextResponse, type NextRequest } from "next/server";
import { Receiver } from "@upstash/qstash";
import { getAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

// QStash hits this every minute. Auth via HMAC signature — no signature, no
// access. Skips entirely if QStash signing keys aren't configured so a misset
// env never silently opens the route.
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

type Row = { id: string; tenant_id: string; status: string };

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const ok = await verifyQstash(req, raw);
  if (!ok) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Service role missing" }, { status: 503 });
  }

  const admin = getAdminClient();
  const nowIso = new Date().toISOString();
  const { data: stale } = await admin
    .from("orders")
    .select("id, tenant_id, status")
    .eq("status", "pending_payment")
    .lt("payment_expires_at", nowIso)
    .limit(500)
    .returns<Row[]>();

  if (!stale || stale.length === 0) {
    return NextResponse.json({ ok: true, expired: 0 });
  }

  const ids = stale.map((s) => s.id);
  await admin.from("orders").update({ status: "expired" }).in("id", ids);
  await admin.from("order_status_logs").insert(
    stale.map((s) => ({
      tenant_id: s.tenant_id,
      order_id: s.id,
      from_status: "pending_payment" as const,
      to_status: "expired" as const,
      note: "Auto-expired (QStash)",
    }))
  );
  await admin.from("audit_logs").insert(
    stale.map((s) => ({
      tenant_id: s.tenant_id,
      action: "order.expired_auto",
      target_type: "order",
      target_id: s.id,
    }))
  );
  return NextResponse.json({ ok: true, expired: stale.length });
}
