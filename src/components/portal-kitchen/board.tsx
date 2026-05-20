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
  const [sessionExpired, setSessionExpired] = useState(false);
  const bellOnRef = useRef(true);
  const seenOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));

  // Detect session expiry from server action errors and show a blocking overlay
  // so kitchen staff know they must re-login rather than silently losing orders.
  const handleActionError = (error: string) => {
    if (error === "Not authorised" || error.toLowerCase().includes("not authorised") || error.toLowerCase().includes("unauthorized")) {
      setSessionExpired(true);
    } else {
      toast.error(error);
    }
  };

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

  const placedCount = groups.placed.length;

  return (
    <div
      className="min-h-screen lg:grid"
      style={{ gridTemplateColumns: "228px 1fr" }}
    >
      {/* Session-expired overlay — blocks all interaction until staff re-login */}
      {sessionExpired && (
        <div
          role="alertdialog"
          aria-modal
          aria-label="Session expired — please log in again"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-6 text-center"
          style={{ background: "rgba(42,22,10,0.95)", backdropFilter: "blur(4px)", color: "var(--kt-cream)" }}
        >
          <div
            className="font-display font-bold"
            style={{ fontSize: "64px", color: "var(--kt-tomato)", fontFamily: "var(--font-newsreader), ui-serif, Georgia", fontStyle: "italic" }}
          >
            !
          </div>
          <p
            className="font-display font-medium"
            style={{ fontSize: "32px", fontFamily: "var(--font-newsreader), ui-serif, Georgia", color: "var(--kt-cream)" }}
          >
            Session timeout
          </p>
          <p style={{ fontSize: "15px", color: "var(--kt-ink-3)", maxWidth: "280px" }}>
            Your login has expired. Tap below to sign in again — orders are safe.
          </p>
          <a
            href={`/c/${tenantSlug}/kitchen/staff-select`}
            className="inline-flex items-center justify-center"
            style={{
              height: "56px",
              padding: "0 32px",
              borderRadius: "7px",
              background: "var(--kt-tomato)",
              color: "var(--kt-cream)",
              fontSize: "16px",
              fontWeight: 700,
              boxShadow: "0 3px 0 var(--kt-ink)",
              textDecoration: "none",
            }}
          >
            Log in again
          </a>
        </div>
      )}

      {/* ── SIDEBAR — matches kitchen.html .sb spec exactly ── */}
      <aside
        className="hidden lg:flex flex-col sticky top-0 h-screen px-4 gap-1"
        style={{
          background: "var(--kt-paper)",
          borderRight: "1px solid var(--kt-line)",
          paddingTop: "18px",
          paddingBottom: "16px",
        }}
      >
        {/* Brand mark — italic T in tomato circle, matches .brand-mark */}
        <Link
          href={`/c/${tenantSlug}/kitchen`}
          className="flex items-center"
          style={{
            gap: "9px",
            padding: "6px 8px 18px",
            marginBottom: "14px",
            borderBottom: "1px solid var(--kt-line)",
            fontFamily: "var(--font-newsreader), ui-serif, Georgia",
            fontWeight: 500,
            fontSize: "22px",
            letterSpacing: "-0.02em",
            color: "var(--kt-ink)",
            textDecoration: "none",
          }}
        >
          <span
            className="inline-flex items-center justify-center shrink-0"
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "var(--kt-tomato)",
              color: "var(--kt-cream)",
              fontFamily: "var(--font-newsreader), ui-serif, Georgia",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "18px",
              boxShadow: "inset 0 -3px 0 rgba(0,0,0,0.14)",
            }}
          >
            T
          </span>
          Tray
          <span style={{ fontStyle: "italic", color: "var(--kt-tomato)", marginLeft: "-3px" }}>.</span>
        </Link>

        {/* Kitchen nav group label */}
        <div
          style={{
            fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
            fontSize: "10px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--kt-ink-3)",
            padding: "12px 8px 6px",
            fontWeight: 600,
          }}
        >
          Kitchen
        </div>

        {/* Live queue — active nav link */}
        <Link
          href={`/c/${tenantSlug}/kitchen`}
          className="flex items-center"
          style={{
            gap: "10px",
            padding: "8px 10px",
            borderRadius: "7px",
            background: "var(--kt-ink)",
            color: "var(--kt-cream)",
            fontSize: "13.5px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <svg className="shrink-0" style={{ width: 16, height: 16, opacity: 1 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 4h12M2 8h12M2 12h8" />
          </svg>
          Live queue
          {placedCount > 0 && (
            <span
              className="ml-auto tabular"
              style={{
                background: "var(--kt-cream)",
                color: "var(--kt-ink)",
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: "10px",
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: "4px",
                letterSpacing: "0.04em",
              }}
            >
              {placedCount}
            </span>
          )}
        </Link>

        {/* History link */}
        <Link
          href={`/c/${tenantSlug}/kitchen/history`}
          className="flex items-center transition-colors"
          style={{
            gap: "10px",
            padding: "8px 10px",
            borderRadius: "7px",
            color: "var(--kt-ink-2)",
            fontSize: "13.5px",
            fontWeight: 500,
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--kt-cream-3)";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--kt-ink)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--kt-ink-2)";
          }}
        >
          <svg className="shrink-0" style={{ width: 16, height: 16, opacity: 0.7 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="8" r="6" /><path d="M8 4v4l3 2" />
          </svg>
          History
        </Link>

        {/* Staff select link */}
        <Link
          href={`/c/${tenantSlug}/kitchen/staff-select`}
          className="flex items-center transition-colors"
          style={{
            gap: "10px",
            padding: "8px 10px",
            borderRadius: "7px",
            color: "var(--kt-ink-2)",
            fontSize: "13.5px",
            fontWeight: 500,
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "var(--kt-cream-3)";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--kt-ink)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--kt-ink-2)";
          }}
        >
          <svg className="shrink-0" style={{ width: 16, height: 16, opacity: 0.7 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="6" r="3" /><path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          </svg>
          Staff select
        </Link>

        {/* Sidebar bottom — portals + live status + bell */}
        <div
          className="mt-auto flex flex-col"
          style={{
            gap: "12px",
            paddingTop: "18px",
            borderTop: "1px solid var(--kt-line)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
              fontSize: "10px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--kt-ink-3)",
              padding: "0 8px",
              fontWeight: 600,
            }}
          >
            Other portals
          </div>
          <div className="flex flex-col" style={{ gap: "4px" }}>
            <Link
              href={`/c/${tenantSlug}/menu`}
              className="flex items-center justify-between transition-colors"
              style={{
                padding: "6px 8px",
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: "11px",
                color: "var(--kt-ink-3)",
                letterSpacing: "0.04em",
                borderRadius: "5px",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--kt-cream-3)";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--kt-ink)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--kt-ink-3)";
              }}
            >
              Student ordering <span>→</span>
            </Link>
            <Link
              href={`/c/${tenantSlug}/admin/dashboard`}
              className="flex items-center justify-between transition-colors"
              style={{
                padding: "6px 8px",
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: "11px",
                color: "var(--kt-ink-3)",
                letterSpacing: "0.04em",
                borderRadius: "5px",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--kt-cream-3)";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--kt-ink)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--kt-ink-3)";
              }}
            >
              Admin dashboard <span>→</span>
            </Link>
          </div>

          {/* Live status dot + bell toggle */}
          <div className="flex items-center justify-between" style={{ padding: "6px 8px" }}>
            <span
              className="inline-flex items-center tabular"
              style={{
                gap: "6px",
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: "11px",
                fontWeight: 600,
                color: wsConnected ? "var(--kt-olive)" : "var(--kt-mustard)",
              }}
            >
              <span
                className={wsConnected ? "animate-[blinkLive_1.6s_infinite]" : "animate-pulse"}
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: wsConnected ? "var(--kt-olive)" : "var(--kt-mustard)",
                  display: "inline-block",
                }}
              />
              {wsConnected ? "Connected" : "Reconnecting"}
            </span>
            <button
              type="button"
              onClick={() => setBellOn((v) => !v)}
              aria-label={bellOn ? "Mute chime" : "Unmute chime"}
              title={bellOn ? "New-order chime: on" : "New-order chime: off"}
              className="inline-flex items-center justify-center transition-colors"
              style={{
                height: "28px",
                width: "28px",
                borderRadius: "6px",
                color: "var(--kt-ink-3)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              {bellOn ? <Bell size={13} /> : <BellOff size={13} />}
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-col min-w-0">
        {/* Wi-Fi disconnection banner — big and visible from across the kitchen */}
        {!wsConnected && (
          <div
            role="status"
            aria-live="polite"
            className="sticky top-0 z-40 flex items-center justify-center gap-3"
            style={{
              background: "var(--kt-mustard)",
              color: "var(--kt-ink)",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            <Radio size={16} className="shrink-0 animate-pulse" />
            <span>Wi-Fi disconnected — orders may be delayed. Reconnecting…</span>
          </div>
        )}

        {/* Page header — matches .page-head spec */}
        <header
          className="sticky top-0 z-30"
          style={{
            background: "var(--kt-paper)",
            borderBottom: "1px solid var(--kt-line-2)",
          }}
        >
          <div
            className="flex flex-wrap items-center gap-4 justify-between"
            style={{ padding: "16px 24px 12px" }}
          >
            <div>
              {/* Eyebrow — .eyebrow style from spec */}
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                  fontSize: "11px",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--kt-ink-3)",
                  fontWeight: 500,
                }}
              >
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {tenantName} · Lunch Service
              </div>
              {/* H1 — matches .page-head h1 + .it italic tomato */}
              <h1
                style={{
                  fontFamily: "var(--font-newsreader), ui-serif, Georgia",
                  fontWeight: 500,
                  fontSize: "clamp(28px, 4vw, 48px)",
                  letterSpacing: "-0.03em",
                  margin: "6px 0 4px",
                  lineHeight: 1,
                  color: "var(--kt-ink)",
                }}
              >
                Kitchen <span style={{ fontStyle: "italic", color: "var(--kt-tomato)", fontWeight: 500 }}>queue.</span>
              </h1>
              {/* Sub row — clock + live dot */}
              <div
                className="flex items-center"
                style={{
                  gap: "14px",
                  fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                  fontSize: "11px",
                  color: "var(--kt-ink-3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                <span className="tabular" style={{ color: "var(--kt-ink)" }}>{clock}</span>
                <span
                  className="inline-flex items-center"
                  style={{
                    gap: "6px",
                    color: "var(--kt-olive)",
                    textTransform: "none",
                    letterSpacing: 0,
                    fontFamily: "var(--font-manrope), ui-sans-serif, system-ui",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: wsConnected ? "var(--kt-olive)" : "var(--kt-mustard)",
                      display: "inline-block",
                      animation: "blinkLive 1.6s infinite",
                    }}
                  />
                  {wsConnected ? "Connected · WS" : "Reconnecting"}
                </span>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Bell toggle — always visible */}
              <button
                type="button"
                onClick={() => setBellOn((v) => !v)}
                aria-label={bellOn ? "Mute new-order chime" : "Unmute new-order chime"}
                title={bellOn ? "New-order chime: on" : "New-order chime: off"}
                className="inline-flex items-center gap-2 transition-all"
                style={{
                  height: "34px",
                  padding: "0 12px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid var(--kt-line-2)",
                  background: "var(--kt-cream-4)",
                  color: bellOn ? "var(--kt-ink)" : "var(--kt-ink-3)",
                  cursor: "pointer",
                }}
              >
                {bellOn ? <Bell size={12} /> : <BellOff size={12} />}
                {bellOn ? "Sounds" : "Muted"}
              </button>
              <ThemeToggle className="text-[var(--kt-ink-3)]" />
              {/* Mobile-only quick links */}
              <Link
                href={`/c/${tenantSlug}/kitchen/history`}
                className="lg:hidden inline-flex items-center gap-1.5 transition-colors"
                style={{
                  height: "34px",
                  padding: "0 12px",
                  borderRadius: "7px",
                  border: "1px solid var(--kt-line-2)",
                  background: "var(--kt-cream-4)",
                  color: "var(--kt-ink)",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
                title="Today's completed orders"
              >
                <HistoryIcon size={12} /> History
              </Link>
              <Link
                href={`/c/${tenantSlug}/kitchen/staff-select`}
                className="lg:hidden inline-flex items-center gap-1.5 transition-colors"
                style={{
                  height: "34px",
                  padding: "0 12px",
                  borderRadius: "7px",
                  border: "1px solid var(--kt-line-2)",
                  background: "var(--kt-cream-4)",
                  color: "var(--kt-ink)",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
                title="Switch logged-in staff member"
              >
                <UserRoundCog size={12} /> Staff
              </Link>
            </div>
          </div>

          {/* KPI strip */}
          <KitchenKpiStrip orders={orders} />
        </header>

        <KitchenMarquee items={marquee} />

        {/* Main board area */}
        <main style={{ padding: "24px 24px 64px" }}>
          <PrepTotalsStrip orders={orders} lines={lines} onSessionExpired={() => setSessionExpired(true)} />

          {/* 4-column queue board — matches .queue-board + .queue-cols */}
          <div
            style={{
              background: "var(--kt-paper)",
              border: "1px solid var(--kt-ink)",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "5px 5px 0 var(--kt-ink)",
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4" style={{ minHeight: "520px" }}>
              <OrderColumn
                title="Incoming"
                subtitle="Just paid · awaiting kitchen"
                status="placed"
                orders={groups.placed}
                linesByOrder={linesByOrder}
                onAction={async (id, action) => {
                  const { markPreparing } = await import("@/app/(kitchen)/_actions");
                  const r = await markPreparing(id);
                  if (!r.ok) handleActionError(r.error);
                  if (action === "start" && r.ok) toast.success(`Started ${id.slice(0, 6)}`);
                }}
                onReject={async (id, reason) => {
                  const { rejectOrder } = await import("@/app/(kitchen)/_actions");
                  const r = await rejectOrder(id, reason);
                  if (!r.ok) handleActionError(r.error ?? "Failed to reject order");
                  else toast.success("Order rejected — refund queued");
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
                  if (!r.ok) handleActionError(r.error);
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
            {/* Queue footer — matches .queue-foot */}
            <div
              className="flex justify-between items-center"
              style={{
                padding: "10px 16px",
                borderTop: "1px solid var(--kt-line)",
                background: "var(--kt-cream-4)",
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: "11px",
                color: "var(--kt-ink-3)",
                letterSpacing: "0.04em",
              }}
            >
              <span>CLICK A TICKET TO ADVANCE · TAP VERIFY OTP FOR COLLECTION</span>
              <span style={{ color: "var(--kt-tomato)", fontWeight: 600 }}>
                {groups.placed.length + groups.preparing.length} active
              </span>
            </div>
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

  const cells: { label: string; value: string; accent?: boolean; icon?: React.ReactNode }[] = [
    { label: "Incoming",       value: String(counts.placed).padStart(2, "0") },
    { label: "Preparing",      value: String(counts.preparing).padStart(2, "0"), accent: true },
    { label: "Ready",          value: String(counts.ready).padStart(2, "0") },
    { label: "Collected today",value: String(counts.collected) },
    { label: "Revenue today",  value: formatRupees(counts.revenue), icon: <ChefHat size={11} /> },
  ];

  return (
    /* .kpi-bar — matches spec: paper bg, ink border, 3px ink shadow */
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      style={{
        borderTop: "1px solid var(--kt-line)",
        padding: "12px 24px",
        gap: "12px",
      }}
    >
      {cells.map((c) => (
        <div
          key={c.label}
          style={{
            background: "var(--kt-paper)",
            border: "1px solid var(--kt-ink)",
            borderRadius: "10px",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            boxShadow: "3px 3px 0 var(--kt-ink)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            className="flex items-center gap-1.5"
            style={{
              fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
              fontSize: "10px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--kt-ink-3)",
              fontWeight: 600,
            }}
          >
            {c.icon} {c.label}
          </div>
          <div
            className="tabular leading-none"
            style={{
              fontFamily: "var(--font-newsreader), ui-serif, Georgia",
              fontSize: "clamp(24px, 3.5vw, 44px)",
              letterSpacing: "-0.03em",
              fontWeight: 500,
              fontStyle: c.accent ? "italic" : "normal",
              color: c.accent ? "var(--kt-tomato)" : "var(--kt-ink)",
            }}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function PrepTotalsStrip({ orders, lines, onSessionExpired }: { orders: OrderRow[]; lines: LineRow[]; onSessionExpired: () => void }) {
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
        const err = r.error ?? "Failed";
        if (err.toLowerCase().includes("not authorised") || err.toLowerCase().includes("unauthorized")) {
          onSessionExpired();
        } else {
          toast.error(err);
        }
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
      style={{
        marginBottom: "16px",
        border: "1px solid var(--kt-line-2)",
        borderRadius: "10px",
        background: "var(--kt-paper)",
        padding: "12px 16px",
        boxShadow: "3px 3px 0 var(--kt-ink)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
          fontSize: "10px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--kt-ink-3)",
          fontWeight: 600,
          marginBottom: "10px",
        }}
      >
        Prep totals · placed + preparing
      </div>
      <div className="flex flex-wrap" style={{ gap: "8px" }}>
        {totals.map(([name, qty]) => {
          const isLoading = loading.has(name);
          return (
            <div
              key={name}
              className="inline-flex items-center"
              style={{
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--kt-line-2)",
                background: "var(--kt-cream-4)",
              }}
            >
              <span
                className="tabular leading-none"
                style={{
                  fontFamily: "var(--font-newsreader), ui-serif, Georgia",
                  fontSize: "22px",
                  fontWeight: 500,
                  color: "var(--kt-tomato)",
                  fontStyle: "italic",
                }}
              >
                {qty}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--kt-ink-2)",
                  maxWidth: "200px",
                }}
              >
                {name}
              </span>
              {/* 86 button — min 44px touch target */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handle86(name, false)}
                title={`86 — mark ${name} sold out`}
                aria-label={`Mark ${name} sold out`}
                className="inline-flex items-center justify-center transition-colors"
                style={{
                  height: "44px",
                  minWidth: "44px",
                  padding: "0 10px",
                  borderRadius: "5px",
                  border: "1px solid var(--kt-line-2)",
                  background: "transparent",
                  fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--kt-tomato)",
                  cursor: isLoading ? "wait" : "pointer",
                  opacity: isLoading ? 0.4 : 1,
                  textDecoration: "line-through",
                }}
              >
                86
              </button>
            </div>
          );
        })}

        {/* Ghost "undo 86" pills for items recently sold out with 0 active qty */}
        {zeroedOut86Names.map((name) => {
          const isLoading = loading.has(name);
          return (
            <div
              key={`undo-${name}`}
              className="inline-flex items-center"
              style={{
                gap: "8px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--kt-line)",
                background: "var(--kt-cream-4)",
                opacity: 0.55,
              }}
            >
              <span
                className="tabular leading-none"
                style={{
                  fontFamily: "var(--font-newsreader), ui-serif, Georgia",
                  fontSize: "22px",
                  fontWeight: 500,
                  color: "var(--kt-tomato)",
                  fontStyle: "italic",
                  textDecoration: "line-through",
                }}
              >
                0
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--kt-ink-3)",
                  maxWidth: "180px",
                  textDecoration: "line-through",
                }}
              >
                {name}
              </span>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handle86(name, true)}
                title={`Undo 86 — restore ${name}`}
                aria-label={`Undo 86 — mark ${name} back in stock`}
                className="inline-flex items-center justify-center transition-colors"
                style={{
                  height: "44px",
                  minWidth: "44px",
                  padding: "0 10px",
                  borderRadius: "5px",
                  border: "1px solid var(--kt-line-2)",
                  background: "transparent",
                  fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--kt-ink-2)",
                  cursor: isLoading ? "wait" : "pointer",
                  opacity: isLoading ? 0.4 : 1,
                }}
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
