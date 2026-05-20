"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import crypto from "node:crypto";
import dayjs from "dayjs";
import { resolveTenant } from "@/lib/tenant";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/get-user";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";

async function ctx() {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) return { ok: false as const, error: "Tenant missing" };
  const user = await requireRole(["canteen_admin", "super_admin"]);
  if (!user) return { ok: false as const, error: "Not authorised" };
  return { ok: true as const, tenant, user };
}

export async function setMenuItemStatus(
  id: string,
  status: "draft" | "live" | "archived"
): Promise<{ ok: boolean; error?: string }> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("menu_items")
    .update({ status })
    .eq("id", id)
    .eq("tenant_id", c.tenant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return { ok: true };
}

export async function setMenuItemStock(id: string, inStock: boolean): Promise<{ ok: boolean; error?: string }> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("menu_items")
    .update({ in_stock: inStock })
    .eq("id", id)
    .eq("tenant_id", c.tenant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return { ok: true };
}

export async function inviteStaff(
  email: string,
  role: "kitchen_staff" | "canteen_admin"
): Promise<{ ok: boolean; error?: string; url?: string }> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
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
  revalidatePath("/admin/staff");
  return { ok: true, url };
}

export async function revokeStaff(membershipId: string): Promise<{ ok: boolean; error?: string }> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
  const admin = getAdminClient(c.tenant.id);
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
  revalidatePath("/admin/staff");
  return { ok: true };
}

// ── Canteen Settings ─────────────────────────────────────────────────────────

export async function updateCanteenHours(opts: {
  isOpen: boolean;
  opensAt: string | null; // "HH:MM" or null
  closesAt: string | null; // "HH:MM" or null
}): Promise<{ ok: boolean; error?: string }> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
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
  revalidatePath("/admin/settings");
  revalidatePath("/menu");
  revalidateTag("tenant");
  return { ok: true };
}

export async function pauseCanteen(minutes: number): Promise<{ ok: boolean; error?: string }> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
  const admin = getAdminClient(c.tenant.id);
  const pausedUntil =
    minutes > 0 ? dayjs().add(minutes, "minute").toISOString() : null;
  const { error } = await admin
    .from("tenants")
    .update({ paused_until: pausedUntil })
    .eq("id", c.tenant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/menu");
  revalidateTag("tenant");
  return { ok: true };
}

export async function updateCanteenSettings(opts: {
  guestOrdersEnabled: boolean;
  upiVpa: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("tenants")
    .update({
      guest_orders_enabled: opts.guestOrdersEnabled,
      upi_vpa: opts.upiVpa,
    })
    .eq("id", c.tenant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  revalidatePath("/menu");
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
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
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
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
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
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
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
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return { ok: true };
}

export async function deleteMenuItem(id: string): Promise<{ ok: boolean; error?: string }> {
  const c = await ctx();
  if (!c.ok) return { ok: false, error: c.error };
  const admin = getAdminClient(c.tenant.id);
  const { error } = await admin
    .from("menu_items")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("tenant_id", c.tenant.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  revalidatePath("/menu");
  return { ok: true };
}
