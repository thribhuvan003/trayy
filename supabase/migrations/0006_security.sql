-- Tray security/bootstrap migration.
--
-- This body was originally applied directly through the Supabase MCP but the
-- repository contained only a comment placeholder. Keep the historical version
-- complete so a fresh `supabase db push` can reach the later forward migrations.

do $$ begin
  create type public.order_type as enum ('takeaway', 'dine_in');
exception when duplicate_object then null; end $$;

alter table public.orders
  add column if not exists order_type public.order_type not null default 'takeaway',
  add column if not exists table_label text;

create table if not exists public.pickup_secrets (
  order_id uuid primary key references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  otp_plain text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_logs enable row level security;
alter table public.staff_invites enable row level security;
alter table public.audit_logs enable row level security;
alter table public.pickup_secrets enable row level security;

drop policy if exists tenants_select_self on public.tenants;
create policy tenants_select_self on public.tenants for select
  using (id = public.current_tenant_id());

drop policy if exists memberships_self_read on public.tenant_memberships;
create policy memberships_self_read on public.tenant_memberships for select
  using (user_id = auth.uid() or tenant_id = public.current_tenant_id());

drop policy if exists memberships_admin_write on public.tenant_memberships;
create policy memberships_admin_write on public.tenant_memberships for all
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = public.current_tenant_id()
        and m.role in ('canteen_admin', 'super_admin')
        and m.is_active
    )
  )
  with check (tenant_id = public.current_tenant_id());

drop policy if exists menu_cat_read on public.menu_categories;
create policy menu_cat_read on public.menu_categories for select
  using (tenant_id = public.current_tenant_id());

drop policy if exists menu_cat_admin on public.menu_categories;
create policy menu_cat_admin on public.menu_categories for all
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = public.current_tenant_id()
        and m.role in ('canteen_admin', 'super_admin', 'kitchen_staff')
        and m.is_active
    )
  )
  with check (tenant_id = public.current_tenant_id());

drop policy if exists menu_items_read on public.menu_items;
create policy menu_items_read on public.menu_items for select
  using (tenant_id = public.current_tenant_id());

drop policy if exists menu_items_admin on public.menu_items;
create policy menu_items_admin on public.menu_items for all
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = public.current_tenant_id()
        and m.role in ('canteen_admin', 'super_admin', 'kitchen_staff')
        and m.is_active
    )
  )
  with check (tenant_id = public.current_tenant_id());

drop policy if exists orders_owner_read on public.orders;
create policy orders_owner_read on public.orders for select
  using (
    tenant_id = public.current_tenant_id()
    and (
      user_id = auth.uid()
      or exists (
        select 1 from public.tenant_memberships m
        where m.user_id = auth.uid()
          and m.tenant_id = public.current_tenant_id()
          and m.role in ('kitchen_staff', 'canteen_admin', 'super_admin')
          and m.is_active
      )
    )
  );

drop policy if exists orders_insert_owner on public.orders;
create policy orders_insert_owner on public.orders for insert
  with check (
    tenant_id = public.current_tenant_id()
    and user_id = auth.uid()
    and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = public.current_tenant_id()
        and m.is_active
    )
  );

drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff on public.orders for update
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = public.current_tenant_id()
        and m.role in ('kitchen_staff', 'canteen_admin', 'super_admin')
        and m.is_active
    )
  )
  with check (tenant_id = public.current_tenant_id());

drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items for select
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or exists (
            select 1 from public.tenant_memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = public.current_tenant_id()
              and m.role in ('kitchen_staff', 'canteen_admin', 'super_admin')
              and m.is_active
          )
        )
    )
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items for insert
  with check (tenant_id = public.current_tenant_id());

drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or exists (
            select 1 from public.tenant_memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = public.current_tenant_id()
              and m.role in ('canteen_admin', 'super_admin')
              and m.is_active
          )
        )
    )
  );

drop policy if exists osl_read on public.order_status_logs;
create policy osl_read on public.order_status_logs for select
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.user_id = auth.uid()
          or exists (
            select 1 from public.tenant_memberships m
            where m.user_id = auth.uid()
              and m.tenant_id = public.current_tenant_id()
              and m.role in ('kitchen_staff', 'canteen_admin', 'super_admin')
              and m.is_active
          )
        )
    )
  );

drop policy if exists invites_admin on public.staff_invites;
create policy invites_admin on public.staff_invites for all
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = public.current_tenant_id()
        and m.role in ('canteen_admin', 'super_admin')
        and m.is_active
    )
  )
  with check (tenant_id = public.current_tenant_id());

drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs for select
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = public.current_tenant_id()
        and m.role in ('canteen_admin', 'super_admin')
        and m.is_active
    )
  );

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists menu_items_touch on public.menu_items;
create trigger menu_items_touch
before update on public.menu_items
for each row execute function public.touch_updated_at();

-- Historical allocator required by migration 0008. Migration 0029 replaces it
-- with the counter-table implementation and migration 0031 fixes wide codes.
create or replace function public.next_order_short_code(p_tenant uuid)
returns text
language plpgsql
as $$
declare
  seq_name text := 'short_code_' || replace(p_tenant::text, '-', '_');
  next_val bigint;
begin
  execute format('create sequence if not exists %I start with 2401', seq_name);
  execute format('select nextval(%L)', seq_name) into next_val;
  return 'T-' || lpad(next_val::text, 4, '0');
end;
$$;

create or replace function public.resolve_tenant(p_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  college_name text,
  hero_tagline text,
  logo_url text,
  allowed_domain text,
  upi_vpa text,
  is_active boolean
)
language sql
security definer
set search_path = public
as $$
  select
    t.id, t.slug, t.name, t.college_name, t.hero_tagline, t.logo_url,
    t.allowed_domain, t.upi_vpa, t.is_active
  from public.tenants t
  where t.slug = p_slug and t.is_active
  limit 1;
$$;
grant execute on function public.resolve_tenant(text) to anon, authenticated;

create or replace function public.read_my_pickup_otp(p_order uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_otp text;
begin
  select s.otp_plain into v_otp
  from public.pickup_secrets s
  join public.orders o on o.id = s.order_id
  where s.order_id = p_order
    and o.user_id = auth.uid()
    and o.status = 'ready'
    and s.expires_at > now();
  return v_otp;
end;
$$;
revoke all on function public.read_my_pickup_otp(uuid) from public;
grant execute on function public.read_my_pickup_otp(uuid) to authenticated;

-- Historical pre-request definition required by migration 0008. Migration 0023
-- replaces it with the hardened header parser.
create or replace function public.pre_request_set_tenant()
returns void
language plpgsql
as $$
declare
  tid text;
begin
  select coalesce(
    current_setting('request.headers', true)::jsonb->>'x-tenant-id',
    ''
  ) into tid;
  if tid <> '' then
    perform set_config('app.current_tenant', tid, true);
  end if;
end;
$$;

alter role authenticator
  set pgrst.db_pre_request = 'public.pre_request_set_tenant';
notify pgrst, 'reload config';
