import Link from "next/link";
import { headers } from "next/headers";
import { Download } from "lucide-react";
import { resolveTenant } from "@/lib/tenant";
import { getServerClient } from "@/lib/supabase/server";
import { formatRupees } from "@/lib/utils";
import { OrdersTable } from "@/components/portal-admin/orders-table";

type Row = {
  id: string;
  short_code: string;
  status: string;
  total_paise: number;
  placed_at: string;
  customer_name: string | null;
  order_type: "takeaway" | "dine_in";
  table_label: string | null;
};


export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "";
  const tenant = await resolveTenant(slug);
  if (!tenant) return null;
  const supabase = await getServerClient(tenant.id);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayIso = startOfDay.toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, short_code, status, total_paise, placed_at, customer_name, order_type, table_label")
    .eq("tenant_id", tenant.id)
    .order("placed_at", { ascending: false })
    .limit(100)
    .returns<Row[]>();

  const allOrders = orders ?? [];
  const todayOrders = allOrders.filter((o) => o.placed_at >= todayIso);
  const todayRevenue = todayOrders
    .filter((o) => !["pending_payment", "rejected", "expired"].includes(o.status))
    .reduce((acc, o) => acc + o.total_paise, 0);

  // Build today's export URL
  const todayExportUrl = `/api/admin/export/orders?slug=${encodeURIComponent(tenant.slug)}&from=${encodeURIComponent(todayIso)}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-tight">Orders</h1>
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-graphite-400 mt-0.5">
            Last 100 · all statuses
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={todayExportUrl}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono uppercase tracking-wider text-graphite-300 hover:border-lime hover:text-lime transition-colors"
          >
            <Download size={11} /> Export today&apos;s CSV
          </a>
          <a
            href={`/api/admin/export/orders?slug=${encodeURIComponent(tenant.slug)}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono uppercase tracking-wider text-graphite-300 hover:border-lime hover:text-lime transition-colors"
          >
            <Download size={11} /> Export all
          </a>
        </div>
      </div>

      {/* Today's summary strip */}
      <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-graphite-200/[0.08] bg-graphite-700/60 px-5 py-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-graphite-400">Today&apos;s orders</div>
          <div className="font-display text-[22px] font-semibold text-graphite-200 leading-tight">{todayOrders.length}</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-graphite-400">Today&apos;s revenue</div>
          <div className="font-display text-[22px] font-semibold text-lime leading-tight">
            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(todayRevenue / 100)}
          </div>
        </div>
      </div>

      <OrdersTable orders={allOrders} />
    </div>
  );
}
