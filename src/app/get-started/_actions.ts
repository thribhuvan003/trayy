"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, ""); // strip leading/trailing dashes ("so " → "so" not "so-")
}

async function resolveUniqueCollegeSlug(
  admin: ReturnType<typeof getAdminClient>,
  base: string
): Promise<string> {
  const { data } = await admin
    .from("colleges")
    .select("slug")
    .ilike("slug", `${base}%`);

  const existing = new Set((data ?? []).map((r) => r.slug));
  if (!existing.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

async function resolveUniqueTenantSlug(
  admin: ReturnType<typeof getAdminClient>,
  base: string
): Promise<string> {
  const { data } = await admin
    .from("tenants")
    .select("slug")
    .ilike("slug", `${base}%`);

  const existing = new Set((data ?? []).map((r) => r.slug));
  if (!existing.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export interface CreateInstitutionForm {
  institutionName: string;
  institutionType: string;
  city: string;
  emailDomain: string | null;
  canteenName: string;
  canteenBuilding: string | null;
  upiVpa: string | null;
  orderMode: string;
  opensAt: string | null;
  closesAt: string | null;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export async function createInstitution(
  form: CreateInstitutionForm
): Promise<{ ok: boolean; canteenSlug?: string; error?: string }> {
  const admin = getAdminClient(); // no tenantId — creating new tenants

  // ── 1. Generate slugs ────────────────────────────────────────────────────────
  const collegeSlugBase = toSlug(form.institutionName);
  const collegeSlug = await resolveUniqueCollegeSlug(admin, collegeSlugBase);

  const canteenSlugBase = toSlug(form.canteenName || form.institutionName + " canteen");
  const canteenSlug = await resolveUniqueTenantSlug(admin, canteenSlugBase);

  // ── 2. Resolve or create auth user ───────────────────────────────────────────
  // If the email already exists (e.g. user started signup but wizard failed),
  // reuse their account instead of blocking them with "email already registered".
  // This is the root cause of the "user exists / no account found" split-brain bug.
  let userId: string;
  let userAlreadyExisted = false;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: form.adminEmail,
    password: form.adminPassword,
    email_confirm: true,
    user_metadata: { full_name: form.adminName },
  });

  if (authError) {
    const isEmailTaken =
      authError.message.toLowerCase().includes("already") ||
      authError.message.toLowerCase().includes("exists") ||
      (authError as any).status === 422;

    if (!isEmailTaken) {
      return { ok: false, error: authError.message ?? "Failed to create account" };
    }

    // Email already has an auth account — look it up and reuse it.
    // Uses the DB function we added in migration 0022 which queries auth.users
    // server-side (the auth schema is not accessible via PostgREST).
    const { data: existingId, error: lookupErr } = await (admin as any).rpc(
      "find_auth_user_id_by_email",
      { p_email: form.adminEmail }
    ) as { data: string | null; error: unknown };

    if (lookupErr || !existingId) {
      logger.error("find_auth_user_id_by_email failed", lookupErr, { email: form.adminEmail });
      return { ok: false, error: "Account setup failed. Please try again." };
    }

    // Check if this user already has an active canteen — don't create a duplicate
    const { count: existingAdmin } = await admin
      .from("tenant_memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", existingId)
      .in("role", ["canteen_admin", "super_admin"])
      .eq("is_active", true);

    if ((existingAdmin ?? 0) > 0) {
      // They already have a working canteen — just tell them to log in
      return {
        ok: false,
        error: "An account with this email already has a canteen. Sign in to access your dashboard.",
      };
    }

    // Has an auth account but no canteen yet (previous wizard attempt failed mid-way).
    // Do NOT reset their password — that would be a credential-takeover: anyone who knows
    // the victim's email could silently hijack their Supabase account by filling the wizard.
    // Instead, create the canteen under their account. The wizard will redirect to the login
    // page on auto-sign-in failure (wrong password) and they sign in with their own credentials.
    userId = existingId;
    userAlreadyExisted = true;
    logger.info("createInstitution: reusing existing auth user", { user_id: userId, email: form.adminEmail });
  } else if (!authData.user) {
    return { ok: false, error: "Failed to create account" };
  } else {
    userId = authData.user.id;
  }

  // ── 3. Resolve or create college ────────────────────────────────────────────
  // If a college with the same institution name already exists, reuse it so
  // that multiple canteens at the same campus share one college row. Without
  // this, each canteen wizard run creates a separate college row, which breaks
  // the multi-canteen switcher in the student menu (collegeCanteens() returns
  // siblings by college_id — different IDs → no siblings → no switcher).
  let college: { id: string };

  // Match on both institution name AND city so "AEC Rajam" and "AEC Vizag"
  // remain separate colleges while two admins at the same campus share one.
  let collegeQuery = admin
    .from("colleges")
    .select("id")
    .ilike("name", form.institutionName.trim())
    .eq("is_active", true)
    .limit(1);
  if (form.city?.trim()) {
    collegeQuery = (collegeQuery as any).ilike("city", form.city.trim());
  }
  const { data: existingCollege } = await (collegeQuery as any).maybeSingle() as { data: { id: string } | null };

  if (existingCollege) {
    college = existingCollege;
    logger.info("createInstitution: reusing existing college", {
      college_id: existingCollege.id,
      institution: form.institutionName,
    });
  } else {
    const { data: newCollege, error: collegeError } = await admin
      .from("colleges")
      .insert({
        name: form.institutionName,
        slug: collegeSlug,
        city: form.city || null,
        allowed_domains: [],
        is_active: true,
      })
      .select("id")
      .single<{ id: string }>();

    if (collegeError || !newCollege) {
      if (!userAlreadyExisted) await admin.auth.admin.deleteUser(userId);
      return { ok: false, error: collegeError?.message ?? "Failed to create institution" };
    }
    college = newCollege;
  }

  // ── 4. Create first tenant (canteen) ─────────────────────────────────────────
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      name: form.canteenName,
      slug: canteenSlug,
      college_name: form.institutionName,
      college_id: college.id,
      building: form.canteenBuilding || null,
      upi_vpa: form.upiVpa || null,
      order_mode: form.orderMode === "token_prepaid" ? "token_prepaid" : "kitchen_flow",
      tier: form.orderMode === "token_prepaid" ? "street_stall" : "canteen",
      opens_at: form.opensAt || null,
      closes_at: form.closesAt || null,
      allowed_domain: null, // never restrict by domain — open to any email
      is_active: true,
      is_open: true,
      guest_orders_enabled: true,
      upi_trust_enabled: true,
    })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    if (!userAlreadyExisted) await admin.auth.admin.deleteUser(userId);
    await admin.from("colleges").delete().eq("id", college.id);
    return { ok: false, error: tenantError?.message ?? "Failed to create canteen" };
  }

  // ── 5. Create college_membership ─────────────────────────────────────────────
  const { error: colMemberError } = await admin.from("college_memberships").insert({
    college_id: college.id,
    user_id: userId,
    is_active: true,
  });

  if (colMemberError) {
    // Non-fatal — log but continue
    logger.error("get-started college_membership insert failed", colMemberError, {
      college_id: college.id,
      user_id: userId,
    });
  }

  // ── 6. Create tenant_membership — FATAL: roll back everything if this fails ──
  // This was non-fatal before — that silent failure is the root cause of every
  // "user exists / no account found" split-brain complaint.
  const { error: memberError } = await admin.from("tenant_memberships").insert({
    tenant_id: tenant.id,
    user_id: userId,
    role: "canteen_admin",
    display_name: form.adminName,
    is_active: true,
  });

  if (memberError) {
    // Full rollback so nothing is left in a half-created state
    await admin.from("tenants").delete().eq("id", tenant.id);
    await admin.from("colleges").delete().eq("id", college.id);
    if (!userAlreadyExisted) await admin.auth.admin.deleteUser(userId);
    logger.error("createInstitution membership FATAL — rolled back", memberError, {
      tenant_id: tenant.id,
      user_id: userId,
    });
    return { ok: false, error: "Failed to set up admin access. Please try again." };
  }

  // ── 6b. Seed starter categories (non-fatal) ──────────────────────────────────
  // A fresh canteen with zero categories means the category picker stays hidden on
  // the menu forms and every dish lands under "OTHER" on the student menu. Seeding
  // sensible defaults makes categories work out of the box — the admin can rename
  // or delete any of them in Menu → Categories.
  const { error: seedCatError } = await admin.from("menu_categories").insert(
    ["Breakfast", "Main Course", "Snacks", "Beverages"].map((name, i) => ({
      tenant_id: tenant.id,
      name,
      sort_order: i,
    }))
  );
  if (seedCatError) {
    logger.warn("createInstitution starter-category seed failed (non-fatal)", {
      tenant_id: tenant.id,
      error: seedCatError.message,
    });
  }

  // ── 7. Send welcome email ────────────────────────────────────────────────────
  const dashboardUrl = `${env.APP_URL}/c/${canteenSlug}/admin/dashboard`;
  const studentUrl = `${env.APP_URL}/c/${canteenSlug}/menu`;
  const kitchenUrl = `${env.APP_URL}/c/${canteenSlug}/kitchen`;
  await sendEmail({
    to: form.adminEmail,
    subject: `Welcome to Tray — ${form.institutionName} is ready`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a140e;">
        <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px;">Welcome to Tray, ${form.adminName}!</h1>
        <p style="color: #555; margin: 0 0 24px;">Your canteen <strong>${form.canteenName}</strong> at <strong>${form.institutionName}</strong> is set up and ready to go.</p>
        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">Your 3 links — save these now</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:10px;background:#f4f6f8;border-radius:8px;margin-bottom:8px;">
            <strong>🍽️ Student ordering link</strong><br>
            <span style="font-size:12px;color:#666;">Share this on WhatsApp with your students</span><br>
            <a href="${studentUrl}" style="color:#0066cc;font-size:13px;">${studentUrl}</a>
          </td></tr>
          <tr><td style="height:8px;"></td></tr>
          <tr><td style="padding:10px;background:#f4f6f8;border-radius:8px;">
            <strong>📺 Kitchen display link</strong><br>
            <span style="font-size:12px;color:#666;">Open this on your kitchen tablet</span><br>
            <a href="${kitchenUrl}" style="color:#0066cc;font-size:13px;">${kitchenUrl}</a>
          </td></tr>
        </table>
        <h3 style="font-size:16px;font-weight:600;margin:24px 0 8px;">What to do next:</h3>
        <ol style="padding-left:20px;color:#333;line-height:1.8;">
          <li>Open your admin dashboard and <strong>add your menu items</strong></li>
          <li>Set your UPI ID in Settings so students can pay you directly</li>
          <li>Share the student ordering link with your students via WhatsApp</li>
          <li>Open the kitchen display link on your kitchen tablet</li>
        </ol>
        <a href="${dashboardUrl}" style="display: inline-block; background: #0066ff; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 15px;">Open Admin Dashboard →</a>
        <hr style="border: none; border-top: 1px solid #e8ecf2; margin: 32px 0;" />
        <p style="font-size: 13px; color: #999; margin: 0;">Tray · Campus canteen ordering for institutions</p>
      </div>
    `,
  }).catch((e) => {
    logger.error("get-started welcome email failed", e, {
      tenant_id: tenant.id,
      user_id: userId,
    });
  });

  return { ok: true, canteenSlug };
}
