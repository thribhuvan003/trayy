import { redirect } from "next/navigation";
import { requireTenantContext } from "@/lib/tenant";
import { getServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { Announcer } from "@/components/portal-kitchen/announcer";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  short_code: string;
  total_paise: number;
  placed_at: string;
};
type LineRow = {
  order_id: string;
  name_snapshot: string;
  qty: number;
};

export default async function KitchenAnnouncePage() {
  // Same production-grade tenant context as the kitchen board (fail-fast + rich logging).
  let tenantCtx;
  try {
    tenantCtx = await requireTenantContext();
  } catch {
    return null;
  }
  const tenant = tenantCtx.tenant;

  const user = await requireRole(["kitchen_staff", "canteen_admin", "super_admin"]);
  if (!user) redirect(`/c/${tenant.slug}/login?next=/c/${tenant.slug}/kitchen/announce`);

  const supabase = await getServerClient(tenant.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  // Snapshot of today's paid ("placed") orders. The client seeds its seen-set from
  // these ids so a page refresh never re-announces orders that already landed.
  const { data: orders } = await supabase
    .from("orders")
    .select("id, short_code, total_paise, placed_at")
    .eq("tenant_id", tenant.id)
    .eq("status", "placed")
    .gte("placed_at", todayIso)
    .order("placed_at", { ascending: false })
    .limit(30)
    .returns<OrderRow[]>();

  const orderIds = (orders ?? []).map((o) => o.id);
  let lines: LineRow[] = [];
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from("order_items")
      .select("order_id, name_snapshot, qty")
      .in("order_id", orderIds)
      .returns<LineRow[]>();
    lines = data ?? [];
  }

  return (
    <Announcer
      tenantId={tenant.id}
      tenantName={tenant.name}
      tenantSlug={tenant.slug}
      initialOrders={orders ?? []}
      initialLines={lines}
    />
  );
}
