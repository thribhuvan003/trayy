-- PostgREST pre-request hook: sets app.current_tenant from the x-tenant-id header.
-- The authenticator role has pgrst.db_pre_request=public.pre_request_set_tenant
-- configured, but the function was missing — causing every tenant-scoped RLS
-- policy (menu_items_read, orders_owner_read, oe_tenant_read, etc.) to evaluate
-- current_tenant_id() as NULL and return zero rows to students.
CREATE OR REPLACE FUNCTION public.pre_request_set_tenant()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  headers   json;
  tenant_id text;
BEGIN
  BEGIN
    headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN OTHERS THEN
    headers := NULL;
  END;

  IF headers IS NOT NULL THEN
    tenant_id := headers->>'x-tenant-id';
  END IF;

  IF tenant_id IS NOT NULL AND tenant_id <> '' THEN
    PERFORM set_config('app.current_tenant', tenant_id, true);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pre_request_set_tenant() TO anon, authenticated, service_role;
