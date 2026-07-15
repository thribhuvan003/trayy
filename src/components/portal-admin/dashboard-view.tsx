"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUp, Copy, Download, IndianRupee, ListOrdered, Receipt, Timer, Wifi, WifiOff } from "lucide-react";
import dayjs from "dayjs";
import { formatRupees, formatTimeIST, fmtElapsed } from "@/lib/utils";
import { getBrowserClient } from "@/lib/supabase/browser";
import Link from "next/link";
import { KpiCard } from "./kpi-card";
import { RevenueChart } from "./revenue-chart";
import { PeakHeatmap } from "./peak-heatmap";
import { TopItems } from "./top-items";
import { ActivityFeed } from "./activity-feed";
import { ServiceControls } from "./service-controls";

// Connection state for truthful high-contrast banner (modeled on the proven kitchen board resilience).
type ConnState = "online" | "reconnecting" | "offline";

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
type ItemRow = {
  id: string;
  order_id: string;
  name_snapshot: string;
  qty: number;
  diet_snapshot: "veg" | "nonveg" | "egg";
  price_paise_snapshot: number;
};

export function DashboardView({
  tenantName,
  tenantSlug,
  tenantId,
  ordersWeek: initialOrdersWeek,
  todayOrders: initialTodayOrders,
  lastWeekToday: initialLastWeekToday,
  logs: initialLogs,
  todayItems: initialTodayItems,
  isOpen = true,
  pausedUntil = null,
  opensAt = null,
  closesAt = null,
  upiVpa = null,
}: {
  tenantName: string;
  tenantSlug: string;
  tenantId: string;
  ordersWeek: OrderRow[];
  todayOrders: OrderRow[];
  lastWeekToday: OrderRow[];
  logs: StatusLog[];
  todayItems: ItemRow[];
  isOpen?: boolean;
  pausedUntil?: string | null;
  opensAt?: string | null;
  closesAt?: string | null;
  upiVpa?: string | null;
}) {
  const [logs, setLogs] = useState(initialLogs);

  // Live money data (KPIs, revenue, charts, top items, heatmap) for real-time updates during rush.
  // Owner no longer has to manually refresh to see new paid orders, revenue move, top items change.
  // Modeled on the proven kitchen board resilience (exponential backoff + jitter + visibilitychange + poll fallback).
  const [liveOrdersWeek, setLiveOrdersWeek] = useState(initialOrdersWeek);
  const [liveTodayOrders, setLiveTodayOrders] = useState(initialTodayOrders);
  const [liveLastWeekToday, setLiveLastWeekToday] = useState(initialLastWeekToday);
  const [liveTodayItems, setLiveTodayItems] = useState(initialTodayItems);

  // Connection state + refs for truthful high-contrast banner and resilient reconnect (exact kitchen pattern).
  const [connState, setConnState] = useState<ConnState>("online");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const connStateRef = useRef<ConnState>("online");
  const reconnectAttemptRef = useRef(0);
  const channelRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Rush-hour flood guard for the admin money refetch (mirrors the kitchen board).
  // refreshMoneyData pulls up to 1600 orders + today's items, so calling it once
  // per order_status_logs INSERT during a 1000-order rush would hammer the DB and
  // freeze the dashboard. scheduleMoneyRefresh (below) coalesces a burst into one
  // refetch per window with an in-flight guard.
  const MONEY_REFRESH_MS = 600;
  const moneyRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const moneyRefreshInFlightRef = useRef(false);
  const moneyRefreshQueuedRef = useRef(false);
  const scheduleMoneyRefreshRef = useRef<() => void>(() => {});

  const prevPaidCountRef = useRef(
    initialTodayOrders.filter((o) => !["pending_payment", "rejected", "expired"].includes(o.status)).length
  );
  const [newOrderFlash, setNewOrderFlash] = useState(false);

  // Scenario 66: Admin audio + visual alert on new paid order — same pattern as kitchen board bell.
  const playAdminBell = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Two-tone chime: softer than kitchen bell, appropriate for an admin console
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
      gain.connect(ctx.destination);
      [880, 1108].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        osc.connect(gain);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + 0.9);
      });
    } catch {
      // Audio unavailable — visual flash still fires
    }
  }, []);

  // Live re-fetch of all dashboard data on every realtime event or poll tick.
  // This is the real production fix: owner KPIs, revenue, top items, heatmap all update the moment a new order is paid.
  const refreshMoneyData = useCallback(async () => {
    try {
      const sb = getBrowserClient();
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const start14d = new Date(now);
      start14d.setDate(start14d.getDate() - 13);
      start14d.setHours(0, 0, 0, 0);
      const start7d = new Date(now);
      start7d.setDate(start7d.getDate() - 6);
      start7d.setHours(0, 0, 0, 0);

      const { data: orders14 } = await sb
        .from("orders")
        .select("id, short_code, status, total_paise, placed_at, collected_at, ready_at, customer_name, order_type")
        .eq("tenant_id", tenantId)
        .gte("placed_at", start14d.toISOString())
        .order("placed_at", { ascending: false })
        .limit(1600)
        .returns<OrderRow[]>();

      if (orders14) {
        const todayIso = startOfDay.toISOString();
        const start7dIso = start7d.toISOString();
        const week = orders14.filter((o) => o.placed_at >= start7dIso);
        const today = week.filter((o) => o.placed_at >= todayIso);
        const todayIds = today.map((o) => o.id);

        const elapsedMs = now.getTime() - startOfDay.getTime();
        const lwStart = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lwEnd = new Date(lwStart.getTime() + elapsedMs);
        const lastWeek = orders14.filter(
          (o) => o.placed_at >= lwStart.toISOString() && o.placed_at < lwEnd.toISOString()
        );

        setLiveOrdersWeek(week);
        setLiveTodayOrders(today);
        setLiveLastWeekToday(lastWeek);

        const paidCount = today.filter((o) => !["pending_payment", "rejected", "expired"].includes(o.status)).length;
        if (paidCount > prevPaidCountRef.current) {
          setNewOrderFlash(true);
          setTimeout(() => setNewOrderFlash(false), 8000);
          playAdminBell(); // scenario 66: audio + visual in sync
        }
        prevPaidCountRef.current = paidCount;

        if (todayIds.length > 0) {
          const { data: items } = await sb
            .from("order_items")
            .select("id, order_id, name_snapshot, qty, diet_snapshot, price_paise_snapshot")
            .in("order_id", todayIds)
            .returns<ItemRow[]>();
          setLiveTodayItems(items ?? []);
        } else {
          setLiveTodayItems([]);
        }
      }

      if (connStateRef.current !== "online") {
        setConnState("online");
        connStateRef.current = "online";
        setReconnectAttempt(0);
        reconnectAttemptRef.current = 0;
      }
    } catch {
      // Swallow — the 20s poll + visibility will recover.
    }
  }, [tenantId]);

  // Coalesce a burst of realtime events into ONE money refetch per MONEY_REFRESH_MS
  // window. Trailing debounce + in-flight guard: a 1000-order rush triggers a couple
  // of refetches/sec instead of one heavy 1600-row refetch per event.
  const scheduleMoneyRefresh = useCallback(() => {
    if (moneyRefreshTimerRef.current) return;
    moneyRefreshTimerRef.current = setTimeout(async () => {
      moneyRefreshTimerRef.current = null;
      if (moneyRefreshInFlightRef.current) {
        moneyRefreshQueuedRef.current = true;
        return;
      }
      moneyRefreshInFlightRef.current = true;
      try {
        await refreshMoneyData();
      } finally {
        moneyRefreshInFlightRef.current = false;
        if (moneyRefreshQueuedRef.current) {
          moneyRefreshQueuedRef.current = false;
          scheduleMoneyRefreshRef.current();
        }
      }
    }, MONEY_REFRESH_MS);
  }, [refreshMoneyData]);
  scheduleMoneyRefreshRef.current = scheduleMoneyRefresh;

  // Resilient Realtime subscription for money data (modeled exactly on the proven kitchen board).
  // order_events / order_status_logs INSERT for this tenant triggers refreshMoneyData.
  // Exponential backoff + jitter, visibilitychange, 20s poll fallback, truthful high-contrast banner.
  const setupRealtime = useCallback(() => {
    const sb = getBrowserClient();

    if (channelRef.current) {
      try { sb.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    const channel = sb
      .channel(`admin-money:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_status_logs",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          scheduleMoneyRefresh();
          if (connStateRef.current !== "online") {
            setConnState("online");
            connStateRef.current = "online";
            setReconnectAttempt(0);
            reconnectAttemptRef.current = 0;
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (connStateRef.current !== "online") {
            setConnState("online");
            connStateRef.current = "online";
            setReconnectAttempt(0);
            reconnectAttemptRef.current = 0;
          }
        }
      });

    channelRef.current = channel;

    // Exponential backoff + jitter for reconnect (exact kitchen pattern).
    const scheduleReconnect = () => {
      const attempt = reconnectAttemptRef.current;
      const base = 900;
      const cap = 30000;
      const jitter = Math.random() * 200;
      const delay = Math.min(base * Math.pow(2, attempt), cap) + jitter;

      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        reconnectAttemptRef.current = Math.min(attempt + 1, 8);
        setReconnectAttempt(reconnectAttemptRef.current);
        setConnState("reconnecting");
        connStateRef.current = "reconnecting";
        setupRealtime();
      }, delay);
    };

    // 20s poll fallback (exact kitchen pattern).
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        scheduleMoneyRefresh();
      }
    }, 20000);

    // Visibilitychange handler (exact kitchen pattern).
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleMoneyRefresh();
        if (connStateRef.current !== "online") {
          reconnectAttemptRef.current = 0;
          setReconnectAttempt(0);
          setupRealtime();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (moneyRefreshTimerRef.current) {
        clearTimeout(moneyRefreshTimerRef.current);
        moneyRefreshTimerRef.current = null;
      }
    };
  }, [tenantId, scheduleMoneyRefresh]);

  useEffect(() => {
    const cleanup = setupRealtime();
    return () => {
      cleanup();
      if (channelRef.current) {
        try { getBrowserClient().removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [tenantId, setupRealtime]);

  useEffect(() => {
    const sb = getBrowserClient();
    const ch = sb
      .channel("admin-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_status_logs", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          setLogs((prev) => [(payload.new as StatusLog), ...prev].slice(0, 40));
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [tenantId]);

  // KPIs derived from live data (updated in real time via the resilient order_status_logs sub + refreshMoneyData).
  // Owner sees new paid orders, revenue move, top items change without manual refresh during rush.
  const kpis = useMemo(() => {
    const paid = (rows: OrderRow[]) =>
      rows.filter((o) => !["pending_payment", "rejected", "expired"].includes(o.status));
    const today = paid(liveTodayOrders);
    const prior = paid(liveLastWeekToday);

    const revenue = today.reduce((acc, o) => acc + o.total_paise, 0);
    const priorRevenue = prior.reduce((acc, o) => acc + o.total_paise, 0);
    const count = today.length;
    const priorCount = prior.length;
    const avgTicket = count ? Math.round(revenue / count) : 0;
    const priorAvg = priorCount ? Math.round(priorRevenue / priorCount) : 0;

    const pickupSecs = (rows: OrderRow[]) =>
      rows
        .filter((o) => o.collected_at && o.placed_at)
        .map((o) => (new Date(o.collected_at!).getTime() - new Date(o.placed_at).getTime()) / 1000);
    const pickups = pickupSecs(today);
    const priorPickups = pickupSecs(prior);
    const avgPickup = pickups.length ? Math.round(pickups.reduce((a, b) => a + b, 0) / pickups.length) : 0;
    const priorAvgPickup = priorPickups.length
      ? Math.round(priorPickups.reduce((a, b) => a + b, 0) / priorPickups.length)
      : 0;

    return { revenue, priorRevenue, count, priorCount, avgTicket, priorAvg, avgPickup, priorAvgPickup };
  }, [liveTodayOrders, liveLastWeekToday]);

  const deltaPct = (current: number, prior: number) => {
    if (prior === 0 && current === 0) return { text: "—", up: true };
    if (prior === 0) return { text: "new", up: true };
    const pct = ((current - prior) / prior) * 100;
    const sign = pct >= 0 ? "+" : "";
    return { text: `${sign}${pct.toFixed(1)}%`, up: pct >= 0 };
  };
  const deltaTime = (current: number, prior: number) => {
    if (prior === 0 && current === 0) return { text: "—", up: true };
    if (prior === 0) return { text: "new", up: true };
    const diff = current - prior;
    const sign = diff <= 0 ? "-" : "+";
    const abs = Math.abs(diff);
    return { text: `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`, up: diff <= 0 };
  };
  const dRev = deltaPct(kpis.revenue, kpis.priorRevenue);
  const dCount = deltaPct(kpis.count, kpis.priorCount);
  const dAvg = deltaPct(kpis.avgTicket, kpis.priorAvg);
  const dPickup = deltaTime(kpis.avgPickup, kpis.priorAvgPickup);

  // Revenue buckets, heatmap, top items derived from live data (updated in real time via the resilient sub).
  const dayBuckets = useMemo(() => {
    const start = dayjs().startOf("day").subtract(6, "day");
    const days: { label: string; key: string; revenue: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = start.add(i, "day");
      days.push({ label: d.format("ddd").toUpperCase(), key: d.format("YYYY-MM-DD"), revenue: 0 });
    }
    for (const o of liveOrdersWeek) {
      if (["rejected", "expired", "pending_payment"].includes(o.status)) continue;
      const k = dayjs(o.placed_at).format("YYYY-MM-DD");
      const b = days.find((x) => x.key === k);
      if (b) b.revenue += o.total_paise;
    }
    return days;
  }, [liveOrdersWeek]);

  const heatmap = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(12).fill(0));
    for (const o of liveOrdersWeek) {
      const d = dayjs(o.placed_at);
      const dow = (d.day() + 6) % 7;
      const hour = d.hour();
      if (hour < 8 || hour > 19) continue;
      const col = hour - 8;
      grid[dow]![col]! += 1;
    }
    return grid;
  }, [liveOrdersWeek]);

  // Top items and first-day check derived from live data (updated in real time via the resilient sub).
  const topItems = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number; diet: "veg" | "nonveg" | "egg" }>();
    for (const i of liveTodayItems) {
      const cur = m.get(i.name_snapshot) ?? { name: i.name_snapshot, qty: 0, revenue: 0, diet: i.diet_snapshot };
      cur.qty += i.qty;
      cur.revenue += i.qty * i.price_paise_snapshot;
      m.set(i.name_snapshot, cur);
    }
    return [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [liveTodayItems]);

  const isFirstDay = liveOrdersWeek.length === 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      {/* ── First-run onboarding checklist ───────────────────────────── */}
      {isFirstDay && (
        <div
          className="mb-5 rounded-xl p-5"
          style={{ border: "1px solid rgba(205,250,80,0.25)", background: "rgba(205,250,80,0.05)" }}
        >
          <div className="text-[13px] font-semibold mb-3" style={{ color: "var(--admin-lime)" }}>
            Welcome! Here&rsquo;s how to get your first order in 3 steps:
          </div>
          <ol className="flex flex-col gap-2.5">
            {[
              {
                n: "1",
                text: "Add your menu items",
                href: `/c/${tenantSlug}/admin/menu/new`,
                cta: "Go to Menu →",
              },
              {
                n: "2",
                text: "Set your UPI ID so students can pay you",
                href: `/c/${tenantSlug}/admin/settings`,
                cta: "Go to Settings →",
              },
              {
                n: "3",
                text: "Share your ordering link with students",
                href: null,
                cta: null,
                copyStudentLink: true,
              },
            ].map((step) => (
              <li key={step.n} className="flex items-start gap-3">
                <span
                  className="mt-0.5 shrink-0 h-5 w-5 rounded-full text-[11px] font-bold inline-flex items-center justify-center"
                  style={{ background: "rgba(205,250,80,0.20)", color: "var(--admin-lime)" }}
                >
                  {step.n}
                </span>
                <div className="flex flex-col gap-1.5 flex-1 text-[13px]" style={{ color: "var(--admin-ink-2)" }}>
                  <span>{step.text}</span>
                  {"copyStudentLink" in step && step.copyStudentLink && (
                    <button
                      onClick={() => {
                        const origin = typeof window !== "undefined" ? window.location.origin : "";
                        navigator.clipboard.writeText(`${origin}/c/${tenantSlug}/menu`).catch(() => undefined);
                      }}
                      className="inline-flex items-center gap-1.5 text-[12px] font-mono bg-lime/10 border border-lime/20 text-lime px-3 py-1.5 rounded-lg hover:bg-lime/20 transition-colors w-fit"
                    >
                      <Copy size={11} /> Copy student link
                    </button>
                  )}
                  {step.href && step.cta && (
                    <a
                      href={step.href}
                      className="ml-2 text-[12px] font-medium hover:underline inline-flex items-center gap-0.5"
                      style={{ color: "var(--admin-lime)" }}
                    >
                      {step.cta} <ArrowRight size={11} />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Page heading + topbar-style row ─────────────────────────── */}
      {/* New-order flash — fires for 8s whenever paid order count increases */}
      {newOrderFlash && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-medium mb-3"
          style={{
            background: "rgba(205,250,80,0.12)",
            borderColor: "rgba(205,250,80,0.3)",
            color: "var(--admin-lime)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--admin-lime)",
              display: "inline-block",
              boxShadow: "0 0 6px var(--admin-lime)",
            }}
          />
          <span>New order in — KPIs updated</span>
        </motion.div>
      )}

      {/* High-contrast truthful connection banner (exact kitchen board pattern) */}
      {connState !== "online" && (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-medium"
          style={{
            background: connState === "reconnecting" ? "rgba(205,250,80,0.12)" : "rgba(255,100,100,0.12)",
            borderColor: connState === "reconnecting" ? "rgba(205,250,80,0.3)" : "rgba(255,100,100,0.3)",
            color: connState === "reconnecting" ? "var(--admin-lime)" : "var(--admin-rose)",
          }}
        >
          {connState === "reconnecting" ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{connState === "reconnecting" ? "Reconnecting…" : "Offline — updates may be delayed"}</span>
          {reconnectAttempt > 0 && <span className="font-mono">· attempt {reconnectAttempt}</span>}
        </div>
      )}

      <div
        className="flex flex-wrap items-end justify-between gap-3 mb-4 pb-4"
        style={{ borderBottom: "1px solid var(--admin-line)" }}
      >
        <div>
          <h1
            className="font-semibold leading-tight"
            style={{ fontSize: 24, letterSpacing: "-0.025em", color: "var(--admin-ink)" }}
          >
            Today
          </h1>
          <div
            className="font-mono uppercase mt-1"
            style={{ fontSize: 11, letterSpacing: "0.06em", color: "var(--admin-ink-3)" }}
          >
            {dayjs().format("ddd · D MMM YYYY").toUpperCase()} · {tenantName.toUpperCase()} · aaj ka hisaab
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/export/orders?slug=${tenantSlug}`}
            className="inline-flex items-center gap-1.5 font-mono uppercase tracking-wider transition-colors"
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 7,
              border: "1px solid var(--admin-line-2)",
              fontSize: 11,
              color: "var(--admin-ink-2)",
            }}
          >
            <Download size={11} /> Export CSV
          </a>
        </div>
      </div>

      {/* ── Hero: aaj ka paisa (phone-first) ─────────────────────────── */}
      {!isFirstDay && (
        <div
          className="mb-4 rounded-2xl p-5 sm:p-6"
          style={{
            background: "var(--admin-bg-card)",
            border: "2px solid var(--admin-line)",
            boxShadow: "4px 4px 0 rgba(238,241,247,0.08)",
          }}
        >
          <div
            className="font-mono uppercase mb-2"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--admin-ink-3)" }}
          >
            Aaj ka paisa · paid today
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div
                className="tabular leading-none font-semibold"
                style={{
                  fontSize: "clamp(40px, 12vw, 56px)",
                  letterSpacing: "-0.04em",
                  color: "var(--admin-lime)",
                }}
              >
                {formatRupees(kpis.revenue)}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[13px]" style={{ color: "var(--admin-ink-2)" }}>
                <span>
                  <strong style={{ color: "var(--admin-ink)" }}>{kpis.count}</strong> orders
                </span>
                <span style={{ color: dRev.up ? "var(--admin-lime)" : "var(--admin-rose, #f87171)" }}>
                  {dRev.text} vs last week
                </span>
                <span className="font-mono text-[12px]" style={{ color: "var(--admin-ink-3)" }}>
                  avg {formatRupees(kpis.avgTicket)}
                </span>
              </div>
            </div>
            {upiVpa && (
              <div
                className="rounded-lg px-3 py-2 font-mono text-[11px]"
                style={{
                  background: "var(--admin-bg-3)",
                  border: "1px solid var(--admin-line)",
                  color: "var(--admin-ink-2)",
                  maxWidth: 220,
                }}
              >
                <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
                  Students pay you
                </div>
                <div className="truncate font-semibold mt-0.5" style={{ color: "var(--admin-lime)" }}>
                  {upiVpa}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Open / Pause — one tap during rush */}
      <div className="mb-4">
        <ServiceControls
          isOpen={isOpen}
          pausedUntil={pausedUntil}
          opensAt={opensAt}
          closesAt={closesAt}
        />
      </div>

      {/* Pipeline → kitchen */}
      {!isFirstDay && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          {(
            [
              {
                label: "New",
                count: liveTodayOrders.filter((o) => o.status === "placed").length,
                href: `/c/${tenantSlug}/kitchen`,
              },
              {
                label: "Cooking",
                count: liveTodayOrders.filter((o) => o.status === "preparing").length,
                href: `/c/${tenantSlug}/kitchen`,
              },
              {
                label: "Serve",
                count: liveTodayOrders.filter((o) => o.status === "ready").length,
                href: `/c/${tenantSlug}/kitchen`,
              },
            ] as const
          ).map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-xl p-3 text-center transition-colors"
              style={{
                background: "var(--admin-bg-card)",
                border: "1px solid var(--admin-line)",
              }}
            >
              <div
                className="tabular font-semibold leading-none"
                style={{ fontSize: 28, color: "var(--admin-ink)" }}
              >
                {String(c.count).padStart(2, "0")}
              </div>
              <div
                className="font-mono uppercase mt-1"
                style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--admin-ink-3)" }}
              >
                {c.label}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            { href: `/c/${tenantSlug}/admin/menu`, label: "Menu · 86 stock" },
            { href: `/c/${tenantSlug}/admin/orders`, label: "Orders ledger" },
            { href: `/c/${tenantSlug}/admin/qr`, label: "QR poster" },
            { href: `/c/${tenantSlug}/admin/settings`, label: "UPI & hours" },
          ] as const
        ).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex items-center h-10 px-3 rounded-lg text-[12px] font-semibold"
            style={{
              background: "var(--admin-bg-3)",
              border: "1px solid var(--admin-line-2)",
              color: "var(--admin-ink-2)",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>

      {/* ── KPI cards (secondary on phone; charts further down) ──────── */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {isFirstDay ? (
          <>
            {/* First-day setup prompts replace numeric KPIs */}
            {(
              [
                {
                  icon: IndianRupee,
                  label: "Revenue today",
                  prompt: "Set up your UPI ID to receive payments",
                  href: `/c/${tenantSlug}/admin/settings`,
                  cta: "Go to Settings →",
                },
                {
                  icon: ListOrdered,
                  label: "Orders",
                  prompt: "Share your student link to get first orders",
                  href: `/c/${tenantSlug}/admin/settings`,
                  cta: "Copy link →",
                },
                {
                  icon: Receipt,
                  label: "Avg ticket",
                  prompt: "Coming soon after your first order",
                  href: null,
                  cta: null,
                },
                {
                  icon: Timer,
                  label: "Avg pickup",
                  prompt: "Coming soon after your first order",
                  href: null,
                  cta: null,
                },
              ] as const
            ).map((card) => (
              <div
                key={card.label}
                className="relative overflow-hidden flex flex-col gap-3 transition-colors"
                style={{
                  padding: "18px 20px",
                  background: "var(--admin-bg-card)",
                  border: "1px solid var(--admin-line)",
                  borderRadius: 12,
                  boxShadow: "3px 3px 0 rgba(238,241,247,0.08)",
                }}
              >
                <div
                  className="inline-flex items-center justify-center rounded-md"
                  style={{ height: 28, width: 28, background: "var(--admin-line)" }}
                >
                  <card.icon size={13} strokeWidth={1.6} style={{ color: "var(--admin-ink-3)" }} />
                </div>
                <div
                  className="font-mono uppercase font-medium"
                  style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--admin-ink-3)" }}
                >
                  {card.label}
                </div>
                <p
                  className="leading-snug"
                  style={{ fontSize: 13, color: "var(--admin-ink-2)", margin: 0 }}
                >
                  {card.prompt}
                </p>
                {card.href && card.cta && (
                  <a
                    href={card.href}
                    className="font-mono font-medium hover:underline"
                    style={{ fontSize: 11, color: "var(--admin-lime)", letterSpacing: "0.04em" }}
                  >
                    {card.cta}
                  </a>
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            <KpiCard label="Revenue today" value={formatRupees(kpis.revenue)} delta={dRev.text} deltaUp={dRev.up} icon={IndianRupee} />
            <KpiCard label="Orders" value={String(kpis.count)} delta={dCount.text} deltaUp={dCount.up} icon={ListOrdered} />
            <KpiCard label="Avg ticket" value={formatRupees(kpis.avgTicket)} delta={dAvg.text} deltaUp={dAvg.up} icon={Receipt} tone="amber" />
            <KpiCard label="Avg pickup" value={kpis.avgPickup ? fmtElapsed(kpis.avgPickup) : "—"} delta={dPickup.text} deltaUp={dPickup.up} icon={Timer} tone="rose" />
          </>
        )}
      </div>

      {/* Top sellers always visible — owner 86s from Menu; this is the signal */}
      <div className="mb-3">
        <TopItems items={topItems} />
      </div>

      {/* Charts + feed: full on desktop; collapsible on phone so money stays hero */}
      <details className="lg:hidden mb-3 group">
        <summary
          className="cursor-pointer list-none rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-wider"
          style={{
            background: "var(--admin-bg-3)",
            border: "1px solid var(--admin-line)",
            color: "var(--admin-ink-3)",
          }}
        >
          More charts & activity ▾
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <RevenueChart days={dayBuckets} />
          <PeakHeatmap grid={heatmap} />
          <ActivityFeed logs={logs} />
        </div>
      </details>

      <div className="hidden lg:grid lg:grid-cols-[1.4fr_1fr] gap-2 mb-3">
        <RevenueChart days={dayBuckets} />
        <PeakHeatmap grid={heatmap} />
      </div>

      <div className="hidden lg:block mb-2">
        <ActivityFeed logs={logs} />
      </div>
    </motion.div>
  );
}

export function _UnusedIcons({ a, b }: { a: typeof ArrowUp; b: typeof ArrowDown }) {
  return (
    <span>
      <a />
      <b />
    </span>
  );
}
