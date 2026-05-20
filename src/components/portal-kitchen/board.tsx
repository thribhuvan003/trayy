"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff, ChefHat, History as HistoryIcon, Radio, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase/browser";
import { formatRupees, formatTimeIST } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { OrderColumn } from "./order-column";
import { OtpVerifyDialog } from "./otp-verify-dialog";
import { KitchenMarquee } from "./marquee";

type Status = "placed" | "preparing" | "ready" | "collected";
type OrderRow = {
  id: string;
  short_code: string;
  status: Status | "pending_payment" | "rejected" | "expired";
  total_paise: number;
  placed_at: string;
  ready_at: string | null;
  collected_at: string | null;
  customer_name: string | null;
  order_type: "takeaway" | "dine_in";
  table_label: string | null;
};
type LineRow = {
  id: string;
  order_id: string;
  name_snapshot: string;
  qty: number;
  diet_snapshot: "veg" | "nonveg" | "egg";
};

export function KitchenBoard({
  tenantId,
  tenantName,
  tenantSlug,
  orders: initialOrders,
  lines: initialLines,
  marquee,
}: {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  orders: OrderRow[];
  lines: LineRow[];
  marquee: { id: string; name: string; price_paise: number; diet: "veg" | "nonveg" | "egg" }[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [lines, setLines] = useState(initialLines);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [clock, setClock] = useState<string>("--:--");
  const [wsConnected, setWsConnected] = useState(false);
  const [bellOn, setBellOn] = useState(true);
  const bellOnRef = useRef(true);
  const seenOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));

  useEffect(() => {
    bellOnRef.current = bellOn;
  }, [bellOn]);

  useEffect(() => {
    const tick = () => setClock(formatTimeIST(new Date()));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  const playBell = () => {
    if (!bellOnRef.current) return;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.5);
      setTimeout(() => ctx.close().catch(() => {}), 700);
    } catch {
      // audio unavailable — silent fail
    }
  };

  useEffect(() => {
    const sb = getBrowserClient();

    const refresh = async (onNewPlaced?: () => void) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data } = await sb
        .from("orders")
        .select(
          "id, short_code, status, total_paise, placed_at, ready_at, collected_at, customer_name, order_type, table_label"
        )
        .eq("tenant_id", tenantId)
        .in("status", ["placed", "preparing", "ready", "collected"])
        .gte("placed_at", today.toISOString())
        .order("placed_at", { ascending: true })
        .limit(120)
        .returns<OrderRow[]>();
      if (data) {
        const seen = seenOrderIdsRef.current;
        const newPlaced = data.some((o) => o.status === "placed" && !seen.has(o.id));
        for (const o of data) seen.add(o.id);
        setOrders(data);
        const ids = data.map((o) => o.id);
        if (ids.length === 0) {
          setLines([]);
        } else {
          const { data: l } = await sb
            .from("order_items")
            .select("id, order_id, name_snapshot, qty, diet_snapshot")
            .in("order_id", ids)
            .returns<LineRow[]>();
          setLines(l ?? []);
        }
        if (newPlaced) onNewPlaced?.();
      }
    };

    // Subscribe to the append-only order_events log (migration 0009 + 0011).
    // Cheaper + safer than postgres_changes on the orders table, and survives
    // the WAL-bomb pattern (REPLICA IDENTITY FULL is not needed).
    const channel = sb
      .channel(`kitchen:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_events",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const eventType = (payload.new as { event_type?: string } | null)?.event_type;
          void refresh(() => {
            if (eventType === "placed") playBell();
          });
        }
      )
      .subscribe((status) => {
        setWsConnected(status === "SUBSCRIBED");
      });

    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    // Lightweight safety-net poll for kitchens on flaky campus Wi-Fi where
    // the WS may silently die. 20s is far below the 60s connection timeout
    // and won't add meaningful DB load (one indexed query).
    const pollId = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20_000);

    return () => {
      sb.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(pollId);
    };
  }, [tenantId]);

  const groups = useMemo(() => {
    const g: Record<Status, OrderRow[]> = { placed: [], preparing: [], ready: [], collected: [] };
    for (const o of orders) {
      if (o.status in g) g[o.status as Status].push(o);
    }
    g.collected = g.collected.slice(-10);
    return g;
  }, [orders]);

  const linesByOrder = useMemo(() => {
    const m = new Map<string, LineRow[]>();
    for (const l of lines) {
      if (!m.has(l.order_id)) m.set(l.order_id, []);
      m.get(l.order_id)!.push(l);
    }
    return m;
  }, [lines]);

  const verifyOrder = verifyId ? orders.find((o) => o.id === verifyId) ?? null : null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b-2 border-tomato-900 bg-cream-50 dark:bg-graphite-900">
        <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-4 justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-tomato-900/70 dark:text-cream-200/60">
              Edition 03 · Tuesday 16 May 2026 · {tenantName} · Lunch Service
            </div>
            <h1 className="font-display font-medium tracking-[-0.025em] text-[24px] sm:text-[28px] leading-none mt-1">
              The kitchen <span className="italic text-tomato-500">queue.</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tomato-900/5 dark:bg-cream-200/5 text-[10px] font-mono uppercase tracking-wider">
              <Radio size={11} className={wsConnected ? "text-emerald-500" : "text-amber-500"} />
              {wsConnected ? "Live · WS" : "Reconnecting"}
            </span>
            <span className="font-mono tabular text-[18px] font-semibold text-tomato-900 dark:text-cream-200">
              {clock}
            </span>
            <button
              type="button"
              onClick={() => setBellOn((v) => !v)}
              aria-label={bellOn ? "Mute new-order chime" : "Unmute new-order chime"}
              title={bellOn ? "New-order chime: on" : "New-order chime: off"}
              className="inline-flex items-center justify-center h-9 w-9 rounded-full border-2 border-tomato-900 dark:border-cream-200 text-tomato-900 dark:text-cream-200 hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 transition-colors"
            >
              {bellOn ? <Bell size={14} /> : <BellOff size={14} />}
            </button>
            <ThemeToggle className="text-tomato-900 dark:text-cream-200" />
            <Link
              href={`/c/${tenantSlug}/kitchen/history`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border-2 border-tomato-900 dark:border-cream-200 text-[12px] font-medium hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 transition-colors"
              title="Today's completed orders"
            >
              <HistoryIcon size={12} /> History
            </Link>
            <Link
              href={`/c/${tenantSlug}/kitchen/staff-select`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border-2 border-tomato-900 dark:border-cream-200 text-[12px] font-medium hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 transition-colors"
              title="Switch logged-in staff member"
            >
              <UserRoundCog size={12} /> Switch Staff
            </Link>
            <Link
              href={`/c/${tenantSlug}/admin/dashboard`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border-2 border-tomato-900 dark:border-cream-200 text-[12px] font-medium hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
        <KitchenKpiStrip orders={orders} />
      </header>

      <KitchenMarquee items={marquee} />

      <main className="px-4 sm:px-6 lg:px-8 py-6">
        <PrepTotalsStrip orders={orders} lines={lines} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <OrderColumn
            title="Incoming"
            subtitle="Just paid · awaiting kitchen"
            status="placed"
            orders={groups.placed}
            linesByOrder={linesByOrder}
            onAction={async (id, action) => {
              const { markPreparing } = await import("@/app/(kitchen)/_actions");
              const r = await markPreparing(id);
              if (!r.ok) toast.error(r.error);
              if (action === "start" && r.ok) toast.success(`Started ${id.slice(0, 6)}`);
            }}
          />
          <OrderColumn
            title="Preparing"
            subtitle="On the line"
            status="preparing"
            orders={groups.preparing}
            linesByOrder={linesByOrder}
            onAction={async (id) => {
              const { markReady } = await import("@/app/(kitchen)/_actions");
              const r = await markReady(id);
              if (!r.ok) toast.error(r.error);
              else toast.success("Ready — pickup code issued");
            }}
          />
          <OrderColumn
            title="Ready"
            subtitle="Awaiting OTP at counter"
            status="ready"
            orders={groups.ready}
            linesByOrder={linesByOrder}
            onAction={(id) => setVerifyId(id)}
          />
          <OrderColumn
            title="Collected"
            subtitle="Today · last 10"
            status="collected"
            orders={groups.collected}
            linesByOrder={linesByOrder}
            onAction={() => {}}
          />
        </div>
      </main>

      <OtpVerifyDialog
        open={Boolean(verifyId)}
        order={verifyOrder}
        onClose={() => setVerifyId(null)}
        onResult={(ok) => {
          if (ok) setVerifyId(null);
        }}
      />
    </div>
  );
}

function KitchenKpiStrip({ orders }: { orders: OrderRow[] }) {
  const counts = useMemo(() => {
    return {
      placed: orders.filter((o) => o.status === "placed").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      ready: orders.filter((o) => o.status === "ready").length,
      collected: orders.filter((o) => o.status === "collected").length,
      revenue: orders.reduce((acc, o) => (o.status !== "rejected" && o.status !== "expired" ? acc + o.total_paise : acc), 0),
    };
  }, [orders]);
  const cells: { label: string; value: string; tone?: string; icon?: React.ReactNode }[] = [
    { label: "Incoming", value: String(counts.placed) },
    { label: "Preparing", value: String(counts.preparing) },
    { label: "Ready", value: String(counts.ready), tone: "text-tomato-500" },
    { label: "Collected today", value: String(counts.collected) },
    { label: "Revenue today", value: formatRupees(counts.revenue), icon: <ChefHat size={11} /> },
  ];
  return (
    <div className="border-t-2 border-tomato-900 px-4 sm:px-6 lg:px-8 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      {cells.map((c) => (
        <div
          key={c.label}
          className="bg-cream-50 dark:bg-graphite-800 border-2 border-tomato-900 dark:border-cream-200/30 p-2.5 shadow-[4px_4px_0_0_var(--color-tomato-900)] dark:shadow-[4px_4px_0_0_rgba(247,200,194,0.3)]"
        >
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-tomato-900/65 dark:text-cream-200/60 flex items-center gap-1.5">
            {c.icon} {c.label}
          </div>
          <div className={`font-display text-[24px] sm:text-[28px] font-medium tabular leading-none mt-1 ${c.tone ?? ""}`}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrepTotalsStrip({ orders, lines }: { orders: OrderRow[]; lines: LineRow[] }) {
  // loading: set of item names currently being 86'd/un-86'd
  const [loading, setLoading] = useState<Set<string>>(new Set());
  // recentlySoldOut: tracks items 86'd this session so we can show undo pill
  // Map<name, true> — persists until undo is pressed or page refreshes
  const [recentlySoldOut, setRecentlySoldOut] = useState<Map<string, true>>(new Map());

  const totals = useMemo(() => {
    const activeIds = new Set(
      orders.filter((o) => o.status === "placed" || o.status === "preparing").map((o) => o.id)
    );
    const m = new Map<string, number>();
    for (const l of lines) {
      if (!activeIds.has(l.order_id)) continue;
      m.set(l.name_snapshot, (m.get(l.name_snapshot) ?? 0) + l.qty);
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [orders, lines]);

  // Collect item names that were recently 86'd but have dropped to 0 active qty
  // so we can render ghost "undo" pills for them.
  const zeroedOut86Names = useMemo(() => {
    const activeNames = new Set(totals.map(([n]) => n));
    return Array.from(recentlySoldOut.keys()).filter((n) => !activeNames.has(n));
  }, [totals, recentlySoldOut]);

  const handle86 = async (name: string, inStock: boolean) => {
    setLoading((prev) => new Set(prev).add(name));
    try {
      const { markItemSoldOut } = await import("@/app/(kitchen)/_actions");
      const r = await markItemSoldOut(name, inStock);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
      } else if (!inStock) {
        toast.success(`86 — ${name} marked sold out. Student menu updated.`);
        setRecentlySoldOut((prev) => new Map(prev).set(name, true));
      } else {
        toast.success(`${name} back in stock.`);
        setRecentlySoldOut((prev) => {
          const next = new Map(prev);
          next.delete(name);
          return next;
        });
      }
    } catch {
      toast.error("Unexpected error — try again");
    } finally {
      setLoading((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  if (totals.length === 0 && zeroedOut86Names.length === 0) return null;

  return (
    <section
      aria-label="Prep totals — active orders"
      className="mb-4 border-2 border-tomato-900 dark:border-cream-200/30 bg-cream-50 dark:bg-graphite-800 p-3 shadow-[5px_5px_0_0_var(--color-tomato-900)] dark:shadow-[5px_5px_0_0_rgba(247,200,194,0.3)]"
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-tomato-900/65 dark:text-cream-200/60 mb-2">
        Prep totals · placed + preparing
      </div>
      <div className="flex flex-wrap gap-2">
        {totals.map(([name, qty]) => {
          const isLoading = loading.has(name);
          return (
            <div
              key={name}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border-2 border-tomato-900 dark:border-cream-200/30 bg-cream-100 dark:bg-graphite-900"
            >
              <span className="font-display text-[20px] sm:text-[22px] font-medium tabular leading-none text-tomato-500">
                {qty}
              </span>
              <span className="text-[12px] sm:text-[13px] font-medium truncate max-w-[180px]">
                {name}
              </span>
              {/* 86 button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handle86(name, false)}
                title={`86 — mark ${name} sold out`}
                aria-label={`Mark ${name} sold out`}
                className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-tomato-900/40 dark:border-cream-200/25 text-[10px] font-mono font-semibold uppercase tracking-wider text-tomato-700 dark:text-cream-300 hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 disabled:opacity-40 disabled:cursor-wait transition-colors"
              >
                <span className="line-through leading-none">86</span>
              </button>
            </div>
          );
        })}

        {/* Ghost "undo 86" pills for items recently sold out that now have 0 active qty */}
        {zeroedOut86Names.map((name) => {
          const isLoading = loading.has(name);
          return (
            <div
              key={`undo-${name}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border-2 border-tomato-900/30 dark:border-cream-200/15 bg-cream-100/50 dark:bg-graphite-900/50 opacity-60"
            >
              <span className="font-display text-[20px] sm:text-[22px] font-medium tabular leading-none text-tomato-500/40 line-through">
                0
              </span>
              <span className="text-[12px] sm:text-[13px] font-medium truncate max-w-[180px] line-through text-tomato-900/40 dark:text-cream-200/40">
                {name}
              </span>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handle86(name, true)}
                title={`Undo 86 — restore ${name}`}
                aria-label={`Undo 86 — mark ${name} back in stock`}
                className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-tomato-900/30 dark:border-cream-200/20 text-[10px] font-mono font-semibold uppercase tracking-wider text-tomato-900/60 dark:text-cream-200/60 hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 hover:opacity-100 disabled:opacity-40 disabled:cursor-wait transition-colors"
              >
                Undo
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
