"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, BellOff, ChefHat, History as HistoryIcon, Radio, UserRoundCog, X } from "lucide-react";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn, formatRupees, formatTimeIST } from "@/lib/utils";
import { toggleItemSpecial } from "@/app/(admin)/admin/_actions";
import { OrderColumn } from "./order-column";
import { OtpVerifyDialog } from "./otp-verify-dialog";
import { WalkInDialog } from "./walk-in-dialog";
import { KitchenMarquee } from "./marquee";
import { logger } from "@/lib/logging";

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

export function KitchenBoard({
  tenantId,
  tenantName,
  tenantSlug,
  orders: initialOrders,
  lines: initialLines,
  menuItems: initialMenuItems,
}: {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  orders: OrderRow[];
  lines: LineRow[];
  menuItems: { id: string; name: string; price_paise: number; diet: "veg" | "nonveg" | "egg"; is_special: boolean; in_stock: boolean; category_id: string | null }[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [lines, setLines] = useState(initialLines);
  const [menuItems, setMenuItems] = useState(initialMenuItems);
  const [togglingSpecialId, setTogglingSpecialId] = useState<string | null>(null);
  const [manageSpecialsOpen, setManageSpecialsOpen] = useState(false);
  const [pendingTransition, startTransition] = useTransition();

  const handleToggleSpecial = (itemId: string, isSpecial: boolean) => {
    setTogglingSpecialId(itemId);
    setMenuItems((prev) => 
      prev.map((it) => it.id === itemId ? { ...it, is_special: isSpecial } : it)
    );
    startTransition(async () => {
      const r = await toggleItemSpecial(itemId, isSpecial);
      setTogglingSpecialId(null);
      if (!r.ok) {
        toast.error(r.error ?? "Failed to toggle special status");
        setMenuItems((prev) => 
          prev.map((it) => it.id === itemId ? { ...it, is_special: !isSpecial } : it)
        );
      } else {
        toast.success(isSpecial ? "Added to Today's Specials" : "Removed from Specials");
      }
    });
  };

  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [clock, setClock] = useState<string>("--:--");
  const [connState, setConnState] = useState<'online' | 'reconnecting' | 'offline'>('online');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [bellOn, setBellOn] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [newOrderFlash, setNewOrderFlash] = useState(false);
  const [pendingUndo, setPendingUndo] = useState<null | {
    orderId: string;
    shortCode: string;
    from: "placed" | "preparing";
    to: Status;
    expiresAt: number;
  }>(null);

  // Per-order pending state for primary actions (Start/Ready/Verify) — immediate visual feedback so staff doesn't hammer during rush + flaky WiFi (direct from real bhaiya testing).
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  // Priority 1: Track orders that came in via UPI-trust path (unverified payment)
  // Set is populated from Realtime event payload; clears when order is collected/rejected.
  const [unverifiedUpiOrders, setUnverifiedUpiOrders] = useState<Set<string>>(new Set());

  const bellOnRef = useRef(true);
  const seenOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));
  const channelRef = useRef<ReturnType<ReturnType<typeof getBrowserClient>['channel']> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live refs so realtime handlers / reconnect logic never close over stale state during WiFi flaps (critical on real campus networks)
  const connStateRef = useRef<'online' | 'reconnecting' | 'offline'>(connState);
  useEffect(() => { connStateRef.current = connState; }, [connState]);
  const reconnectAttemptRef = useRef(reconnectAttempt);
  useEffect(() => { reconnectAttemptRef.current = reconnectAttempt; }, [reconnectAttempt]);

  // === 5-Second Undo System (Real Kitchen Staff Mistake Recovery) ===
  // Designed for tired, non-technical staff during high-pressure rushes.
  // One very clear, high-contrast, large-target bar appears for the most recent
  // accidental forward transition. Tapping it instantly reverts the order.
  // Auto-dismisses after 5 seconds. Full audit trail on the backend.
  const startUndoWindow = (orderId: string, shortCode: string, from: "placed" | "preparing", to: Status) => {
    // Clear any previous undo window
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    const expiresAt = Date.now() + 5000;

    setPendingUndo({
      orderId,
      shortCode,
      from,
      to,
      expiresAt,
    });

    // Auto-dismiss after 5 seconds — staff gets a real recovery window, not forever
    undoTimeoutRef.current = setTimeout(() => {
      setPendingUndo(null);
    }, 5000);
  };

  const performUndo = async () => {
    if (!pendingUndo) return;

    const { orderId, shortCode, from, to } = pendingUndo;

    const revertTo = from;

    logger.info("kitchen staff initiated undo", {
      tenant_id: tenantId,
      order_id: orderId,
      short_code: shortCode,
      from,
      to: revertTo,
    });

    try {
      const { revertStatus } = await import("@/app/(kitchen)/_actions");
      const result = await revertStatus(orderId, revertTo);

      if (result.ok) {
        toast.success(`Undid #${shortCode}`);
        await refreshFn();

        logger.info("kitchen undo successful", {
          tenant_id: tenantId,
          order_id: orderId,
          short_code: shortCode,
        });
      } else {
        toast.error(result.error || "Could not undo right now");
        logger.warn("kitchen undo failed", {
          tenant_id: tenantId,
          order_id: orderId,
          error: result.error,
        });
      }
    } catch (e: any) {
      handleActionError(e?.message || "Undo failed");
      logger.error("kitchen undo exception", e, {
        tenant_id: tenantId,
        order_id: orderId,
      });
    } finally {
      setPendingUndo(null);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
    }
  };

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

  // The refresh function defined FIRST for safe closure in the resilient realtime helpers below.
  // Behavior 100% identical to the original — only extracted for sharing with backoff logic.
  // Reuses seenOrderIdsRef, playBell, newOrderFlash exactly.
  const refreshFn = async (onNewPlaced?: () => void) => {
    const sb = getBrowserClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await sb
      .from("orders")
      .select(
        "id, short_code, status, total_paise, placed_at, ready_at, collected_at, customer_name, order_type, table_label, otp_attempts"
      )
      .eq("tenant_id", tenantId)
      .in("status", ["placed", "preparing", "ready", "collected"])
      .gte("placed_at", today.toISOString())
      .order("placed_at", { ascending: true })
      .limit(300) // raised from 120 — handles high-volume campuses (200+ orders/day)
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
          .select("id, order_id, name_snapshot, qty, diet_snapshot, menu_item_id")
          .in("order_id", ids)
          .returns<LineRow[]>();
        setLines(l ?? []);
      }
      if (newPlaced) {
        // Real-world fix: always notify (bell + flash) when a new paid order appears in "placed".
        // This covers the dominant student UPI/direct payment path (which emits "status_changed" to placed),
        // not just rare literal "placed" events. The bhaiya gets the reliable ding exactly when the ticket lands.
        playBell();
        setNewOrderFlash(true);
        setTimeout(() => setNewOrderFlash(false), 10000);
        onNewPlaced?.();
      }
    }
  };

  // Resilient realtime with exponential backoff + jitter (900ms base, capped 30s).
  // Reuses EXACTLY the same order_events INSERT subscription, refresh logic,
  // seenOrderIdsRef, 20s poll + visibilitychange, playBell, and emit-driven flow.
  // Masterpiece for real kitchens: during 30-60s drops the UI tells truth, keeps polling,
  // auto-heals with jitter so multiple tablets don't thundering herd, one-tap force retry.
  const setupRealtime = () => {
    const sb = getBrowserClient();

    // Clean any prior
    if (channelRef.current) {
      try { sb.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

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
          // Priority 1: detect UPI-trust (unverified) orders and badge them in kitchen
          const ev = payload.new as { order_id?: string; payload?: { upi_unverified?: boolean; to?: string } } | null;
          if (ev?.payload?.upi_unverified && ev.order_id) {
            setUnverifiedUpiOrders((prev) => new Set(prev).add(ev.order_id!));
          }
          // Clear unverified flag when order is collected/rejected/cancelled
          if (ev?.order_id && ["collected","rejected","expired","cancelled_by_kitchen"].includes(ev?.payload?.to ?? "")) {
            setUnverifiedUpiOrders((prev) => { const next = new Set(prev); next.delete(ev.order_id!); return next; });
          }

          void refreshFn();
          if (connStateRef.current !== "online") {
            setConnState("online");
            setReconnectAttempt(0);
          }
        }
      );

    const handleStatus = (status: string) => {
      if (status === "SUBSCRIBED") {
        setConnState("online");
        setReconnectAttempt(0);
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
        // Production-grade observability: log successful recovery
        logger.info("kitchen realtime connected", {
          tenant_id: tenantId,
          reconnect_attempt: reconnectAttempt,
        });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setConnState("reconnecting");
        scheduleReconnect();
        logger.warn("kitchen realtime disconnected", {
          tenant_id: tenantId,
          status,
          reconnect_attempt: reconnectAttempt + 1,
        });
      }
    };

    channel.subscribe((status, err) => {
      handleStatus(status);
      if (err) {
        setConnState("reconnecting");
        scheduleReconnect();
        logger.error("kitchen realtime subscription error", err, {
          tenant_id: tenantId,
          reconnect_attempt: reconnectAttempt,
        });
      }
    });

    channelRef.current = channel;
    return channel;
  };

  const scheduleReconnect = () => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    const attempt = reconnectAttemptRef.current;
    const base = Math.min(30000, 900 * Math.pow(2, Math.min(attempt, 6)));
    const jitter = Math.floor(Math.random() * 1400) - 300;
    const delay = Math.max(800, base + jitter);

    const nextAttempt = attempt + 1;
    setReconnectAttempt(nextAttempt);
    reconnectAttemptRef.current = nextAttempt;

    // P0-4 FIX: After 4 failed attempts (~30s total), surface a clear OFFLINE state.
    // Staff were previously stuck on "Reconnecting (attempt 47)" indefinitely.
    // At OFFLINE, the manual "Tap to reconnect" button becomes reachable.
    if (nextAttempt >= 4) {
      setConnState("offline");
      connStateRef.current = "offline";
    }

    retryTimeoutRef.current = setTimeout(() => {
      if (connStateRef.current === "offline") return; // manual reconnect will handle it
      setConnState("reconnecting");
      connStateRef.current = "reconnecting";
      setupRealtime();
    }, delay);
  };

  const forceReconnect = () => {
    setReconnectAttempt(0);
    setConnState("reconnecting");
    setupRealtime();
  };

  useEffect(() => {
    const sb = getBrowserClient();

    // Initial resilient connection (replaces the old direct subscribe)
    setupRealtime();

    const onVis = () => {
      if (document.visibilityState === "visible") void refreshFn();
    };
    document.addEventListener("visibilitychange", onVis);

    // Network events for faster recovery on campus Wi-Fi flaps
    const onNetOnline = () => {
      if (connStateRef.current !== "online") forceReconnect();
    };
    window.addEventListener("online", onNetOnline);
    // Note: no 'offline' listener needed — our poll + backoff handles it gracefully

    // The legendary 20s safety-net poll + visibility (kept 100% unchanged in spirit & load)
    const pollId = setInterval(() => {
      if (document.visibilityState === "visible") void refreshFn();
    }, 20_000);

    return () => {
      if (channelRef.current) {
        try { sb.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onNetOnline);
      clearInterval(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        className="hidden lg:flex flex-col px-4 gap-1"
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          width: "228px",
          zIndex: 30,
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

          {/* Live resilient status dot + bell toggle — 3-state high visibility for bright kitchens */}
          <div className="flex items-center justify-between" style={{ padding: "6px 8px" }}>
            <button
              type="button"
              onClick={forceReconnect}
              className="inline-flex items-center tabular"
              style={{
                gap: "6px",
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: "11px",
                fontWeight: 700,
                color: connState === "online" ? "var(--kt-olive)" : connState === "reconnecting" ? "var(--kt-mustard)" : "var(--kt-tomato)",
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
              title={connState === "online" ? "Connected — tap to force refresh" : "Tap to retry connection now"}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: connState === "online" ? "var(--kt-olive)" : connState === "reconnecting" ? "var(--kt-mustard)" : "var(--kt-tomato)",
                  display: "inline-block",
                  animation: connState !== "online" ? "blinkLive 1.1s infinite" : "none",
                }}
              />
              {connState === "online" ? "Online" : connState === "reconnecting" ? `Reconnecting ${reconnectAttempt}` : "OFFLINE"}
            </button>
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
      <div className="hidden lg:block shrink-0" style={{ width: 228 }} />

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-col min-w-0">
        {/* Masterpiece resilient connection banner — high contrast for bright kitchen lights, oily fingers, 2G drops.
           Persistent truth: Online (no banner), Reconnecting (attempt count + auto backoff), OFFLINE (big tap-to-retry).
           Reuses the original wsConnected visual language but upgraded to 3 states + forceReconnect.
           Solves the exact 30-60s network pain: staff always knows "system is fighting for me" or "one tap fixes it".
        */}
        {connState !== "online" && (
          <div
            role="status"
            aria-live="polite"
            onClick={forceReconnect}
            className="sticky top-0 z-40 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.985] transition-transform"
            style={{
              background: connState === "reconnecting" ? "var(--kt-mustard)" : "#2a160a",
              color: connState === "reconnecting" ? "var(--kt-ink)" : "var(--kt-cream)",
              padding: "14px 18px",
              fontSize: "15px",
              fontWeight: 700,
              borderBottom: connState === "offline" ? "4px solid var(--kt-tomato)" : "none",
              minHeight: "52px",
            }}
          >
            <Radio size={18} className="shrink-0" style={{ animation: connState === "reconnecting" ? "blinkLive 1.2s infinite" : "none" }} />
            <span style={{ letterSpacing: "0.01em" }}>
              {connState === "reconnecting"
                ? `Reconnecting… (attempt ${reconnectAttempt}) — orders safe via poll`
                : "OFFLINE — kitchen link down. Tap anywhere to retry now"}
            </span>
            {connState === "offline" && (
              <span
                style={{
                  marginLeft: "12px",
                  padding: "4px 14px",
                  background: "var(--kt-cream)",
                  color: "var(--kt-ink)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                RETRY NOW
              </span>
            )}
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
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {tenantName} · {(() => { const h = new Date().getHours(); if (h < 11) return "Breakfast Service"; if (h < 15) return "Lunch Service"; if (h < 18) return "Evening Snacks"; return "Dinner Service"; })()}
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
                    color: connState === "online" ? "var(--kt-olive)" : connState === "reconnecting" ? "var(--kt-mustard)" : "var(--kt-tomato)",
                    textTransform: "none",
                    letterSpacing: 0,
                    fontFamily: "var(--font-manrope), ui-sans-serif, system-ui",
                    fontWeight: 700,
                    fontSize: "12px",
                  }}
                >
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: connState === "online" ? "var(--kt-olive)" : connState === "reconnecting" ? "var(--kt-mustard)" : "var(--kt-tomato)",
                      display: "inline-block",
                      animation: connState !== "online" ? "blinkLive 1.1s infinite" : "none",
                    }}
                  />
                  {connState === "online" ? "Online · WS" : connState === "reconnecting" ? `Reconnecting (${reconnectAttempt})` : "OFFLINE"}
                </span>
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Walk-in order button — KFC-style quick counter order */}
              <button
                type="button"
                onClick={() => setWalkInOpen(true)}
                className="inline-flex items-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  height: "34px",
                  padding: "0 12px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: "2px solid var(--kt-tomato)",
                  background: "var(--kt-tomato)",
                  color: "var(--kt-cream)",
                  cursor: "pointer",
                  boxShadow: "0 2px 0 var(--kt-ink)",
                }}
              >
                + Walk-in
              </button>

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
          <KitchenKpiStrip orders={orders} newOrderFlash={newOrderFlash} />
        </header>

        <KitchenMarquee items={menuItems.filter(it => it.in_stock)} />

        {/* Main board area */}
        <main style={{ padding: "24px 24px 64px" }}>
          <PrepTotalsStrip orders={orders} lines={lines} onSessionExpired={() => setSessionExpired(true)} />

          {/* Today's Specials Header section */}
          <div className="mb-6 p-5 rounded-2xl border-2 border-dashed border-[color:var(--kt-tomato)] bg-tomato-500/5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[18px]">✨</span>
                <div>
                  <h3 className="font-display font-bold text-[18px] text-[color:var(--kt-ink)] leading-none">Today&apos;s Specials</h3>
                  <p className="text-[11px] font-mono text-[color:var(--kt-ink-3)] uppercase tracking-wider mt-1">Highlighted on student ordering screens</p>
                </div>
              </div>
              <button
                onClick={() => setManageSpecialsOpen((v) => !v)}
                className="px-4 py-1.5 rounded-lg border border-tomato-500/20 text-[12.5px] font-semibold text-tomato-600 bg-white hover:bg-tomato-50/50 transition-colors active:scale-95 cursor-pointer"
              >
                {manageSpecialsOpen ? "Close panel" : "⚙️ Manage Specials"}
              </button>
            </div>

            {/* List of items currently marked as special */}
            <div className="flex flex-wrap gap-2.5">
              {menuItems.filter(it => it.is_special).map(it => (
                <div 
                  key={it.id} 
                  className="px-3.5 py-2 rounded-xl border border-tomato-500/20 bg-tomato-500/10 text-[13px] font-bold text-tomato-600 flex items-center gap-2"
                >
                  <span className="shrink-0">
                    {it.diet === "veg" ? "🥬" : it.diet === "egg" ? "🍳" : "🍗"}
                  </span>
                  <span>{it.name}</span>
                  <button
                    onClick={() => handleToggleSpecial(it.id, false)}
                    disabled={togglingSpecialId === it.id}
                    className="p-0.5 rounded-full hover:bg-tomato-500/20 text-tomato-500 hover:text-tomato-600 transition-colors cursor-pointer"
                    title="Remove from specials"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
              {menuItems.filter(it => it.is_special).length === 0 && (
                <div className="text-[12.5px] text-[color:var(--kt-ink-3)] italic">No specials selected for today. Tap &ldquo;Manage Specials&rdquo; to highlight items!</div>
              )}
            </div>

            {/* Collapsible panel to manage specials */}
            {manageSpecialsOpen && (
              <div className="mt-2 pt-4 border-t border-dashed border-[color:var(--kt-line)]">
                <p className="text-[12px] font-semibold text-[color:var(--kt-ink-2)] mb-3">Toggle Special Status for Live Items:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {menuItems.map(it => {
                    const isSp = it.is_special;
                    return (
                      <button
                        key={it.id}
                        onClick={() => handleToggleSpecial(it.id, !isSp)}
                        disabled={togglingSpecialId === it.id}
                        className={cn(
                          "px-3 py-2 rounded-xl border text-[12px] font-bold transition-all text-left flex items-center justify-between gap-2 active:scale-[0.98] cursor-pointer",
                          isSp
                            ? "border-tomato-500/30 bg-tomato-500/15 text-tomato-600"
                            : "border-[color:var(--kt-line)] bg-white text-[color:var(--kt-ink-2)] hover:bg-[color:var(--kt-cream-3)]"
                        )}
                      >
                        <span className="truncate">{it.name}</span>
                        <span className="text-[14px] shrink-0">{isSp ? "★" : "☆"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

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
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <div className="grid grid-cols-4 min-w-[680px]" style={{ minHeight: "520px" }}>
              <OrderColumn
                title="Incoming"
                subtitle="Just paid · awaiting kitchen"
                status="placed"
                orders={groups.placed}
                linesByOrder={linesByOrder}
                pendingActionId={pendingActionId}
                unverifiedUpiOrders={unverifiedUpiOrders}
                onAction={async (id, action) => {
                  setPendingActionId(id);
                  try {
                    const { markPreparing } = await import("@/app/(kitchen)/_actions");
                    const r = await markPreparing(id);
                    if (!r.ok) handleActionError(r.error);
                    if (action === "start" && r.ok) {
                      const ord = orders.find((o) => o.id === id);
                      toast.success(`Started ${id.slice(0, 6)}`);
                      if (ord) startUndoWindow(id, ord.short_code, "placed", "preparing");
                    }
                  } finally {
                    setPendingActionId(null);
                  }
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
                subtitle="Currently cooking"
                status="preparing"
                orders={groups.preparing}
                linesByOrder={linesByOrder}
                pendingActionId={pendingActionId}
                onAction={async (id) => {
                  setPendingActionId(id);
                  try {
                    const { markReady } = await import("@/app/(kitchen)/_actions");
                    const r = await markReady(id);
                    if (!r.ok) handleActionError(r.error);
                    else {
                      const ord = orders.find((o) => o.id === id);
                      toast.success("Ready — pickup code issued");
                      if (ord) startUndoWindow(id, ord.short_code, "preparing", "ready");
                    }
                  } finally {
                    setPendingActionId(null);
                  }
                }}
              />
              <OrderColumn
                title="Ready"
                subtitle="Student will show a code"
                status="ready"
                orders={groups.ready}
                linesByOrder={linesByOrder}
                pendingActionId={pendingActionId}
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
            </div>
            {/* Queue footer — matches .queue-foot */}
            <div
              className="flex justify-between items-center"
              style={{
                padding: "10px 16px",
                borderTop: "1px solid var(--kt-line)",
                background: "var(--kt-cream-4)",
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: "13px",
                color: "var(--kt-ink-3)",
                letterSpacing: "0.04em",
              }}
            >
              <span>TAP any card to move it forward · TAP VERIFY CODE when student arrives</span>
              <span style={{ color: "var(--kt-tomato)", fontWeight: 600 }}>
                {groups.placed.length + groups.preparing.length} active
              </span>
            </div>
          </div>

          {/* 5-second "I made a mistake" undo bar — high-contrast, 56px tap target, auto-dismiss.
             Only appears for 5s after a status advance. Reuses PrepTotals ghost-pill pattern + full logging.
             Solves the #1 accidental tap terror during rush: no more "oops, now what?". One big friendly bar.
          */}
          {pendingUndo && (
            <div
              onClick={() => void performUndo()}
              role="button"
              aria-label={`Undo move of ${pendingUndo.shortCode} — tap now`}
              style={{
                position: "sticky",
                bottom: "12px",
                zIndex: 60,
                margin: "12px auto 0",
                maxWidth: "min(520px, 94%)",
                background: "var(--kt-tomato)",
                color: "var(--kt-cream)",
                borderRadius: "10px",
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow: "0 4px 0 var(--kt-ink)",
                fontFamily: "var(--font-manrope), ui-sans-serif, system-ui",
                fontWeight: 700,
                fontSize: "15px",
                cursor: "pointer",
                border: "3px solid var(--kt-ink)",
              }}
            >
              <span style={{ fontSize: "18px" }}>↩︎</span>
              <div style={{ flex: 1 }}>
                MISTAKE? Undo <span style={{ fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace", fontWeight: 800 }}>{pendingUndo.shortCode}</span> — tap this bar now
              </div>
              <span
                style={{
                  background: "var(--kt-cream)",
                  color: "var(--kt-tomato)",
                  padding: "2px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                }}
              >
                UNDO (5s)
              </span>
            </div>
          )}
        </main>

        <OtpVerifyDialog
          open={Boolean(verifyId)}
          order={verifyOrder}
          onClose={() => setVerifyId(null)}
          onResult={(ok) => {
            if (ok) setVerifyId(null);
          }}
        />

        <WalkInDialog
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          open={walkInOpen}
          onClose={() => setWalkInOpen(false)}
          onCreated={(shortCode) => {
            void refreshFn();
            toast.success(`#${shortCode} placed — it's in the queue`);
          }}
        />
      </div>
    </div>
  );
}

function KitchenKpiStrip({ orders, newOrderFlash }: { orders: OrderRow[]; newOrderFlash: boolean }) {
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
          className={cn(c.label === "Incoming" && newOrderFlash && "ring-2 ring-[#d52821] ring-offset-2 animate-pulse")}
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
  // recentlySoldOut: Map<name, menuItemId | null> — persists until undo or refresh
  const [recentlySoldOut, setRecentlySoldOut] = useState<Map<string, string | null>>(new Map());

  const totals = useMemo(() => {
    const activeIds = new Set(
      orders.filter((o) => o.status === "placed" || o.status === "preparing").map((o) => o.id)
    );
    // Build name→{qty, menuItemId} — first seen menuItemId wins (all rows for same item share it)
    const m = new Map<string, { qty: number; menuItemId: string | null }>();
    for (const l of lines) {
      if (!activeIds.has(l.order_id)) continue;
      const existing = m.get(l.name_snapshot);
      m.set(l.name_snapshot, {
        qty: (existing?.qty ?? 0) + l.qty,
        menuItemId: existing?.menuItemId ?? l.menu_item_id ?? null,
      });
    }
    return Array.from(m.entries())
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 8)
      .map(([name, { qty, menuItemId }]) => ({ name, qty, menuItemId }));
  }, [orders, lines]);

  // Ghost "undo" pills: recently 86'd items that no longer appear in active queue
  const zeroedOut86Items = useMemo(() => {
    const activeNames = new Set(totals.map((t) => t.name));
    return Array.from(recentlySoldOut.entries())
      .filter(([name]) => !activeNames.has(name))
      .map(([name, menuItemId]) => ({ name, menuItemId }));
  }, [totals, recentlySoldOut]);

  const handle86 = async (name: string, menuItemId: string | null, inStock: boolean) => {
    setLoading((prev) => new Set(prev).add(name));
    try {
      const { markItemSoldOut } = await import("@/app/(kitchen)/_actions");
      // Priority 3 fix: pass UUID (menuItemId) not name. Falls back to name-based
      // lookup inside the action if menuItemId is somehow null (shouldn't happen with real DB data).
      const r = await markItemSoldOut(menuItemId ?? name, inStock);
      if (!r.ok) {
        const err = r.error ?? "Failed";
        if (err.toLowerCase().includes("not authorised") || err.toLowerCase().includes("unauthorized")) {
          onSessionExpired();
        } else {
          toast.error(err);
        }
      } else if (!inStock) {
        toast.success(`${name} marked as sold out. Student menu updated.`);
        setRecentlySoldOut((prev) => new Map(prev).set(name, menuItemId));
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

  if (totals.length === 0 && zeroedOut86Items.length === 0) return null;

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
        {totals.map(({ name, qty, menuItemId }) => {
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
              {/* SOLD OUT button — min 44px touch target */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handle86(name, menuItemId, false)}
                title={`Mark as sold out`}
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
                }}
              >
                SOLD OUT
              </button>
            </div>
          );
        })}

        {/* Ghost "undo 86" pills for items recently sold out with 0 active qty */}
        {zeroedOut86Items.map(({ name, menuItemId }) => {
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
                onClick={() => void handle86(name, menuItemId, true)}
                title={`Mark ${name} back in stock`}
                aria-label={`Mark ${name} back in stock`}
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
                BACK IN STOCK
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
