import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getServerClient } from "@/lib/supabase/server";
import { getVerifiedAuthUser } from "@/lib/auth/verified-user";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const origin = req.nextUrl.origin;

  // Resolve invite (service-role: invites aren't readable to anon).
  const admin = getAdminClient();
  const { data: invite } = await admin
    .from("staff_invites")
    .select("id, tenant_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle<{
      id: string;
      tenant_id: string;
      email: string;
      role: "kitchen_staff" | "canteen_admin" | "super_admin" | "student";
      expires_at: string;
      accepted_at: string | null;
    }>();
  if (!invite) return NextResponse.redirect(new URL("/login?error=Invite+not+found", origin));
  if (invite.accepted_at) return NextResponse.redirect(new URL("/login?error=Invite+already+used", origin));
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.redirect(new URL("/login?error=Invite+expired", origin));
  }

  // Caller must be signed in as the invited email. Otherwise bounce to signup,
  // pre-filling the email and looping back here after auth.
  const supabase = await getServerClient(invite.tenant_id);
  const u = { user: await getVerifiedAuthUser(supabase) };
  if (!u.user) {
    const next = `/auth/invite/${encodeURIComponent(token)}`;
    return NextResponse.redirect(
      new URL(`/signup?next=${encodeURIComponent(next)}&email=${encodeURIComponent(invite.email)}`, origin)
    );
  }
  if (u.user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(`Sign in as ${invite.email}`)}`, origin)
    );
  }

  await admin
    .from("tenant_memberships")
    .upsert(
      {
        user_id: u.user.id,
        tenant_id: invite.tenant_id,
        role: invite.role,
        display_name:
          (u.user.user_metadata?.display_name as string | undefined) ?? u.user.email ?? null,
        is_active: true,
      },
      { onConflict: "user_id,tenant_id" }
    );
  await admin
    .from("staff_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Resolve slug for the invited tenant so the new user lands in *their* dedicated canteen admin/kitchen (critical for same-college multi-outlet owners).
  // No silent "aditya" fallback — if the tenant row is missing after a valid invite, something is wrong; fail loud with a clear error.
  const { data: t } = await admin
    .from("tenants")
    .select("slug")
    .eq("id", invite.tenant_id)
    .maybeSingle<{ slug: string }>();
  if (!t?.slug) {
    return NextResponse.redirect(new URL("/login?error=Invite+tenant+not+found", origin));
  }
  const tenantSlug = t.slug;

  const dest =
    invite.role === "kitchen_staff"
      ? `/c/${tenantSlug}/kitchen`
      : invite.role === "canteen_admin" || invite.role === "super_admin"
      ? `/c/${tenantSlug}/admin/dashboard`
      : `/c/${tenantSlug}/menu`;
  return NextResponse.redirect(new URL(dest, origin));
}
