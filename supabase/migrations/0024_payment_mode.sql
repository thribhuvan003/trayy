-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 0024 — Per-tenant payment_mode (the core money-flow fix)
--
-- ROOT CAUSE this fixes:
-- Payment behaviour was switched globally by featureFlags.razorpayLive (i.e. "do
-- Razorpay keys exist in env?"). The moment live keys were set, EVERY tenant was
-- forced down the Razorpay-capture path — but the app collects money via a raw
-- `upi://pay` deep link straight to the canteen's own VPA, which never goes
-- through Razorpay. Result: money debited from the student, Razorpay never sees
-- it, order stuck on pending_payment forever → kitchen never gets the order.
--
-- FIX: decide payment behaviour PER TENANT, not globally.
--   'direct_upi'  — student pays the canteen's UPI VPA directly (instant to the
--                   canteen's bank). Server cannot auto-verify a P2P UPI transfer,
--                   so the order enters the queue flagged UNVERIFIED and the
--                   pickup OTP + staff's own UPI-app glance is the verification.
--                   This is the default — it matches "admin just adds a UPI ID".
--   'razorpay'    — money flows THROUGH Razorpay (gateway). The existing webhook /
--                   safe_capture_payment / reconcile machinery auto-confirms.
--                   Gateway-ready: a canteen flips to this with no rewrite.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.tenants
  add column if not exists payment_mode text not null default 'direct_upi';

-- Constrain to the two supported rails. Named constraint so it's droppable later.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_payment_mode_chk'
  ) then
    alter table public.tenants
      add constraint tenants_payment_mode_chk
      check (payment_mode in ('direct_upi', 'razorpay'));
  end if;
end$$;

comment on column public.tenants.payment_mode is
  'Authoritative per-tenant payment rail. direct_upi (default): student pays the
   canteen VPA directly, instant to bank, order enters queue UNVERIFIED, verified
   at the counter via pickup OTP + staff UPI-app glance (no programmatic capture
   is possible for a raw P2P UPI transfer). razorpay: money flows through Razorpay
   and is auto-captured by the webhook / reconcile cron. Replaces the old global
   featureFlags.razorpayLive switch for all payment-behaviour decisions.';

-- Existing rows already received 'direct_upi' from the NOT NULL DEFAULT above.
