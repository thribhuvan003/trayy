"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import dayjs from "dayjs";
import { resolveTenant } from "@/lib/tenant";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import type { Diet, OrderType } from "@/lib/db/types";

type PlaceArgs = { menuItemId: string; qty: number }[];

type PlaceResult =
  | { ok: true; orderId: string; razorpayOrderId: string | null; simulated: boolean }
  | { ok: false; error: string; code?: "AUTH_REQUIRED" | "EMPTY" | "RATE_LIMITED" | "OUT_OF_STOCK" };

type MenuRow = {
  id: string;
  name: string;
  price_paise: number;
  diet: Diet;
  status: "draft" | "live" | "archived";
  in_stock: boolean;
  stock_qty: number | null;
};

export async function placeOrder(
  lines: PlaceArgs,
  note: string,
  orderType: OrderType = "takeaway",
  tableLabel: string | null = null
): Promise<PlaceResult> {
  if (!lines || lines.length === 0) return { ok: false, error: "Cart is empty", code: "EMPTY" };

  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) return { ok: false, error: "Tenant not found" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in to place an order", code: "AUTH_REQUIRED" };

  const rl = await rateLimit(`placeOrder:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) return { ok: false, error: "Too many orders — slow down a moment", code: "RATE_LIMITED" };

  const supabase = await getServerClient(tenant.id);
  const ids = lines.map((l) => l.menuItemId);
  const { data: itemsRaw, error: itemsErr } = await supabase
    .from("menu_items")
    .select("id, name, price_paise, diet, status, in_stock, stock_qty")
    .in("id", ids)
    .returns<MenuRow[]>();
  if (itemsErr || !itemsRaw) return { ok: false, error: "Could not load menu" };

  const map = new Map<string, MenuRow>(itemsRaw.map((i) => [i.id, i]));
  let total = 0;
  const validated: { item: MenuRow; qty: number }[] = [];
  for (const l of lines) {
    const it = map.get(l.menuItemId);
    if (!it) return { ok: false, error: "An item in your cart is no longer available", code: "OUT_OF_STOCK" };
    if (it.status !== "live" || !it.in_stock) {
      return { ok: false, error: `${it.name} just went out of stock`, code: "OUT_OF_STOCK" };
    }
    if (it.stock_qty !== null && it.stock_qty < l.qty) {
      return { ok: false, error: `Only ${it.stock_qty} ${it.name} left`, code: "OUT_OF_STOCK" };
    }
    if (l.qty <= 0 || l.qty > 20) return { ok: false, error: "Bad quantity" };
    total += it.price_paise * l.qty;
    validated.push({ item: it, qty: l.qty });
  }

  const admin = getAdminClient(tenant.id);
  const { data: codeData, error: codeErr } = await admin.rpc("next_order_short_code", {
    p_tenant: tenant.id,
  });
  if (codeErr || !codeData) return { ok: false, error: "Could not assign order code" };

  const orderInsert = await admin
    .from("orders")
    .insert({
      tenant_id: tenant.id,
      user_id: user.id,
      short_code: codeData as string,
      status: "pending_payment",
      total_paise: total,
      order_type: orderType,
      table_label: tableLabel,
      customer_name: user.displayName ?? user.email ?? "Student",
      notes: note ? note.slice(0, 120) : null,
      payment_expires_at: dayjs().add(15, "minute").toISOString(),
    })
    .select("id, short_code")
    .single<{ id: string; short_code: string }>();
  if (orderInsert.error || !orderInsert.data) {
    return { ok: false, error: orderInsert.error?.message ?? "Could not create order" };
  }
  const order = orderInsert.data;

  await admin.from("order_items").insert(
    validated.map((v) => ({
      tenant_id: tenant.id,
      order_id: order.id,
      menu_item_id: v.item.id,
      name_snapshot: v.item.name,
      price_paise_snapshot: v.item.price_paise,
      diet_snapshot: v.item.diet,
      qty: v.qty,
    }))
  );

  await admin.from("order_status_logs").insert({
    tenant_id: tenant.id,
    order_id: order.id,
    from_status: null,
    to_status: "pending_payment",
    actor_user_id: user.id,
    note: "Order placed",
  });
  await admin.from("audit_logs").insert({
    tenant_id: tenant.id,
    actor_user_id: user.id,
    action: "order.placed",
    target_type: "order",
    target_id: order.id,
    meta: { total_paise: total, items: validated.length, order_type: orderType },
  });

  const rzp = await createRazorpayOrder({
    amountPaise: total,
    receipt: order.short_code,
    notes: { tenant: tenant.slug, order: order.id },
  });

  await admin.from("payments").insert({
    tenant_id: tenant.id,
    order_id: order.id,
    razorpay_order_id: rzp.id,
    amount_paise: total,
    status: "initiated",
  });

  revalidatePath("/menu");
  return { ok: true, orderId: order.id, razorpayOrderId: rzp.id, simulated: rzp.simulated };
}

export async function simulatePaymentCapture(orderId: string): Promise<{ ok: boolean; error?: string }> {
  // Hard gate: never simulate captures once real Razorpay keys are present.
  // This makes the dev shortcut a no-op the moment we wire live billing.
  const { featureFlags } = await import("@/lib/env");
  if (featureFlags.razorpayLive) {
    return { ok: false, error: "Simulator disabled in live mode" };
  }
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) return { ok: false, error: "Tenant missing" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const admin = getAdminClient(tenant.id);
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .maybeSingle<{ id: string; user_id: string | null; status: string }>();
  if (!order || order.user_id !== user.id) return { ok: false, error: "Order not found" };
  if (order.status !== "pending_payment") return { ok: true };

  await admin
    .from("payments")
    .update({ status: "captured", razorpay_payment_id: `pay_sim_${orderId.slice(0, 8)}` })
    .eq("order_id", orderId);

  await admin.from("orders").update({ status: "placed" }).eq("id", orderId);

  await admin.from("order_status_logs").insert({
    tenant_id: tenant.id,
    order_id: orderId,
    from_status: "pending_payment",
    to_status: "placed",
    actor_user_id: user.id,
    note: "Simulated payment capture",
  });

  return { ok: true };
}

export async function getMyOrderOtp(orderId: string): Promise<{ otp: string | null }> {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) return { otp: null };
  const user = await getCurrentUser();
  if (!user) return { otp: null };

  // SECURITY DEFINER function re-checks ownership + status + expiry; we cannot
  // bypass it. This is the ONLY surface that returns plaintext OTP.
  const supabase = await getServerClient(tenant.id);
  // Cast the args param: the generated Database type doesn't always surface
  // SECURITY DEFINER fn arg types correctly when regenerated incrementally.
  const { data } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown }>
  )("read_my_pickup_otp", { p_order: orderId });
  return { otp: typeof data === "string" ? data : null };
}
