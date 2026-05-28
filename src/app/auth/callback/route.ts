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

  // Skip auto-enrollment for users who are already staff/admin anywhere.
  // Root-cause fix for "admin lands on stranger's student menu": without this
  // guard, an admin who sets up an open-access canteen gets enrolled as a
  // student in every OTHER open-access canteen on the platform. Those new
  // student rows have the freshest created_at, so the callback routes them
  // to the wrong canteen/portal on every subsequent login.
  const { count: staffCount } = await admin
    .from("tenant_memberships")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("role", ["canteen_admin", "super_admin", "kitchen_staff"]);

  if ((staffCount ?? 0) > 0) return;

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
  const loginRole = searchParams.get("role");

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
    // Domain restriction is intentionally NOT enforced here.
    // Any email — personal, work, college — can sign in.
    // Canteen owners who want email-domain gating can enable it later via
    // an explicit settings toggle (stored in a separate column), but that
    // feature is not yet exposed in the admin UI. Removing this check
    // unblocks every real user currently seeing "restricted to @aec.edu.in".
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
      // No account found after both enrollment passes.
      if (loginRole === "owner") {
        // New canteen owner — send them to the wizard directly.
        return NextResponse.redirect(new URL("/get-started?new=1", origin));
      } else if (loginRole === "kitchen") {
        await supabase.auth.signOut();
        const errMsg = encodeURIComponent("No kitchen staff account found. Ask your canteen admin to add you.");
        return NextResponse.redirect(new URL(`/login?role=kitchen&error=${errMsg}`, origin));
      } else {
        // Unknown student — DON'T sign them out; keep the session so they can
        // visit a canteen URL and be auto-enrolled. Just redirect to get-started
        // so they understand they need a canteen URL, not the global login.
        const errMsg = encodeURIComponent(
          "No account found with this email. If you're a student, open your canteen's ordering link directly (e.g. trayy.vercel.app/c/your-canteen/menu)."
        );
        return NextResponse.redirect(new URL(`/login?role=student&error=${errMsg}`, origin));
      }
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

      if (loginRole) {
        const match = memberships.find((m) => {
          if (loginRole === "owner") return m.role === "canteen_admin" || m.role === "super_admin";
          if (loginRole === "kitchen") return m.role === "kitchen_staff" || m.role === "kitchen";
          return m.role === "student";
        });
        if (match) activeMem = match;
      } else {
        // No explicit role hint — always prefer admin > kitchen > student.
        // This prevents the case where ensureStudentEnrolled just created fresh
        // student rows (newest created_at) that would otherwise win as memberships[0].
        const adminMem = memberships.find((m) =>
          m.role === "canteen_admin" || m.role === "super_admin"
        );
        const kitchenMem = memberships.find((m) =>
          m.role === "kitchen_staff" || m.role === "kitchen"
        );
        activeMem = adminMem ?? kitchenMem ?? activeMem;
      }

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
