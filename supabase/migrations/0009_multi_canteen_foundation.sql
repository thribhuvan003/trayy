-- Tray — Multi-canteen-per-college foundation
-- Adds: colleges, college_memberships, staff_profiles (PIN kiosk), order_events
-- (append-only Realtime log), platform_admins (private), guest_sessions,
-- enum extensions, operating-hours/pause guard, auto_enroll RPC, verify_staff_pin RPC.

create schema if not exists private;

-- ── Colleges (parent of tenants) ──
create table if not exists public.colleges (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  city            text,
  allowed_domains text[] not null default '{}',
  logo_url        text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Tenants get a college_id + operating hours + pause + zone info.
alter table public.tenants
  add column if not exists college_id           uuid references public.colleges(id) on delete restrict,
  add column if not exists is_open              boolean not null default true,
  add column if not exists opens_at             time,
  add column if not exists closes_at            time,
  add column if not exists paused_until         timestamptz,
  add column if not exists guest_orders_enabled boolean not null default false,
  add column if not exists building             text,
  add column if not exists zone                 text,
  add column if not exists mess_type            text;

create index if not exists tenants_college_idx on public.tenants(college_id);

-- ── College memberships (college_admin → college) ──
create table if not exists public.college_memberships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id, college_id)
);
create index if not exists cm_user_idx    on public.college_memberships(user_id);
create index if not exists cm_college_idx on public.college_memberships(college_id);

-- ── Platform admins (Tray team) — private schema, never exposed to PostgREST ──
create table if not exists private.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create or replace function private.is_platform_admin(uid uuid)
returns boolean
language sql stable security definer
set search_path = private, public, pg_temp
as $$
  select exists (select 1 from private.platform_admins where user_id = uid);
$$;

-- ── Staff profiles (PIN-based kiosk login) ──
create table if not exists public.staff_profiles (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  display_name      text not null,
  pin_hash          text not null,                  -- bcrypt of 4–6 digit PIN
  pin_attempt_count int  not null default 0,
  locked_until      timestamptz,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  unique(tenant_id, user_id)
);
create index if not exists sp_tenant_idx on public.staff_profiles(tenant_id);

-- ── Guest sessions (visitor ordering at canteens with guest_orders_enabled) ──
create table if not exists public.guest_sessions (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  phone       text not null,
  otp_hash    text not null,
  verified    boolean not null default false,
  expires_at  timestamptz not null default (now() + interval '10 minutes'),
  created_at  timestamptz not null default now()
);
create index if not exists gs_tenant_idx on public.guest_sessions(tenant_id);
create index if not exists gs_phone_idx  on public.guest_sessions(tenant_id, phone, created_at desc);

-- ── Order events (append-only log for Realtime) ──
-- Replaces REPLICA IDENTITY FULL on orders. Subscribers listen to inserts here.
create table if not exists public.order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders(id) on delete cascade,
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  event_type text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists oe_order_idx  on public.order_events(order_id);
create index if not exists oe_tenant_idx on public.order_events(tenant_id, created_at desc);

-- ── Enum extensions ──
-- (these must run outside transactions; supabase migrate handles that)
do $$
begin
  begin alter type public.member_role add value if not exists 'college_admin'; exception when others then null; end;
  begin alter type public.order_status add value if not exists 'cancelled_by_kitchen'; exception when others then null; end;
  begin alter type public.order_status add value if not exists 'partially_ready'; exception when others then null; end;
  begin alter type public.order_status add value if not exists 'refunded'; exception when others then null; end;
end$$;

-- ── Operating-hours + pause guard on order insert ──
create or replace function public.guard_canteen_open()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare t record;
begin
  select is_open, opens_at, closes_at, paused_until into t
  from public.tenants where id = new.tenant_id;
  if not t.is_open then
    raise exception 'canteen_closed' using errcode = 'P0001';
  end if;
  if t.paused_until is not null and t.paused_until > now() then
    raise exception 'canteen_paused' using errcode = 'P0001';
  end if;
  if t.opens_at is not null and t.closes_at is not null then
    if localtime not between t.opens_at and t.closes_at then
      raise exception 'canteen_closed' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_canteen_open on public.orders;
create trigger orders_canteen_open
  before insert on public.orders
  for each row execute function public.guard_canteen_open();

-- ── auto_enroll_student: enrolls user in ALL canteens under the email's college ──
create or replace function public.auto_enroll_student()
returns void
language sql security definer
set search_path = public, pg_temp
as $$
  insert into public.tenant_memberships (user_id, tenant_id, role)
  select auth.uid(), t.id, 'student'::public.member_role
  from public.tenants t
  join public.colleges c on t.college_id = c.id
  where c.is_active
    and split_part(lower(coalesce(auth.jwt()->>'email','')), '@', 2) = any(c.allowed_domains)
  on conflict (user_id, tenant_id) do nothing;
$$;
grant execute on function public.auto_enroll_student() to authenticated;

-- ── verify_staff_pin: PIN check with DB-side lockout (survives cold starts) ──
create or replace function public.verify_staff_pin(
  p_tenant_id uuid,
  p_user_id   uuid,
  p_pin       text
) returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  sp record;
begin
  select * into sp from public.staff_profiles
  where tenant_id = p_tenant_id and user_id = p_user_id and is_active;
  if not found then return false; end if;

  if sp.locked_until is not null and sp.locked_until > now() then
    return false;
  end if;

  -- pin_hash uses pgcrypto crypt() with bf algorithm
  if crypt(p_pin, sp.pin_hash) = sp.pin_hash then
    update public.staff_profiles
      set pin_attempt_count = 0, locked_until = null
      where id = sp.id;
    return true;
  end if;

  update public.staff_profiles
    set pin_attempt_count = pin_attempt_count + 1,
        locked_until      = case
          when pin_attempt_count + 1 >= 5 then now() + interval '10 minutes'
          else null
        end
    where id = sp.id;
  return false;
end;
$$;
grant execute on function public.verify_staff_pin(uuid, uuid, text) to authenticated;

-- ── college_canteens: lists all canteens under a college with live status ──
create or replace function public.college_canteens(p_college_slug text)
returns table(
  slug                 text,
  name                 text,
  hero_tagline         text,
  building             text,
  zone                 text,
  mess_type            text,
  is_open              boolean,
  paused_until         timestamptz,
  opens_at             time,
  closes_at            time,
  logo_url             text,
  pending_orders_count bigint
)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select
    t.slug, t.name, t.hero_tagline,
    t.building, t.zone, t.mess_type,
    t.is_open, t.paused_until, t.opens_at, t.closes_at,
    t.logo_url,
    coalesce(count(o.id) filter (where o.status in ('placed','preparing','partially_ready')), 0) as pending_orders_count
  from public.tenants t
  join public.colleges c on t.college_id = c.id
  left join public.orders o on o.tenant_id = t.id and o.placed_at > now() - interval '2 hours'
  where c.slug = p_college_slug
    and t.is_active
    and c.is_active
  group by t.slug, t.name, t.hero_tagline, t.building, t.zone, t.mess_type,
           t.is_open, t.paused_until, t.opens_at, t.closes_at, t.logo_url
  order by t.is_open desc, t.name;
$$;
grant execute on function public.college_canteens(text) to anon, authenticated;
