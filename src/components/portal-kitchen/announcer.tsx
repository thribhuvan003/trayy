"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { useRealtimeWithFallback, type PostgresFilter } from "@/lib/hooks/use-realtime-with-fallback";
import { formatRupees, formatTimeIST } from "@/lib/utils";
import { logger } from "@/lib/logging";

type OrderRow = {
  id: string;
  short_code: string;
  total_paise: number;
  placed_at: string;
};
type LineRow = {
  order_id: string;
  name_snapshot: string;
  qty: number;
};

type AnnouncedOrder = {
  orderId: string;
  shortCode: string;
  totalPaise: number;
  items: { name: string; qty: number }[];
  placedAt: string;
};

// "T-2431" → "T 24 31" so the TTS engine reads digit pairs ("twenty-four thirty-one")
// instead of "two thousand four hundred thirty-one".
function spokenCode(code: string) {
  return code.replace(/-/g, " ").replace(/(\d{2})(\d{2})\b/, "$1 $2");
}

function spokenAmount(paise: number) {
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  return rest === 0 ? `${rupees} rupees` : `${rupees} rupees ${rest} paise`;
}

function buildPhrase(o: AnnouncedOrder) {
  const items = o.items.map((i) => `${i.qty} ${i.name}`).join(", ");
  return `New order. ${spokenCode(o.shortCode)}. ${items ? `${items}. ` : ""}Paid, ${spokenAmount(o.totalPaise)}.`;
}

function summariseItems(items: { name: string; qty: number }[]): string {
  if (items.length === 0) return "—";
  return items.map((i) => `${i.qty}× ${i.name}`).join(", ");
}

export function Announcer({
  tenantId,
  tenantName,
  tenantSlug,
  initialOrders,
  initialLines,
}: {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  initialOrders: OrderRow[];
  initialLines: LineRow[];
}) {
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);

  // SSR renders with speech assumed available; corrected right after mount so old
  // phones without speechSynthesis get the "no voice" banner instead of silence.
  const [ttsSupported, setTtsSupported] = useState(true);
  useEffect(() => {
    setTtsSupported("speechSynthesis" in window);
  }, []);

  // Prefer an Indian-English voice; the list is often empty until voiceschanged fires.
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current =
        voices.find((v) => v.lang === "en-IN") ??
        voices.find((v) => v.lang.startsWith("en-IN")) ??
        voices.find((v) => v.lang.startsWith("en")) ??
        null;
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pick);
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) u.voice = voiceRef.current;
    u.rate = 0.95;
    // speechSynthesis queues utterances natively — announcements never overlap.
    window.speechSynthesis.speak(u);
  }, []);

  // ── Wake lock — keep the counter phone's screen on while announcing ─────────
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return; // old phones — feature-detect, no crash
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // denied (battery saver etc.) — announcer still works while the screen is on
    }
  }, []);

  // ── New-order pipeline ───────────────────────────────────────────────────────
  const seenOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));

  const [recent, setRecent] = useState<AnnouncedOrder[]>(() => {
    const itemsByOrder = new Map<string, { name: string; qty: number }[]>();
    for (const l of initialLines) {
      const list = itemsByOrder.get(l.order_id) ?? [];
      list.push({ name: l.name_snapshot, qty: l.qty });
      itemsByOrder.set(l.order_id, list);
    }
    return initialOrders.slice(0, 3).map((o) => ({
      orderId: o.id,
      shortCode: o.short_code,
      totalPaise: o.total_paise,
      items: itemsByOrder.get(o.id) ?? [],
      placedAt: o.placed_at,
    }));
  });

  const announce = useCallback(
    (entry: AnnouncedOrder) => {
      setRecent((prev) => [entry, ...prev.filter((p) => p.orderId !== entry.orderId)].slice(0, 3));
      if (activeRef.current) speak(buildPhrase(entry));
      logger.info("announcer new order", {
        tenant_id: tenantId,
        order_id: entry.orderId,
        short_code: entry.shortCode,
        spoken: activeRef.current,
      });
    },
    [speak, tenantId]
  );

  const fetchAndAnnounce = useCallback(
    async (orderId: string) => {
      const sb = getBrowserClient();
      const [{ data: order }, { data: lines }] = await Promise.all([
        sb
          .from("orders")
          .select("id, short_code, total_paise, placed_at, status")
          .eq("id", orderId)
          .maybeSingle<OrderRow & { status: string }>(),
        sb
          .from("order_items")
          .select("order_id, name_snapshot, qty")
          .eq("order_id", orderId)
          .returns<LineRow[]>(),
      ]);
      if (!order || order.status !== "placed") return;
      announce({
        orderId: order.id,
        shortCode: order.short_code,
        totalPaise: order.total_paise,
        items: (lines ?? []).map((l) => ({ name: l.name_snapshot, qty: l.qty })),
        placedAt: order.placed_at,
      });
    },
    [announce]
  );

  // Safety-net sweep: catches paid orders whose realtime event was missed
  // (WiFi flap, tab hidden) or that carry a different event shape (e.g. walk-ins).
  const sweepInFlightRef = useRef(false);
  const sweep = useCallback(async () => {
    if (sweepInFlightRef.current) return;
    sweepInFlightRef.current = true;
    try {
      const sb = getBrowserClient();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: orders } = await sb
        .from("orders")
        .select("id, short_code, total_paise, placed_at")
        .eq("tenant_id", tenantId)
        .eq("status", "placed")
        .gte("placed_at", today.toISOString())
        .order("placed_at", { ascending: false })
        .limit(30)
        .returns<OrderRow[]>();
      const unseen = (orders ?? []).filter((o) => !seenOrderIdsRef.current.has(o.id));
      if (unseen.length === 0) return;
      for (const o of unseen) seenOrderIdsRef.current.add(o.id);
      const { data: lines } = await sb
        .from("order_items")
        .select("order_id, name_snapshot, qty")
        .in(
          "order_id",
          unseen.map((o) => o.id)
        )
        .returns<LineRow[]>();
      // Oldest first so the spoken queue matches arrival order.
      for (const o of [...unseen].reverse()) {
        announce({
          orderId: o.id,
          shortCode: o.short_code,
          totalPaise: o.total_paise,
          items: (lines ?? [])
            .filter((l) => l.order_id === o.id)
            .map((l) => ({ name: l.name_snapshot, qty: l.qty })),
          placedAt: o.placed_at,
        });
      }
    } finally {
      sweepInFlightRef.current = false;
    }
  }, [announce, tenantId]);

  // Realtime: same order_events INSERT signal the kitchen board listens to.
  // A new paid order arrives as event_type="status_changed" with payload.to="placed".
  const onEvent = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const ev = payload.new as {
        order_id?: string;
        event_type?: string;
        payload?: { to?: string };
      } | null;
      if (ev?.event_type !== "status_changed" || ev.payload?.to !== "placed") return;
      const orderId = ev.order_id;
      if (!orderId || seenOrderIdsRef.current.has(orderId)) return;
      seenOrderIdsRef.current.add(orderId);
      void fetchAndAnnounce(orderId);
    },
    [fetchAndAnnounce]
  );

  const filters = useMemo<PostgresFilter[]>(
    () => [
      {
        event: "INSERT",
        schema: "public",
        table: "order_events",
        filter: `tenant_id=eq.${tenantId}`,
      },
    ],
    [tenantId]
  );

  const connStatus = useRealtimeWithFallback(`announce:${tenantId}`, filters, {
    onEvent,
    onFallbackPoll: sweep,
    pollIntervalMs: 20_000,
  });

  // The legendary 20s safety-net poll + visibilitychange recovery (same as the board).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void sweep();
        // Wake locks auto-release when the tab hides — re-acquire on return.
        if (activeRef.current) void acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    const pollId = setInterval(() => {
      if (document.visibilityState === "visible") void sweep();
    }, 20_000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(pollId);
    };
  }, [sweep, acquireWakeLock]);

  // Release everything on unmount.
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  // ── Start / stop (browsers block speech + wake lock until a user gesture) ────
  const start = async () => {
    setActive(true);
    activeRef.current = true;
    await acquireWakeLock();
    speak(`Announcer on for ${tenantName}.`);
    void sweep();
    logger.info("announcer started", { tenant_id: tenantId });
  };

  const stop = () => {
    setActive(false);
    activeRef.current = false;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    logger.info("announcer stopped", { tenant_id: tenantId });
  };

  const connLabel =
    connStatus === "connected" ? "Live" : connStatus === "connecting" ? "Connecting…" : "Polling";
  const connTone =
    connStatus === "connected"
      ? "text-emerald-600 dark:text-emerald-400"
      : connStatus === "connecting"
        ? "text-amber-600 dark:text-amber-400"
        : "text-tomato-500";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b-2 border-tomato-900 bg-cream-50 dark:bg-graphite-900">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/c/${tenantSlug}/kitchen`}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border-2 border-tomato-900 dark:border-cream-200 text-[12px] font-medium hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 transition-colors"
              aria-label="Back to kitchen board"
            >
              <ArrowLeft size={13} /> Board
            </Link>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-tomato-900/70 dark:text-cream-200/60">
                {tenantName} · Counter
              </div>
              <h1 className="font-display font-medium tracking-[-0.025em] text-[22px] sm:text-[26px] leading-none mt-0.5">
                Order <span className="italic text-tomato-500">announcer.</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-[12px] font-mono font-semibold ${connTone}`}>
              <span className="w-2 h-2 rounded-full bg-current" />
              {connLabel}
            </span>
            {active && (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border-2 border-tomato-900 dark:border-cream-200 text-[12px] font-bold hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 transition-colors"
              >
                <VolumeX size={13} /> Stop
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto flex flex-col gap-5">
        {!ttsSupported && (
          <div className="border-2 border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 px-4 py-3 text-[13px] font-medium">
            This phone&apos;s browser can&apos;t speak — the order list below still updates live.
          </div>
        )}

        {!active ? (
          /* Idle state — one tap unlocks audio + keeps the screen awake */
          <div className="border-2 border-tomato-900 dark:border-cream-200/30 bg-cream-50 dark:bg-graphite-800 shadow-[6px_6px_0_0_var(--color-tomato-900)] p-8 sm:p-12 flex flex-col items-center text-center gap-5">
            <Volume2 size={44} className="text-tomato-500" />
            <button
              type="button"
              onClick={start}
              className="w-full max-w-sm h-16 bg-tomato-500 text-white rounded-xl text-[18px] font-bold tracking-wide hover:bg-tomato-600 active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              Start announcing
            </button>
            <p className="text-[13px] text-tomato-900/60 dark:text-cream-200/60 max-w-sm">
              Tap once, then leave this phone at the counter. Every paid order is read out
              loud and the screen stays awake.
            </p>
          </div>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 px-4 py-3 flex items-center gap-2 text-[13px] font-bold"
          >
            <Volume2 size={15} className="shrink-0" />
            Announcing new paid orders — keep this phone near the counter.
          </div>
        )}

        {/* Visual fallback — audio can be missed at a noisy stall */}
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-tomato-900/60 dark:text-cream-200/50 mb-3">
            Last {Math.min(recent.length, 3)} paid orders
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-tomato-900/40 dark:text-cream-200/40">
              <p className="font-mono text-sm">No paid orders yet today.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {recent.map((o, idx) => (
                <div
                  key={o.orderId}
                  className={`border-2 border-tomato-900 dark:border-cream-200/30 bg-cream-50 dark:bg-graphite-800 shadow-[6px_6px_0_0_var(--color-tomato-900)] p-5 sm:p-6 flex items-center gap-4 ${idx === 0 ? "" : "opacity-75"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-bold text-tomato-500 tabular-nums leading-none text-[40px] sm:text-[56px]">
                      #{o.shortCode}
                    </div>
                    <div className="mt-2 text-[15px] sm:text-[19px] text-tomato-900/80 dark:text-cream-200/80">
                      {summariseItems(o.items)}
                    </div>
                    <div className="mt-1 font-mono text-[12px] text-tomato-900/50 dark:text-cream-200/50">
                      {formatTimeIST(o.placedAt)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="font-display font-medium tabular text-[26px] sm:text-[34px] leading-none">
                      {formatRupees(o.totalPaise)}
                    </div>
                    <button
                      type="button"
                      onClick={() => speak(buildPhrase(o))}
                      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border-2 border-tomato-900 dark:border-cream-200 text-[12px] font-bold hover:bg-tomato-900 hover:text-cream-50 dark:hover:bg-cream-200 dark:hover:text-graphite-900 active:scale-[0.97] transition-all cursor-pointer"
                      aria-label={`Repeat announcement for order ${o.shortCode}`}
                    >
                      <RotateCcw size={13} /> Repeat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
