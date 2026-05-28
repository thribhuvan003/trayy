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
  const isSignup = searchParams.get("signup") === "1";

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
      const { data: existing } = await admin
        .from("tenant_memberships")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (!existing) {
        if (!isSignup) {
          // Block unauthorized login for non-members
          await supabase.auth.signOut();
          const msg = encodeURIComponent("No account found with this email. Please create an account first.");
          return NextResponse.redirect(new URL(`/c/${tenant.slug}/login?error=${msg}`, origin));
        }

        // Safe to create account/membership on explicit signup flow
        await admin
          .from("tenant_memberships")
          .insert({
            user_id: u.user.id,
            tenant_id: tenant.id,
            role: "student",
            display_name: (u.user.user_metadata?.display_name as string | undefined) ?? null,
            is_active: true,
          });
      } else {
        await admin
          .from("tenant_memberships")
          .update({
            display_name: (u.user.user_metadata?.display_name as string | undefined) ?? null,
            is_active: true,
          })
          .eq("user_id", u.user.id)
          .eq("tenant_id", tenant.id);
      }
    } catch (err) {
      logger.error("auth callback role creation/update failed", err, {
        user_id: u.user.id,
        tenant_id: tenant.id,
      });
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

    // Check membership count. If zero after both enrollment passes, the user
    // is brand-new with no canteen. Send them somewhere useful instead of the
    // landing page (the old "/?msg=no-college" redirect was the bug causing
    // "sign in with Google → back to landing page" reports).
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
      // New user: no canteen association yet.
      // Route to get-started so they can either create a canteen (admin)
      // or learn how to find their college's student URL.
      // Never land on "/" — that's just the marketing page.
      return NextResponse.redirect(new URL("/get-started?new=1", origin));
    }
  }

  const isDefaultNext =
    next === "/" ||
    (tenantSlug &&
      (next === `/c/${tenantSlug}/menu` ||
        next === `/c/${tenantSlug}` ||
        next === `/c/${tenantSlug.toLowerCase()}/menu` ||
        next === `/c/${tenantSlug.toLowerCase()}` ||
        next.endsWith("/menu")));

  if (isDefaultNext && u.user) {
    const { data: memberships } = (await supabase
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", u.user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })) as unknown as { data: { tenant_id: string; role: string }[] | null };

    if (memberships && memberships.length > 0) {
      let activeMem = memberships[0];

      if (tenantSlug) {
        const { data: specificTenant } = (await supabase
          .from("tenants")
          .select("id")
          .eq("slug", tenantSlug.toLowerCase())
          .maybeSingle()) as unknown as { data: { id: string } | null };

        if (specificTenant) {
          const match = memberships.find((m) => m.tenant_id === specificTenant.id);
          if (match) activeMem = match;
        }
      }

      const { data: tenantRow } = (await supabase
        .from("tenants")
        .select("slug")
        .eq("id", activeMem.tenant_id)
        .maybeSingle()) as unknown as { data: { slug: string } | null };

      const resolvedSlug = tenantRow?.slug;
      if (resolvedSlug) {
        const role = activeMem.role;
        if (role === "canteen_admin" || role === "super_admin") {
          return NextResponse.redirect(new URL(`/c/${resolvedSlug}/admin/dashboard`, origin));
        } else if (role === "kitchen_staff" || role === "kitchen") {
          return NextResponse.redirect(new URL(`/c/${resolvedSlug}/kitchen/staff-select`, origin));
        } else {
          return NextResponse.redirect(new URL(`/c/${resolvedSlug}/menu`, origin));
        }
      }
    }

    return NextResponse.redirect(new URL("/get-started?new=1", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
