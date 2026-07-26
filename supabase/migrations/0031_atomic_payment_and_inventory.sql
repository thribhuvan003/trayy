-- Production integrity repair:
-- 1. Capture mutates the existing payment ledger instead of inserting a second
--    row that violates payments.razorpay_order_id UNIQUE.
-- 2. Inventory validates every aggregated cart line before any decrement.
-- 3. Human-readable order codes remain unique after 9,999.
-- 4. Direct-UPI claims stay visibly unverified until kitchen staff confirms
--    receipt in the stall's UPI app.

alter table public.orders
  add column if not exists payment_verified boolean not null default true;

-- A no-screen token cannot safely depend on a student's self-asserted UPI
-- payment. Existing incompatible tenants fall back to the kitchen confirmation
-- flow; the admin action prevents the combination from being saved again.
update public.tenants
set order_mode = 'kitchen_flow'
where order_mode = 'token_prepaid'
  and payment_mode = 'direct_upi';

create or replace function public.next_order_short_code(p_tenant uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allocated bigint;
begin
  if p_tenant is null then
    raise exception 'tenant id is required' using errcode = '22004';
  end if;

  insert into public.order_short_code_counters (tenant_id, last_value)
  select
    p_tenant,
    greatest(
      2401::bigint,
      coalesce(
        max(substring(o.short_code from '^T-([0-9]+)$')::bigint),
        2400::bigint
      ) + 1
    )
  from public.orders o
  where o.tenant_id = p_tenant
  on conflict (tenant_id) do update
    set last_value = greatest(
      public.order_short_code_counters.last_value + 1,
      excluded.last_value
    ),
    updated_at = now()
  returning last_value into allocated;

  return 'T-' || case
    when allocated < 10000 then lpad(allocated::text, 4, '0')
    else allocated::text
  end;
end;
$$;

revoke all on function public.next_order_short_code(uuid) from public, anon, authenticated;
grant execute on function public.next_order_short_code(uuid) to service_role;

create or replace function public.atomic_decrement_stock(
  p_tenant_id uuid,
  p_items jsonb
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_problem text;
begin
  if p_tenant_id is null
     or p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
  then
    return 'invalid_request';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items)
      as item(menu_item_id uuid, qty bigint)
    where item.menu_item_id is null
       or item.qty is null
       or item.qty <= 0
       or item.qty > 2147483647
  ) then
    return 'invalid_request';
  end if;

  -- Lock all existing rows in deterministic order before validation. Duplicate
  -- item ids are aggregated so two lines cannot reserve the same stock twice
  -- without the summed quantity being checked.
  perform 1
  from public.menu_items menu
  join (
    select item.menu_item_id, sum(item.qty)::bigint as qty
    from jsonb_to_recordset(p_items)
      as item(menu_item_id uuid, qty bigint)
    group by item.menu_item_id
  ) requested on requested.menu_item_id = menu.id
  where menu.tenant_id = p_tenant_id
  order by menu.id
  for update of menu;

  with requested as (
    select item.menu_item_id, sum(item.qty)::bigint as qty
    from jsonb_to_recordset(p_items)
      as item(menu_item_id uuid, qty bigint)
    group by item.menu_item_id
  )
  select requested.menu_item_id::text
  into v_problem
  from requested
  left join public.menu_items menu
    on menu.id = requested.menu_item_id
   and menu.tenant_id = p_tenant_id
  where menu.id is null
  order by requested.menu_item_id
  limit 1;
  if found then
    return 'item_not_found:' || v_problem;
  end if;

  with requested as (
    select item.menu_item_id, sum(item.qty)::bigint as qty
    from jsonb_to_recordset(p_items)
      as item(menu_item_id uuid, qty bigint)
    group by item.menu_item_id
  )
  select menu.name
  into v_problem
  from requested
  join public.menu_items menu
    on menu.id = requested.menu_item_id
   and menu.tenant_id = p_tenant_id
  where menu.status <> 'live'
     or not menu.in_stock
     or (menu.stock_qty is not null and menu.stock_qty < requested.qty)
  order by menu.id
  limit 1;
  if found then
    return 'out_of_stock:' || v_problem;
  end if;

  with requested as (
    select item.menu_item_id, sum(item.qty)::bigint as qty
    from jsonb_to_recordset(p_items)
      as item(menu_item_id uuid, qty bigint)
    group by item.menu_item_id
  )
  update public.menu_items menu
  set
    stock_qty = menu.stock_qty - requested.qty::int,
    in_stock = case
      when menu.stock_qty - requested.qty::int = 0 then false
      else menu.in_stock
    end,
    updated_at = now()
  from requested
  where menu.id = requested.menu_item_id
    and menu.tenant_id = p_tenant_id
    and menu.stock_qty is not null;

  return 'ok';
end;
$$;

revoke all on function public.atomic_decrement_stock(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.atomic_decrement_stock(uuid, jsonb) to service_role;

create or replace function public.safe_capture_payment(
  p_order_id uuid,
  p_tenant_id uuid,
  p_razorpay_pid text,
  p_razorpay_oid text,
  p_amount_paise bigint,
  p_raw_event_id text
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.order_status;
  v_total_paise bigint;
  v_payment_id uuid;
begin
  if p_order_id is null
     or p_tenant_id is null
     or p_razorpay_pid is null
     or btrim(p_razorpay_pid) = ''
     or p_razorpay_oid is null
     or btrim(p_razorpay_oid) = ''
     or p_amount_paise is null
     or p_raw_event_id is null
     or btrim(p_raw_event_id) = ''
  then
    raise exception 'capture identifiers and amount are required'
      using errcode = '22004';
  end if;

  select status, total_paise
  into v_status, v_total_paise
  from public.orders
  where id = p_order_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    return 'not_found';
  end if;
  if v_status <> 'pending_payment' then
    return 'already_captured';
  end if;
  if abs(p_amount_paise - v_total_paise) > 1 then
    insert into public.order_events (
      tenant_id, order_id, event_type, payload
    ) values (
      p_tenant_id,
      p_order_id,
      'payment_amount_mismatch',
      jsonb_build_object(
        'expected_paise', v_total_paise,
        'received_paise', p_amount_paise,
        'razorpay_payment_id', p_razorpay_pid,
        'razorpay_order_id', p_razorpay_oid
      )
    );
    return 'amount_mismatch';
  end if;

  update public.payments
  set
    razorpay_payment_id = p_razorpay_pid,
    amount_paise = p_amount_paise,
    status = 'captured',
    raw_event_id = p_raw_event_id
  where tenant_id = p_tenant_id
    and order_id = p_order_id
    and razorpay_order_id = p_razorpay_oid
  returning id into v_payment_id;

  if v_payment_id is null then
    insert into public.payments (
      tenant_id,
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      amount_paise,
      status,
      raw_event_id
    ) values (
      p_tenant_id,
      p_order_id,
      p_razorpay_oid,
      p_razorpay_pid,
      p_amount_paise,
      'captured',
      p_raw_event_id
    )
    returning id into v_payment_id;
  end if;

  update public.orders
  set
    status = 'placed',
    payment_verified = true
  where id = p_order_id
    and tenant_id = p_tenant_id
    and status = 'pending_payment';

  insert into public.order_events (
    tenant_id, order_id, event_type, payload
  ) values (
    p_tenant_id,
    p_order_id,
    'status_changed',
    jsonb_build_object(
      'from', 'pending_payment',
      'to', 'placed',
      'razorpay_payment_id', p_razorpay_pid,
      'amount_paise', p_amount_paise,
      'source', 'payment_captured'
    )
  );

  insert into public.order_status_logs (
    tenant_id, order_id, from_status, to_status, note
  ) values (
    p_tenant_id,
    p_order_id,
    'pending_payment',
    'placed',
    format(
      'Captured via Razorpay webhook. amount=%s paise. pid=%s',
      p_amount_paise,
      p_razorpay_pid
    )
  );

  return 'captured';
end;
$$;

revoke all on function public.safe_capture_payment(uuid, uuid, text, text, bigint, text)
  from public, anon, authenticated;
grant execute on function public.safe_capture_payment(uuid, uuid, text, text, bigint, text)
  to service_role;

create or replace function public.safe_claim_direct_upi(
  p_order_id uuid,
  p_tenant_id uuid,
  p_user_id uuid,
  p_payment_id text,
  p_raw_event_id text
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.order_status;
  v_owner_id uuid;
  v_expires_at timestamptz;
  v_payment_row_id uuid;
begin
  if p_order_id is null
     or p_tenant_id is null
     or p_user_id is null
     or p_payment_id is null
     or btrim(p_payment_id) = ''
     or p_raw_event_id is null
     or btrim(p_raw_event_id) = ''
  then
    raise exception 'direct-UPI claim identifiers are required'
      using errcode = '22004';
  end if;

  select status, user_id, payment_expires_at
  into v_status, v_owner_id, v_expires_at
  from public.orders
  where id = p_order_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    return 'not_found';
  end if;
  if v_owner_id is distinct from p_user_id then
    return 'not_owner';
  end if;
  if v_status <> 'pending_payment' then
    return 'already_processed';
  end if;
  if v_expires_at is not null and v_expires_at <= now() then
    return 'expired';
  end if;

  -- Lock the existing checkout ledger. Historical deployments could have more
  -- than one direct-UPI row, so prefer the initiated checkout row and otherwise
  -- take the newest matching row deterministically.
  select id
  into v_payment_row_id
  from public.payments
  where tenant_id = p_tenant_id
    and order_id = p_order_id
    and razorpay_order_id is null
    and status in ('initiated', 'captured')
  order by (status = 'initiated') desc, created_at desc, id desc
  limit 1
  for update;

  if v_payment_row_id is null then
    return 'payment_not_found';
  end if;

  update public.payments
  set
    status = 'initiated',
    razorpay_payment_id = p_payment_id,
    raw_event_id = p_raw_event_id
  where id = v_payment_row_id
    and tenant_id = p_tenant_id
    and order_id = p_order_id;

  update public.orders
  set
    status = 'placed',
    payment_verified = false
  where id = p_order_id
    and tenant_id = p_tenant_id
    and status = 'pending_payment';

  insert into public.order_events (
    tenant_id, order_id, event_type, payload
  ) values (
    p_tenant_id,
    p_order_id,
    'status_changed',
    jsonb_build_object(
      'from', 'pending_payment',
      'to', 'placed',
      'source', 'upi_trust',
      'upi_unverified', true
    )
  );

  insert into public.order_status_logs (
    tenant_id, order_id, from_status, to_status, actor_user_id, note
  ) values (
    p_tenant_id,
    p_order_id,
    'pending_payment',
    'placed',
    p_user_id,
    'UPI payment claimed by student (UNVERIFIED — staff must confirm in UPI app)'
  );

  return 'claimed';
end;
$$;

revoke all on function public.safe_claim_direct_upi(uuid, uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.safe_claim_direct_upi(uuid, uuid, uuid, text, text)
  to service_role;

create or replace function public.safe_confirm_direct_upi_and_start(
  p_order_id uuid,
  p_tenant_id uuid,
  p_actor_user_id uuid
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.order_status;
  v_payment_verified boolean;
  v_payment_row_id uuid;
begin
  if p_order_id is null
     or p_tenant_id is null
     or p_actor_user_id is null
  then
    raise exception 'direct-UPI confirmation identifiers are required'
      using errcode = '22004';
  end if;

  select status, payment_verified
  into v_status, v_payment_verified
  from public.orders
  where id = p_order_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    return 'not_found';
  end if;
  if v_status <> 'placed' then
    return 'wrong_status:' || v_status::text;
  end if;

  if not v_payment_verified then
    select id
    into v_payment_row_id
    from public.payments
    where tenant_id = p_tenant_id
      and order_id = p_order_id
      and razorpay_order_id is null
      and status = 'initiated'
      and (
        razorpay_payment_id like 'pay_upi_%'
        or razorpay_payment_id like 'pay_sim_%'
      )
    order by created_at desc, id desc
    limit 1
    for update;

    if v_payment_row_id is null then
      return 'unverified_payment_not_found';
    end if;

    update public.payments
    set status = 'captured'
    where id = v_payment_row_id
      and tenant_id = p_tenant_id
      and order_id = p_order_id
      and status = 'initiated';
  end if;

  update public.orders
  set
    status = 'preparing',
    payment_verified = true
  where id = p_order_id
    and tenant_id = p_tenant_id
    and status = 'placed';

  insert into public.order_status_logs (
    tenant_id, order_id, from_status, to_status, actor_user_id, note
  ) values (
    p_tenant_id,
    p_order_id,
    'placed',
    'preparing',
    p_actor_user_id,
    case
      when v_payment_verified then null
      else 'Direct UPI receipt confirmed by kitchen staff'
    end
  );

  insert into public.audit_logs (
    tenant_id, actor_user_id, action, target_type, target_id, meta
  ) values (
    p_tenant_id,
    p_actor_user_id,
    'order.preparing',
    'order',
    p_order_id,
    jsonb_build_object(
      'direct_upi_confirmed',
      not v_payment_verified
    )
  );

  insert into public.order_events (
    tenant_id, order_id, event_type, payload
  ) values (
    p_tenant_id,
    p_order_id,
    'preparing',
    jsonb_build_object(
      'actor', 'kitchen',
      'payment_verified', true,
      'direct_upi_confirmed', not v_payment_verified
    )
  );

  return case
    when v_payment_verified then 'started'
    else 'confirmed_and_started'
  end;
end;
$$;

revoke all on function public.safe_confirm_direct_upi_and_start(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.safe_confirm_direct_upi_and_start(uuid, uuid, uuid)
  to service_role;

create or replace function public.safe_mark_direct_upi_refund_owed(
  p_payment_id uuid,
  p_order_id uuid,
  p_tenant_id uuid
) returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.payment_status;
  v_razorpay_payment_id text;
  v_amount_paise bigint;
  v_refund_id text;
begin
  if p_payment_id is null
     or p_order_id is null
     or p_tenant_id is null
  then
    raise exception 'direct-UPI refund identifiers are required'
      using errcode = '22004';
  end if;

  select status, razorpay_payment_id, amount_paise, refund_id
  into v_status, v_razorpay_payment_id, v_amount_paise, v_refund_id
  from public.payments
  where id = p_payment_id
    and order_id = p_order_id
    and tenant_id = p_tenant_id
  for update;

  if not found then
    return 'not_found';
  end if;
  if v_razorpay_payment_id is null
     or (
       v_razorpay_payment_id not like 'pay_upi_%'
       and v_razorpay_payment_id not like 'pay_sim_%'
     )
  then
    return 'not_direct_upi';
  end if;
  if v_status not in ('initiated', 'captured') then
    return 'not_refundable';
  end if;
  if v_refund_id = 'manual_upi_refund_owed' then
    return 'already_recorded';
  end if;
  if v_refund_id is not null then
    return 'already_refunded';
  end if;

  update public.payments
  set refund_id = 'manual_upi_refund_owed'
  where id = p_payment_id
    and order_id = p_order_id
    and tenant_id = p_tenant_id;

  insert into public.order_events (
    tenant_id, order_id, event_type, payload
  ) values (
    p_tenant_id,
    p_order_id,
    'refund_owed',
    jsonb_build_object(
      'amount_paise', v_amount_paise,
      'payment_id', p_payment_id,
      'reason', 'direct_upi_manual_refund',
      'source', 'initiateRefundForOrder'
    )
  );

  return 'recorded';
end;
$$;

revoke all on function public.safe_mark_direct_upi_refund_owed(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.safe_mark_direct_upi_refund_owed(uuid, uuid, uuid)
  to service_role;
