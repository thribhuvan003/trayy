import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
});

import { useCart } from "@/lib/cart/store";

const item = {
  menuItemId: "menu-item-1",
  name: "Masala dosa",
  pricePaise: 6500,
  diet: "veg" as const,
};

describe("cart ordering availability", () => {
  beforeEach(() => {
    useCart.setState({
      tenantSlug: "audit-counter",
      lines: [],
      orderingAvailable: true,
      orderingUnavailableReason: null,
    });
  });

  it("blocks add and increment while the counter is closed or paused", () => {
    useCart.getState().setOrderingAvailability(false, "Ordering is paused.");
    useCart.getState().add(item);
    expect(useCart.getState().lines).toEqual([]);

    useCart.getState().setOrderingAvailability(true);
    useCart.getState().add(item);
    expect(useCart.getState().lines[0]?.qty).toBe(1);

    useCart.getState().setOrderingAvailability(false, "Counter closed.");
    useCart.getState().increment(item.menuItemId);
    expect(useCart.getState().lines[0]?.qty).toBe(1);
  });

  it("still lets a customer remove an item when ordering is unavailable", () => {
    useCart.getState().add(item);
    useCart.getState().setOrderingAvailability(false, "Counter closed.");
    useCart.getState().decrement(item.menuItemId);
    expect(useCart.getState().lines).toEqual([]);
  });
});
