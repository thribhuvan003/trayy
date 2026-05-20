import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { resolveTenant } from "@/lib/tenant";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/get-user";
import { PinKiosk } from "@/components/portal-kitchen/pin-kiosk";

export const dynamic = "force-dynamic";

type StaffProfile = {
  id: string;
  user_id: string;
  display_name: string;
  locked_until: string | null;
};

export default async function StaffSelectPage() {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) return null;

  const user = await requireRole(["kitchen_staff", "canteen_admin", "super_admin"]);
  if (!user) redirect(`/login?next=/kitchen/staff-select`);

  const admin = getAdminClient(tenant.id);
  const { data: profiles } = await admin
    .from("staff_profiles")
    .select("id, user_id, display_name, locked_until")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("display_name")
    .returns<StaffProfile[]>();

  return (
    <PinKiosk
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      profiles={profiles ?? []}
    />
  );
}
