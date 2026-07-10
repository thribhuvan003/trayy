-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 0028 — Per-tenant tier + order_mode (Street Edition foundation)
--
-- WHY:
-- Tray is expanding beyond campus canteens to street food stalls and tiffin
-- centers. A stall has one operator who cooks with both hands — nobody works a
-- kitchen board. Two per-tenant switches (same pattern as payment_mode, 0024):
--
--   tier        — what kind of outlet this tenant is.
--     'canteen'      (default) full institutional flow, unchanged.
--     'street_stall' lightweight outlet; UI relabels + reduced admin surface.
--
--   order_mode  — how a paid order is handled.
--     'kitchen_flow'  (default) existing pipeline: placed → preparing → ready
--                     → collected, driven from the kitchen board.
--     'token_prepaid' paid ⇒ done. The order lands at 'placed' (existing
--                     auto-capture rails already do this), the customer's
--                     screen shows the order number (short_code) as a counter
--                     token + PAID state, and no further status transitions
--                     are expected. The kitchen queue ignores these orders.
--
-- Also recreates resolve_tenant() to return the two new columns. NOTE: the
-- deployed resolve_tenant had drifted from setup.sql (it already returned
-- college_slug/building/zone/is_open); this definition is the reconciled
-- superset and is mirrored back into setup.sql in the same commit.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.tenants
  add column if not exists tier text not null default 'canteen';

alter table public.tenants
  add column if not exists order_mode text not null default 'kitchen_flow';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_tier_chk'
  ) then
    alter table public.tenants
      add constraint tenants_tier_chk
      check (tier in ('canteen', 'street_stall'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'tenants_order_mode_chk'
  ) then
    alter table public.tenants
      add constraint tenants_order_mode_chk
      check (order_mode in ('kitchen_flow', 'token_prepaid'));
  end if;
end$$;

comment on column public.tenants.tier is
  'Outlet kind. canteen (default): institutional canteen/mess, full portal set.
   street_stall: single-operator street stall / tiffin center; UI relabels and
   the admin surface simplifies. Coarse switch — flow behaviour is order_mode.';

comment on column public.tenants.order_mode is
  'How paid orders are handled. kitchen_flow (default): existing board pipeline
   placed→preparing→ready→collected. token_prepaid: paid ⇒ auto-confirmed at
   placed; customer shows short_code as the counter token; no kitchen actions,
   no further transitions. Reuses the existing capture rails unchanged.';

-- resolve_tenant returns two more columns → return type changes → drop first.
drop function if exists public.resolve_tenant(text);

create function public.resolve_tenant(p_slug text)
returns table (
  id uuid, slug text, name text, college_name text,
  hero_tagline text, logo_url text, allowed_domain text,
  upi_vpa text, is_active boolean, college_slug text,
  building text, zone text, is_open boolean,
  tier text, order_mode text
)
language sql security definer set search_path = public as $$
  select t.id, t.slug, t.name, t.college_name, t.hero_tagline, t.logo_url,
         t.allowed_domain, t.upi_vpa, t.is_active, c.slug as college_slug,
         t.building, t.zone, t.is_open, t.tier, t.order_mode
    from public.tenants t
    left join public.colleges c on c.id = t.college_id
   where t.slug = p_slug and t.is_active
   limit 1;
$$;
grant execute on function public.resolve_tenant(text) to anon, authenticated;

-- Existing rows already received defaults from the NOT NULL DEFAULTs above.
