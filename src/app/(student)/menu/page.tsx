import { headers } from "next/headers";
import { resolveTenant } from "@/lib/tenant";
import { getServerClient } from "@/lib/supabase/server";
import { MenuBoard } from "@/components/portal-student/menu-board";
import { ClosedBanner } from "@/components/portal-student/closed-banner";
import { MenuLiveSync } from "@/components/portal-student/menu-live-sync";
import { notFound } from "next/navigation";

export const revalidate = 15;

export default async function MenuPage() {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "";
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();

  const supabase = await getServerClient(tenant.id);
  const [{ data: cats }, { data: items }, { data: tenantStatus }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("status", "live")
      .order("sort_order"),
    supabase
      .from("tenants")
      .select("is_open, paused_until")
      .eq("id", tenant.id)
      .maybeSingle<{ is_open: boolean; paused_until: string | null }>(),
  ]);

  // Fail-closed: if the status row is missing (DB error), treat as closed to prevent ordering during outages.
  const isClosed = tenantStatus ? !tenantStatus.is_open : true;
  const pausedUntil = tenantStatus?.paused_until ?? null;

  return (
    <>
      <MenuLiveSync tenantId={tenant.id} />
      <ClosedBanner
        tenantName={tenant.name}
        isClosed={isClosed}
        pausedUntil={pausedUntil}
      />
      <MenuBoard categories={cats ?? []} items={items ?? []} />
    </>
  );
}
