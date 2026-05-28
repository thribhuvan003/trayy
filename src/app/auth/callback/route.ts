import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { resolveTenant } from "@/lib/tenant";
import { logger } from "@/lib/logging";
import { safeNext } from "@/lib/auth/safe-redirect";

// Maps raw Supabase auth error messages to user-friendly strings so we never
// reflect internal error details back to the browser URL bar.
function userFacingAuthError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("expired") || msg.includes("invalid") || msg.includes("link"))
    return "Sign-in link expired or invalid — please request a new one.";
  if (msg.includes("email") && msg.includes("not confirmed"))
    return "Email not confirmed. Check your inbox for a confirmation link.";
  if (msg.includes("already") && msg.includes("registered"))
    return "An account with this email already exists. Try signing in instead.";
  if (msg.includes("signup") || msg.includes("not allowed"))
    return "No account found with that email. Sign up first.";
  return "Sign-in failed. Please try again.";
}

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
    logger.error("auth callback ensureStudentEnrolled query failed", error, {
      user_id: userId,
    });
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
    logger.error("auth callback ensureStudentEnrolled upsert failed", upsertError, {
      user_id: userId,
    });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"), "/");
  // Prefer explicit tenant from the invite/signup link or the x-tenant-slug header (set by middleware for /c/slug/... flows).
  // No silent "aditya" default for normal auth — fail loud with a clear error so broken invites/links are obvious.
  const tenantSlug = searchParams.get("tenant") ?? req.headers.get("x-tenant-slug");

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
    const msg = userFacingAuthError(authError.message);
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(msg)}`, origin));
  }
  const tenant = tenantSlug ? await resolveTenant(tenantSlug) : null;
  const { data: u } = await supabase.auth.getUser();
  if (tenant && u.user) {
    // Domain check: only enforce if the tenant has opted in with allowed_domain.
    // Per product decision: any email is accepted by default (personal, college, work).
    // allowed_domain can be set per-tenant by admins who want stricter control later.
    if (tenant.allowed_domain && tenant.allowed_domain.trim() !== "") {
      const userDomain = u.user.email?.split("@")[1]?.toLowerCase();
      if (userDomain !== tenant.allowed_domain.toLowerCase()) {
        await supabase.auth.signOut();
        const msg = encodeURIComponent(
          `This canteen is restricted to @${tenant.allowed_domain} accounts. Please use that email.`
        );
        return NextResponse.redirect(new URL(`/c/${tenant.slug}/login?error=${msg}`, origin));
      }
    }
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
      logger.error("auth callback auto_enroll_student failed", enrollError, {
        user_id: u.user.id,
        tenant_slug: tenantSlug,
      });
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
      logger.error("auth callback membership count failed", countError, {
        user_id: u.user.id,
        tenant_slug: tenantSlug,
      });
    } else if ((count ?? 0) === 0) {
      return NextResponse.redirect(new URL("/?msg=no-college", origin));
    }
  }

  // If next === "/" (user signed in from landing), route to their portal instead.
  // OAuth FIX: When next === "/" (sign-in from landing page or direct /login visit),
  // look up the user's membership and route to their correct portal.
  // Previously this fell through to "/" (landing page) when the tenants join returned null,
  // causing "Google sign-in takes me back to the landing page" bug.
  if (next === "/" && u.user) {
    // Explicit two-step query: first get membership, then resolve the slug separately.
    // Avoids the Supabase PostgREST join returning {tenants: null} on FK lookup failures.
    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", u.user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    const mem = memberships?.[0] as { tenant_id: string; role: string } | undefined;

    if (mem?.tenant_id) {
      // Second query: resolve the slug from the tenant_id directly
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("slug")
        .eq("id", mem.tenant_id)
        .maybeSingle<{ slug: string }>();

      const slug = tenantRow?.slug;
      if (slug) {
        const role = mem.role;
        if (role === "canteen_admin" || role === "super_admin") {
          return NextResponse.redirect(new URL(`/c/${slug}/admin/dashboard`, origin));
        } else if (role === "kitchen_staff" || role === "kitchen") {
          return NextResponse.redirect(new URL(`/c/${slug}/kitchen/staff-select`, origin));
        } else {
          return NextResponse.redirect(new URL(`/c/${slug}/menu`, origin));
        }
      }
    }

    // No membership found (brand-new user, or student who signed in from landing).
    // Send to get-started for owners; for students, they need a canteen URL.
    // Redirect to login with a helpful message rather than silently landing on "/".
    return NextResponse.redirect(new URL("/login?msg=select-canteen", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
