"use client";

import { Minus, Plus } from "lucide-react";
import { formatRupees, cn } from "@/lib/utils";
import { useCart } from "@/lib/cart/store";
import { motion, AnimatePresence } from "framer-motion";
import type { MenuItem } from "@/lib/db/types";

export function MenuItemCard({ item }: { item: MenuItem }) {
  const line = useCart((s) => s.lines.find((l) => l.menuItemId === item.id));
  const add = useCart((s) => s.add);
  const inc = useCart((s) => s.increment);
  const dec = useCart((s) => s.decrement);
  const oos = !item.in_stock || item.status !== "live";

  const qty = line?.qty || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group bg-white rounded-[32px] p-6 shadow-premium border border-ink/5 hover:shadow-premium-lg transition-all duration-500",
        oos && "opacity-60 grayscale pointer-events-none"
      )}
    >
      <div className="relative aspect-square bg-ink/5 rounded-2xl mb-6 overflow-hidden flex items-center justify-center font-display text-6xl text-ink/5 group-hover:text-ink/10 transition-colors">
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        ) : (
          <span className="italic">{item.name[0]}</span>
        )}
        
        {item.diet && (
          <div className={cn(
            "absolute top-4 right-4 w-3 h-3 rounded-full shadow-sm border-2 border-white",
            item.diet === "veg" ? "bg-green-500" : "bg-red-500"
          )} />
        )}
      </div>

      <div className="flex justify-between items-start mb-2">
        <h3 className="font-display text-2xl tracking-tight leading-tight group-hover:italic transition-all">
          {item.name}
        </h3>
      </div>
      
      <p className="text-[13px] font-medium text-dust mb-6 line-clamp-2 min-h-[2.5rem]">
        {item.description || "Freshly prepared and served hot with love."}
      </p>

      <div className="flex items-center justify-between">
        <span className="font-display text-2xl italic tracking-tight">
          {formatRupees(item.price_paise)}
        </span>

        <div className="relative h-11 min-w-[110px]">
          <AnimatePresence mode="wait">
            {qty === 0 ? (
              <motion.button
                key="add"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => add({ menuItemId: item.id, name: item.name, pricePaise: item.price_paise, diet: item.diet })}
                className="absolute inset-0 w-full rounded-full bg-ink text-white text-[10px] font-bold uppercase tracking-widest hover:bg-ocean hover:scale-105 active:scale-95 transition-all shadow-sm"
              >
                Add to Tray
              </motion.button>
            ) : (
              <motion.div
                key="qty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute inset-0 flex items-center justify-between bg-ink/5 rounded-full p-1"
              >
                <button 
                  onClick={() => dec(item.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-ink shadow-sm hover:scale-110 active:scale-90 transition-all"
                >
                  <Minus size={14} strokeWidth={2.5} />
                </button>
                <span className="font-bold text-sm tabular-nums">{qty}</span>
                <button 
                  onClick={() => inc(item.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-ink shadow-sm hover:scale-110 active:scale-90 transition-all"
                >
                  <Plus size={14} strokeWidth={2.5} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
