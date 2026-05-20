import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { resolveTenant } from "@/lib/tenant";

/**
 * Enrolls the authenticated user into every open-access tenant they are not
 * yet a member of. Open-access means the parent college has an empty
 * allowed_domains array (`'{}'` in Postgres) — any authenticated user can
 * order there (hotels, standalone canteens, corporate campuses, etc.).
 *
 * This runs AFTER auto_enroll_student() so domain-restricted institutions
 * are already handled; we only need to sweep for the open-access ones.
 */
async function ensureStudentEnrolled(userId: string): Promise<void> {
  const admin = getAdminClient();

  // Find every active tenant whose parent college imposes no domain restriction.
  // We filter server-side using the Postgres array equality operator via PostgREST.
  const { data: openTenants, error } = await admin
    .from("tenants")
    .select("id, colleges!inner(allowed_domains, is_active)")
    .eq("is_active", true)
    .eq("colleges.is_active", true)
    .filter("colleges.allowed_domains", "eq", "{}");

  if (error) {
    console.error("[auth/callback] ensureStudentEnrolled — query failed:", error.message);
    return;
  }
  if (!openTenants || openTenants.length === 0) return;

  // Upsert memberships with ignoreDuplicates so re-logins are a no-op and
  // the unique(user_id, tenant_id) constraint is never violated.
  const inserts = openTenants.map((t) => ({
    user_id: userId,
    tenant_id: t.id,
    role: "student" as const,
    is_active: true,
  }));

  const { error: upsertError } = await admin
    .from("tenant_memberships")
    .upsert(inserts, { onConflict: "user_id,tenant_id", ignoreDuplicates: true });

  if (upsertError) {
    console.error("[auth/callback] ensureStudentEnrolled — upsert failed:", upsertError.message);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";
  const tenantSlug = searchParams.get("tenant") ?? req.headers.get("x-tenant-slug") ?? "aditya";

  const supabase = await getServerClient();
  let authError: { message: string } | null = null;

  if (code) {
    // PKCE flow — Supabase auth flow type = PKCE
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else if (token_hash && type) {
    // Implicit/email OTP flow — Supabase auth flow type = Implicit
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as Parameters<typeof supabase.auth.verifyOtp>[0]["type"],
    });
    authError = error;
  } else {
    return NextResponse.redirect(new URL("/login?error=Missing+code", origin));
  }

  if (authError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(authError.message)}`, origin));
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

  if (u.user) {
    // Step 1 — domain-restricted auto-enroll: enrolls users whose email
    // domain matches colleges.allowed_domains[]. Colleges with an empty
    // allowed_domains array are intentionally skipped by this RPC.
    const { error: enrollError } = await supabase.rpc("auto_enroll_student");
    if (enrollError) {
      console.error("[auth/callback] auto_enroll_student failed:", enrollError.message);
    }

    // Step 2 — open-access enroll: enrolls users in every tenant whose parent
    // college has allowed_domains = '{}' (no restriction). This covers hotels,
    // standalone canteens, corporate campuses, and any institution that accepts
    // any authenticated user without email-domain gating.
    await ensureStudentEnrolled(u.user.id);

    // Hard-block: if the user still has zero memberships after both enrollment
    // passes, their account has no canteen access. Redirect with a contextual
    // message so they know what to do next.
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
