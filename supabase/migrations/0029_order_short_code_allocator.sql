-- Restore the order-code allocator that was applied manually in some
-- environments but never recorded in the migration chain.
--
-- Forward-only / zero-downtime:
-- - Existing orders are untouched.
-- - The first allocation for each tenant starts after its highest persisted
--   T-<number> order code, so this is safe for tenants that already have orders.
-- - INSERT .. ON CONFLICT serializes concurrent allocations per tenant.

create table if not exists public.order_short_code_counters (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  last_value bigint not null check (last_value >= 2401),
  updated_at timestamptz not null default now()
);

alter table public.order_short_code_counters enable row level security;

-- This table is an internal allocator. Application traffic reaches it only
-- through the SECURITY DEFINER function below; no direct PostgREST access.
revoke all on table public.order_short_code_counters from public, anon, authenticated;

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
    and o.short_code ~ '^T-[0-9]{1,6}$'
  on conflict (tenant_id) do update
    set last_value = greatest(
      public.order_short_code_counters.last_value + 1,
      excluded.last_value
    ),
    updated_at = now()
  returning last_value into allocated;

  return 'T-' || lpad(allocated::text, 4, '0');
end;
$$;

revoke all on function public.next_order_short_code(uuid) from public, anon, authenticated;
grant execute on function public.next_order_short_code(uuid) to service_role;

comment on table public.order_short_code_counters is
  'Internal, per-tenant allocator for race-safe human-readable order codes.';
comment on function public.next_order_short_code(uuid) is
  'Allocates a unique T-<number> order code for one tenant. Service-role only.';
