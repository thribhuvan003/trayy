# ADR 0003: QStash for scheduled jobs

## Context
Orders sit in `pending_payment` until the UPI capture lands or the payment window expires. Without a scheduled job, expired orders linger forever, consume short codes, and pollute analytics. We need a cron mechanism that runs in serverless without a long-lived worker.

## Decision
Use Upstash QStash to invoke `POST /api/cron/expire-orders` once per minute. The handler:
1. Verifies the `upstash-signature` HMAC via `@upstash/qstash`'s `Receiver` — rejects unsigned/forged calls with 401. Without `QSTASH_*_SIGNING_KEY` set, the route refuses everything.
2. Selects up to 500 orders where `status = 'pending_payment' AND payment_expires_at < now()`.
3. Updates them to `expired`, writes `order_status_logs` and `audit_logs` rows in batch.

The service-role Supabase client is required (RLS bypass for cross-tenant scheduled work). If `SUPABASE_SERVICE_ROLE_KEY` is missing the handler returns 503.

## One-time setup (after deploy)
Once `APP_URL` points at a publicly reachable host:

```bash
# Schedule: every minute.
curl -X POST "$QSTASH_URL/v2/schedules/$APP_URL/api/cron/expire-orders" \
  -H "Authorization: Bearer $QSTASH_TOKEN" \
  -H "Upstash-Cron: */1 * * * *" \
  -H "Content-Type: application/json" \
  -d '{}'
```

To list / delete schedules:

```bash
curl "$QSTASH_URL/v2/schedules" -H "Authorization: Bearer $QSTASH_TOKEN"
curl -X DELETE "$QSTASH_URL/v2/schedules/<scheduleId>" -H "Authorization: Bearer $QSTASH_TOKEN"
```

## Consequences
- Expired orders self-clean within ~60s of timeout.
- QStash retries on 5xx automatically; the handler is idempotent (already-expired orders are excluded by the `eq('status','pending_payment')` filter).
- The cron endpoint is unreachable without a valid QStash signature, so it cannot be DoS'd by drive-by traffic.
- Future scheduled jobs (daily admin recap, abandoned-cart nudge) fit the same pattern: one `/api/cron/<name>` route + one QStash schedule.
