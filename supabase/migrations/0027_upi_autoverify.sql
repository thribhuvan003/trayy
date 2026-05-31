-- Migration 0027 — Direct-UPI auto-verify (money-arrival listener)
-- Adds: per-order unique paise tag, per-tenant listener secret + toggle,
-- upi_credit_events ledger, and safe_capture_upi_credit RPC.
-- direct_upi rail only. Razorpay path untouched.

-- 1. Per-order uniqueness tag (1-99). NULL = legacy/no tag.
alter table public.orders
  add column if not exists upi_verify_paise smallint;

comment on column public.orders.upi_verify_paise is
  'Direct-UPI auto-verify: 1-99 paise added to total_paise so the order has a
   unique final amount among the tenant''s pending orders. Used to match the
   counter phone UPI notification to this exact order. NULL = no tag (legacy or
   collision fallback).';

-- 2. Per-tenant listener config.
alter table public.tenants
  add column if not exists upi_listener_secret text;
alter table public.tenants
  add column if not exists upi_autoverify_enabled boolean not null default false;

comment on column public.tenants.upi_listener_secret is
  'Shared secret the counter-phone automation (MacroDroid) sends in the
   x-tray-upi-secret header to POST /api/webhooks/upi-credit. Rotatable.';
comment on column public.tenants.upi_autoverify_enabled is
  'When true, the direct_upi pay flow waits for listener confirmation instead of
   the student self-confirming. Default false (behaviour unchanged).';

-- 3. Incoming UPI credit ledger (idempotency + admin audit + unmatched view).
create table if not exists public.upi_credit_events (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  raw_text        text not null,
  package         text,
  parsed_paise    integer,
  received_at     timestamptz,
  matched_order_id uuid references public.orders(id) on delete set null,
  status          text not null check (status in ('matched','unmatched','unparsed','duplicate')),
  dedup_hash      text not null,
  created_at      timestamptz not null default now(),
  constraint upi_credit_events_dedup_unique unique (tenant_id, dedup_hash)
);

create index if not exists upi_credit_events_tenant_created_idx
  on public.upi_credit_events (tenant_id, created_at desc);

-- 4. Fast matcher lookup: pending orders by tenant + status.
create index if not exists orders_tenant_status_pending_idx
  on public.orders (tenant_id, status)
  where status = 'pending_payment';

-- 5. RLS: service role does everything; tenant admins read their own rows.
alter table public.upi_credit_events enable row level security;

drop policy if exists upi_credit_events_admin_read on public.upi_credit_events;
create policy upi_credit_events_admin_read
  on public.upi_credit_events for select
  using (
    exists (
      select 1 from public.tenant_memberships m
      where m.tenant_id = upi_credit_events.tenant_id
        and m.user_id = auth.uid()
        and m.is_active = true
        and m.role in ('canteen_admin','super_admin')
    )
  );

-- 6. safe_capture_upi_credit — atomic, idempotent confirm for a listener-matched order.
-- Mirrors safe_capture_payment but: source='upi_listener', validates the credited
-- amount equals the order's expected final amount (total_paise + verify tag).
create or replace function public.safe_capture_upi_credit(
  p_order_id     uuid,
  p_tenant_id    uuid,
  p_amount_paise bigint,
  p_raw_event_id text
) returns text   -- 'captured' | 'already_captured' | 'not_found' | 'amount_mismatch'
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status   text;
  v_order_id uuid;
  v_expected bigint;
begin
  select id, status, (total_paise + coalesce(upi_verify_paise, 0))
    into v_order_id, v_status, v_expected
  from orders
  where id = p_order_id
    and tenant_id = p_tenant_id
  for update;

  if v_order_id is null then
    return 'not_found';
  end if;

  if v_status <> 'pending_payment' then
    return 'already_captured';
  end if;

  if p_amount_paise <> v_expected then
    return 'amount_mismatch';
  end if;

  -- razorpay_payment_id stays null: this is a direct-UPI capture, not a gateway
  -- payment. Setting it to a non-null sentinel would (a) pollute the Razorpay-only
  -- UNIQUE column and (b) make initiateRefundForOrder misclassify this as a
  -- gateway payment and attempt a doomed Razorpay API refund. Idempotency is
  -- carried entirely by raw_event_id.
  insert into payments (tenant_id, order_id, razorpay_order_id, razorpay_payment_id, amount_paise, status, raw_event_id)
  values (p_tenant_id, p_order_id, null, null, p_amount_paise, 'captured', p_raw_event_id)
  on conflict (raw_event_id) do nothing;

  update orders
  set status = 'placed'
  where id = p_order_id
    and tenant_id = p_tenant_id
    and status = 'pending_payment';

  insert into order_events (tenant_id, order_id, event_type, payload)
  values (
    p_tenant_id, p_order_id, 'status_changed',
    jsonb_build_object('from','pending_payment','to','placed','source','upi_listener','verified',true)
  );

  insert into order_status_logs (tenant_id, order_id, from_status, to_status, note)
  values (
    p_tenant_id, p_order_id,
    'pending_payment'::public.order_status, 'placed'::public.order_status,
    'Auto-verified via UPI listener'
  );

  return 'captured';
end;
$$;

comment on function public.safe_capture_upi_credit is
  'Atomic auto-verify for a listener-matched direct-UPI order: FOR UPDATE lock +
   amount check (total_paise + upi_verify_paise) + payments upsert + orders status
   + order_events INSERT (source=upi_listener, verified=true) + order_status_logs.';
