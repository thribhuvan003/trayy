"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * Toggle is_open for a canteen.
 * The caller must be an active college_admin with a college_memberships row
 * whose college_id matches the tenant's college_id.
 */
export async function setCanteenOpen(
  tenantId: string,
  isOpen: boolean
): Promise<{ ok: boolean; error?: string }> {
  // Verify the requesting user is authenticated
  const serverClient = await getServerClient();
  const {
    data: { user },
    error: authError,
  } = await serverClient.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  const admin = getAdminClient();

  // Fetch the tenant to get its college_id
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select("id, college_id")
    .eq("id", tenantId)
    .maybeSingle();

  if (tenantError || !tenant) {
    return { ok: false, error: "Canteen not found" };
  }

  if (!tenant.college_id) {
    return { ok: false, error: "Canteen is not associated with a college" };
  }

  // Check the user has an active college_memberships row for this college
  const { data: membership } = await admin
    .from("college_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("college_id", tenant.college_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "Not authorized to manage this canteen" };
  }

  // Perform the update
  const { error: updateError } = await admin
    .from("tenants")
    .update({ is_open: isOpen })
    .eq("id", tenantId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath("/college-admin");
  revalidatePath("/college-admin/canteens");

  return { ok: true };
}
