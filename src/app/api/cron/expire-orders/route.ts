import { NextResponse, type NextRequest } from "next/server";
import { Receiver } from "@upstash/qstash";
import { getAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Expire-orders cron (QStash scheduled).
 * Production-hardened with explicit tenant context for every privileged background job.
 *
 * This job touches money-adjacent state (pending_payment orders across all tenants).
 * It must never leak across tenants and must be fully observable — part of the
 * "one login = own dedicated system + own data" guarantee at scale.
 *
 * Pattern: requireTenantContextForJob + per-tenant getAdminClient inside the loop
 * (same as the already-hardened reconcile cron and the kitchen/student surfaces).
 */

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

  // Additional defense-in-depth rate limiting on this privileged background job.
  const cronRl = await rateLimit("cron:expire-orders", { limit: 10, windowMs: 60_000 });
  if (!cronRl.success) {
    logger.warn("expire-orders cron rate limited");
    return NextResponse.json({ ok: true, skipped: "rate_limited" });
  }

  const start = Date.now();

  logger.info("expire-orders cron started", {
    job: "expire-orders",
  });

  const admin = getAdminClient();
  const nowIso = new Date().toISOString();
  const { data: stale } = await admin
    .from("orders")
    .select("id, tenant_id, status")
    .eq("status", "pending_payment")
    .lt("payment_expires_at", nowIso)
    .limit(500)
    .returns<Row[]>();

  // ── Group 1: pending_payment orders past their expiry window ──────────────
  const byTenant = new Map<string, Row[]>();
  if (stale && stale.length > 0) {
    for (const r of stale) {
      if (!byTenant.has(r.tenant_id)) byTenant.set(r.tenant_id, []);
      byTenant.get(r.tenant_id)!.push(r);
    }
  }

  let totalExpired = 0;
  for (const [tenantId, rows] of byTenant) {
    const tAdmin = getAdminClient(tenantId);
    const ids = rows.map((r) => r.id);

    await tAdmin.from("orders").update({ status: "expired" }).in("id", ids);

    await tAdmin.from("order_status_logs").insert(
      rows.map((r) => ({
        tenant_id: r.tenant_id,
        order_id: r.id,
        from_status: "pending_payment" as const,
        to_status: "expired" as const,
        note: "Auto-expired: payment window closed (QStash)",
      }))
    );

    await tAdmin.from("audit_logs").insert(
      rows.map((r) => ({
        tenant_id: r.tenant_id,
        action: "order.expired_auto",
        target_type: "order",
        target_id: r.id,
      }))
    );

    totalExpired += rows.length;

    logger.info("expire-orders tenant batch", {
      job: "expire-orders",
      tenant_id: tenantId,
      expired_in_batch: rows.length,
    });
  }

  // ── Group 2: ready orders that were never collected (>45 min in ready state) ──
  // Keeps the kitchen board clean and the admin informed. Expires the order and
  // fires an order_event so Realtime pushes the terminal state to the student.
  const fortyFiveMinAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  const { data: uncollected } = await admin
    .from("orders")
    .select("id, tenant_id, status")
    .eq("status", "ready")
    .lt("ready_at", fortyFiveMinAgo)
    .limit(100)
    .returns<Row[]>();

  if (uncollected && uncollected.length > 0) {
    const uncollectedByTenant = new Map<string, Row[]>();
    for (const r of uncollected) {
      if (!uncollectedByTenant.has(r.tenant_id)) uncollectedByTenant.set(r.tenant_id, []);
      uncollectedByTenant.get(r.tenant_id)!.push(r);
    }

    for (const [tenantId, rows] of uncollectedByTenant) {
      const tAdmin = getAdminClient(tenantId);
      const ids = rows.map((r) => r.id);

      await tAdmin.from("orders").update({ status: "expired" }).in("id", ids).eq("status", "ready");

      await tAdmin.from("order_status_logs").insert(
        rows.map((r) => ({
          tenant_id: r.tenant_id,
          order_id: r.id,
          from_status: "ready" as const,
          to_status: "expired" as const,
          note: "Auto-expired: order not collected within 45 minutes",
        }))
      );

      // Emit order_events so track-panel Realtime pushes the update to the student
      for (const r of rows) {
        try {
          await (tAdmin.from("order_events") as unknown as {
            insert: (row: Record<string, unknown>) => Promise<unknown>;
          }).insert({
            tenant_id: r.tenant_id,
            order_id: r.id,
            event_type: "status_changed",
            payload: { from: "ready", to: "expired", source: "uncollected_expiry_cron" },
          });
        } catch {
          // Non-fatal — order_status_logs already written
        }
      }

      await tAdmin.from("audit_logs").insert(
        rows.map((r) => ({
          tenant_id: r.tenant_id,
          action: "order.expired_uncollected",
          target_type: "order",
          target_id: r.id,
        }))
      );

      totalExpired += rows.length;

      logger.info("expire-orders uncollected batch", {
        job: "expire-orders",
        tenant_id: tenantId,
        uncollected_expired: rows.length,
      });
    }
  }

  const duration = Date.now() - start;

  logger.info("expire-orders cron completed", {
    job: "expire-orders",
    tenants_affected: byTenant.size,
    expired: totalExpired,
    duration_ms: duration,
  });

  return NextResponse.json({ ok: true, expired: totalExpired, duration_ms: duration, tenants: byTenant.size });
}
