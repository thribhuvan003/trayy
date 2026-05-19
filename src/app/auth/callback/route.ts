import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { resolveTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/menu";
  const tenantSlug = searchParams.get("tenant") ?? req.headers.get("x-tenant-slug") ?? "aditya";

  if (!code) return NextResponse.redirect(new URL("/login?error=Missing+code", origin));

  const supabase = await getServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin));
  }
  const tenant = await resolveTenant(tenantSlug);
  const { data: u } = await supabase.auth.getUser();
  if (tenant && u.user) {
    try {
      const admin = getAdminClient(tenant.id);
      await admin
        .from("tenant_memberships")
        .upsert(
          {
            user_id: u.user.id,
            tenant_id: tenant.id,
            role: "student",
            display_name: (u.user.user_metadata?.display_name as string | undefined) ?? null,
            is_active: true,
          },
          { onConflict: "user_id,tenant_id" }
        );
    } catch {
      // membership creation is best-effort — RLS may also handle it on first call
    }
  }

  // Auto-enroll the user into every canteen belonging to their college (based on
  // email domain). The RPC is SECURITY DEFINER and uses auth.uid() internally,
  // so we call it with the user's authenticated server client.
  if (u.user) {
    const { error: enrollError } = await supabase.rpc("auto_enroll_student");
    if (enrollError) {
      console.error("[auth/callback] auto_enroll_student failed:", enrollError.message);
    }

    // Hard-block users with zero memberships — they have no canteen access yet
    // (likely an unrecognised email domain). Send them home with a message.
    const { count, error: countError } = await supabase
      .from("tenant_memberships")
      .select("tenant_id", { count: "exact", head: true })
      .eq("user_id", u.user.id)
      .eq("is_active", true);
    if (countError) {
      console.error("[auth/callback] membership count failed:", countError.message);
    } else if ((count ?? 0) === 0) {
      return NextResponse.redirect(new URL("/?msg=no-college", origin));
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
