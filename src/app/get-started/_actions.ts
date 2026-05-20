"use server";

import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
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

  // ── 2. Create auth user (auto-confirmed, no email verification required) ─────
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: form.adminEmail,
    password: form.adminPassword,
    email_confirm: true,
    user_metadata: { full_name: form.adminName },
  });

  if (authError || !authData.user) {
    return { ok: false, error: authError?.message ?? "Failed to create user" };
  }
  const userId = authData.user.id;

  // ── 3. Create college ────────────────────────────────────────────────────────
  const allowedDomains: string[] = form.emailDomain
    ? [form.emailDomain.replace(/^@/, "")]
    : [];

  const { data: college, error: collegeError } = await admin
    .from("colleges")
    .insert({
      name: form.institutionName,
      slug: collegeSlug,
      city: form.city || null,
      allowed_domains: allowedDomains,
      is_active: true,
    })
    .select("id")
    .single();

  if (collegeError || !college) {
    // Clean up auth user on failure
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: collegeError?.message ?? "Failed to create institution" };
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
      opens_at: form.opensAt || null,
      closes_at: form.closesAt || null,
      allowed_domain: allowedDomains[0] ?? null,
      is_active: true,
      is_open: true,
      guest_orders_enabled: true,
    })
    .select("id")
    .single();

  if (tenantError || !tenant) {
    await admin.auth.admin.deleteUser(userId);
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
    console.error("[get-started] college_membership insert failed", colMemberError.message);
  }

  // ── 6. Create tenant_membership with canteen_admin role ──────────────────────
  const { error: memberError } = await admin.from("tenant_memberships").insert({
    tenant_id: tenant.id,
    user_id: userId,
    role: "canteen_admin",
    display_name: form.adminName,
    is_active: true,
  });

  if (memberError) {
    // Non-fatal — the user was created, they can still log in
    console.error("[get-started] tenant_membership insert failed", memberError.message);
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
    console.error("[get-started] welcome email failed", e);
  });

  return { ok: true, canteenSlug };
}
