"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, BellOff, ChefHat, History as HistoryIcon, Radio, UserRoundCog, X } from "lucide-react";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn, formatRupees, formatTimeIST } from "@/lib/utils";
import { toggleItemSpecial, createSpecialMenuItem } from "@/app/(admin)/admin/_actions";
import { OrderColumn } from "./order-column";
import { OtpVerifyDialog } from "./otp-verify-dialog";
import { WalkInDialog } from "./walk-in-dialog";
import { KitchenMarquee } from "./marquee";
import { logger } from "@/lib/logging";
import { readKitchenSoundsOn, writeKitchenSoundsOn } from "@/lib/kitchen-sounds-pref";

type WorkLane = "placed" | "preparing" | "ready";

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
  const [specialForm, setSpecialForm] = useState({
    name: "",
    description: "",
    price: "",
    prep: "10",
    diet: "veg" as "veg" | "nonveg" | "egg",
  });
  const [submittingSpecial, startSubmitSpecial] = useTransition();

  const handlePushSpecial = () => {
    const { name, description, price, prep, diet } = specialForm;
    if (!name.trim()) {
      toast.error("Enter a dish name");
      return;
    }
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    const pricePaise = Math.round(parsedPrice * 100);
    const prepMin = parseInt(prep, 10) || 10;

    startSubmitSpecial(async () => {
      const existing = menuItems.find(
        (it) => it.name.trim().toLowerCase() === name.trim().toLowerCase()
      );

      if (existing) {
        setTogglingSpecialId(existing.id);
        setMenuItems((prev) =>
          prev.map((it) => it.id === existing.id ? { ...it, is_special: true } : it)
        );
        const r = await toggleItemSpecial(existing.id, true);
        setTogglingSpecialId(null);
        if (!r.ok) {
          toast.error(r.error ?? "Failed to toggle special status");
          setMenuItems((prev) =>
            prev.map((it) => it.id === existing.id ? { ...it, is_special: existing.is_special } : it)
          );
        } else {
          toast.success(`"${existing.name}" is now on specials!`);
          setSpecialForm({ name: "", description: "", price: "", prep: "10", diet: "veg" });
        }
      } else {
        const r = await createSpecialMenuItem({
          name: name.trim(),
          description: description.trim() || null,
          price_paise: pricePaise,
          diet,
          prep_time_minutes: prepMin,
        });

        if (!r.ok || !r.id) {
          toast.error(r.error ?? "Failed to create special item");
        } else {
          toast.success(`"${name.trim()}" created and pushed to live specials!`);
          const newItem = {
            id: r.id,
            name: name.trim(),
            price_paise: pricePaise,
            diet,
            is_special: true,
            in_stock: true,
            category_id: null,
          };
          setMenuItems((prev) => [...prev, newItem]);
          setSpecialForm({ name: "", description: "", price: "", prep: "10", diet: "veg" });
        }
      }
    });
  };

  const handleNameChange = (val: string) => {
    setSpecialForm((prev) => {
      const next = { ...prev, name: val };
      const match = menuItems.find(
        (it) => it.name.trim().toLowerCase() === val.trim().toLowerCase()
      );
      if (match) {
        next.price = (match.price_paise / 100).toString();
        next.diet = match.diet;
      }
      return next;
    });
  };
  const [clock, setClock] = useState<string>("--:--");
  const [connState, setConnState] = useState<'online' | 'reconnecting' | 'offline'>('online');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  // Speaker is the product: phone + chime replaces shouting across the counter.
  const [bellOn, setBellOn] = useState(true);
  const [mobileLane, setMobileLane] = useState<WorkLane>("placed");
  const [toolsOpen, setToolsOpen] = useState(false);
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
        setMobileLane(from);
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
      clearUndoWindow();
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

  // Hydrate speaker pref after mount (SSR-safe).
  useEffect(() => {
    const on = readKitchenSoundsOn();
    setBellOn(on);
    bellOnRef.current = on;
  }, []);

  const setSpeaker = (on: boolean) => {
    setBellOn(on);
    bellOnRef.current = on;
    writeKitchenSoundsOn(on);
    // Unlock Web Audio on user gesture so the first live ding actually plays (iOS/Safari).
    if (on) {
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        void ctx.resume().then(() => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.setValueAtTime(720, ctx.currentTime);
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
          o.connect(g).connect(ctx.destination);
          o.start();
          o.stop(ctx.currentTime + 0.2);
          setTimeout(() => ctx.close().catch(() => {}), 400);
        });
      } catch {
        // silent
      }
    }
  };

  const clearUndoWindow = () => {
    setPendingUndo(null);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  };

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

  // ── Coalesced-refresh state ────────────────────────────────────────────────
  // Under a lunch-rush flood (hundreds of order_events/min) the board MUST NOT
  // fire one full 300-order refetch per event — that is what froze the queue.
  // These refs let scheduleRefresh() collapse a burst into at most one refetch
  // per MIN_REFRESH_MS window, with no overlapping in-flight fetches.
  const MIN_REFRESH_MS = 400;
  const lastRefreshAtRef = useRef(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);

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
        // Speaker + flash = the shout replacement. Jump phone cook to New so the ticket is under the thumb.
        playBell();
        setNewOrderFlash(true);
        setMobileLane("placed");
        setTimeout(() => setNewOrderFlash(false), 10000);
        onNewPlaced?.();
      }
    }
  };

  // Runs refreshFn with an in-flight guard. If events arrive mid-fetch, one
  // trailing refresh is queued so the board never misses the final state.
  const runRefresh = async () => {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }
    refreshInFlightRef.current = true;
    lastRefreshAtRef.current = Date.now();
    try {
      await refreshFn();
    } finally {
      refreshInFlightRef.current = false;
      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        scheduleRefresh();
      }
    }
  };

  // Coalesces a burst of realtime events into at most one refetch per
  // MIN_REFRESH_MS window. Leading-edge when idle (a lone order shows in <1s),
  // trailing otherwise. This is the single most important guard against the
  // board freezing when 1000 orders land at the lunch bell.
  const scheduleRefresh = () => {
    if (refreshTimerRef.current) return; // a run is already queued for this window
    const wait = Math.max(0, MIN_REFRESH_MS - (Date.now() - lastRefreshAtRef.current));
    if (wait === 0 && !refreshInFlightRef.current) {
      void runRefresh();
    } else {
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        void runRefresh();
      }, wait);
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
          const ev = payload.new as {
            order_id?: string;
            event_type?: string;
            payload?: { upi_unverified?: boolean; to?: string; from?: string };
          } | null;
          if (ev?.payload?.upi_unverified && ev.order_id) {
            setUnverifiedUpiOrders((prev) => new Set(prev).add(ev.order_id!));
          }
          // Clear unverified flag when order is collected/rejected/cancelled
          if (ev?.order_id && ["collected","rejected","expired","cancelled_by_kitchen"].includes(ev?.payload?.to ?? "")) {
            setUnverifiedUpiOrders((prev) => { const next = new Set(prev); next.delete(ev.order_id!); return next; });
          }

          // ── Surgical patch for status-change events ──────────────────────────
          // When the event carries a known status transition, update just that one
          // order in state instead of refetching all 300. This eliminates the
          // full-DB-round-trip on every button tap during a lunch-rush flood.
          //
          // event_type values that map 1:1 to an order status:
          //   "preparing"  → order moved to preparing
          //   "ready"      → order moved to ready
          //   "collected"  → order collected after OTP verify
          //   "reverted"   → undo: payload.to is the status to revert to
          //
          // For new orders (event_type "status_changed" with to="placed") and
          // ambiguous events, fall through to the full scheduleRefresh path.
          const PATCH_STATUS: Record<string, Status> = {
            preparing: "preparing",
            ready:     "ready",
            collected: "collected",
          };

          const eventType = ev?.event_type ?? "";
          const orderId = ev?.order_id;

          if (orderId && PATCH_STATUS[eventType]) {
            const newStatus = PATCH_STATUS[eventType];
            setOrders((prev) => prev.map((o) =>
              o.id === orderId
                ? { ...o, status: newStatus, ...(newStatus === "collected" ? { collected_at: o.collected_at ?? new Date().toISOString() } : {}) }
                : o
            ));
            // Mark connection healthy but skip full refetch
            if (connStateRef.current !== "online") {
              setConnState("online");
              setReconnectAttempt(0);
            }
            return;
          }

          if (orderId && eventType === "reverted") {
            const revertTo = ev?.payload?.to as Status | undefined;
            if (revertTo === "placed" || revertTo === "preparing") {
              setOrders((prev) => prev.map((o) =>
                o.id === orderId ? { ...o, status: revertTo } : o
              ));
              if (connStateRef.current !== "online") {
                setConnState("online");
                setReconnectAttempt(0);
              }
              return;
            }
          }

          // All other events (new order, rejected, menu_item_86, walkin, etc.)
          // require a full refetch to get accurate data.
          scheduleRefresh();
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
      if (document.visibilityState === "visible") scheduleRefresh();
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
      if (document.visibilityState === "visible") scheduleRefresh();
    }, 20_000);

    return () => {
      if (channelRef.current) {
        try { sb.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
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
              onClick={() => setSpeaker(!bellOn)}
              aria-label={bellOn ? "Mute speaker" : "Unmute speaker"}
              title={bellOn ? "Speaker on — new orders ding" : "Speaker muted"}
              className="inline-flex items-center justify-center transition-colors"
              style={{
                height: "28px",
                width: "28px",
                borderRadius: "6px",
                color: bellOn ? "var(--kt-olive)" : "var(--kt-ink-3)",
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

        {/* Page header — phone-first cook chrome: speaker is the product, not decoration */}
        <header
          className="sticky top-0 z-30"
          style={{
            background: "var(--kt-paper)",
            borderBottom: "1px solid var(--kt-line-2)",
          }}
        >
          <div
            className="flex flex-wrap items-center gap-2 justify-between"
            style={{ padding: "10px 14px 8px" }}
          >
            <div className="min-w-0">
              <div
                className="hidden sm:block"
                style={{
                  fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                  fontSize: "10px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--kt-ink-3)",
                  fontWeight: 500,
                }}
              >
                {tenantName} · phone + speaker · no shouting
              </div>
              <h1
                style={{
                  fontFamily: "var(--font-newsreader), ui-serif, Georgia",
                  fontWeight: 500,
                  fontSize: "clamp(22px, 5vw, 40px)",
                  letterSpacing: "-0.03em",
                  margin: "2px 0 2px",
                  lineHeight: 1.05,
                  color: "var(--kt-ink)",
                }}
              >
                Live <span style={{ fontStyle: "italic", color: "var(--kt-tomato)", fontWeight: 500 }}>kitchen.</span>
              </h1>
              <div
                className="flex items-center flex-wrap"
                style={{
                  gap: "10px",
                  fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                  fontSize: "11px",
                  color: "var(--kt-ink-3)",
                  fontWeight: 500,
                }}
              >
                <span className="tabular" style={{ color: "var(--kt-ink)" }}>{clock}</span>
                <span
                  className="inline-flex items-center"
                  style={{
                    gap: "6px",
                    color: connState === "online" ? "var(--kt-olive)" : connState === "reconnecting" ? "var(--kt-mustard)" : "var(--kt-tomato)",
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
                  {connState === "online" ? "Live" : connState === "reconnecting" ? `…${reconnectAttempt}` : "OFFLINE"}
                </span>
                {newOrderFlash && (
                  <span
                    style={{
                      color: "var(--kt-tomato)",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontSize: "11px",
                      animation: "urgent 1s infinite",
                    }}
                  >
                    New ticket
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* SPEAKER — first-class control: this is how orders "arrive" without shouting */}
              <button
                type="button"
                onClick={() => setSpeaker(!bellOn)}
                aria-label={bellOn ? "Mute speaker" : "Turn speaker on"}
                aria-pressed={bellOn}
                title={bellOn ? "Speaker ON — new orders ding" : "Speaker OFF — turn on for rush"}
                className="inline-flex items-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  height: "44px",
                  minWidth: "44px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: 800,
                  border: bellOn ? "2px solid var(--kt-olive)" : "2px solid var(--kt-line-2)",
                  background: bellOn ? "var(--kt-olive-soft)" : "var(--kt-cream-4)",
                  color: bellOn ? "var(--kt-olive)" : "var(--kt-ink-3)",
                  cursor: "pointer",
                  boxShadow: bellOn ? "0 2px 0 var(--kt-ink)" : "none",
                }}
              >
                {bellOn ? <Bell size={16} /> : <BellOff size={16} />}
                <span className="hidden sm:inline">{bellOn ? "Speaker" : "Muted"}</span>
              </button>

              <button
                type="button"
                onClick={() => setWalkInOpen(true)}
                className="hidden lg:inline-flex items-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
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

              {/* Tools on all non-xl: phone + tablet (specials aside only at xl) */}
              <button
                type="button"
                onClick={() => setToolsOpen((v) => !v)}
                className="xl:hidden inline-flex items-center justify-center transition-all"
                aria-label="More tools"
                aria-expanded={toolsOpen}
                style={{
                  height: "44px",
                  width: "44px",
                  borderRadius: "10px",
                  border: "2px solid var(--kt-line-2)",
                  background: toolsOpen ? "var(--kt-ink)" : "var(--kt-cream-4)",
                  color: toolsOpen ? "var(--kt-cream)" : "var(--kt-ink)",
                  fontSize: "18px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ⋯
              </button>
            </div>
          </div>

          {/* Tools sheet — phone + tablet until specials side panel appears */}
          {toolsOpen && (
            <div
              className="xl:hidden flex flex-col gap-1 px-3 pb-3"
              style={{ borderTop: "1px solid var(--kt-line)" }}
            >
              <Link
                href={`/c/${tenantSlug}/kitchen/history`}
                className="flex items-center gap-2 px-3 py-3 rounded-lg text-[14px] font-semibold"
                style={{ color: "var(--kt-ink)", background: "var(--kt-cream-4)" }}
                onClick={() => setToolsOpen(false)}
              >
                <HistoryIcon size={16} /> History · served today
              </Link>
              <Link
                href={`/c/${tenantSlug}/kitchen/staff-select`}
                className="flex items-center gap-2 px-3 py-3 rounded-lg text-[14px] font-semibold"
                style={{ color: "var(--kt-ink)", background: "var(--kt-cream-4)" }}
                onClick={() => setToolsOpen(false)}
              >
                <UserRoundCog size={16} /> Switch staff
              </Link>
              <button
                type="button"
                onClick={() => { setWalkInOpen(true); setToolsOpen(false); }}
                className="flex items-center gap-2 px-3 py-3 rounded-lg text-[14px] font-semibold text-left"
                style={{ color: "var(--kt-ink)", background: "var(--kt-cream-4)", border: "none", cursor: "pointer" }}
              >
                + Walk-in order
              </button>
              <button
                type="button"
                onClick={() => { setManageSpecialsOpen(true); setToolsOpen(false); }}
                className="flex items-center gap-2 px-3 py-3 rounded-lg text-[14px] font-semibold text-left"
                style={{ color: "var(--kt-ink)", background: "var(--kt-cream-4)", border: "none", cursor: "pointer" }}
              >
                Today&apos;s specials
              </button>
            </div>
          )}

          {/* Phone segment control — one lane under the thumb */}
          <div
            className="lg:hidden grid grid-cols-3 gap-1 px-3 pb-3"
            role="tablist"
            aria-label="Kitchen lanes"
          >
            {(
              [
                { id: "placed" as const, label: "New", count: groups.placed.length, flash: newOrderFlash },
                { id: "preparing" as const, label: "Cooking", count: groups.preparing.length, flash: false },
                { id: "ready" as const, label: "Serve", count: groups.ready.length, flash: false },
              ] as const
            ).map((tab) => {
              const active = mobileLane === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`kitchen-tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls={`kitchen-lane-${tab.id}`}
                  onClick={() => setMobileLane(tab.id)}
                  className="flex flex-col items-center justify-center transition-all active:scale-[0.98]"
                  style={{
                    minHeight: "52px",
                    borderRadius: "10px",
                    border: active ? "2px solid var(--kt-ink)" : "2px solid var(--kt-line)",
                    background: active ? "var(--kt-ink)" : "var(--kt-cream-4)",
                    color: active ? "var(--kt-cream)" : "var(--kt-ink-2)",
                    boxShadow: active ? "0 2px 0 var(--kt-tomato)" : "none",
                    cursor: "pointer",
                    outline: tab.flash && !active ? "2px solid var(--kt-tomato)" : "none",
                  }}
                >
                  <span
                    className="tabular"
                    style={{
                      fontFamily: "var(--font-newsreader), ui-serif, Georgia",
                      fontSize: "22px",
                      fontWeight: 600,
                      lineHeight: 1,
                      color: active
                        ? tab.id === "preparing"
                          ? "var(--kt-mustard)"
                          : tab.id === "ready"
                            ? "var(--kt-olive-soft)"
                            : "var(--kt-cream)"
                        : "var(--kt-ink)",
                    }}
                  >
                    {String(tab.count).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginTop: 2,
                      opacity: active ? 0.9 : 0.7,
                    }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Desktop KPI only — phone uses segments */}
          <div className="hidden lg:block">
            <KitchenKpiStrip orders={orders} newOrderFlash={newOrderFlash} />
          </div>
        </header>

        <div className="hidden lg:block">
          <KitchenMarquee items={menuItems.filter((it) => it.in_stock)} />
        </div>

        {/* Main board: phone = one vertical lane; desktop = 3 work lanes (no live Collected) */}
        <div
          className="flex flex-col xl:flex-row gap-4 xl:gap-6 items-stretch xl:items-start w-full flex-1 min-h-0"
          style={{ padding: "12px 12px 80px" }}
        >
          <div
            className="flex-1 w-full flex flex-col min-h-0"
            style={{
              background: "var(--kt-paper)",
              border: "1px solid var(--kt-ink)",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "5px 5px 0 var(--kt-ink)",
              minHeight: "min(70vh, 640px)",
            }}
          >
            {/* PHONE: single active lane */}
            <div
              className="lg:hidden flex flex-col flex-1 min-h-0"
              style={{ minHeight: "55vh" }}
              role="tabpanel"
              id={`kitchen-lane-${mobileLane}`}
              aria-label={mobileLane === "placed" ? "New tickets" : mobileLane === "preparing" ? "Cooking" : "Ready to serve"}
            >
              <OrderColumn
                title={mobileLane === "placed" ? "New" : mobileLane === "preparing" ? "Cooking" : "Serve"}
                status={mobileLane}
                orders={
                  mobileLane === "placed"
                    ? groups.placed
                    : mobileLane === "preparing"
                      ? groups.preparing
                      : groups.ready
                }
                linesByOrder={linesByOrder}
                pendingActionId={pendingActionId}
                unverifiedUpiOrders={unverifiedUpiOrders}
                hideHeader
                variant="phone"
                onAction={async (id, action) => {
                  // Route by action verb only — never by lane alone (prevents wrong transition).
                  if (action === "start") {
                    setPendingActionId(id);
                    const ord = orders.find((o) => o.id === id);
                    if (ord) {
                      setOrders((prev) =>
                        prev.map((o) => (o.id === id ? { ...o, status: "preparing" as const } : o))
                      );
                      startUndoWindow(id, ord.short_code, "placed", "preparing");
                      // Stay on New so cook can START several tickets in a rush; toast is enough.
                      toast.success(`#${ord.short_code} cooking`);
                    }
                    try {
                      const { markPreparing } = await import("@/app/(kitchen)/_actions");
                      const r = await markPreparing(id);
                      if (!r.ok) {
                        setOrders((prev) =>
                          prev.map((o) => (o.id === id ? { ...o, status: "placed" as const } : o))
                        );
                        clearUndoWindow();
                        setMobileLane("placed");
                        handleActionError(r.error);
                      }
                    } finally {
                      setPendingActionId(null);
                    }
                    return;
                  }
                  if (action === "ready") {
                    setPendingActionId(id);
                    const ord = orders.find((o) => o.id === id);
                    if (ord) {
                      setOrders((prev) =>
                        prev.map((o) => (o.id === id ? { ...o, status: "ready" as const } : o))
                      );
                      startUndoWindow(id, ord.short_code, "preparing", "ready");
                      setMobileLane("ready");
                    }
                    try {
                      const { markReady } = await import("@/app/(kitchen)/_actions");
                      const r = await markReady(id);
                      if (!r.ok) {
                        setOrders((prev) =>
                          prev.map((o) => (o.id === id ? { ...o, status: "preparing" as const } : o))
                        );
                        clearUndoWindow();
                        setMobileLane("preparing");
                        handleActionError(r.error);
                      }
                    } finally {
                      setPendingActionId(null);
                    }
                    return;
                  }
                  // action === "verify" → SERVE (OTP)
                  setVerifyId(id);
                }}
                onReject={async (id, reason) => {
                  const { rejectOrder } = await import("@/app/(kitchen)/_actions");
                  const r = await rejectOrder(id, reason);
                  if (!r.ok) handleActionError(r.error ?? "Failed to reject order");
                }}
              />
            </div>

            {/* DESKTOP / TABLET: 3 work lanes — New · Cooking · Serve (Collected lives in History) */}
            <div className="hidden lg:grid grid-cols-3" style={{ minHeight: "520px" }}>
                <OrderColumn
                  title="New"
                  subtitle="Just paid · ding lands here"
                  status="placed"
                  orders={groups.placed}
                  linesByOrder={linesByOrder}
                  pendingActionId={pendingActionId}
                  unverifiedUpiOrders={unverifiedUpiOrders}
                  onAction={async (id, action) => {
                    setPendingActionId(id);
                    const ord = orders.find((o) => o.id === id);
                    if (ord) {
                      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "preparing" as const } : o));
                      if (action === "start") startUndoWindow(id, ord.short_code, "placed", "preparing");
                    }
                    try {
                      const { markPreparing } = await import("@/app/(kitchen)/_actions");
                      const r = await markPreparing(id);
                      if (!r.ok) {
                        setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "placed" as const } : o));
                        clearUndoWindow();
                        handleActionError(r.error);
                      }
                    } finally {
                      setPendingActionId(null);
                    }
                  }}
                  onReject={async (id, reason) => {
                    const { rejectOrder } = await import("@/app/(kitchen)/_actions");
                    const r = await rejectOrder(id, reason);
                    if (!r.ok) handleActionError(r.error ?? "Failed to reject order");
                  }}
                />
                <OrderColumn
                  title="Cooking"
                  subtitle="On the flame"
                  status="preparing"
                  orders={groups.preparing}
                  linesByOrder={linesByOrder}
                  pendingActionId={pendingActionId}
                  onAction={async (id) => {
                    setPendingActionId(id);
                    const ord = orders.find((o) => o.id === id);
                    if (ord) {
                      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "ready" as const } : o));
                      startUndoWindow(id, ord.short_code, "preparing", "ready");
                    }
                    try {
                      const { markReady } = await import("@/app/(kitchen)/_actions");
                      const r = await markReady(id);
                      if (!r.ok) {
                        setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "preparing" as const } : o));
                        clearUndoWindow();
                        handleActionError(r.error);
                      }
                    } finally {
                      setPendingActionId(null);
                    }
                  }}
                />
                <OrderColumn
                  title="Serve"
                  subtitle="OTP handover — no shout"
                  status="ready"
                  orders={groups.ready}
                  linesByOrder={linesByOrder}
                  pendingActionId={pendingActionId}
                  onAction={async (id) => {
                    setVerifyId(id);
                  }}
                />
            </div>
            <div
              className="hidden lg:flex"
              style={{
                justifyContent: "space-between",
                padding: "10px 16px",
                borderTop: "1px solid var(--kt-line)",
                background: "var(--kt-cream-4)",
                fontFamily: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
                fontSize: "12px",
                color: "var(--kt-ink-3)",
                letterSpacing: "0.04em",
              }}
            >
              <span>START → READY → SERVE · speaker dings new tickets · no shouting</span>
              <span style={{ color: "var(--kt-tomato)", fontWeight: 600 }}>
                {groups.placed.length + groups.preparing.length} active
              </span>
            </div>
          </div>

          {/* Specials — desktop only; phone uses tools menu + sheet */}
          <aside
            className="hidden xl:flex w-full xl:w-[280px] shrink-0 p-5 rounded-2xl border-2 flex-col gap-4 text-tomato-900 select-none"
            style={{
              background: "var(--kt-paper)",
              border: "2px solid var(--kt-ink)",
              boxShadow: "5px 5px 0 var(--kt-ink)",
            }}
          >
            <div className="flex flex-col gap-1 border-b border-tomato-900/10 pb-3">
              <div className="flex items-baseline justify-between gap-1">
                <h3 className="font-display font-bold text-[22px] italic text-[color:var(--kt-ink)] leading-none">Today&apos;s Special</h3>
                <span className="bg-tomato-500 text-[9px] font-mono text-white font-bold px-1.5 py-0.5 rounded leading-none">LIVE · PUSHES</span>
              </div>
              <p className="text-[10px] font-mono text-[color:var(--kt-ink-3)] uppercase tracking-wider mt-1">Direct to student menu</p>
            </div>

            {/* Form fields */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[color:var(--kt-ink-2)]">Dish Name</label>
                <input
                  type="text"
                  list="canteen-dishes"
                  placeholder="e.g. Hyderabadi Dum Biryani"
                  value={specialForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-tomato-900/20 bg-white text-tomato-900 focus:outline-none focus:border-tomato-500 font-sans"
                />
                <datalist id="canteen-dishes">
                  {menuItems.map((it) => (
                    <option key={it.id} value={it.name} />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[color:var(--kt-ink-2)]">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Slow-cooked, sealed in dum"
                  value={specialForm.description}
                  onChange={(e) => setSpecialForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 text-[13px] rounded-lg border border-tomato-900/20 bg-white text-tomato-900 focus:outline-none focus:border-tomato-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[color:var(--kt-ink-2)]">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="240"
                    value={specialForm.price}
                    onChange={(e) => setSpecialForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-tomato-900/20 bg-white text-tomato-900 focus:outline-none focus:border-tomato-500 font-sans"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[color:var(--kt-ink-2)]">Prep (min)</label>
                  <input
                    type="number"
                    placeholder="8"
                    value={specialForm.prep}
                    onChange={(e) => setSpecialForm((prev) => ({ ...prev, prep: e.target.value }))}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-tomato-900/20 bg-white text-tomato-900 focus:outline-none focus:border-tomato-500 font-sans"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-mono uppercase tracking-wider font-semibold text-[color:var(--kt-ink-2)]">Diet</label>
                <div className="grid grid-cols-3 gap-1">
                  {(["veg", "nonveg", "egg"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSpecialForm((prev) => ({ ...prev, diet: d }))}
                      className={cn(
                        "py-1 rounded text-[11px] font-mono uppercase tracking-wider font-bold border transition-colors cursor-pointer text-center",
                        specialForm.diet === d
                          ? "bg-tomato-500 border-tomato-500 text-white"
                          : "bg-white border-tomato-900/10 text-tomato-900/60 hover:bg-tomato-50"
                      )}
                    >
                      {d === "veg" ? "Veg" : d === "egg" ? "Egg" : "Non-Veg"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handlePushSpecial}
                disabled={submittingSpecial}
                className="w-full mt-2 h-10 bg-tomato-500 text-white rounded-xl text-[12.5px] font-bold tracking-wider hover:bg-tomato-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                {submittingSpecial ? "PUSHING..." : "▶ PUSH TO LIVE MENU"}
              </button>
            </div>

            {/* Active Specials list */}
            <div className="mt-2 pt-4 border-t border-tomato-900/10 flex flex-col gap-2 flex-1 min-h-[120px]">
              <p className="text-[11px] font-mono uppercase tracking-wider font-bold text-[color:var(--kt-ink-2)]">Active Specials</p>
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {menuItems.filter(it => it.is_special).map(it => (
                  <div 
                    key={it.id} 
                    className="px-3 py-2 rounded-xl border border-tomato-900/10 bg-cream-50 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0 text-sm">
                        {it.diet === "veg" ? "🥬" : it.diet === "egg" ? "🍳" : "🍗"}
                      </span>
                      <span className="text-[12.5px] font-bold text-tomato-900 truncate" title={it.name}>{it.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-tomato-900/65 font-bold">₹{it.price_paise / 100}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSpecial(it.id, false)}
                        disabled={togglingSpecialId === it.id}
                        className="text-[9px] font-mono font-bold tracking-wider uppercase text-tomato-500 hover:text-tomato-700 bg-white border border-tomato-500/20 px-1.5 py-0.5 rounded cursor-pointer disabled:opacity-50"
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                ))}
                {menuItems.filter(it => it.is_special).length === 0 && (
                  <div className="text-[12px] text-[color:var(--kt-ink-3)] italic py-3 text-center">No live specials. Push a dish above!</div>
                )}
              </div>
            </div>
          </aside>
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

        <OtpVerifyDialog
          open={Boolean(verifyId)}
          order={verifyOrder}
          onClose={() => setVerifyId(null)}
          onResult={(ok) => {
            if (ok) {
              // Optimistic: move to collected instantly — no Realtime wait
              if (verifyId) {
                setOrders((prev) =>
                  prev.map((o) =>
                    o.id === verifyId
                      ? { ...o, status: "collected" as const, collected_at: new Date().toISOString() }
                      : o
                  )
                );
              }
              setVerifyId(null);
            }
          }}
        />

        <WalkInDialog
          tenantId={tenantId}
          tenantSlug={tenantSlug}
          open={walkInOpen}
          onClose={() => setWalkInOpen(false)}
          onCreated={(shortCode) => {
            scheduleRefresh();
            toast.success(`#${shortCode} placed — it's in the queue`);
          }}
        />

        {/* Mobile specials sheet — same push form as desktop panel, without eating the cook queue */}
        {manageSpecialsOpen && (
          <div
            className="xl:hidden fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
            style={{ background: "rgba(42,22,10,0.55)" }}
            role="dialog"
            aria-modal
            aria-label="Today's specials"
            onClick={() => setManageSpecialsOpen(false)}
          >
            <div
              className="w-full max-w-md max-h-[85vh] overflow-y-auto p-5 rounded-t-2xl sm:rounded-2xl"
              style={{
                background: "var(--kt-paper)",
                border: "2px solid var(--kt-ink)",
                boxShadow: "0 -4px 0 var(--kt-ink)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  style={{
                    fontFamily: "var(--font-newsreader), ui-serif, Georgia",
                    fontSize: "22px",
                    fontStyle: "italic",
                    fontWeight: 600,
                  }}
                >
                  Today&apos;s special
                </h3>
                <button
                  type="button"
                  onClick={() => setManageSpecialsOpen(false)}
                  aria-label="Close"
                  style={{
                    height: 44,
                    width: 44,
                    borderRadius: 8,
                    border: "1px solid var(--kt-line-2)",
                    background: "var(--kt-cream-4)",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  list="canteen-dishes-mobile"
                  placeholder="Dish name"
                  value={specialForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-3 text-[15px] rounded-lg border border-tomato-900/20 bg-white"
                />
                <datalist id="canteen-dishes-mobile">
                  {menuItems.map((it) => (
                    <option key={it.id} value={it.name} />
                  ))}
                </datalist>
                <input
                  type="number"
                  placeholder="Price ₹"
                  value={specialForm.price}
                  onChange={(e) => setSpecialForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="w-full px-3 py-3 text-[15px] rounded-lg border border-tomato-900/20 bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    handlePushSpecial();
                  }}
                  disabled={submittingSpecial}
                  className="w-full h-12 bg-tomato-500 text-white rounded-xl text-[14px] font-bold disabled:opacity-50"
                >
                  {submittingSpecial ? "PUSHING…" : "PUSH TO LIVE MENU"}
                </button>
              </div>
            </div>
          </div>
        )}
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
    { label: "New", value: String(counts.placed).padStart(2, "0") },
    { label: "Cooking", value: String(counts.preparing).padStart(2, "0"), accent: true },
    { label: "Serve", value: String(counts.ready).padStart(2, "0") },
    { label: "Served today", value: String(counts.collected) },
    { label: "Revenue today", value: formatRupees(counts.revenue), icon: <ChefHat size={11} /> },
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
          className={cn(c.label === "New" && newOrderFlash && "ring-2 ring-[#d52821] ring-offset-2 animate-pulse")}
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
