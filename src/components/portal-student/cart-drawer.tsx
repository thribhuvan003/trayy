"use client";

import { Drawer } from "vaul";
import { Minus, Plus, ShoppingBag, ShoppingCart, Trash2, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart, cartTotalPaise, cartItemCount } from "@/lib/cart/store";
import { formatRupees, cn } from "@/lib/utils";
import { placeOrder } from "@/app/(student)/_actions";
import type { OrderType } from "@/lib/db/types";

// Tiny inline matchMedia hook — kept local to avoid spawning a /lib/hooks
// dir just for one consumer. Returns false on the server / first paint so
// hydration matches the server-rendered (mobile-first) tree, then flips on
// the first effect tick if the viewport is actually large.
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    // `addEventListener('change', ...)` is the modern API; Safari < 14
    // would need addListener, but we're already on a Next 15 / modern
    // browser baseline so this is fine.
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function CartDrawer({ tenantUpi }: { tenantUpi: string }) {
  const lines = useCart((s) => s.lines);
  const note = useCart((s) => s.note);
  const setNote = useCart((s) => s.setNote);
  const inc = useCart((s) => s.increment);
  const dec = useCart((s) => s.decrement);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pending, start] = useTransition();
  const [orderType, setOrderType] = useState<OrderType>("takeaway");
  const [tableLabel, setTableLabel] = useState("");
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  const count = cartItemCount(lines);
  const total = cartTotalPaise(lines);

  // Desktop: render the sidebar shell even with an empty cart so the right
  // column doesn't collapse and reflow the menu. Mobile: hide entirely until
  // there's something in the tray (original behavior).
  const empty = count === 0;
  if (empty && !isDesktop) return null;

  const onCheckout = () => {
    if (orderType === "dine_in" && !tableLabel.trim()) {
      toast.error("Pick a table for dine-in");
      return;
    }
    start(async () => {
      const res = await placeOrder(
        lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty })),
        note,
        orderType,
        orderType === "dine_in" ? tableLabel.trim().toUpperCase() : null
      );
      if (!res.ok) {
        toast.error(res.error ?? "Could not place order");
        if (res.code === "AUTH_REQUIRED") {
          router.push(`/login?next=/menu`);
        }
        return;
      }
      clear();
      setOpen(false);
      router.push(`/pay/${res.orderId}`);
    });
  };

  // Shared cart-body markup used by both the mobile drawer and the desktop
  // sticky sidebar. Keeping one source of truth here avoids drift between
  // form fields / totals between the two surfaces.
  const cartBody = (
    <>
      <div className="px-5 sm:px-6 pb-3 flex items-center justify-between border-b border-[color:var(--color-line)]">
        <div>
          <div className="font-display text-[22px] font-medium tracking-tight">Your tray.</div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55">
            {tenantUpi} · ready in ~7 min
          </div>
        </div>
        {!isDesktop && (
          <button
            aria-label="Close cart"
            onClick={() => setOpen(false)}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-[color:var(--color-line)]"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 flex flex-col gap-3">
        {empty ? (
          <li className="text-[13px] text-[color:var(--color-ink)]/55 italic text-center py-8">
            Your tray is empty. Pick something from the menu →
          </li>
        ) : (
          lines.map((l) => (
            <li
              key={l.menuItemId}
              className="flex items-center gap-3 rounded-2xl border border-[color:var(--color-line)] p-3"
            >
              <span
                aria-label={l.diet}
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center border-2 rounded-sm bg-white shrink-0",
                  l.diet === "veg"
                    ? "border-emerald-500"
                    : l.diet === "egg"
                    ? "border-amber-500"
                    : "border-rose-500"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    l.diet === "veg" ? "bg-emerald-500" : l.diet === "egg" ? "bg-amber-500" : "bg-rose-500"
                  )}
                />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium truncate">{l.name}</div>
                <div className="text-[12px] text-[color:var(--color-ink)]/55 tabular">
                  {formatRupees(l.pricePaise)} ea
                </div>
              </div>
              <div className="inline-flex items-center rounded-full border border-[color:var(--color-line)]">
                <button
                  aria-label="Decrease"
                  onClick={() => dec(l.menuItemId)}
                  className="h-8 w-8 inline-flex items-center justify-center"
                >
                  <Minus size={13} />
                </button>
                <span className="text-[13px] font-medium tabular w-5 text-center">{l.qty}</span>
                <button
                  aria-label="Increase"
                  onClick={() => inc(l.menuItemId)}
                  className="h-8 w-8 inline-flex items-center justify-center"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="text-[14px] font-semibold tabular min-w-[64px] text-right">
                {formatRupees(l.pricePaise * l.qty)}
              </div>
              <button
                aria-label="Remove"
                onClick={() => remove(l.menuItemId)}
                className="h-8 w-8 inline-flex items-center justify-center text-[color:var(--color-ink)]/40 hover:text-rose-500"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))
        )}
      </ul>

      {!empty && (
        <div className="px-5 sm:px-6 py-4 border-t border-[color:var(--color-line)] flex flex-col gap-3 bg-[color:var(--color-paper-dim)]">
          <div
            role="radiogroup"
            aria-label="Order type"
            className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)]"
          >
            <button
              role="radio"
              aria-checked={orderType === "takeaway"}
              onClick={() => setOrderType("takeaway")}
              className={cn(
                "h-10 inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors",
                orderType === "takeaway" ? "bg-ocean-500 text-white" : "text-[color:var(--color-ink)]/70"
              )}
            >
              <ShoppingBag size={14} /> Takeaway
            </button>
            <button
              role="radio"
              aria-checked={orderType === "dine_in"}
              onClick={() => setOrderType("dine_in")}
              className={cn(
                "h-10 inline-flex items-center justify-center gap-2 rounded-lg text-[13px] font-medium transition-colors",
                orderType === "dine_in" ? "bg-ocean-500 text-white" : "text-[color:var(--color-ink)]/70"
              )}
            >
              <UtensilsCrossed size={14} /> Dine-in
            </button>
          </div>
          {orderType === "dine_in" && (
            <label className="block">
              <span className="sr-only">Table number</span>
              <input
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                placeholder="Table number (e.g. 7 or A3)"
                maxLength={8}
                className="w-full h-10 px-3 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[13px] focus:outline-none focus:border-ocean-500 uppercase tabular"
              />
            </label>
          )}
          <label className="block">
            <span className="sr-only">Note for the kitchen</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note for the kitchen (e.g. less spicy)"
              maxLength={120}
              className="w-full h-10 px-3 rounded-lg border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[13px] focus:outline-none focus:border-ocean-500"
            />
          </label>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55">
                Total · UPI
              </div>
              <div className="font-display text-[28px] font-medium tabular tracking-tight">{formatRupees(total)}</div>
            </div>
            <button
              onClick={onCheckout}
              disabled={pending}
              className={cn(
                "inline-flex items-center gap-2 h-12 px-6 rounded-full bg-ocean-500 text-white text-[14px] font-medium hover:bg-ocean-600 transition-colors",
                pending && "opacity-70 cursor-not-allowed"
              )}
            >
              {pending ? "Placing order…" : "Pay with UPI →"}
            </button>
          </div>
          <p className="text-[11px] text-[color:var(--color-ink)]/45 text-center">
            Tray takes 0%. Payment goes straight to {tenantUpi}.
          </p>
        </div>
      )}
    </>
  );

  // Desktop: render as a sticky right column, no Drawer wrapping. The
  // surrounding layout already reserves a 20rem column in the main grid.
  if (isDesktop) {
    return (
      <aside
        aria-label="Your cart"
        className="lg:sticky lg:top-20 lg:w-80 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] flex flex-col mt-6"
      >
        {cartBody}
      </aside>
    );
  }

  // Mobile: original Vaul drawer behavior — floating CTA + bottom sheet.
  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          aria-label={`View cart — ${count} items, ${formatRupees(total)}`}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-3 rounded-full bg-ocean-500 text-white px-5 h-12 shadow-[0_10px_30px_-10px_rgba(0,102,255,0.6)] hover:bg-ocean-600 transition-colors"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShoppingCart size={15} />
            <span className="text-[13px] font-medium">{count} item{count === 1 ? "" : "s"}</span>
          </span>
          <span className="h-4 w-px bg-white/30" />
          <span className="text-[13px] font-medium tabular">{formatRupees(total)}</span>
          <span className="text-[12px] font-mono uppercase tracking-wider opacity-90">View cart →</span>
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-[88vh] sm:h-[80vh] flex-col rounded-t-3xl bg-[color:var(--color-paper)] focus:outline-none">
          <Drawer.Title className="sr-only">Your cart</Drawer.Title>
          <div className="mx-auto w-12 h-1.5 rounded-full bg-[color:var(--color-line-strong)] mt-3 mb-2" />
          {cartBody}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
