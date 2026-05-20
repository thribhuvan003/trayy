import "server-only";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { IndianRupee, ShoppingBag, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

function formatRupees(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export default async function ReportsPage() {
  const serverClient = await getServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) redirect("/login?next=/college-admin/reports");

  const admin = getAdminClient();

  const { data: membership } = await admin
    .from("college_memberships")
    .select("college_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/login?next=/college-admin/reports");

  // Fetch all active tenants for this college
  const { data: tenants } = await admin
    .from("tenants")
    .select("id, name, slug")
    .eq("college_id", membership.college_id)
    .eq("is_active", true)
    .order("name");

  const tenantIds = (tenants ?? []).map((t) => t.id);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayIso = startOfDay.toISOString();

  let totalOrdersToday = 0;
  let totalRevenueToday = 0;
  const orderCountByTenant: Record<string, number> = {};
  const revenueByTenant: Record<string, number> = {};

  if (tenantIds.length > 0) {
    const { data: orders } = await admin
      .from("orders")
      .select("tenant_id, status, placed_at, total_paise")
      .in("tenant_id", tenantIds)
      .gte("placed_at", todayIso);

    const EXCLUDED_STATUSES = new Set(["rejected", "expired", "refunded", "pending_payment"]);
    for (const o of orders ?? []) {
      // Count and sum only confirmed/paid orders (exclude failed and unpaid)
      if (!EXCLUDED_STATUSES.has(o.status)) {
        totalOrdersToday += 1;
        totalRevenueToday += o.total_paise ?? 0;
        orderCountByTenant[o.tenant_id] = (orderCountByTenant[o.tenant_id] ?? 0) + 1;
        revenueByTenant[o.tenant_id] =
          (revenueByTenant[o.tenant_id] ?? 0) + (o.total_paise ?? 0);
      }
    }
  }

  // Determine most popular canteen
  let topCanteen: { name: string; slug: string; count: number } | null = null;
  for (const t of tenants ?? []) {
    const count = orderCountByTenant[t.id] ?? 0;
    if (!topCanteen || count > topCanteen.count) {
      topCanteen = { name: t.name, slug: t.slug, count };
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-medium text-graphite-200">Reports</h1>
        <p className="text-[13px] text-graphite-400 mt-1">
          Aggregate statistics across all canteens for today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Orders today */}
        <div className="bg-graphite-700 border border-graphite-200/[0.08] rounded-xl p-4 hover:border-graphite-200/[0.15] transition-colors">
          <div className="inline-flex h-7 w-7 rounded-md items-center justify-center bg-graphite-200/[0.06]">
            <ShoppingBag size={13} className="text-graphite-300" strokeWidth={1.6} />
          </div>
          <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.12em] text-graphite-400">
            Total Orders Today
          </div>
          <div className="mt-1 font-display text-[28px] font-medium tabular leading-none text-graphite-200">
            {totalOrdersToday}
          </div>
        </div>

        {/* Revenue today */}
        <div className="bg-graphite-700 border border-graphite-200/[0.08] rounded-xl p-4 hover:border-graphite-200/[0.15] transition-colors">
          <div className="inline-flex h-7 w-7 rounded-md items-center justify-center bg-graphite-200/[0.06]">
            <IndianRupee size={13} className="text-graphite-300" strokeWidth={1.6} />
          </div>
          <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.12em] text-graphite-400">
            Total Revenue Today
          </div>
          <div className="mt-1 font-display text-[28px] font-medium tabular leading-none text-graphite-200">
            {formatRupees(totalRevenueToday)}
          </div>
        </div>

        {/* Most popular */}
        <div className="bg-graphite-700 border border-graphite-200/[0.08] rounded-xl p-4 hover:border-graphite-200/[0.15] transition-colors">
          <div className="inline-flex h-7 w-7 rounded-md items-center justify-center bg-graphite-200/[0.06]">
            <Trophy size={13} className="text-graphite-300" strokeWidth={1.6} />
          </div>
          <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.12em] text-graphite-400">
            Most Popular Today
          </div>
          {topCanteen && topCanteen.count > 0 ? (
            <>
              <div className="mt-1 font-display text-[18px] font-medium leading-tight text-graphite-200">
                {topCanteen.name}
              </div>
              <div className="text-[11px] text-graphite-400 mt-1">
                {topCanteen.count} orders
              </div>
            </>
          ) : (
            <div className="mt-1 text-[13px] text-graphite-400">No orders yet</div>
          )}
        </div>
      </div>

      {/* Per-canteen breakdown */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-graphite-400 font-semibold mb-3">
          Breakdown by Canteen
        </div>
        <div className="border border-graphite-200/[0.08] rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-graphite-200/[0.08] bg-graphite-800/40">
                <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-graphite-400 font-medium">
                  Canteen
                </th>
                <th className="text-right px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-graphite-400 font-medium">
                  Orders Today
                </th>
                <th className="text-right px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-graphite-400 font-medium">
                  Revenue Today
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-200/[0.05]">
              {(tenants ?? [])
                .sort(
                  (a, b) =>
                    (orderCountByTenant[b.id] ?? 0) - (orderCountByTenant[a.id] ?? 0)
                )
                .map((t) => {
                  const count = orderCountByTenant[t.id] ?? 0;
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-graphite-200/[0.03] transition-colors"
                    >
                      <td className="px-4 py-3 text-graphite-200 font-medium">{t.name}</td>
                      <td className="px-4 py-3 text-right text-graphite-300 font-mono">
                        {count}
                      </td>
                      <td className="px-4 py-3 text-right text-graphite-300 font-mono">
                        {formatRupees(revenueByTenant[t.id] ?? 0)}
                      </td>
                    </tr>
                  );
                })}

              {(tenants ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-graphite-400 text-[13px]"
                  >
                    No canteens found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
