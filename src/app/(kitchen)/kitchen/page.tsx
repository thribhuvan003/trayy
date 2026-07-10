import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { requireTenantContext } from "@/lib/tenant";
import { resolveFeatures } from "@/lib/features";
import { getServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { KitchenBoard } from "@/components/portal-kitchen/board";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  short_code: string;
  status: "placed" | "preparing" | "ready" | "collected" | "pending_payment" | "rejected" | "expired";
  total_paise: number;
  placed_at: string;
  ready_at: string | null;
  collected_at: string | null;
  customer_name: string | null;
  order_type: "takeaway" | "dine_in";
  table_label: string | null;
  otp_attempts: number;
};
type LineRow = {
  id: string;
  order_id: string;
  name_snapshot: string;
  qty: number;
  diet_snapshot: "veg" | "nonveg" | "egg";
  menu_item_id: string | null;
};
type KitchenMenuItemRow = { id: string; name: string; price_paise: number; diet: "veg" | "nonveg" | "egg"; is_special: boolean; in_stock: boolean; category_id: string | null };

export default async function KitchenPage() {
  // Use the standardized production-grade tenant context (fail-fast + rich logging).
  // This removes the ad-hoc ?? "aditya" fallback and makes kitchen pages consistent
  // with the "own dedicated system" contract (as emphasized by the Isolation Architect).
  let tenantCtx;
  try {
    tenantCtx = await requireTenantContext();
  } catch {
    return null;
  }
  const tenant = tenantCtx.tenant;

  const user = await requireRole(["kitchen_staff", "canteen_admin", "super_admin"]);
  if (!user) redirect(`/c/${tenant.slug}/login?next=/c/${tenant.slug}/kitchen`);

  // Token counter mode: paid orders auto-confirm and terminate at `placed` —
  // there is nothing to work on a board. Showing it would fill Incoming with
  // tickets nobody is meant to touch.
  if (!resolveFeatures(tenant).hasKitchenQueue) {
    return (
      <div className="mx-auto max-w-lg px-6 pt-20 text-center">
        <h1 className="font-display text-[28px] font-semibold tracking-tight">
          Token counter mode
        </h1>
        <p className="text-[13.5px] opacity-70 mt-3 leading-relaxed">
          Paid orders confirm automatically — the customer&rsquo;s phone shows a token
          number and a PAID stamp to present at the counter. No board to work.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href={`/c/${tenant.slug}/kitchen/announce`}
            className="inline-flex h-11 items-center px-6 rounded-full bg-lime text-graphite-900 text-[13px] font-semibold"
          >
            Open the order announcer
          </Link>
          <Link
            href={`/c/${tenant.slug}/admin`}
            className="text-[12.5px] underline underline-offset-4 opacity-70 hover:opacity-100"
          >
            Today&rsquo;s money &amp; menu → Admin
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await getServerClient(tenant.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [{ data: orders }, { data: menuItems }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, short_code, status, total_paise, placed_at, ready_at, collected_at, customer_name, order_type, table_label, otp_attempts"
      )
      .eq("tenant_id", tenant.id)
      .in("status", ["placed", "preparing", "ready", "collected"])
      .gte("placed_at", todayIso)
      .order("placed_at", { ascending: true })
      .limit(300) // raised from 120 — handles high-volume campus canteens (150+ orders/day)
      .returns<OrderRow[]>(),
    supabase
      .from("menu_items")
      .select("id, name, price_paise, diet, is_special, in_stock, category_id")
      .eq("tenant_id", tenant.id)
      .eq("status", "live")
      .order("sort_order")
      .returns<KitchenMenuItemRow[]>(),
  ]);

  const orderIds = (orders ?? []).map((o) => o.id);
  let filteredLines: LineRow[] = [];
  if (orderIds.length > 0) {
    const { data: lines } = await supabase
      .from("order_items")
      .select("id, order_id, name_snapshot, qty, diet_snapshot, menu_item_id")
      .in("order_id", orderIds)
      .returns<LineRow[]>();
    filteredLines = lines ?? [];
  }

  return (
    <KitchenBoard
      tenantId={tenant.id}
      tenantName={tenant.name}
      tenantSlug={tenant.slug}
      orders={orders ?? []}
      lines={filteredLines}
      menuItems={menuItems ?? []}
    />
  );
}
