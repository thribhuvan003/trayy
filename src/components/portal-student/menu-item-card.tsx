"use client";

import { Minus, Plus } from "lucide-react";
import type { MenuItem } from "@/lib/db/types";
import { formatRupees, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart/store";

export function MenuItemCard({ item }: { item: MenuItem }) {
  const line = useCart((s) => s.lines.find((l) => l.menuItemId === item.id));
  const add = useCart((s) => s.add);
  const inc = useCart((s) => s.increment);
  const dec = useCart((s) => s.decrement);
  const oos = !item.in_stock || item.status !== "live";

  const dietRing =
    item.diet === "veg"
      ? "border-emerald-500"
      : item.diet === "egg"
      ? "border-amber-500"
      : "border-rose-500";
  const dietFill =
    item.diet === "veg" ? "bg-emerald-500" : item.diet === "egg" ? "bg-amber-500" : "bg-rose-500";

  return (
    <article
      className={cn(
        "group relative rounded-2xl overflow-hidden flex flex-col transition-all duration-100",
        oos ? "opacity-60" : "hover:-translate-x-[2px] hover:-translate-y-[2px]"
      )}
      style={{
        background: "var(--student-card-bg, #fff)",
        border: "var(--ns-border)",
        boxShadow: oos ? "var(--ns-shadow-sm)" : "var(--ns-shadow)",
      }}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-ocean-50 to-cream-100 dark:from-ocean-500/10 dark:to-graphite-700">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display text-[44px] text-ocean-500/25 select-none leading-none">
            {item.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span
          aria-label={item.diet}
          className={cn(
            "absolute top-2 left-2 inline-flex h-4 w-4 items-center justify-center border-2 rounded-sm bg-white",
            dietRing
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", dietFill)} />
        </span>
        {oos && (
          <span className="absolute top-2 right-2 text-[10px] font-mono uppercase tracking-wider bg-[color:var(--color-paper)]/90 text-[color:var(--color-ink)]/70 px-2 py-1 rounded-full">
            Out of stock
          </span>
        )}
      </div>
      <div className="p-3.5 flex flex-col flex-1 gap-1.5">
        <h3 className="text-[15px] font-bold leading-tight" style={{ fontFamily: "var(--font-title-ns)" }}>{item.name}</h3>
        {item.description && (
          <p className="text-[12px] leading-[1.4] text-[color:var(--color-ink)]/55 line-clamp-2">
            {item.description}
          </p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <div
            className="text-[19px] font-bold leading-none tracking-[0.01em] text-ocean-600 dark:text-ocean-400 tabular"
            style={{ fontFamily: "var(--font-num-ns)" }}
          >
            {formatRupees(item.price_paise)}
          </div>
          {line ? (
            <div className="inline-flex items-center rounded-lg bg-ocean-500 text-white" style={{ border: "2px solid #000" }}>
              <button
                aria-label="Decrease"
                onClick={() => dec(item.id)}
                className="h-8 w-8 inline-flex items-center justify-center"
              >
                <Minus size={14} />
              </button>
              <span className="text-[13px] font-medium tabular w-5 text-center">{line.qty}</span>
              <button
                aria-label="Increase"
                onClick={() => inc(item.id)}
                className="h-8 w-8 inline-flex items-center justify-center"
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button
              disabled={oos}
              onClick={() =>
                add({
                  menuItemId: item.id,
                  name: item.name,
                  pricePaise: item.price_paise,
                  diet: item.diet,
                })
              }
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-bold uppercase tracking-wide transition-all duration-100",
                oos
                  ? "bg-[color:var(--color-line)] text-white/60 cursor-not-allowed"
                  : "ns-press bg-ocean-500 text-white"
              )}
              style={oos ? undefined : { fontFamily: "var(--font-title-ns)" }}
            >
              <Plus size={14} /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
