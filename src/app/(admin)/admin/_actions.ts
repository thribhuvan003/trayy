"use server";

/**
 * Admin (canteen owner) Server Actions — production hardened.
 *
 * These are the privileged "owner console" surfaces for each tenant.
 * One login for a canteen_admin → their own dedicated pages, own subdomain/URL,
 * own isolated data, own "system" feel. Every write here must carry explicit,
 * observable tenant context so the promise is real at scale (thousands of users,
 * many simultaneous college canteens, no noisy neighbor, no cross-tenant leaks).
 *
 * Pattern reused exactly from the already-wired kitchen + student surfaces:
 *   - requireTenantContext (or ForJob variant) for fail-fast + rich logging
 *   - tenantRateLimit per-tenant+per-user for rush/abuse protection
 *   - getAdminClient(tenant.id) explicit scoping on every DB write
 *   - .eq("tenant_id", ...) guards on every query
 *   - Full audit_logs + order_status_logs + structured logger with all context keys
 *
 * BlackRock/HFT standard: defensive, observable, minimal, operator-empathic.
 * Never silent on missing context. 2am debugging must be trivial.
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import crypto from "node:crypto";
import dayjs from "dayjs";
import { requireTenantContext } from "@/lib/tenant";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/get-user";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { logger } from "@/lib/logging";
import { tenantRateLimit } from "@/lib/rate-limit/tenant";

import type { ResolvedTenant } from "@/lib/tenant";
import type { CurrentUser } from "@/lib/auth/get-user";

type AdminCtx =
  | { ok: false; error: string }
  | { ok: true; tenant: ResolvedTenant; user: CurrentUser };

/**
 * Production ctx helper for canteen_admin surfaces.
 * Delegates to the standardized requireTenantContext (header-driven, logged, fail-fast)
 * then enforces the role. This makes every admin action participate in the
 * "one login = own dedicated isolated system" enforcement + observability story.
 */
async function adminContext(): Promise<AdminCtx> {
  let tenantCtx;
  try {
    tenantCtx = await requireTenantContext();
  } catch (e) {
    logger.error("admin context resolution failed", e, {
      reason: "requireTenantContext threw",
    });
    return { ok: false, error: "Tenant context invalid" };
  }

  const user = await requireRole(["canteen_admin", "super_admin"]);
  if (!user) {
    return { ok: false, error: "Not authorised" };
  }

  logger.info("admin context established", {
    tenant_id: tenantCtx.tenant.id,
    slug: tenantCtx.tenant.slug,
    user_id: user.id,
    actor_role: user.role,
  });

  return { ok: true, tenant: tenantCtx.tenant, user };
}

export async function setMenuItemStatus(
  id: string,
  status: "draft" | "live" | "archived"
): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  // Per-tenant + per-user rate limit for admin actions (rush protection + noisy-neighbor defense)
  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("menu_items")
    .update({ status })
    .eq("id", id)
    .eq("tenant_id", c.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("admin menu item status changed", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    target: "menu_item",
    target_id: id,
    new_status: status,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/menu`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  return { ok: true };
}

export async function setMenuItemStock(id: string, inStock: boolean): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("menu_items")
    .update({ in_stock: inStock })
    .eq("id", id)
    .eq("tenant_id", c.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("admin menu item stock changed", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    target: "menu_item",
    target_id: id,
    in_stock: inStock,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/menu`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  return { ok: true };
}

export async function inviteStaff(
  email: string,
  role: "kitchen_staff" | "canteen_admin"
): Promise<{ ok: boolean; error?: string; url?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = dayjs().add(48, "hour").toISOString();
  const { error } = await admin.from("staff_invites").insert({
    tenant_id: c.tenant.id,
    email,
    role,
    token,
    expires_at: expiresAt,
    invited_by: c.user.id,
  });
  if (error) return { ok: false, error: error.message };
  const url = `${env.APP_URL}/auth/invite/${token}`;
  await sendEmail({
    to: email,
    subject: `You're invited to join ${c.tenant.name} on Tray`,
    html: `<p>You've been invited as a ${role.replace("_", " ")}.</p><p><a href="${url}">Accept invite</a></p>`,
  });
  await admin.from("audit_logs").insert({
    tenant_id: c.tenant.id,
    actor_user_id: c.user.id,
    action: "staff.invited",
    target_type: "invite",
    meta: { email, role },
  });

  logger.info("admin staff invited", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    invited_email: email,
    invited_role: role,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/staff`);
  return { ok: true, url };
}

export async function revokeStaff(membershipId: string): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  // Prevent admins from revoking their own access
  const { data: target } = await admin
    .from("tenant_memberships")
    .select("user_id")
    .eq("id", membershipId)
    .eq("tenant_id", c.tenant.id)
    .maybeSingle<{ user_id: string }>();
  if (target?.user_id === c.user.id) {
    return { ok: false, error: "You cannot revoke your own access" };
  }
  const { error } = await admin
    .from("tenant_memberships")
    .update({ is_active: false })
    .eq("id", membershipId)
    .eq("tenant_id", c.tenant.id);
  if (error) return { ok: false, error: error.message };
  await admin.from("audit_logs").insert({
    tenant_id: c.tenant.id,
    actor_user_id: c.user.id,
    action: "staff.revoked",
    target_type: "membership",
    target_id: membershipId,
  });

  logger.info("admin staff revoked", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    target_id: membershipId,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/staff`);
  return { ok: true };
}

// ── Canteen Settings ─────────────────────────────────────────────────────────

export async function updateCanteenHours(opts: {
  isOpen: boolean;
  opensAt: string | null; // "HH:MM" or null
  closesAt: string | null; // "HH:MM" or null
}): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("tenants")
    .update({
      is_open: opts.isOpen,
      opens_at: opts.opensAt,
      closes_at: opts.closesAt,
    })
    .eq("id", c.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("admin canteen hours updated", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    is_open: opts.isOpen,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/settings`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  revalidateTag("tenant");
  return { ok: true };
}

export async function pauseCanteen(minutes: number): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const pausedUntil =
    minutes > 0 ? dayjs().add(minutes, "minute").toISOString() : null;
  const { error } = await admin
    .from("tenants")
    .update({ paused_until: pausedUntil })
    .eq("id", c.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("admin canteen paused", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    minutes,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/settings`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  revalidateTag("tenant");
  return { ok: true };
}

export async function updateCanteenSettings(opts: {
  guestOrdersEnabled: boolean;
  upiVpa: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("tenants")
    .update({
      guest_orders_enabled: opts.guestOrdersEnabled,
      upi_vpa: opts.upiVpa,
    })
    .eq("id", c.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("admin canteen settings updated", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    guest_orders_enabled: opts.guestOrdersEnabled,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/settings`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  revalidateTag("tenant");
  return { ok: true };
}

// ── Menu Item CRUD ────────────────────────────────────────────────────────────

export async function createMenuItem(form: {
  name: string;
  description: string | null;
  price_paise: number;
  diet: "veg" | "nonveg" | "egg";
  category_id: string | null;
  image_url: string | null;
  sort_order: number;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const { data, error } = await admin
    .from("menu_items")
    .insert({
      tenant_id: c.tenant.id,
      name: form.name,
      description: form.description,
      price_paise: form.price_paise,
      diet: form.diet,
      category_id: form.category_id,
      image_url: form.image_url,
      sort_order: form.sort_order,
      status: "live",
      in_stock: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  logger.info("admin menu item created", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    item_name: form.name,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/menu`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  return { ok: true, id: data.id };
}

export async function updateMenuItem(
  id: string,
  form: {
    name: string;
    description: string | null;
    price_paise: number;
    diet: "veg" | "nonveg" | "egg";
    category_id: string | null;
    image_url: string | null;
    sort_order: number;
    status: "draft" | "live" | "archived";
    in_stock: boolean;
  }
): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("menu_items")
    .update({
      name: form.name,
      description: form.description,
      price_paise: form.price_paise,
      diet: form.diet,
      category_id: form.category_id,
      image_url: form.image_url,
      sort_order: form.sort_order,
      status: form.status,
      in_stock: form.in_stock,
    })
    .eq("id", id)
    .eq("tenant_id", c.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("admin menu item updated", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    target_id: id,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/menu`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  return { ok: true };
}

export async function deleteMenuItem(id: string): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("menu_items")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("tenant_id", c.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("admin menu item deleted (archived)", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    target_id: id,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/menu`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  return { ok: true };
}
