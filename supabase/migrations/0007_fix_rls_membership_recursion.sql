-- Fix infinite recursion in RLS policies that check tenant_memberships.
--
-- The old policies embedded `EXISTS (SELECT 1 FROM tenant_memberships ...)`
-- directly in the policy USING/WITH CHECK clauses. RLS on tenant_memberships
-- then re-fired on the inner query, looping until Postgres bailed with
-- `42P17: infinite recursion detected in policy for relation "tenant_memberships"`.
-- Every read of menu_items (which has both a read and an admin policy)
-- evaluated the recursive admin one and returned 0 rows, breaking the menu.
--
-- Fix: wrap the membership check in SECURITY DEFINER helpers. They run as the
-- function owner, which bypasses RLS on tenant_memberships, breaking the
-- cycle. Helpers are STABLE so the planner can fold them.

create or replace function public.is_tenant_member(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tenant_memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = p_tenant
      and m.is_active
  );
$$;

create or replace function public.is_tenant_staff(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tenant_memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = p_tenant
      and m.is_active
      and m.role in ('kitchen_staff','canteen_admin','super_admin')
  );
$$;

create or replace function public.is_tenant_admin(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tenant_memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = p_tenant
      and m.is_active
      and m.role in ('canteen_admin','super_admin')
  );
$$;

revoke all on function public.is_tenant_member(uuid) from public;
revoke all on function public.is_tenant_staff(uuid)  from public;
revoke all on function public.is_tenant_admin(uuid)  from public;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.is_tenant_staff(uuid)  to authenticated;
grant execute on function public.is_tenant_admin(uuid)  to authenticated;

drop policy if exists memberships_admin_write on public.tenant_memberships;
create policy memberships_admin_write on public.tenant_memberships
for all
using (tenant_id = current_tenant_id() and public.is_tenant_admin(current_tenant_id()))
with check (tenant_id = current_tenant_id());

drop policy if exists menu_cat_admin on public.menu_categories;
create policy menu_cat_admin on public.menu_categories
for all
using (tenant_id = current_tenant_id() and public.is_tenant_staff(current_tenant_id()))
with check (tenant_id = current_tenant_id());

drop policy if exists menu_items_admin on public.menu_items;
create policy menu_items_admin on public.menu_items
for all
using (tenant_id = current_tenant_id() and public.is_tenant_staff(current_tenant_id()))
with check (tenant_id = current_tenant_id());

drop policy if exists orders_owner_read on public.orders;
create policy orders_owner_read on public.orders
for select
using (
  tenant_id = current_tenant_id()
  and (user_id = auth.uid() or public.is_tenant_staff(current_tenant_id()))
);

drop policy if exists orders_insert_owner on public.orders;
create policy orders_insert_owner on public.orders
for insert
with check (
  tenant_id = current_tenant_id()
  and user_id = auth.uid()
  and public.is_tenant_member(current_tenant_id())
);

drop policy if exists orders_update_staff on public.orders;
create policy orders_update_staff on public.orders
for update
using (tenant_id = current_tenant_id() and public.is_tenant_staff(current_tenant_id()))
with check (tenant_id = current_tenant_id());

drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items
for select
using (
  tenant_id = current_tenant_id()
  and exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_tenant_staff(current_tenant_id()))
  )
);

drop policy if exists osl_read on public.order_status_logs;
create policy osl_read on public.order_status_logs
for select
using (
  tenant_id = current_tenant_id()
  and exists (
    select 1 from public.orders o
    where o.id = order_status_logs.order_id
      and (o.user_id = auth.uid() or public.is_tenant_staff(current_tenant_id()))
  )
);

drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments
for select
using (
  tenant_id = current_tenant_id()
  and exists (
    select 1 from public.orders o
    where o.id = payments.order_id
      and (o.user_id = auth.uid() or public.is_tenant_admin(current_tenant_id()))
  )
);

drop policy if exists invites_admin on public.staff_invites;
create policy invites_admin on public.staff_invites
for all
using (tenant_id = current_tenant_id() and public.is_tenant_admin(current_tenant_id()))
with check (tenant_id = current_tenant_id());

drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs
for select
using (tenant_id = current_tenant_id() and public.is_tenant_admin(current_tenant_id()));

-- pickup_secrets had RLS enabled with zero policies (flagged by advisors).
-- Lock it explicitly; service_role bypasses RLS so server-side code keeps
-- working unchanged.
drop policy if exists pickup_secrets_no_access on public.pickup_secrets;
create policy pickup_secrets_no_access on public.pickup_secrets
for all using (false) with check (false);
