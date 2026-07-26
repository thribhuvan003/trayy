"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartLine = {
  menuItemId: string;
  name: string;
  pricePaise: number;
  diet: "veg" | "nonveg" | "egg";
  qty: number;
};

type State = {
  tenantSlug: string;
  lines: CartLine[];
  note: string;
  orderType: "takeaway" | "dine_in";
  tableLabel: string;
  isOpen: boolean;
  orderingAvailable: boolean;
  orderingUnavailableReason: string | null;
  setIsOpen: (open: boolean) => void;
  setOrderingAvailability: (available: boolean, reason?: string | null) => void;
  add: (item: Omit<CartLine, "qty">, qty?: number) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  setNote: (n: string) => void;
  setOrderType: (t: "takeaway" | "dine_in") => void;
  setTableLabel: (tbl: string) => void;
  ensureTenant: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

// Single localStorage key holds a per-tenant map under it. Switching tenants
// reveals a different bucket instead of leaking lines across colleges.
export const useCart = create<State>()(
  persist(
    (set, get) => ({
      tenantSlug: "",
      lines: [],
      note: "",
      orderType: "takeaway",
      tableLabel: "",
      isOpen: false,
      orderingAvailable: true,
      orderingUnavailableReason: null,
      searchQuery: "",
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setIsOpen: (isOpen) => set({ isOpen }),
      setOrderingAvailability: (orderingAvailable, orderingUnavailableReason = null) =>
        set({ orderingAvailable, orderingUnavailableReason }),
      add: (item, qty = 1) =>
        set(({ lines, orderingAvailable }) => {
          if (!orderingAvailable) return { lines };
          const existing = lines.find((l) => l.menuItemId === item.menuItemId);
          if (existing) {
            return {
              lines: lines.map((l) =>
                l.menuItemId === item.menuItemId ? { ...l, qty: l.qty + qty } : l
              ),
            };
          }
          return { lines: [...lines, { ...item, qty }] };
        }),
      increment: (id) =>
        set(({ lines, orderingAvailable }) => ({
          lines: orderingAvailable
            ? lines.map((l) => (l.menuItemId === id ? { ...l, qty: l.qty + 1 } : l))
            : lines,
        })),
      decrement: (id) =>
        set(({ lines }) => ({
          lines: lines
            .map((l) => (l.menuItemId === id ? { ...l, qty: l.qty - 1 } : l))
            .filter((l) => l.qty > 0),
        })),
      remove: (id) =>
        set(({ lines }) => ({ lines: lines.filter((l) => l.menuItemId !== id) })),
      clear: () => set({ lines: [], note: "", orderType: "takeaway", tableLabel: "" }),
      setNote: (note) => set({ note }),
      setOrderType: (orderType) => set({ orderType }),
      setTableLabel: (tableLabel) => set({ tableLabel }),
      ensureTenant: (slug) => {
        if (get().tenantSlug === slug) return;
        if (typeof window === "undefined") return;
        const stash = readBucket();
        // Save outgoing tenant's lines, note, and service preferences.
        if (get().tenantSlug) {
          stash[get().tenantSlug] = {
            lines: get().lines,
            note: get().note,
            orderType: get().orderType,
            tableLabel: get().tableLabel,
          };
        }
        writeBucket(stash);
        const incoming = stash[slug] ?? { lines: [], note: "", orderType: "takeaway" as const, tableLabel: "" };
        set({
          tenantSlug: slug,
          lines: incoming.lines,
          note: incoming.note,
          orderType: incoming.orderType ?? "takeaway",
          tableLabel: incoming.tableLabel ?? "",
          orderingAvailable: true,
          orderingUnavailableReason: null,
        });
      },
    }),
    {
      name: "tray:cart:active",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        tenantSlug: s.tenantSlug,
        lines: s.lines,
        note: s.note,
        orderType: s.orderType,
        tableLabel: s.tableLabel,
      }),
    }
  )
);

const BUCKET_KEY = "tray:cart:bucket";
type Bucket = Record<
  string,
  {
    lines: CartLine[];
    note: string;
    orderType?: "takeaway" | "dine_in";
    tableLabel?: string;
  }
>;
function readBucket(): Bucket {
  try {
    return JSON.parse(localStorage.getItem(BUCKET_KEY) ?? "{}") as Bucket;
  } catch {
    return {};
  }
}
function writeBucket(b: Bucket) {
  try {
    localStorage.setItem(BUCKET_KEY, JSON.stringify(b));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function cartTotalPaise(lines: CartLine[]) {
  return lines.reduce((acc, l) => acc + l.pricePaise * l.qty, 0);
}
export function cartItemCount(lines: CartLine[]) {
  return lines.reduce((acc, l) => acc + l.qty, 0);
}
