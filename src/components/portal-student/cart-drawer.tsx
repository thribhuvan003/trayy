"use client";

import { Drawer } from "vaul";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, ShoppingCart, Trash2, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart, cartTotalPaise, cartItemCount } from "@/lib/cart/store";
import { formatRupees, cn } from "@/lib/utils";
import { placeOrder } from "@/app/(student)/_actions";
import { pickupEtaCartSubline } from "@/lib/student/pickup-eta";
import { motion, AnimatePresence } from "framer-motion";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function CartDrawer({ tenantSlug, tenantName }: { tenantSlug: string; tenantName: string }) {
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
  const orderType = useCart((s) => s.orderType);
  const setOrderType = useCart((s) => s.setOrderType);
  const tableLabel = useCart((s) => s.tableLabel);
  const setTableLabel = useCart((s) => s.setTableLabel);
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  const count = cartItemCount(lines);
  const total = cartTotalPaise(lines);
  const empty = count === 0;

  const onCheckout = () => {
    if (orderType === "dine_in" && !tableLabel.trim()) {
      toast.error("Pick a table for dine-in");
      return;
    }
    start(async () => {
      try {
        const res = await placeOrder(
          lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty })),
          note,
          orderType,
          orderType === "dine_in" ? tableLabel.trim().toUpperCase() : null
        );
        if (!res.ok) {
          toast.error(res.error ?? "Could not place order");
          return;
        }
        clear();
        setOpen(false);
        router.push(`/c/${tenantSlug}/pay/${res.orderId}`);
      } catch {
        toast.error("Connection error — please try again");
      }
    });
  };

  const cartBody = (
    <div className="flex flex-col h-full bg-paper">
      <div className="p-8 flex items-center justify-between border-b border-ink/5">
        <div>
          <h2 className="font-display text-4xl tracking-tight italic leading-none">Your <span>Tray</span></h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-dust mt-2">
            {tenantName} · {pickupEtaCartSubline()}
          </p>
        </div>
        {!isDesktop && (
          <button onClick={() => setOpen(false)} className="w-10 h-10 flex items-center justify-center bg-ink/5 rounded-full hover:bg-ink hover:text-white transition-colors">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <AnimatePresence mode="popLayout">
          {empty ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
              <div className="w-20 h-20 bg-ink/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag size={32} className="text-dust opacity-20" />
              </div>
              <p className="font-display text-2xl text-dust italic mb-4">Your tray is empty</p>
              <button onClick={() => setOpen(false)} className="text-[10px] font-bold text-ocean uppercase tracking-widest hover:underline">
                Browse Menu
              </button>
            </motion.div>
          ) : (
            lines.map((l) => (
              <motion.div 
                key={l.menuItemId}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-xl leading-none truncate">{l.name}</h4>
                  <p className="text-[10px] font-bold text-dust uppercase tracking-widest mt-1">
                    {formatRupees(l.pricePaise)} each
                  </p>
                </div>
                <div className="flex items-center bg-ink/5 rounded-full p-1">
                  <button onClick={() => dec(l.menuItemId)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white transition-colors">
                    <Minus size={12} strokeWidth={3} />
                  </button>
                  <span className="w-8 text-center font-bold text-sm tabular-nums">{l.qty}</span>
                  <button onClick={() => inc(l.menuItemId)} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white transition-colors">
                    <Plus size={12} strokeWidth={3} />
                  </button>
                </div>
                <button onClick={() => remove(l.menuItemId)} className="p-2 text-ink/10 hover:text-rose-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {!empty && (
        <div className="p-8 border-t border-ink/5 bg-white space-y-6">
          <div className="grid grid-cols-2 gap-2 p-1 bg-ink/5 rounded-2xl">
            <button 
              onClick={() => setOrderType("takeaway")}
              className={cn("h-11 flex items-center justify-center gap-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", 
              orderType === "takeaway" ? "bg-white text-ink shadow-sm" : "text-dust")}
            >
              <ShoppingBag size={14} /> Takeaway
            </button>
            <button 
              onClick={() => setOrderType("dine_in")}
              className={cn("h-11 flex items-center justify-center gap-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all", 
              orderType === "dine_in" ? "bg-white text-ink shadow-sm" : "text-dust")}
            >
              <UtensilsCrossed size={14} /> Dine-in
            </button>
          </div>

          <div className="space-y-3">
            {orderType === "dine_in" && (
              <input
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                placeholder="Table Number"
                className="w-full h-12 px-4 rounded-xl bg-ink/5 border-none text-sm font-medium focus:ring-2 focus:ring-ocean/10 transition-all uppercase placeholder:normal-case"
              />
            )}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any special requests?"
              className="w-full h-12 px-4 rounded-xl bg-ink/5 border-none text-sm font-medium focus:ring-2 focus:ring-ocean/10 transition-all"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-[10px] font-bold text-dust uppercase tracking-[0.2em] mb-1">Total Amount</p>
              <div className="font-display text-5xl tracking-tighter italic leading-none">{formatRupees(total)}</div>
            </div>
            <button
              onClick={onCheckout}
              disabled={pending}
              className="h-16 px-10 rounded-full bg-ink text-white font-bold text-sm hover:bg-ocean hover:scale-105 active:scale-95 transition-all shadow-premium disabled:opacity-50"
            >
              {pending ? "Processing..." : "Checkout →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <aside className="lg:sticky lg:top-24 lg:w-96 lg:h-[calc(100vh-8rem)] rounded-[40px] overflow-hidden border border-ink/5 shadow-premium mt-8">
        {cartBody}
      </aside>
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-40 h-16 px-8 rounded-full bg-ink text-white flex items-center gap-4 shadow-premium-lg hover:scale-105 active:scale-95 transition-all",
          empty && "hidden"
        )}>
          <div className="relative">
            <ShoppingCart size={20} />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-ocean text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-ink">
              {count}
            </span>
          </div>
          <span className="w-px h-6 bg-white/20" />
          <span className="font-display text-2xl italic leading-none">{formatRupees(total)}</span>
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 h-[90vh] rounded-t-[48px] overflow-hidden outline-none">
          {cartBody}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
