"use client";

import { Minus, Plus } from "lucide-react";
import type { MenuItem } from "@/lib/db/types";
import { formatRupees, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart/store";
import { motion } from "framer-motion";

export function MenuItemCard({ item }: { item: MenuItem }) {
  const line = useCart((s) => s.lines.find((l) => l.menuItemId === item.id));
  const add = useCart((s) => s.add);
  const inc = useCart((s) => s.increment);
  const dec = useCart((s) => s.decrement);
  const oos = !item.in_stock || item.status !== "live";

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn(
        "group relative flex flex-col bg-white rounded-[24px] p-6 border border-ink/5 shadow-premium hover:shadow-premium-lg transition-all duration-500",
        oos && "opacity-60 grayscale"
      )}
    >
      <div className="relative aspect-[16/10] bg-paper rounded-[16px] mb-6 overflow-hidden">
        {item.image_url ? (
          <motion.img 
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            src={item.image_url} 
            alt={item.name} 
            className="absolute inset-0 h-full w-full object-cover" 
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-display text-[80px] text-ink/5 select-none italic">
            {item.name.charAt(0)}
          </div>
        )}
        
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={cn(
            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/20",
            item.diet === "veg" ? "bg-emerald-500/10 text-emerald-700" : "bg-rose-500/10 text-rose-700"
          )}>
            {item.diet}
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1">
        <h3 className="font-display text-2xl leading-tight mb-2 tracking-tight group-hover:text-ocean transition-colors">
          {item.name}
        </h3>
        
        {item.description && (
          <p className="text-[14px] leading-relaxed text-dust line-clamp-2 mb-6 font-medium">
            {item.description}
          </p>
        )}
        
        <div className="mt-auto flex items-center justify-between">
          <div className="text-xl font-semibold tracking-tight">
            {formatRupees(item.price_paise)}
          </div>
          
          {line ? (
            <div className="flex items-center bg-ink/5 rounded-full p-1">
              <button
                onClick={() => dec(item.id)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white transition-colors"
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>
              <span className="w-8 text-center font-bold text-sm">{line.qty}</span>
              <button
                onClick={() => inc(item.id)}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white transition-colors"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              disabled={oos}
              onClick={() => add({ menuItemId: item.id, name: item.name, pricePaise: item.price_paise, diet: item.diet })}
              className="h-10 px-6 rounded-full bg-ink text-white font-semibold text-sm hover:bg-ocean hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
