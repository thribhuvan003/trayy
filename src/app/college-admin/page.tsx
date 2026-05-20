import "server-only";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { Building2, ShoppingBag, IndianRupee, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

type CanteenRow = {
  id: string;
  slug: string;
  name: string;
  is_open: boolean;
  paused_until: string | null;
  building: string | null;
  zone: string | null;
  mess_type: string | null;
  hero_tagline: string | null;
  active_orders: number;
  revenue_24h: number;
};

function formatRupees(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function canteenStatus(row: CanteenRow): {
  label: string;
  color: string;
} {
  if (!row.is_open) return { label: "CLOSED", color: "text-rose-400 bg-rose-400/10 border-rose-400/20" };
  if (row.paused_until && new Date(row.paused_until) > new Date())
    return { label: "PAUSED", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
  return { label: "OPEN", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
}

export default async function CollegeAdminDashboard() {
  const serverClient = await getServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) redirect("/login?next=/college-admin");

  const admin = getAdminClient();

  // 1. Find the user's college
  const { data: membership } = await admin
    .from("college_memberships")
    .select("college_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/login?next=/college-admin");
  const { college_id } = membership;

  // 2. Fetch college info and canteens in parallel
  // Use tenants directly (not college_canteens RPC) so we have tenant IDs for order aggregation
  const [{ data: college }, { data: canteensData }] = await Promise.all([
    admin.from("colleges").select("id, name, slug").eq("id", college_id).single(),
    admin
      .from("tenants")
      .select("id, slug, name, is_open, paused_until, building, zone, mess_type, hero_tagline")
      .eq("college_id", college_id)
      .eq("is_active", true)
      .order("name"),
  ]);

  // Fetch aggregate order stats per canteen for the last 24h
  const tenantIds = (canteensData ?? []).map((t) => t.id);

  let orderStats: Record<string, { active_orders: number; revenue_24h: number }> = {};

  if (tenantIds.length > 0) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch active orders (no time filter — "placed" and "preparing" regardless of age)
    const { data: activeOrders } = await admin
      .from("orders")
      .select("tenant_id, status")
      .in("tenant_id", tenantIds)
      .in("status", ["placed", "preparing"]);

    for (const o of activeOrders ?? []) {
      if (!orderStats[o.tenant_id]) {
        orderStats[o.tenant_id] = { active_orders: 0, revenue_24h: 0 };
      }
      orderStats[o.tenant_id].active_orders += 1;
    }

    // Fetch revenue-eligible orders for the last 24 h only — push filter to DB.
    // Exclude unpaid, cancelled, and failed statuses from revenue.
    const { data: recentOrders } = await admin
      .from("orders")
      .select("tenant_id, status, total_paise")
      .in("tenant_id", tenantIds)
      .gte("placed_at", since24h)
      .not("status", "in", '("pending_payment","rejected","expired","refunded")');

    for (const o of recentOrders ?? []) {
      if (!orderStats[o.tenant_id]) {
        orderStats[o.tenant_id] = { active_orders: 0, revenue_24h: 0 };
      }
      orderStats[o.tenant_id].revenue_24h += o.total_paise;
    }
  }

  const canteens: CanteenRow[] = (canteensData ?? []).map((t) => ({
    ...t,
    active_orders: orderStats[t.id]?.active_orders ?? 0,
    revenue_24h: orderStats[t.id]?.revenue_24h ?? 0,
  }));

  const totalActiveOrders = canteens.reduce((s, c) => s + c.active_orders, 0);
  const totalRevenue24h = canteens.reduce((s, c) => s + c.revenue_24h, 0);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <h1 className="font-display text-2xl font-medium text-graphite-200">
          Welcome, {college?.name ?? "College"} Admin
        </h1>
        <p className="text-[13px] text-graphite-400 mt-1">
          Manage all canteens and view consolidated reports for your institution.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-graphite-700 border border-graphite-200/[0.08] rounded-xl p-4 hover:border-graphite-200/[0.15] transition-colors">
          <div className="inline-flex h-7 w-7 rounded-md items-center justify-center bg-graphite-200/[0.06]">
            <Building2 size={13} className="text-graphite-300" strokeWidth={1.6} />
          </div>
          <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.12em] text-graphite-400">
            Total Canteens
          </div>
          <div className="mt-1 font-display text-[28px] font-medium tabular leading-none text-graphite-200">
            {canteens.length}
          </div>
        </div>

        <div className="bg-graphite-700 border border-graphite-200/[0.08] rounded-xl p-4 hover:border-graphite-200/[0.15] transition-colors">
          <div className="inline-flex h-7 w-7 rounded-md items-center justify-center bg-graphite-200/[0.06]">
            <ShoppingBag size={13} className="text-graphite-300" strokeWidth={1.6} />
          </div>
          <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.12em] text-graphite-400">
            Active Orders
          </div>
          <div className="mt-1 font-display text-[28px] font-medium tabular leading-none text-graphite-200">
            {totalActiveOrders}
          </div>
        </div>

        <div className="bg-graphite-700 border border-graphite-200/[0.08] rounded-xl p-4 hover:border-graphite-200/[0.15] transition-colors">
          <div className="inline-flex h-7 w-7 rounded-md items-center justify-center bg-graphite-200/[0.06]">
            <IndianRupee size={13} className="text-graphite-300" strokeWidth={1.6} />
          </div>
          <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.12em] text-graphite-400">
            Revenue (24h)
          </div>
          <div className="mt-1 font-display text-[28px] font-medium tabular leading-none text-graphite-200">
            {formatRupees(totalRevenue24h)}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Link
          href="/college-admin/reports"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono uppercase tracking-wider text-graphite-300 hover:border-lime hover:text-lime transition-colors"
        >
          View Reports <ArrowRight size={11} />
        </Link>
        <Link
          href="/college-admin/canteens"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono uppercase tracking-wider text-graphite-300 hover:border-lime hover:text-lime transition-colors"
        >
          Manage Canteens <ArrowRight size={11} />
        </Link>
      </div>

      {/* Canteen grid */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-graphite-400 font-semibold mb-3">
          All Canteens
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {canteens.map((c) => {
            const status = canteenStatus(c);
            return (
              <Link
                key={c.id}
                href={`/c/${c.slug}/admin/dashboard`}
                className="group bg-graphite-700 border border-graphite-200/[0.08] rounded-xl p-4 hover:border-graphite-200/[0.18] transition-colors flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-medium text-graphite-200 group-hover:text-lime transition-colors">
                      {c.name}
                    </div>
                    {(c.building || c.zone) && (
                      <div className="text-[11px] text-graphite-400 mt-0.5">
                        {[c.building, c.zone].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${status.color}`}
                  >
                    {status.label}
                  </span>
                </div>

                {c.mess_type && (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-graphite-400">
                    {c.mess_type}
                  </div>
                )}

                <div className="flex items-center gap-4 text-[11px] text-graphite-400 border-t border-graphite-200/[0.06] pt-3">
                  <span>
                    <span className="text-graphite-200 font-medium">{c.active_orders}</span>{" "}
                    active orders
                  </span>
                  <span>
                    <span className="text-graphite-200 font-medium">
                      {formatRupees(c.revenue_24h)}
                    </span>{" "}
                    24h
                  </span>
                </div>
              </Link>
            );
          })}

          {canteens.length === 0 && (
            <div className="col-span-full text-center py-12 text-graphite-400 text-[13px]">
              No canteens found for your college.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
