-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 0018: Payments refund_id column + idempotency_keys TTL cleanup
--
-- P1-9: Store Razorpay refund_id atomically with the refund status transition.
--   The reconcile cron queries WHERE refund_id IS NULL so a payment whose
--   refund was initiated (Razorpay API succeeded) but whose DB status update
--   failed cannot be retried indefinitely. The refund_id is proof that Razorpay
--   already processed it.
--
-- P2-7: Nightly cleanup of expired idempotency keys prevents unbounded growth.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add refund_id to payments table
alter table public.payments
  add column if not exists refund_id text;

-- Index for the refund cron query (WHERE status='captured' AND refund_id IS NULL)
create index if not exists payments_refund_pending_idx
  on public.payments (order_id)
  where status = 'captured' and refund_id is null;


-- 2. Nightly idempotency_keys TTL cleanup (P2-7)
-- Runs as a pg_cron job every night at 02:00 IST (20:30 UTC).
-- Prevents the table growing unbounded — keys older than 24h are safe to purge
-- since the 5-second bucket guarantee has long since expired.
-- Note: pg_cron must be enabled in Supabase (it is by default on Pro/Team).
-- If not enabled, this is a no-op and the cleanup can be done from the reconcile cron instead.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'cleanup-idempotency-keys',
      '30 20 * * *',  -- 02:00 IST daily
      $$delete from public.idempotency_keys where created_at < now() - interval '24 hours'$$
    );
  end if;
end $$;
