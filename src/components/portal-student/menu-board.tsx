"use client";

const S_RADIUS_SM = 10;

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import type { MenuItem, MenuCategory } from "@/lib/db/types";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn, formatRupees } from "@/lib/utils";
import { useRealtimeWithFallback, type PostgresFilter } from "@/lib/hooks/use-realtime-with-fallback";
import { useCart } from "@/lib/cart/store";
import { toast } from "sonner";
import type { CurrentUser } from "@/lib/auth/get-user";
import { Drawer } from "vaul";

function formatPausedTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
    }).format(new Date(iso));
  } catch { return iso; }
}

function dietEmoji(diet: string): string {
  if (diet === "veg") return "🥬";
  if (diet === "egg") return "🍳";
  return "🍗";
}

type Props = {
  categories: MenuCategory[];
  items: MenuItem[];
  tenantId: string;
  tenantSlug: string;
  tenantName?: string;
  siblings?: any[];
  user?: CurrentUser | null;
  adminName?: string | null;
  isOpen: boolean;
  pausedUntil: string | null;
  pendingCount: number;
  collegeSlug: string | null;
};

export function MenuBoard({
  categories, items, tenantId, tenantSlug,
  tenantName: tenantNameProp, siblings = [], user,
  adminName: _adminName = null,
  isOpen: initialIsOpen, pausedUntil: initialPausedUntil,
  pendingCount: initialPendingCount, collegeSlug,
}: Props) {
  const [activeCat, setActiveCat] = useState<string>("all");
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const q = useCart((s) => s.searchQuery);
  const setSearchQuery = useCart((s) => s.setSearchQuery);
  const router = useRouter();

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const [liveStatus, setLiveStatus] = useState({
    isOpen: initialIsOpen, pausedUntil: initialPausedUntil, pendingCount: initialPendingCount,
  });

  const tenantName = useMemo(() => {
    if (tenantNameProp) return tenantNameProp;
    const sib = siblings.find((s: any) => s.slug === tenantSlug);
    return sib?.name ?? tenantSlug;
  }, [tenantNameProp, siblings, tenantSlug]);

  useEffect(() => {
    setLiveStatus({ isOpen: initialIsOpen, pausedUntil: initialPausedUntil, pendingCount: initialPendingCount });
  }, [initialIsOpen, initialPausedUntil, initialPendingCount]);

  useEffect(() => {
    const sb = getBrowserClient();
    let isMounted = true;
    async function updateStatus() {
      if (!collegeSlug) return;
      try {
        const { data, error } = await (sb as any).rpc("college_canteens", { p_college_slug: collegeSlug });
        if (!error && data && isMounted) {
          const current = (data as any[]).find((c) => c.slug === tenantSlug);
          if (current) setLiveStatus({ isOpen: current.is_open, pausedUntil: current.paused_until, pendingCount: Number(current.pending_orders_count || 0) });
        }
      } catch {}
    }
    updateStatus();
    const id = setInterval(updateStatus, 30_000);
    return () => { isMounted = false; clearInterval(id); };
  }, [collegeSlug, tenantSlug]);

  const statusInfo = useMemo(() => {
    const isClosed = !liveStatus.isOpen;
    const isPaused = !isClosed && !!liveStatus.pausedUntil && new Date(liveStatus.pausedUntil) > new Date();
    if (isClosed) return { text: "Kitchen Closed", dotColor: "#ef4444", textColor: "#dc2626" };
    if (isPaused) return { text: `Kitchen Paused until ${formatPausedTime(liveStatus.pausedUntil!)}`, dotColor: "#f59e0b", textColor: "#d97706" };
    const wait = Math.min(20, Math.max(3, 3 + liveStatus.pendingCount));
    if (liveStatus.pendingCount >= 10) return { text: `Kitchen Busy · ~${wait} min wait`, dotColor: "#ef4444", textColor: "#dc2626" };
    if (liveStatus.pendingCount >= 5) return { text: `Kitchen Moderate · ~${wait} min wait`, dotColor: "#f59e0b", textColor: "#d97706" };
    return { text: `Kitchen Open · ~${wait} min wait`, dotColor: "#0c8a43", textColor: "#0c8a43" };
  }, [liveStatus]);

  const specialsItems = useMemo(() => items.filter((it) => it.is_special), [items]);
  const filteredSpecials = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return specialsItems.filter((it) => {
      if (vegOnly && it.diet !== "veg") return false;
      if (!needle) return true;
      return it.name.toLowerCase().includes(needle) || (it.description ?? "").toLowerCase().includes(needle);
    });
  }, [specialsItems, vegOnly, q]);

  const otherItems = useMemo(() => items.filter((it) => !it.is_special), [items]);
  const filteredOther = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return otherItems.filter((it) => {
      if (vegOnly && it.diet !== "veg") return false;
      if (!needle) return true;
      return it.name.toLowerCase().includes(needle) || (it.description ?? "").toLowerCase().includes(needle);
    });
  }, [otherItems, vegOnly, q]);

  const byCat = useMemo(() => {
    const m = new Map<string | null, MenuItem[]>();
    for (const it of filteredOther) {
      const k = it.category_id;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }, [filteredOther]);

  const injectedCategories = useMemo(() => {
    const filtered = categories.filter((c) => c.name.toLowerCase() !== "specials");
    if (specialsItems.length > 0) {
      return [
        { id: "specials", name: "Today's Specials", sort_order: -1 } as MenuCategory,
        ...filtered,
      ];
    }
    return filtered;
  }, [categories, specialsItems]);

  const { orderType, setOrderType, tableLabel, setTableLabel, lines, clear } = useCart();
  const cartDec = useCart((s) => s.decrement);
  const cartInc = useCart((s) => s.increment);
  const cartAdd = useCart((s) => s.add);
  const cartCount = lines.reduce((acc, l) => acc + l.qty, 0);
  const cartTotal = lines.reduce((acc, l) => acc + l.pricePaise * l.qty, 0);
  const totalFilteredCount = filteredSpecials.length + filteredOther.length;
  // Which sections to render for the current category selection.
  const showSpecials = filteredSpecials.length > 0 && (activeCat === "all" || activeCat === "specials");
  const visibleOtherCount = activeCat === "all"
    ? filteredOther.length
    : activeCat === "uncategorised"
      ? (byCat.get(null)?.length ?? 0)
      : (byCat.get(activeCat)?.length ?? 0);
  // True when a specific (non-"all") category is selected but has nothing to show.
  const activeCatEmpty = activeCat !== "all" && !showSpecials && visibleOtherCount === 0;
  const canteenGridCols = siblings.length <= 1 ? 1 : siblings.length === 2 ? 2 : 3;

  function sibWait(sib: any): string {
    if (!sib.is_open) return "Closed";
    const wait = Math.min(20, Math.max(3, 3 + (sib.pending_orders_count ?? 0)));
    return `~${wait} min wait`;
  }

  // Selecting a category *segregates* the menu: it filters the grid down to
  // just that category's items (and scrolls back to the top so the filtered
  // list starts in view). "All" shows every section. This replaced a
  // scroll-to-section model whose scroll-spy fought the explicit selection.
  const scrollToCategory = (catId: string) => {
    setActiveCat(catId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Coalesce menu/tenant realtime changes into at most one router.refresh() per
  // window. A busy canteen toggling stock / editing prices used to fire a
  // server re-render PER change, which re-rendered the whole menu and made
  // sections visibly shift ("shake"). One debounced refresh per 500ms is
  // imperceptible to the student but stops the thrash.
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, 500);
  }, [router]);

  // Stable filter arrays — defined outside render so the hook's dep array never
  // changes. If we put these inside the component body they'd be new objects every
  // render and trigger endless resubscriptions.
  const menuFilters: PostgresFilter[] = useMemo(() => [
    { event: "*", schema: "public", table: "menu_items", filter: `tenant_id=eq.${tenantId}` },
  ], [tenantId]);
  const tenantFilters: PostgresFilter[] = useMemo(() => [
    { event: "UPDATE", schema: "public", table: "tenants", filter: `id=eq.${tenantId}` },
  ], [tenantId]);

  const menuStatus = useRealtimeWithFallback(
    `realtime-menu-${tenantId}`,
    menuFilters,
    { onEvent: debouncedRefresh, onFallbackPoll: debouncedRefresh, pollIntervalMs: 30_000 }
  );
  const tenantStatus = useRealtimeWithFallback(
    `realtime-tenant-${tenantId}`,
    tenantFilters,
    { onEvent: debouncedRefresh, onFallbackPoll: debouncedRefresh, pollIntervalMs: 30_000 }
  );

  // Aggregate: disconnected if either channel drops (most conservative).
  const realtimeStatus =
    menuStatus === "connected" && tenantStatus === "connected" ? "connected"
    : menuStatus === "disconnected" || tenantStatus === "disconnected" ? "disconnected"
    : "connecting";

  // Tab visibility — only refresh via WebSocket path when already connected.
  // When offline the polling fallback already covers wake-from-background.
  useEffect(() => {
    const fn = () => {
      if (document.visibilityState === "visible" && realtimeStatus === "connected") {
        debouncedRefresh();
      }
    };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, [debouncedRefresh, realtimeStatus]);

  // Cleanup debounce timer on unmount.
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) { clearTimeout(refreshTimerRef.current); refreshTimerRef.current = null; }
    };
  }, []);

  const S = {
    text: "var(--color-ink)", muted: "var(--student-muted)", muted2: "var(--student-muted2)",
    accent: "var(--color-ocean-500)", accentDim: "var(--student-accent-dim)",
    border: "var(--color-line)", surface: "var(--student-surface)", surface2: "var(--student-surface2)",
    cardBg: "var(--student-card-bg)",
    fontDisplay: "var(--font-bricolage, 'Bricolage Grotesque', system-ui, sans-serif)",
    fontMono: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
    radius: 14, radiusSm: 10,
  } as const;

  return (
    <div className="w-full max-w-[1440px] mx-auto min-h-screen" style={{ display: "flex", flex: 1, position: "relative", alignItems: "flex-start" }}>

      {/* LEFT: Desktop Category Nav */}
      <nav aria-label="Categories" style={{ display: isDesktop ? "block" : "none", width: 200, flexShrink: 0, padding: "20px 12px 20px 16px", borderRight: `1px solid ${S.border}`, position: "sticky", top: 56, maxHeight: "calc(100vh - 56px)", overflowY: "auto", alignSelf: "flex-start" }}>
        <p style={{ fontFamily: S.fontDisplay, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: S.muted, margin: "0 12px 14px" }}>Browse</p>
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <li>
            <button onClick={() => scrollToCategory("all")} style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: S.radiusSm, fontSize: 15, fontWeight: 500, background: activeCat === "all" ? S.accentDim : "transparent", color: activeCat === "all" ? S.accent : S.muted, cursor: "pointer", border: "none", transition: "color .2s, background .2s", fontFamily: S.fontDisplay }}>
              All items
              <span style={{ display: "block", fontSize: 11, color: S.muted2, marginTop: 2, fontWeight: 500 }}>{items.length} dishes</span>
            </button>
          </li>
          {injectedCategories.map((cat) => {
            const cnt = cat.id === "specials" ? filteredSpecials.length : (byCat.get(cat.id)?.length ?? 0);
            const isActive = activeCat === cat.id;
            return (
              <li key={cat.id}>
                <button onClick={() => scrollToCategory(cat.id)} style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: S.radiusSm, fontSize: 15, fontWeight: 500, background: isActive ? S.accentDim : "transparent", color: isActive ? S.accent : S.muted, cursor: "pointer", border: "none", transition: "color .2s, background .2s", fontFamily: S.fontDisplay }}>
                  {cat.name}
                  <span style={{ display: "block", fontSize: 11, color: S.muted2, marginTop: 2, fontWeight: 500 }}>{cnt} dish{cnt === 1 ? "" : "es"}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Today's Specials Sidebar Widget */}
        {filteredSpecials.length > 0 && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${S.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: S.fontDisplay, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: S.muted, margin: "0 12px 8px" }}>Today's Specials</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredSpecials.map((it) => {
                const line = lines.find((l) => l.menuItemId === it.id);
                const oos = !it.in_stock || it.status !== "live";
                return (
                  <div
                    key={it.id}
                    onClick={() => scrollToCategory("specials")}
                    style={{
                      padding: "10px 12px",
                      borderRadius: S.radiusSm,
                      border: `1px solid ${S.border}`,
                      background: "var(--student-special-card-bg)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      cursor: "pointer",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      opacity: oos ? 0.6 : 1,
                    }}
                    className="hover:-translate-y-[1.5px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: S.text, lineHeight: 1.25, display: "block" }}>{it.name}</span>
                    {it.description && (
                      <p style={{ margin: 0, fontSize: 11, color: S.muted2, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {it.description}
                      </p>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                      <span style={{ fontFamily: S.fontDisplay, fontSize: 13, fontWeight: 700, color: "var(--color-ocean-500)" }}>{formatRupees(it.price_paise)}</span>
                      {line ? (
                        <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--color-line)", borderRadius: 6, overflow: "hidden", background: "var(--student-surface)" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => cartDec(it.id)}
                            style={{ width: 22, height: 22, display: "grid", placeItems: "center", cursor: "pointer", background: "transparent", border: "none", color: S.text, fontSize: 10 }}
                          >
                            -
                          </button>
                          <span style={{ minWidth: 16, textAlign: "center", fontSize: 11, fontWeight: 700, fontFamily: S.fontMono }}>{line.qty}</span>
                          <button
                            type="button"
                            onClick={() => cartInc(it.id)}
                            style={{ width: 22, height: 22, display: "grid", placeItems: "center", cursor: "pointer", background: "transparent", border: "none", color: "var(--color-ocean-500)", fontSize: 10 }}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={oos}
                          onClick={(e) => {
                            e.stopPropagation();
                            cartAdd({ menuItemId: it.id, name: it.name, pricePaise: it.price_paise, diet: it.diet as "veg" | "nonveg" | "egg" });
                            toast.success(`Added ${it.name}!`);
                          }}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            background: "rgba(51,65,85,.08)",
                            color: "var(--color-ocean-500)",
                            border: `1px solid ${S.border}`,
                            cursor: oos ? "not-allowed" : "pointer",
                            fontFamily: S.fontDisplay,
                          }}
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* MIDDLE: Main content */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: "24px 28px 40px", width: "100%", margin: "0 auto" }} className="px-4 sm:px-5 lg:px-7">

          {/* Hero */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: S.fontMono, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: statusInfo.textColor, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusInfo.dotColor, display: "inline-block" }} />
              {statusInfo.text}
            </div>
            {realtimeStatus !== "connected" && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: "rgba(245,158,11,.10)", border: "1px solid rgba(245,158,11,.25)", fontFamily: S.fontMono, fontSize: 10, letterSpacing: "0.08em", color: "#d97706", marginBottom: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                {realtimeStatus === "connecting" ? "RECONNECTING…" : "UPDATES PAUSED · REFRESHING EVERY 30s"}
              </div>
            )}
            <h1 style={{ fontFamily: S.fontDisplay, fontSize: "clamp(1.75rem, 8vw, 42px)", fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.035em", margin: "4px 0 0" }}>
              What&apos;s <span style={{ fontStyle: "italic", fontWeight: 400 }}>cooking{user ? `, ${user.displayName || user.email?.split("@")[0]}` : " today"}?</span>
            </h1>
          </div>

          {/* Controls card */}
          <div style={{ marginBottom: 18, padding: 16, borderRadius: S.radius, border: `1px solid ${S.border}`, background: S.cardBg, boxShadow: "inset 0 1px 0 rgba(255,255,255,.65), 0 1px 2px rgba(0,0,0,.05)" }}>
            {/* Canteen segments */}
            {siblings.length > 0 && (
              <>
                <div>
                  <p style={{ fontFamily: S.fontDisplay, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(0,0,0,.62)", margin: "0 0 6px" }}>Canteen</p>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${canteenGridCols}, minmax(0, 1fr))`, gap: 8, marginTop: 8 }}>
                    {siblings.map((sib: any) => {
                      const isCurrent = sib.slug === tenantSlug;
                      return (
                        <button key={sib.slug} onClick={() => { if (!isCurrent) window.location.href = `/c/${sib.slug}/menu`; }}
                          style={{ minWidth: 0, padding: "10px 12px", borderRadius: S.radiusSm, border: isCurrent ? `1px solid ${S.accent}` : `1px solid ${S.border}`, background: S.cardBg, boxShadow: isCurrent ? "0 0 0 1px rgba(51,65,85,.15), 0 10px 26px rgba(26,26,25,.10)" : "none", transform: isCurrent ? "translateY(-1px)" : "none", color: S.text, fontFamily: S.fontDisplay, fontSize: 14, fontWeight: 600, textAlign: "left", cursor: isCurrent ? "default" : "pointer", transition: "border-color .15s, box-shadow .15s, transform .15s" }}>
                          {sib.name}
                          <small style={{ display: "block", marginTop: 2, fontFamily: S.fontDisplay, fontSize: 12, fontWeight: 500, color: S.muted }}>{sibWait(sib)}</small>
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${S.border}`, fontFamily: S.fontDisplay, fontSize: 13, fontWeight: 500, color: S.muted, lineHeight: 1.45, marginBottom: 0 }}>Each canteen has its own menu and kitchen queue.</p>
                </div>
                <div style={{ height: 1, background: S.border, margin: "14px 0 12px" }} />
              </>
            )}

            {/* Order type + veg filter */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <p style={{ margin: 0, fontFamily: S.fontDisplay, fontSize: 12, fontWeight: 600, letterSpacing: "0.11em", textTransform: "uppercase", color: S.muted }}>How are you eating today?</p>
                <button type="button" onClick={() => setVegOnly(!vegOnly)} style={{ fontFamily: S.fontDisplay, fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "6px 12px", borderRadius: 999, border: vegOnly ? "1px solid rgba(94,224,138,.55)" : `1px solid ${S.border}`, background: vegOnly ? "rgba(94,224,138,.12)" : "transparent", color: vegOnly ? "#0c8a43" : S.muted, cursor: "pointer", transition: "border-color .2s, background .2s, color .2s" }}>🌿 Veg only</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(["takeaway", "dine_in"] as const).map((type) => {
                  const isActive = orderType === type;
                  return (
                    <button key={type} type="button" onClick={() => setOrderType(type)}
                      style={{ textAlign: "left", padding: "14px 14px 12px", borderRadius: S.radiusSm, border: isActive ? `1px solid ${S.accent}` : `1px solid ${S.border}`, background: S.cardBg, boxShadow: isActive ? "0 0 0 1px rgba(51,65,85,.15), 0 10px 26px rgba(26,26,25,.10)" : "none", transform: isActive ? "translateY(-1px)" : "none", cursor: "pointer", color: S.text, transition: "border-color .2s, box-shadow .2s, transform .2s", fontFamily: S.fontDisplay }}>
                      <span style={{ fontSize: "1.45rem", display: "block", marginBottom: 6 }}>{type === "takeaway" ? "🛍️" : "🍽️"}</span>
                      <span style={{ display: "block", fontWeight: 600, fontSize: 15 }}>{type === "takeaway" ? "Takeaway" : "Dine in"}</span>
                      <span style={{ display: "block", marginTop: 4, fontSize: 13, fontWeight: 500, color: S.muted, lineHeight: 1.4 }}>{type === "takeaway" ? "Counter pickup · OTP handover" : "Mess seating · optional table"}</span>
                    </button>
                  );
                })}
              </div>
              {orderType === "dine_in" && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontFamily: S.fontDisplay, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: S.muted }}>Table or block (optional)</label>
                  <input type="text" placeholder="e.g. T4, Block B" value={tableLabel} onChange={(e) => setTableLabel(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: S.radiusSm, border: `1px solid ${S.border}`, background: S.surface, fontFamily: S.fontDisplay, fontSize: 14, fontWeight: 500, outline: "none", boxSizing: "border-box" }} />
                </div>
              )}
            </div>
            <div style={{ height: 1, background: S.border, margin: "14px 0 12px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontFamily: S.fontDisplay, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: S.muted }}>Search menu</label>
              <input
                type="search"
                placeholder="e.g. Biryani, Chai…"
                value={q}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: S.radiusSm, border: `1px solid ${S.border}`, background: S.surface, fontFamily: S.fontDisplay, fontSize: 14, fontWeight: 500, outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Mobile sticky category chips */}
          <div 
            className="sticky top-[56px] z-20 py-3 mb-4 backdrop-blur-md bg-[color:var(--color-paper)]/85 border-b border-[color:var(--color-line)] -mx-4 px-4 sm:-mx-5 sm:px-5 flex gap-2 overflow-x-auto"
            style={{ display: isDesktop ? "none" : "flex", scrollbarWidth: "none" }}
          >
            {[{ id: "all", name: "All items" }, ...injectedCategories].map((cat) => {
              const isActive = activeCat === cat.id;
              return (
                <button key={cat.id} onClick={() => scrollToCategory(cat.id)} style={{ flexShrink: 0, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, border: isActive ? "1px solid transparent" : `1px solid ${S.border}`, color: isActive ? "#FAF8F5" : S.muted, background: isActive ? S.accent : S.surface, cursor: "pointer", transition: "all .2s", fontFamily: S.fontDisplay }}>
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Empty state */}
          {(totalFilteredCount === 0 || activeCatEmpty) && (
            <div style={{ padding: "64px 0", textAlign: "center", color: S.muted }}>
              <div style={{ fontFamily: S.fontDisplay, fontStyle: "italic", fontSize: 24, color: S.accent }}>Nothing found.</div>
              <p style={{ fontSize: 14, marginTop: 8 }}>{q || vegOnly ? "Clear the filters or search term to see more dishes." : "Check back at lunchtime."}</p>
            </div>
          )}

          {/* Specials Section */}
          {showSpecials && (
            <div id="category-specials" style={{ marginBottom: 32, scrollMarginTop: "140px" }} className="pt-2">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontFamily: S.fontDisplay, fontSize: "clamp(1.5rem, 5vw, 1.95rem)", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.15 }}>Today&apos;s <span style={{ fontStyle: "italic" }}>specials.</span></h2>
                <span style={{ fontFamily: S.fontMono, fontSize: 11, letterSpacing: "0.06em", color: "#0c8a43", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0c8a43", display: "inline-block" }} />LIVE FROM KITCHEN
                </span>
              </div>
              <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "4px 4px 16px", margin: "0 -4px", scrollbarWidth: "none" }}>
                {filteredSpecials.map((item) => <SpecialCard key={item.id} item={item} onAdd={cartAdd} onInc={cartInc} onDec={cartDec} />)}
              </div>
            </div>
          )}

          {/* Menu grid */}
          {visibleOtherCount > 0 && (
            <div className="flex flex-col gap-6">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontFamily: S.fontDisplay, fontSize: "clamp(1.5rem, 5vw, 1.95rem)", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                  Menu
                </h2>
                <p style={{ margin: 0, fontFamily: S.fontMono, fontSize: 12, color: S.muted }}>{visibleOtherCount} item{visibleOtherCount === 1 ? "" : "s"}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {injectedCategories.filter((cat) => cat.id !== "specials").map((cat) => {
                  const list = byCat.get(cat.id) ?? [];
                  if (list.length === 0) return null;
                  if (activeCat !== "all" && activeCat !== cat.id) return null;
                  return (
                    <div key={cat.id} id={`category-${cat.id}`} style={{ scrollMarginTop: "140px" }} className="pt-2">
                      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.muted, margin: "0 0 12px", paddingLeft: 8, borderLeft: `2px solid ${S.accent}`, fontFamily: S.fontDisplay }}>{cat.name}</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                        {list.map((it) => <RegularCard key={it.id} item={it} onAdd={cartAdd} onInc={cartInc} onDec={cartDec} />)}
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const uncategorised = byCat.get(null) ?? [];
                  if (uncategorised.length === 0) return null;
                  if (activeCat !== "all" && activeCat !== "uncategorised") return null;
                  return (
                    <div key="__uncategorised" id="category-uncategorised" style={{ scrollMarginTop: "140px" }} className="pt-2">
                      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: S.muted, margin: "0 0 12px", paddingLeft: 8, borderLeft: `2px solid ${S.accent}`, fontFamily: S.fontDisplay }}>Other</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                        {uncategorised.map((it) => <RegularCard key={it.id} item={it} onAdd={cartAdd} onInc={cartInc} onDec={cartDec} />)}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </main>


      {/* Mobile Floating Browse Button */}
      <Drawer.Root open={isBrowseOpen} onOpenChange={setIsBrowseOpen}>
        <Drawer.Trigger asChild>
          <button type="button" className={cn("fixed left-1/2 -translate-x-1/2 z-30 lg:hidden flex items-center gap-2 px-5 py-3 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer text-[13.5px]", cartCount > 0 ? "bottom-20" : "bottom-6")}>
            <span>🍴</span><span>Browse Menu</span>
          </button>
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex max-h-[70vh] flex-col rounded-t-3xl bg-[color:var(--color-paper)] border-t border-[color:var(--color-line)] focus:outline-none pb-[env(safe-area-inset-bottom)]">
            <Drawer.Title className="sr-only">Categories</Drawer.Title>
            <div className="mx-auto w-12 h-1.5 rounded-full bg-[color:var(--color-line-strong)] mt-3 mb-2" />
            <div className="px-5 py-3 border-b border-[color:var(--color-line)]"><h3 className="font-display text-[18px] font-bold">Browse Menu</h3></div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              <button onClick={() => { scrollToCategory("all"); setIsBrowseOpen(false); }} className={cn("w-full text-left px-4 py-3.5 rounded-2xl text-[14.5px] font-semibold transition-all border flex items-center justify-between", activeCat === "all" ? "bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 font-bold border-ocean-500/20" : "border-[color:var(--color-line)] text-[color:var(--color-ink)] bg-[color:var(--color-paper)]")}>
                <span>All items</span><span className="text-[12px] opacity-60 font-normal">{items.filter((it) => !vegOnly || it.diet === "veg").length} items</span>
              </button>
              {injectedCategories.map((cat) => {
                const catCount = cat.id === "specials"
                  ? specialsItems.filter((it) => !vegOnly || it.diet === "veg").length
                  : (byCat.get(cat.id)?.length ?? 0);
                if (catCount === 0) return null;
                const isActive = activeCat === cat.id;
                return (
                  <button key={cat.id} onClick={() => { scrollToCategory(cat.id); setIsBrowseOpen(false); }} className={cn("w-full text-left px-4 py-3.5 rounded-2xl text-[14.5px] font-semibold transition-all border flex items-center justify-between", isActive ? "bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 font-bold border-ocean-500/20" : "border-[color:var(--color-line)] text-[color:var(--color-ink)] bg-[color:var(--color-paper)]")}>
                    <span>{cat.name}</span><span className="text-[12px] opacity-60 font-normal">{catCount} items</span>
                  </button>
                );
              })}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

type CartAddFn = (item: { menuItemId: string; name: string; pricePaise: number; diet: "veg" | "nonveg" | "egg" }) => void;
type CartQtyFn = (menuItemId: string) => void;

function SpecialCard({ item, onAdd, onInc, onDec }: { item: MenuItem; onAdd: CartAddFn; onInc: CartQtyFn; onDec: CartQtyFn }) {
  const line = useCart((s) => s.lines.find((l) => l.menuItemId === item.id));
  const oos = !item.in_stock || item.status !== "live";
  const accent = "var(--color-ocean-500)";
  const border = "var(--color-line)";
  return (
    <article style={{ flexShrink: 0, width: 220, background: "var(--student-special-card-bg)", border: `1px solid ${border}`, borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12, position: "relative", opacity: oos ? 0.6 : 1, cursor: oos ? "not-allowed" : "default" }}
      className={oos ? "" : "hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(26,26,25,.08)]"}>
      <span style={{ position: "absolute", top: 12, right: 12, background: "#b32b2b", color: "#fff", fontFamily: "monospace", fontSize: 9, letterSpacing: "0.08em", padding: "2px 6px", borderRadius: 4, fontWeight: 700, textTransform: "uppercase" }}>SPECIAL</span>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: item.image_url ? "transparent" : "var(--student-card-bg)", border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, overflow: "hidden", flexShrink: 0 }}>
          {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : dietEmoji(item.diet)}
        </div>
        <DietDot diet={item.diet} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h3 style={{ margin: 0, fontFamily: "var(--font-bricolage, system-ui)", fontSize: 18, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.25 }}>{item.name}</h3>
        {item.description && <p style={{ margin: 0, fontSize: 13, color: "var(--student-muted)", lineHeight: 1.45 }}>{item.description}</p>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 8 }}>
        <span style={{ fontFamily: "var(--font-bricolage, system-ui)", fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: accent }}>{formatRupees(item.price_paise)}</span>
        {line ? <QtyControl qty={line.qty} onDec={() => onDec(item.id)} onInc={() => onInc(item.id)} disabled={oos} btnSize={32} /> : (
          <button disabled={oos} onClick={() => { onAdd({ menuItemId: item.id, name: item.name, pricePaise: item.price_paise, diet: item.diet as "veg" | "nonveg" | "egg" }); toast.success(`Added ${item.name}!`); }}
            style={{ padding: "6px 12px", borderRadius: S_RADIUS_SM, fontSize: 13, fontWeight: 600, background: "rgba(51,65,85,.08)", color: accent, border: `1px solid ${border}`, cursor: oos ? "not-allowed" : "pointer", opacity: oos ? 0.5 : 1, fontFamily: "var(--font-bricolage, system-ui)" }}>+ Add</button>
        )}
      </div>
    </article>
  );
}

function RegularCard({ item, onAdd, onInc, onDec }: { item: MenuItem; onAdd: CartAddFn; onInc: CartQtyFn; onDec: CartQtyFn }) {
  const line = useCart((s) => s.lines.find((l) => l.menuItemId === item.id));
  const oos = !item.in_stock || item.status !== "live";
  const accent = "var(--color-ocean-500)";
  const border = "var(--color-line)";
  return (
    <article style={{ display: "flex", gap: 14, padding: 16, borderRadius: 14, border: `1px solid ${border}`, background: "var(--student-regular-card-bg)", opacity: oos ? 0.6 : 1 }}
      className={oos ? "" : "hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(26,26,25,.08)]"}>
      <div style={{ width: 72, height: 72, borderRadius: 12, flexShrink: 0, background: "var(--student-surface2)", display: "grid", placeItems: "center", fontSize: 30, border: "1px solid var(--color-line)", overflow: "hidden" }}>
        {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : dietEmoji(item.diet)}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <h3 style={{ margin: 0, fontFamily: "var(--font-bricolage, system-ui)", fontSize: 17, fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.25 }}>{item.name}</h3>
          <DietDot diet={item.diet} />
        </div>
        {item.description && <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--student-muted)", lineHeight: 1.45 }}>{item.description}</p>}
        <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-bricolage, system-ui)", fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: accent }}>{formatRupees(item.price_paise)}</span>
          {line ? <QtyControl qty={line.qty} onDec={() => onDec(item.id)} onInc={() => onInc(item.id)} disabled={oos} btnSize={38} /> : (
            <button disabled={oos} onClick={() => { onAdd({ menuItemId: item.id, name: item.name, pricePaise: item.price_paise, diet: item.diet as "veg" | "nonveg" | "egg" }); toast.success(`Added ${item.name}!`); }}
              style={{ padding: "8px 14px", borderRadius: S_RADIUS_SM, fontSize: 14, fontWeight: 600, background: "rgba(51,65,85,.08)", color: accent, border: `1px solid ${border}`, cursor: oos ? "not-allowed" : "pointer", opacity: oos ? 0.5 : 1, fontFamily: "var(--font-bricolage, system-ui)" }}>+ Add</button>
          )}
        </div>
      </div>
    </article>
  );
}

function QtyControl({ qty, onDec, onInc, disabled, btnSize }: { qty: number; onDec: () => void; onInc: () => void; disabled: boolean; btnSize: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", borderRadius: S_RADIUS_SM, border: "1px solid var(--color-line)", overflow: "hidden", background: "var(--student-surface2)" }}>
      <button aria-label="Decrease" disabled={disabled} onClick={onDec} style={{ width: btnSize, height: btnSize, display: "grid", placeItems: "center", cursor: disabled ? "not-allowed" : "pointer", background: "transparent", border: "none", color: "var(--color-ink)" }}><Minus size={Math.round(btnSize * 0.37)} /></button>
      <span style={{ minWidth: btnSize - 8, textAlign: "center", fontFamily: "var(--font-jetbrains, monospace)", fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{qty}</span>
      <button aria-label="Increase" disabled={disabled} onClick={onInc} style={{ width: btnSize, height: btnSize, display: "grid", placeItems: "center", cursor: disabled ? "not-allowed" : "pointer", background: "transparent", border: "none", color: "var(--color-ocean-500)" }}><Plus size={Math.round(btnSize * 0.37)} /></button>
    </div>
  );
}

function DietDot({ diet }: { diet: string }) {
  const color = diet === "veg" ? "#0c8a43" : diet === "egg" ? "#f59e0b" : "#b32b2b";
  return (
    <span style={{ width: 18, height: 18, border: `2px solid ${color}`, borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4, background: "transparent" }}>
      {diet === "nonveg"
        ? <span style={{ width: 0, height: 0, borderLeft: "4.5px solid transparent", borderRight: "4.5px solid transparent", borderBottom: `8px solid ${color}`, display: "block" }} />
        : <span style={{ height: 8, width: 8, borderRadius: "50%", background: color, display: "block" }} />}
    </span>
  );
}
