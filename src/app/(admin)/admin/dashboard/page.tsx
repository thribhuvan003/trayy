import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { DashboardView } from "@/components/portal-admin/dashboard-view";
import { WelcomeBanner } from "@/components/portal-admin/welcome-banner";
import { CanteenLinks } from "@/components/portal-admin/canteen-links";
import { env } from "@/lib/env";
import { requireTenantContext } from "@/lib/tenant";

type OrderRow = {
  id: string;
  short_code: string;
  status: "pending_payment" | "placed" | "preparing" | "ready" | "collected" | "rejected" | "expired";
  total_paise: number;
  placed_at: string;
  collected_at: string | null;
  ready_at: string | null;
  customer_name: string | null;
  order_type: "takeaway" | "dine_in";
};

type StatusLog = {
  id: string;
  order_id: string;
  to_status: string;
  from_status: string | null;
  created_at: string;
  note: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  name_snapshot: string;
  qty: number;
  diet_snapshot: "veg" | "nonveg" | "egg";
  price_paise_snapshot: number;
};

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const showWelcome = sp.welcome === "1";

  // Production-grade tenant context (enforces "one login = own dedicated system per canteen" promise).
  // Fail-fast with structured logging; no silent "aditya" default ever again.
  const { tenant } = await requireTenantContext();
  const supabase = await getServerClient(tenant.id);

  // Fetch college slug for the welcome banner (only on first load).
  let collegeSlug: string = tenant.slug; // safe fallback
  if (showWelcome) {
    const adm = getAdminClient(tenant.id);
    const { data: tenantRow } = await adm
      .from("tenants")
      .select("college_id")
      .eq("id", tenant.id)
      .maybeSingle<{ college_id: string | null }>();
    if (tenantRow?.college_id) {
      const { data: collegeRow } = await adm
        .from("colleges")
        .select("slug")
        .eq("id", tenantRow.college_id)
        .maybeSingle<{ slug: string }>();
      if (collegeRow?.slug) collegeSlug = collegeRow.slug;
    }
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const start14d = new Date();
  start14d.setDate(start14d.getDate() - 13);
  start14d.setHours(0, 0, 0, 0);

  // Pull 14 days so we can compute deltas vs the prior 7-day window.
  const [{ data: orders14 }, { data: logs }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, short_code, status, total_paise, placed_at, collected_at, ready_at, customer_name, order_type")
      .eq("tenant_id", tenant.id)
      .gte("placed_at", start14d.toISOString())
      .order("placed_at", { ascending: false })
      .limit(1600)
      .returns<OrderRow[]>(),
    supabase
      .from("order_status_logs")
      .select("id, order_id, to_status, from_status, created_at, note")
      .eq("tenant_id", tenant.id)
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: false })
      .limit(40)
      .returns<StatusLog[]>(),
  ]);

  const todayIso = startOfDay.toISOString();
  const start7d = new Date();
  start7d.setDate(start7d.getDate() - 6);
  start7d.setHours(0, 0, 0, 0);
  const start7dIso = start7d.toISOString();
  const ordersWeek = (orders14 ?? []).filter((o) => o.placed_at >= start7dIso);
  const todayOrders = ordersWeek.filter((o) => o.placed_at >= todayIso);
  const todayIds = todayOrders.map((o) => o.id);

  // Scope order_items to today only — the previous version pulled every row
  // in the tenant.
  let todayItems: OrderItemRow[] = [];
  if (todayIds.length > 0) {
    const { data } = await supabase
      .from("order_items")
      .select("id, order_id, name_snapshot, qty, diet_snapshot, price_paise_snapshot")
      .in("order_id", todayIds)
      .returns<OrderItemRow[]>();
    todayItems = data ?? [];
  }

  // Yesterday-equivalent window: same number of hours today have elapsed,
  // but exactly 7 days ago. Compares like for like for an active business day.
  const elapsedMs = Date.now() - startOfDay.getTime();
  const lwStart = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lwEnd = new Date(lwStart.getTime() + elapsedMs);
  const lastWeekToday = (orders14 ?? []).filter(
    (o) => o.placed_at >= lwStart.toISOString() && o.placed_at < lwEnd.toISOString()
  );

  // Service state for Open / Pause on Today home (Indian owner P0)
  const admin = getAdminClient(tenant.id);
  const { data: serviceRow } = await admin
    .from("tenants")
    .select("is_open, opens_at, closes_at, paused_until, upi_vpa")
    .eq("id", tenant.id)
    .maybeSingle<{
      is_open: boolean;
      opens_at: string | null;
      closes_at: string | null;
      paused_until: string | null;
      upi_vpa: string | null;
    }>();

  return (
    <>
      {showWelcome && (
        <WelcomeBanner
          tenantSlug={tenant.slug}
          collegeSlug={collegeSlug}
          appUrl={env.APP_URL}
        />
      )}
      <CanteenLinks
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
        collegeSlug={collegeSlug !== tenant.slug ? collegeSlug : null}
        appUrl={env.APP_URL}
      />
      <DashboardView
        tenantName={tenant.name}
        tenantSlug={tenant.slug}
        tenantId={tenant.id}
        ordersWeek={ordersWeek}
        todayOrders={todayOrders}
        lastWeekToday={lastWeekToday}
        logs={logs ?? []}
        todayItems={todayItems}
        isOpen={serviceRow?.is_open ?? true}
        pausedUntil={serviceRow?.paused_until ?? null}
        opensAt={serviceRow?.opens_at ?? null}
        closesAt={serviceRow?.closes_at ?? null}
        upiVpa={serviceRow?.upi_vpa ?? tenant.upi_vpa ?? null}
      />
    </>
  );
}
