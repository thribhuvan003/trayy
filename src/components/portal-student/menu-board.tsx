"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { MenuItem, MenuCategory } from "@/lib/db/types";
import { DietFilterTabs, type DietFilter } from "./diet-filter";
import { MenuItemCard } from "./menu-item-card";
import { cn } from "@/lib/utils";

type Props = { categories: MenuCategory[]; items: MenuItem[] };

export function MenuBoard({ categories, items }: Props) {
  const [filter, setFilter] = useState<DietFilter>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<DietFilter, number> = { all: 0, veg: 0, egg: 0, nonveg: 0 };
    for (const it of items) {
      c.all++;
      c[it.diet]++;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (filter !== "all" && it.diet !== filter) return false;
      if (!needle) return true;
      return it.name.toLowerCase().includes(needle) || (it.description ?? "").toLowerCase().includes(needle);
    });
  }, [items, filter, q]);

  const byCat = useMemo(() => {
    const m = new Map<string | null, MenuItem[]>();
    for (const it of filtered) {
      const k = it.category_id;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(it);
    }
    return m;
  }, [filtered]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-0 lg:max-w-none pt-6 pb-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-[clamp(32px,5.5vw,52px)] leading-[1.04] tracking-[-0.035em] font-medium">
          What&rsquo;s <span className="italic text-ocean-500">cooking.</span>
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink)]/65 mt-1">
          {counts.all} dishes · live menu · pickup in 4–11 min
        </p>
      </div>

      <div className="sticky top-14 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 py-3 bg-[color:var(--color-paper)]/85 backdrop-blur-xl border-b border-[color:var(--color-line)] flex flex-col gap-3">
        <label className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--color-ink)]/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search dishes…"
            className="w-full h-10 pl-10 pr-3 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-paper-dim)] text-[14px] focus:outline-none focus:border-ocean-500 focus:bg-[color:var(--color-paper)]"
          />
        </label>
        <DietFilterTabs value={filter} onChange={setFilter} counts={counts} />
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-[color:var(--color-ink)]/55">
          <div className="font-display italic text-[24px] text-ocean-500">Nothing found.</div>
          <p className="text-[14px] mt-2">Try a different filter or come back at lunchtime.</p>
        </div>
      ) : (
        <div className="mt-6 sm:mt-8 flex flex-col gap-8">
          {categories.map((cat) => {
            const list = byCat.get(cat.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={cat.id}>
                <div className="flex items-end justify-between mb-3">
                  <h2 className="font-display text-[22px] sm:text-[26px] font-medium tracking-tight">{cat.name}</h2>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/45">
                    {list.length} item{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className={cn("grid gap-3", "grid-cols-2 md:grid-cols-3 lg:grid-cols-3")}>
                  {list.map((it) => (
                    <MenuItemCard key={it.id} item={it} />
                  ))}
                </div>
              </section>
            );
          })}
          {/* Render items that have no category (category_id === null) last */}
          {(() => {
            const uncategorised = byCat.get(null) ?? [];
            if (uncategorised.length === 0) return null;
            return (
              <section key="__uncategorised">
                {categories.length > 0 && (
                  <div className="flex items-end justify-between mb-3">
                    <h2 className="font-display text-[22px] sm:text-[26px] font-medium tracking-tight">Other</h2>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/45">
                      {uncategorised.length} item{uncategorised.length === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
                <div className={cn("grid gap-3", "grid-cols-2 md:grid-cols-3 lg:grid-cols-3")}>
                  {uncategorised.map((it) => (
                    <MenuItemCard key={it.id} item={it} />
                  ))}
                </div>
              </section>
            );
          })()}
        </div>
      )}
    </div>
  );
}
