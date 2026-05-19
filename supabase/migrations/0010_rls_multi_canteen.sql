-- Tray — RLS for multi-canteen foundation tables.
-- Locks colleges, college_memberships, staff_profiles, guest_sessions, order_events.

-- ── Colleges: authenticated read only ──
-- Hides allowed_domains[] from anonymous crawlers (spear-phishing surface).
alter table public.colleges enable row level security;
drop policy if exists "colleges_auth_read" on public.colleges;
create policy "colleges_auth_read" on public.colleges
  for select using (is_active and auth.uid() is not null);

-- ── College memberships: user reads their own rows ──
alter table public.college_memberships enable row level security;
drop policy if exists "cm_self_read" on public.college_memberships;
create policy "cm_self_read" on public.college_memberships
  for select using (user_id = auth.uid());

-- ── Tenants: college_admin sees their college's canteens ──
-- (Existing tenant policies remain; this adds a second SELECT path.)
drop policy if exists "tenants_college_admin_read" on public.tenants;
create policy "tenants_college_admin_read" on public.tenants
  for select using (
    college_id in (
      select college_id from public.college_memberships
      where user_id = auth.uid() and is_active
    )
  );

-- ── Staff profiles: tenant-scoped, admin writes ──
alter table public.staff_profiles enable row level security;

drop policy if exists "sp_tenant_read" on public.staff_profiles;
create policy "sp_tenant_read" on public.staff_profiles
  for select using (tenant_id = public.current_tenant_id());

drop policy if exists "sp_admin_write" on public.staff_profiles;
create policy "sp_admin_write" on public.staff_profiles
  for all using (
    tenant_id = public.current_tenant_id()
    and public.is_tenant_admin(public.current_tenant_id())
  );

-- ── Guest sessions: no PostgREST access (service role only via SECURITY DEFINER) ──
alter table public.guest_sessions enable row level security;
drop policy if exists "gs_deny" on public.guest_sessions;
create policy "gs_deny" on public.guest_sessions for all using (false);

-- ── Order events: tenant-scoped read, insert via SECURITY DEFINER server actions ──
alter table public.order_events enable row level security;

drop policy if exists "oe_tenant_read" on public.order_events;
create policy "oe_tenant_read" on public.order_events
  for select using (tenant_id = public.current_tenant_id());

drop policy if exists "oe_tenant_insert" on public.order_events;
create policy "oe_tenant_insert" on public.order_events
  for insert with check (tenant_id = public.current_tenant_id());
