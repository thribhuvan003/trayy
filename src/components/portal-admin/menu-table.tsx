"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, CircleDot, EyeOff, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { formatRupees, cn, fmtElapsed } from "@/lib/utils";
import { setMenuItemStatus, setMenuItemStock } from "@/app/(admin)/admin/_actions";

type Row = {
  id: string;
  name: string;
  category_id: string | null;
  diet: "veg" | "nonveg" | "egg";
  price_paise: number;
  status: "draft" | "live" | "archived";
  in_stock: boolean;
  stock_qty: number | null;
  prep_target_seconds: number;
};

export function MenuTable({ items, categories, tenantSlug }: { items: Row[]; categories: { id: string; name: string }[]; tenantSlug: string }) {
  const [filter, setFilter] = useState<"all" | "live" | "draft" | "archived">("all");
  const [pending, start] = useTransition();
  const filtered = items.filter((i) => filter === "all" || i.status === filter);
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const onStatus = (id: string, status: Row["status"]) => {
    start(async () => {
      const r = await setMenuItemStatus(id, status);
      if (!r.ok) toast.error(r.error ?? "Failed");
      else toast.success(`Moved to ${status}`);
    });
  };
  const onStock = (id: string, inStock: boolean) => {
    start(async () => {
      const r = await setMenuItemStock(id, inStock);
      if (!r.ok) toast.error(r.error ?? "Failed");
      else toast.success(inStock ? "Back in stock" : "Marked out of stock");
    });
  };

  return (
    <>
      <div className="flex items-center gap-1 mb-3 p-1 rounded-md border border-graphite-200/15 bg-graphite-700 w-fit text-[11px] font-mono">
        {(["all", "live", "draft", "archived"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={cn(
              "px-3 h-7 rounded uppercase tracking-wider",
              filter === v ? "bg-lime text-graphite-900 font-semibold" : "text-graphite-400 hover:text-graphite-200"
            )}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="bg-graphite-700 border border-graphite-200/[0.08] rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10px] font-mono uppercase tracking-wider text-graphite-400 border-b border-graphite-200/[0.08]">
              <th className="text-left px-4 py-3 font-medium">Item</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-left px-4 py-3 font-medium">Diet</th>
              <th className="text-right px-4 py-3 font-medium">Price</th>
              <th className="text-right px-4 py-3 font-medium">Prep</th>
              <th className="text-left px-4 py-3 font-medium">Stock</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => (
              <tr key={it.id} className="border-b border-graphite-200/[0.05] last:border-0">
                <td className="px-4 py-2.5 text-graphite-200 font-medium">{it.name}</td>
                <td className="px-4 py-2.5 text-graphite-300">
                  {it.category_id ? catMap.get(it.category_id) ?? "—" : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      "inline-flex h-3.5 w-3.5 items-center justify-center border-[1.5px] rounded-sm " +
                      (it.diet === "veg"
                        ? "border-emerald-400"
                        : it.diet === "egg"
                        ? "border-amber-400"
                        : "border-rose-400")
                    }
                  >
                    <span
                      className={
                        "h-1.5 w-1.5 rounded-full " +
                        (it.diet === "veg" ? "bg-emerald-400" : it.diet === "egg" ? "bg-amber-400" : "bg-rose-400")
                      }
                    />
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular text-graphite-200">
                  {formatRupees(it.price_paise)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular text-graphite-300">
                  {fmtElapsed(it.prep_target_seconds)}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => onStock(it.id, !it.in_stock)}
                    disabled={pending}
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-wider px-2 py-1 rounded border transition-colors",
                      it.in_stock
                        ? "border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10"
                        : "border-rose-400/30 text-rose-400 hover:bg-rose-400/10"
                    )}
                  >
                    {it.in_stock ? <Power size={11} /> : <PowerOff size={11} />}
                    {it.in_stock ? "In stock" : "Out"}
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={
                      "inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border " +
                      (it.status === "live"
                        ? "bg-lime/15 text-lime border-lime/30"
                        : it.status === "draft"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                        : "bg-graphite-600 text-graphite-400 border-graphite-500/30")
                    }
                  >
                    {it.status === "live" ? <CheckCircle2 size={10} /> : it.status === "draft" ? <CircleDot size={10} /> : <EyeOff size={10} />}
                    {it.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="inline-flex gap-1">
                    {it.status !== "live" && (
                      <button onClick={() => onStatus(it.id, "live")} disabled={pending} className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-lime/30 text-lime hover:bg-lime/10">
                        Publish
                      </button>
                    )}
                    {it.status === "live" && (
                      <button onClick={() => onStatus(it.id, "draft")} disabled={pending} className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-amber-400/30 text-amber-400 hover:bg-amber-400/10">
                        Draft
                      </button>
                    )}
                    {it.status !== "archived" && (
                      <button onClick={() => onStatus(it.id, "archived")} disabled={pending} className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-graphite-200/15 text-graphite-400 hover:bg-graphite-200/[0.06]">
                        Archive
                      </button>
                    )}
                    <Link
                      href={`/c/${tenantSlug}/admin/menu/${it.id}/edit`}
                      className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-graphite-200/15 text-graphite-400 hover:bg-graphite-200/[0.06] hover:text-graphite-200 transition-colors"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-graphite-400 text-[13px]">
                  No items in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
