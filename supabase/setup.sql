-- ============================================================================
-- Tray — one-shot setup script
-- ============================================================================
-- Paste this whole file into the Supabase SQL editor for project
-- xcuybxcfxvreppfaczsg (or any new project) and run once. It bundles
-- migrations 0001 through 0006 into a single transaction-safe script.
--
-- What it does:
--   1. Extensions + helpers (pgcrypto, pg_trgm, current_tenant_id()).
--   2. Enums (member_role, menu_item_status, diet, order_status,
--      payment_status, order_type).
--   3. Tables (tenants, tenant_memberships, menu_categories, menu_items,
--      orders, order_items, payments, order_status_logs, staff_invites,
--      audit_logs, pickup_secrets).
--   4. RLS policies (multi-tenant isolation; cross-tenant order injection
--      closed; pickup_secrets is unreadable via PostgREST).
--   5. Realtime publication for orders, order_status_logs, menu_items.
--   6. Triggers + helper functions (touch_updated_at, next_order_short_code
--      via per-tenant sequence, resolve_tenant, read_my_pickup_otp,
--      pre_request_set_tenant tied to PostgREST).
--   7. Seed data: one demo tenant (aditya) + 4 categories + 12 menu items.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ── current tenant from a session variable set by the PostgREST hook ──
create or replace function public.current_tenant_id() returns uuid
language sql stable as $$
  select nullif(current_setting('app.current_tenant', true), '')::uuid;
$$;

-- ── Enums ──
do $$ begin
  create type public.member_role as enum ('student','kitchen_staff','canteen_admin','super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.menu_item_status as enum ('draft','live','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diet as enum ('veg','nonveg','egg');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending_payment','placed','preparing','ready','collected','rejected','expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('initiated','captured','failed','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_type as enum ('takeaway','dine_in');
exception when duplicate_object then null; end $$;

-- ── Tables ──
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  college_name text not null,
  allowed_domain text,
  logo_url text,
  hero_tagline text,
  upi_vpa text,
  razorpay_key_id_enc text,
  razorpay_key_secret_enc text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.member_role not null,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, tenant_id)
);
create index if not exists tm_user_idx on public.tenant_memberships(user_id);
create index if not exists tm_tenant_idx on public.tenant_memberships(tenant_id);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists mc_tenant_idx on public.menu_categories(tenant_id);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price_paise int not null check (price_paise >= 0),
  diet public.diet not null default 'veg',
  image_url text,
  status public.menu_item_status not null default 'live',
  prep_target_seconds int not null default 480,
  in_stock boolean not null default true,
  stock_qty int,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mi_tenant_idx on public.menu_items(tenant_id);
create index if not exists mi_status_idx on public.menu_items(tenant_id, status);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  short_code text not null,
  status public.order_status not null default 'pending_payment',
  total_paise int not null check (total_paise >= 0),
  otp_hash text,
  otp_attempts int not null default 0,
  customer_name text,
  customer_phone text,
  notes text,
  placed_at timestamptz not null default now(),
  ready_at timestamptz,
  collected_at timestamptz,
  payment_expires_at timestamptz,
  order_type public.order_type not null default 'takeaway',
  table_label text,
  created_at timestamptz not null default now()
);
create unique index if not exists orders_tenant_short_idx
  on public.orders(tenant_id, short_code);
create index if not exists orders_status_idx on public.orders(tenant_id, status);
create index if not exists orders_user_idx on public.orders(user_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name_snapshot text not null,
  price_paise_snapshot int not null,
  diet_snapshot public.diet not null,
  qty int not null check (qty > 0)
);
create index if not exists oi_order_idx on public.order_items(order_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  amount_paise int not null,
  status public.payment_status not null default 'initiated',
  raw_event_id text unique,
  created_at timestamptz not null default now()
);
create index if not exists pay_order_idx on public.payments(order_id);

create table if not exists public.order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists osl_order_idx on public.order_status_logs(order_id);

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role public.member_role not null,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists si_tenant_idx on public.staff_invites(tenant_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists al_tenant_idx on public.audit_logs(tenant_id);

create table if not exists public.pickup_secrets (
  order_id uuid primary key references public.orders(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  otp_plain text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- ── RLS ──
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
-- pickup_secrets has NO policies → PostgREST denies all access; service-role bypasses.

create policy "tenants_select_self" on public.tenants for select
  using ( id = public.current_tenant_id() );

create policy "memberships_self_read" on public.tenant_memberships for select
  using ( user_id = auth.uid() or tenant_id = public.current_tenant_id() );

create policy "memberships_admin_write" on public.tenant_memberships for all
  using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid()
        and m.tenant_id = public.current_tenant_id()
        and m.role in ('canteen_admin','super_admin')
        and m.is_active
    )
  )
  with check ( tenant_id = public.current_tenant_id() );

create policy "menu_cat_read" on public.menu_categories for select
  using ( tenant_id = public.current_tenant_id() );
create policy "menu_cat_admin" on public.menu_categories for all
  using (
    tenant_id = public.current_tenant_id() and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid() and m.tenant_id = public.current_tenant_id()
        and m.role in ('canteen_admin','super_admin','kitchen_staff') and m.is_active
    )
  )
  with check ( tenant_id = public.current_tenant_id() );

create policy "menu_items_read" on public.menu_items for select
  using ( tenant_id = public.current_tenant_id() );
create policy "menu_items_admin" on public.menu_items for all
  using (
    tenant_id = public.current_tenant_id() and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid() and m.tenant_id = public.current_tenant_id()
        and m.role in ('canteen_admin','super_admin','kitchen_staff') and m.is_active
    )
  )
  with check ( tenant_id = public.current_tenant_id() );

create policy "orders_owner_read" on public.orders for select
  using (
    tenant_id = public.current_tenant_id() and (
      user_id = auth.uid()
      or exists (
        select 1 from public.tenant_memberships m
        where m.user_id = auth.uid() and m.tenant_id = public.current_tenant_id()
          and m.role in ('kitchen_staff','canteen_admin','super_admin') and m.is_active
      )
    )
  );

-- Hardened: caller must hold a membership in the claimed tenant.
create policy "orders_insert_owner" on public.orders for insert
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

create policy "orders_update_staff" on public.orders for update
  using (
    tenant_id = public.current_tenant_id() and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid() and m.tenant_id = public.current_tenant_id()
        and m.role in ('kitchen_staff','canteen_admin','super_admin') and m.is_active
    )
  )
  with check ( tenant_id = public.current_tenant_id() );

create policy "order_items_read" on public.order_items for select
  using (
    tenant_id = public.current_tenant_id() and exists (
      select 1 from public.orders o where o.id = order_id and (
        o.user_id = auth.uid() or exists (
          select 1 from public.tenant_memberships m
          where m.user_id = auth.uid() and m.tenant_id = public.current_tenant_id()
            and m.role in ('kitchen_staff','canteen_admin','super_admin') and m.is_active
        )
      )
    )
  );
create policy "order_items_insert" on public.order_items for insert
  with check ( tenant_id = public.current_tenant_id() );

create policy "payments_read" on public.payments for select
  using (
    tenant_id = public.current_tenant_id() and exists (
      select 1 from public.orders o where o.id = order_id and (
        o.user_id = auth.uid() or exists (
          select 1 from public.tenant_memberships m
          where m.user_id = auth.uid() and m.tenant_id = public.current_tenant_id()
            and m.role in ('canteen_admin','super_admin') and m.is_active
        )
      )
    )
  );

create policy "osl_read" on public.order_status_logs for select
  using (
    tenant_id = public.current_tenant_id() and exists (
      select 1 from public.orders o where o.id = order_id and (
        o.user_id = auth.uid() or exists (
          select 1 from public.tenant_memberships m
          where m.user_id = auth.uid() and m.tenant_id = public.current_tenant_id()
            and m.role in ('kitchen_staff','canteen_admin','super_admin') and m.is_active
        )
      )
    )
  );

create policy "invites_admin" on public.staff_invites for all
  using (
    tenant_id = public.current_tenant_id() and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid() and m.tenant_id = public.current_tenant_id()
        and m.role in ('canteen_admin','super_admin') and m.is_active
    )
  )
  with check ( tenant_id = public.current_tenant_id() );

create policy "audit_admin_read" on public.audit_logs for select
  using (
    tenant_id = public.current_tenant_id() and exists (
      select 1 from public.tenant_memberships m
      where m.user_id = auth.uid() and m.tenant_id = public.current_tenant_id()
        and m.role in ('canteen_admin','super_admin') and m.is_active
    )
  );

-- ── Realtime ──
do $$
begin
  begin alter publication supabase_realtime add table public.orders; exception when others then null; end;
  begin alter publication supabase_realtime add table public.order_status_logs; exception when others then null; end;
  begin alter publication supabase_realtime add table public.menu_items; exception when others then null; end;
end $$;

-- ── Triggers + helper functions ──
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists menu_items_touch on public.menu_items;
create trigger menu_items_touch before update on public.menu_items
for each row execute function public.touch_updated_at();

-- Race-free per-tenant sequence-backed short code.
create or replace function public.next_order_short_code(p_tenant uuid) returns text
language plpgsql as $$
declare
  seq_name text := 'short_code_' || replace(p_tenant::text, '-', '_');
  next_val bigint;
begin
  execute format('create sequence if not exists %I start with 2401', seq_name);
  execute format('select nextval(%L)', seq_name) into next_val;
  return 'T-' || lpad(next_val::text, 4, '0');
end $$;

create or replace function public.resolve_tenant(p_slug text)
returns table (
  id uuid, slug text, name text, college_name text,
  hero_tagline text, logo_url text, allowed_domain text,
  upi_vpa text, is_active boolean
)
language sql security definer set search_path = public as $$
  select id, slug, name, college_name, hero_tagline, logo_url, allowed_domain, upi_vpa, is_active
    from public.tenants where slug = p_slug and is_active limit 1;
$$;
grant execute on function public.resolve_tenant(text) to anon, authenticated;

-- Owner-only OTP plaintext read; pickup_secrets is otherwise inaccessible.
create or replace function public.read_my_pickup_otp(p_order uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare v_otp text;
begin
  select s.otp_plain into v_otp
  from public.pickup_secrets s
  join public.orders o on o.id = s.order_id
  where s.order_id = p_order
    and o.user_id = auth.uid()
    and o.status = 'ready'
    and s.expires_at > now();
  return v_otp;
end $$;
revoke all on function public.read_my_pickup_otp(uuid) from public;
grant execute on function public.read_my_pickup_otp(uuid) to authenticated;

-- PostgREST pre_request hook: read x-tenant-id header into session var so RLS
-- can key off current_tenant_id().
create or replace function public.pre_request_set_tenant() returns void
language plpgsql as $$
declare tid text;
begin
  select coalesce(current_setting('request.headers', true)::jsonb->>'x-tenant-id', '')
    into tid;
  if tid <> '' then
    perform set_config('app.current_tenant', tid, true);
  end if;
end $$;

alter role authenticator set pgrst.db_pre_request = 'public.pre_request_set_tenant';
notify pgrst, 'reload config';

-- ── Seed ──
insert into public.tenants (slug, name, college_name, allowed_domain, hero_tagline, upi_vpa)
values (
  'aditya', 'Aditya Canteen', 'Aditya Engineering College',
  'aec.edu.in',
  'Skip the line. Eat sooner.',
  'aditya@upi'
) on conflict (slug) do nothing;

with t as (select id from public.tenants where slug='aditya')
insert into public.menu_categories (tenant_id, name, sort_order)
select t.id, c.name, c.so from t,
  (values ('Mains', 1), ('Snacks', 2), ('Beverages', 3), ('Specials', 4)) as c(name, so)
on conflict do nothing;

with t as (select id from public.tenants where slug='aditya'),
     cat as (
       select id, name from public.menu_categories
       where tenant_id = (select id from t)
     )
insert into public.menu_items
  (tenant_id, category_id, name, description, price_paise, diet, prep_target_seconds, sort_order)
select (select id from t),
       (select id from cat where cat.name = m.cat),
       m.name, m.descr, m.price, m.diet::public.diet, m.prep, m.sort
from (values
  ('Mains','Chicken Biryani','Aged basmati, slow-cooked chicken, raita on the side', 18000, 'nonveg', 540, 1),
  ('Mains','Veg Biryani','Hyderabadi-style with caramelised onion and saffron',     14000, 'veg',    480, 2),
  ('Mains','Paneer Butter Masala','Creamy tomato gravy, butter-roasted paneer',     16000, 'veg',    420, 3),
  ('Mains','Masala Dosa','Crisp lentil-rice crepe, potato curry, three chutneys',   9000,  'veg',    360, 4),
  ('Mains','Veg Thali','Two curries, dal, rice, roti, salad, sweet',                12000, 'veg',    300, 5),
  ('Mains','Mutton Curry','Goan-style, dark and slow',                              22000, 'nonveg', 600, 6),
  ('Snacks','Samosa (2 pc)','Hand-folded, served hot with tamarind chutney',        4000,  'veg',    180, 7),
  ('Snacks','Vada Pav','Mumbai bun with spiced potato fritter',                     5000,  'veg',    240, 8),
  ('Beverages','Filter Coffee','South Indian decoction, hot, frothy',               3000,  'veg',    180, 9),
  ('Beverages','Masala Chai','Strong, gingery, sweet',                              2500,  'veg',    180, 10),
  ('Beverages','Fresh Lime Soda','Sweet, salt, or mixed',                           4000,  'veg',    120, 11),
  ('Specials','Hyderabadi Mandi','Tuesday special, slow-roasted lamb',              28000, 'nonveg', 720, 12)
) as m(cat, name, descr, price, diet, prep, sort);
