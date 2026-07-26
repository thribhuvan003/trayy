import "server-only";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { CollegeAdminShell } from "./_shell";
import { getVerifiedAuthUser } from "@/lib/auth/verified-user";

export default async function CollegeAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth: get logged-in user via cookie-bound client (no tenant context needed)
  const serverClient = await getServerClient();
  const user = await getVerifiedAuthUser(serverClient);

  if (!user) redirect("/login?next=/college-admin");

  // Authorization: must have an active college_memberships row
  const adminClient = getAdminClient();
  const { data: membership } = await adminClient
    .from("college_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership) redirect("/login?next=/college-admin");

  return (
    <div
      data-portal="college-admin"
      className="min-h-screen bg-graphite-900 text-graphite-200 relative overflow-x-hidden"
    >
      <div className="grid-paper fixed inset-0 z-0" />
      <CollegeAdminShell userEmail={user.email}>
        {children}
      </CollegeAdminShell>
    </div>
  );
}
