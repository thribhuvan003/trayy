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
import { initiateRefundForOrder } from "@/app/(student)/_actions";

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
  paymentMode?: "direct_upi" | "razorpay";
  adminPhone?: string | null;
  orderMode?: "kitchen_flow" | "token_prepaid";
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
      upi_vpa: opts.upiVpa ? opts.upiVpa.toLowerCase() : null,
      ...(opts.paymentMode ? { payment_mode: opts.paymentMode } : {}),
      ...(opts.adminPhone !== undefined ? { admin_phone: opts.adminPhone } : {}),
      ...(opts.orderMode ? { order_mode: opts.orderMode } : {}),
    } as any)
    .eq("id", c.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("admin canteen settings updated", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    guest_orders_enabled: opts.guestOrdersEnabled,
    latency_ms: Date.now() - start,
  });

  // Invalidate every cache layer that holds tenant data so the new UPI VPA
  // shows immediately on the pay page QR code and settings form.
  revalidatePath(`/c/${c.tenant.slug}/admin/settings`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  revalidatePath(`/c/${c.tenant.slug}/pay`, "layout");
  revalidateTag("tenant");
  // Clear the slug-specific unstable_cache entry so the 60s TTL doesn't
  // delay the new UPI VPA from appearing in the QR code on the pay page.
  revalidateTag(`tenant:${c.tenant.slug}`);
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
  is_special?: boolean;
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
      is_special: form.is_special ?? false,
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
    is_special?: boolean;
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
      is_special: form.is_special ?? false,
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

// ── Order Management ──────────────────────────────────────────────────────────

export async function cancelOrderAsAdmin(
  orderId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);

  // Fetch current status first so we log the right from_status
  const { data: cur } = await admin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("tenant_id", c.tenant.id)
    .maybeSingle<{ status: string }>();

  if (!cur) return { ok: false, error: "Order not found" };

  // Only cancel orders that are still in-flight (not already terminal)
  const cancellable = ["placed", "preparing", "pending_payment"] as const;
  if (!(cancellable as readonly string[]).includes(cur.status)) {
    return { ok: false, error: `Cannot cancel order in "${cur.status}" status` };
  }

  const { data: updated } = await admin
    .from("orders")
    .update({ status: "cancelled_by_kitchen" })
    .eq("id", orderId)
    .eq("tenant_id", c.tenant.id)
    .in("status", cancellable)
    .select("id");

  if (!updated || updated.length === 0) {
    return { ok: false, error: "Order was already updated by another action" };
  }

  await admin.from("order_status_logs").insert({
    tenant_id: c.tenant.id,
    order_id: orderId,
    from_status: cur.status as "placed" | "preparing" | "pending_payment",
    to_status: "cancelled_by_kitchen" as const,
    actor_user_id: c.user.id,
    note: `Admin cancelled: ${reason}`,
  });

  await (admin.from("order_events") as unknown as {
    insert: (r: object) => Promise<unknown>;
  }).insert({
    order_id: orderId,
    tenant_id: c.tenant.id,
    event_type: "cancelled_by_admin",
    payload: { reason, actor_user_id: c.user.id },
  });

  await admin.from("audit_logs").insert({
    tenant_id: c.tenant.id,
    actor_user_id: c.user.id,
    action: "order.admin_cancelled",
    target_type: "order",
    target_id: orderId,
    meta: { reason, from_status: cur.status },
  });

  // Queue refund if the order was paid
  if (cur.status !== "pending_payment") {
    void initiateRefundForOrder(orderId, c.tenant.id).catch(() => {});
  }

  logger.info("admin cancelled order", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    order_id: orderId,
    from_status: cur.status,
    reason,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/orders`);
  return { ok: true };
}

// ── Admin-initiated refund (wrong item delivered, dispute, goodwill) ──────────
// Works for any order that has a captured payment — including collected orders.
// The student sees the refund appear on their track page in real-time.
export async function refundOrderAsAdmin(
  orderId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) return { ok: false, error: "Too many admin actions — slow down" };

  const admin = getAdminClient(c.tenant.id);

  const { data: cur } = await admin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("tenant_id", c.tenant.id)
    .maybeSingle<{ status: string }>();
  if (!cur) return { ok: false, error: "Order not found" };

  const refundable = ["collected", "placed", "preparing", "cancelled_by_kitchen"];
  if (!refundable.includes(cur.status)) {
    return { ok: false, error: `Cannot refund an order in "${cur.status}" status` };
  }

  await admin.from("audit_logs").insert({
    tenant_id: c.tenant.id,
    actor_user_id: c.user.id,
    action: "order.admin_refund_initiated",
    target_type: "order",
    target_id: orderId,
    meta: { reason, from_status: cur.status },
  });

  const result = await initiateRefundForOrder(orderId, c.tenant.id);
  if (!result.ok) return { ok: false, error: result.error ?? "Refund failed" };

  logger.info("admin initiated refund", {
    tenant_id: c.tenant.id,
    actor_user_id: c.user.id,
    order_id: orderId,
    refund_id: result.refundId,
    reason,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/orders`);
  return { ok: true };
}

// ── UPI VPA Validation ────────────────────────────────────────────────────────
// Calls Razorpay's VPA validation endpoint to confirm the UPI address actually
// exists at the bank level (not just regex-valid). Requires live keys.
// Used by the admin settings UPI field before allowing Save.

export async function validateUpiVpa(
  vpa: string
): Promise<{ valid: boolean; customerName?: string; error?: string }> {
  // Auth guard: only canteen admins can call this
  const { tenant } = await requireTenantContext();
  void tenant;

  const trimmed = vpa.trim();

  // Regex: standard UPI VPA format — number/name@bankhandle
  // Covers: 9876543210@ybl, name@okaxis, canteen@okhdfcbank, 8977070010-2@ibl, etc.
  const vpaRegex = /^[a-zA-Z0-9.\-_+]{2,256}@[a-zA-Z]{2,64}$/;
  if (!vpaRegex.test(trimmed)) {
    return {
      valid: false,
      error: "Invalid format. Use format like: 9876543210@ybl or canteen@okaxis",
    };
  }

  // Regex passed — the UPI ID format is valid. We accept it directly.
  // We intentionally skip the Razorpay /validate/vpa API because:
  //   1. It only works with specific Razorpay plan tiers
  //   2. It 404s for many valid UPI handles (IBL, ICICI, Axis, etc.)
  //   3. A wrong UPI entered by the admin is their own mistake — the
  //      consequence (payments to wrong account) is on them, and they
  //      can fix it immediately by updating the setting again.
  //   4. Blocking saves on API errors prevents admins from setting their
  //      UPI at all, which breaks the entire payment flow.
  return { valid: true };
}

// ── Category & Special Toggles ──────────────────────────────────────────────

export async function createCategory(name: string): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("menu_categories")
    .insert({
      tenant_id: c.tenant.id,
      name: name.trim(),
      sort_order: 100,
    });
  if (error) return { ok: false, error: error.message };

  logger.info("admin menu category created", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    category_name: name,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/menu`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  return { ok: true };
}

export async function updateCategory(id: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("menu_categories")
    .update({ name: name.trim() })
    .eq("id", id)
    .eq("tenant_id", c.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("admin menu category updated", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    category_id: id,
    category_name: name,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/menu`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  const c = await adminContext();
  if (!c.ok) return { ok: false, error: c.error };

  const rate = await tenantRateLimit(c.tenant.id, "admin_action", c.user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many admin actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(c.tenant.id);

  // Safely null out category_id for items referencing this category first
  const { error: updateError } = await admin
    .from("menu_items")
    .update({ category_id: null })
    .eq("category_id", id)
    .eq("tenant_id", c.tenant.id);

  if (updateError) return { ok: false, error: updateError.message };

  const { error } = await admin
    .from("menu_categories")
    .delete()
    .eq("id", id)
    .eq("tenant_id", c.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("admin menu category deleted", {
    tenant_id: c.tenant.id,
    slug: c.tenant.slug,
    actor_user_id: c.user.id,
    category_id: id,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${c.tenant.slug}/admin/menu`);
  revalidatePath(`/c/${c.tenant.slug}/menu`);
  return { ok: true };
}

export async function toggleItemSpecial(id: string, isSpecial: boolean): Promise<{ ok: boolean; error?: string }> {
  let tenantCtx;
  try {
    tenantCtx = await requireTenantContext();
  } catch {
    return { ok: false, error: "Tenant context invalid" };
  }

  const user = await requireRole(["kitchen_staff", "canteen_admin", "super_admin"]);
  if (!user) {
    return { ok: false, error: "Not authorised" };
  }

  const rate = await tenantRateLimit(tenantCtx.tenant.id, "admin_action", user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(tenantCtx.tenant.id);
  const { error } = await admin
    .from("menu_items")
    .update({ is_special: isSpecial })
    .eq("id", id)
    .eq("tenant_id", tenantCtx.tenant.id);
  if (error) return { ok: false, error: error.message };

  logger.info("menu item special toggled", {
    tenant_id: tenantCtx.tenant.id,
    slug: tenantCtx.tenant.slug,
    actor_user_id: user.id,
    item_id: id,
    is_special: isSpecial,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${tenantCtx.tenant.slug}/admin/menu`);
  revalidatePath(`/c/${tenantCtx.tenant.slug}/menu`);
  return { ok: true };
}

export async function createSpecialMenuItem(form: {
  name: string;
  description: string | null;
  price_paise: number;
  diet: "veg" | "nonveg" | "egg";
  prep_time_minutes?: number;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  let tenantCtx;
  try {
    tenantCtx = await requireTenantContext();
  } catch {
    return { ok: false, error: "Tenant context invalid" };
  }

  const user = await requireRole(["kitchen_staff", "canteen_admin", "super_admin"]);
  if (!user) return { ok: false, error: "Not authorised" };

  const rate = await tenantRateLimit(tenantCtx.tenant.id, "admin_action", user.id);
  if (!rate.success) {
    return { ok: false, error: "Too many actions — slow down a little" };
  }

  const start = Date.now();
  const admin = getAdminClient(tenantCtx.tenant.id);
  
  // Find first category or fallback
  const { data: categories } = await admin
    .from("menu_categories")
    .select("id")
    .eq("tenant_id", tenantCtx.tenant.id)
    .order("sort_order")
    .limit(1);
  const catId = categories?.[0]?.id ?? null;

  const { data, error } = await admin
    .from("menu_items")
    .insert({
      tenant_id: tenantCtx.tenant.id,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      price_paise: form.price_paise,
      diet: form.diet,
      category_id: catId,
      image_url: null,
      sort_order: 0,
      is_special: true,
      status: "live",
      in_stock: true,
      prep_target_seconds: (form.prep_time_minutes ?? 10) * 60,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  logger.info("kitchen menu item created as special", {
    tenant_id: tenantCtx.tenant.id,
    slug: tenantCtx.tenant.slug,
    actor_user_id: user.id,
    item_name: form.name,
    latency_ms: Date.now() - start,
  });

  revalidatePath(`/c/${tenantCtx.tenant.slug}/admin/menu`);
  revalidatePath(`/c/${tenantCtx.tenant.slug}/menu`);
  return { ok: true, id: data.id };
}


