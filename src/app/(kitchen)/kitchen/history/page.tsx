import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, ChefHat } from "lucide-react";
import { resolveTenant } from "@/lib/tenant";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/get-user";
import { formatRupees, formatTimeIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

type HistoryItem = { name: string; qty: number; diet: "veg" | "nonveg" | "egg" };

type HistoryOrder = {
  id: string;
  short_code: string;
  status: "collected" | "rejected" | "refunded";
  total_paise: number;
  placed_at: string;
  ready_at: string | null;
  collected_at: string | null;
  customer_name: string | null;
  order_type: "takeaway" | "dine_in";
  items: HistoryItem[];
};

// Raw row from Supabase — items comes back as Json
type HistoryOrderRaw = Omit<HistoryOrder, "items"> & {
  items: unknown;
};

const STATUS_STYLES: Record<HistoryOrder["status"], string> = {
  collected: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700",
  rejected: "bg-tomato-100 text-tomato-700 dark:bg-tomato-900/30 dark:text-tomato-300 border border-tomato-300 dark:border-tomato-700",
  refunded: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300 dark:border-amber-700",
};

const STATUS_LABEL: Record<HistoryOrder["status"], string> = {
  collected: "Collected",
  rejected: "Rejected",
  refunded: "Refunded",
};

function summariseItems(items: HistoryItem[]): string {
  return items
    .slice(0, 3)
    .map((i) => `${i.qty}× ${i.name}`)
    .join(", ")
    .concat(items.length > 3 ? ` +${items.length - 3} more` : "");
}

export default async function KitchenHistoryPage() {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) return null;

  const user = await requireRole(["kitchen_staff", "canteen_admin", "super_admin"]);
  if (!user) redirect(`/login?next=/kitchen/history`);

  const admin = getAdminClient(tenant.id);

  // Use a raw RPC-style query via .from() with manual join — Supabase JS doesn't
  // support GROUP BY, so we fetch orders and items separately and merge in TS.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [{ data: rawOrders }, { data: rawItems }] = await Promise.all([
    admin
      .from("orders")
      .select("id, short_code, status, total_paise, placed_at, ready_at, collected_at, customer_name, order_type")
      .eq("tenant_id", tenant.id)
      .in("status", ["collected", "rejected", "refunded"])
      .gte("placed_at", todayIso)
      .order("collected_at", { ascending: false, nullsFirst: false })
      .limit(100)
      .returns<Omit<HistoryOrderRaw, "items">[]>(),
    admin
      .from("order_items")
      .select("order_id, name_snapshot, qty, diet_snapshot")
      .eq("tenant_id", tenant.id)
      .returns<{ order_id: string; name_snapshot: string; qty: number; diet_snapshot: "veg" | "nonveg" | "egg" }[]>(),
  ]);

  const orders = rawOrders ?? [];
  const items = rawItems ?? [];

  // Build item map keyed by order_id
  const itemsByOrder = new Map<string, HistoryItem[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push({ name: item.name_snapshot, qty: item.qty, diet: item.diet_snapshot });
    itemsByOrder.set(item.order_id, list);
  }

  const history: HistoryOrder[] = orders
    .filter((o): o is typeof o & { status: HistoryOrder["status"] } =>
      ["collected", "rejected", "refunded"].includes(o.status)
    )
    .map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) ?? [],
    }));

  // Summary stats
  const totalCollected = history.filter((o) => o.status === "collected").length;
  const totalRejected = history.filter((o) => o.status === "rejected").length;
  const totalRefunded = history.filter((o) => o.status === "refunded").length;
  const totalRevenue = history
    .filter((o) => o.status === "collected")
    .reduce((acc, o) => acc + o.total_paise, 0);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b-2 border-tomato-900 bg-cream-50 dark:bg-graphite-900">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/c/${tenant.slug}/kitchen`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border-2 border-tomato-900 dark:border-cream-200 text-[12px] font-medium hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 transition-colors"
              aria-label="Back to kitchen board"
            >
              <ArrowLeft size={13} /> Board
            </Link>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-tomato-900/70 dark:text-cream-200/60">
                {tenant.name} · Today
              </div>
              <h1 className="font-display font-medium tracking-[-0.025em] text-[22px] sm:text-[26px] leading-none mt-0.5">
                Order <span className="italic text-tomato-500">history.</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ChefHat size={18} className="text-tomato-900/50 dark:text-cream-200/50" />
            <span className="text-[12px] font-mono text-tomato-900/60 dark:text-cream-200/60">
              Completed orders — today
            </span>
          </div>
        </div>

        {/* Summary strip */}
        <div className="border-t-2 border-tomato-900 px-4 sm:px-6 lg:px-8 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Collected", value: String(totalCollected), tone: "text-emerald-600 dark:text-emerald-400" },
            { label: "Rejected", value: String(totalRejected), tone: "text-tomato-500" },
            { label: "Refunded", value: String(totalRefunded), tone: "text-amber-600 dark:text-amber-400" },
            { label: "Revenue today", value: formatRupees(totalRevenue), tone: "" },
          ].map((cell) => (
            <div
              key={cell.label}
              className="bg-cream-50 dark:bg-graphite-800 border-2 border-tomato-900 dark:border-cream-200/30 p-2.5 shadow-[4px_4px_0_0_var(--color-tomato-900)] dark:shadow-[4px_4px_0_0_rgba(247,200,194,0.3)]"
            >
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-tomato-900/65 dark:text-cream-200/60">
                {cell.label}
              </div>
              <div className={`font-display text-[24px] sm:text-[28px] font-medium tabular leading-none mt-1 ${cell.tone}`}>
                {cell.value}
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* Table */}
      <main className="px-4 sm:px-6 lg:px-8 py-6">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-tomato-900/40 dark:text-cream-200/40">
            <p className="font-mono text-sm">No completed orders yet today.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border-2 border-tomato-900 dark:border-cream-200/30">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-tomato-900 text-cream-50">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider font-semibold">Code</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider font-semibold">Items</th>
                  <th className="px-4 py-3 text-right font-mono text-[11px] uppercase tracking-wider font-semibold">Total</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider font-semibold">Time</th>
                  <th className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-wider font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tomato-900/15 dark:divide-cream-200/10">
                {history.map((order, idx) => (
                  <tr
                    key={order.id}
                    className={idx % 2 === 0 ? "bg-cream-50 dark:bg-graphite-900" : "bg-cream-100 dark:bg-graphite-800"}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-tomato-500">
                      #{order.short_code}
                    </td>
                    <td className="px-4 py-3 text-tomato-900 dark:text-cream-200">
                      {order.customer_name ?? "Guest"}
                      {order.order_type === "dine_in" && (
                        <span className="ml-1.5 text-[10px] font-mono text-tomato-900/50 dark:text-cream-200/50 uppercase">dine-in</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-tomato-900/80 dark:text-cream-200/80 max-w-xs truncate">
                      {summariseItems(order.items)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-tomato-900 dark:text-cream-200">
                      {formatRupees(order.total_paise)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-tomato-900/60 dark:text-cream-200/60 whitespace-nowrap">
                      {order.collected_at
                        ? formatTimeIST(new Date(order.collected_at))
                        : formatTimeIST(new Date(order.placed_at))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider",
                          STATUS_STYLES[order.status],
                        ].join(" ")}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
