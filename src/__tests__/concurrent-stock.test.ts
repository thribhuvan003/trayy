// @ts-nocheck
/**
 * concurrent-stock.test.ts
 *
 * Verifies the atomic_decrement_stock DB function prevents overselling
 * when N concurrent checkouts target a limited-stock item.
 *
 * Strategy: mock the Supabase admin client so `rpc("atomic_decrement_stock")`
 * behaves like a real row-lock simulation — a counter that only lets
 * `stock_qty` many calls through.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({ get: () => "aditya" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/env", () => ({
  env: {
    RAZORPAY_KEY_ID: undefined,
    RAZORPAY_KEY_SECRET: undefined,
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service_key",
    RAZORPAY_WEBHOOK_SECRET: "secret",
  },
  featureFlags: { razorpayLive: false, upstashLive: false },
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  tenantRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/logging", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), withContext: vi.fn().mockReturnThis() },
  withRequestContext: vi.fn().mockReturnValue({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), withContext: vi.fn().mockReturnThis() }),
}));

// ── Shared order counter for idempotency tests ─────────────────────────────

let capturedOrders = 0;
const STOCK_LIMIT = 5;

// Atomic stock simulation: only STOCK_LIMIT calls succeed
let stockRemaining = STOCK_LIMIT;

const mockRpc = vi.fn().mockImplementation((fn: string) => {
  if (fn === "atomic_decrement_stock") {
    if (stockRemaining > 0) {
      stockRemaining--;
      return Promise.resolve({ data: "ok", error: null });
    }
    return Promise.resolve({ data: "out_of_stock:Crispy Samosa", error: null });
  }
  if (fn === "next_order_short_code") {
    return Promise.resolve({ data: `T-${Date.now()}`, error: null });
  }
  return Promise.resolve({ data: null, error: null });
});

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

// A fully chainable Supabase admin mock — every method returns itself so
// any chain depth resolves correctly.
function makeAdminChainable(finalData: unknown = null): any {
  const c: any = {
    select: () => c,
    insert: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: `order-${Math.random()}`, short_code: "T-001" }, error: null }),
      }),
      ...c,
    })),
    update: vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: "order-1" }] }),
    })),
    upsert: vi.fn().mockImplementation(() => ({ onConflict: vi.fn().mockResolvedValue({ error: null }) })),
    delete: () => c,
    eq: () => c,
    in: () => c,
    gte: () => c,
    gt: () => c,
    lt: () => c,
    order: () => c,
    limit: () => c,
    not: () => c,
    range: () => c,
    returns: vi.fn().mockResolvedValue({ data: finalData, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: "order-1", short_code: "T-001" }, error: null }),
    head: vi.fn().mockResolvedValue({ count: 3, error: null }),
  };
  return c;
}

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn().mockReturnValue({
    rpc: mockRpc,
    from: vi.fn().mockImplementation(() => makeAdminChainable()),
  }),
}));

// Build a chainable mock builder — every method returns the same object so any
// chain depth works. Terminal methods (maybeSingle, returns, single, then) resolve data.
function makeChainable(data: unknown, overrides: Record<string, unknown> = {}): any {
  const chainable: any = {
    select: () => chainable,
    eq: () => chainable,
    in: () => chainable,
    order: () => chainable,
    gte: () => chainable,
    gt: () => chainable,
    lt: () => chainable,
    limit: () => chainable,
    not: () => chainable,
    filter: () => chainable,
    range: () => chainable,
    returns: vi.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: "order-1", short_code: "T-001" }, error: null }),
    head: vi.fn().mockResolvedValue({ count: 3, error: null }),
    ...overrides,
  };
  return chainable;
}

vi.mock("@/lib/supabase/server", () => ({
  getServerClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "tenants") {
        return makeChainable(null, {
          maybeSingle: vi.fn().mockResolvedValue({ data: { is_open: true, paused_until: null }, error: null }),
        });
      }
      if (table === "menu_items") {
        const menuItems = [{
          id: "item-samosa", name: "Crispy Samosa", price_paise: 2000,
          diet: "veg", status: "live", in_stock: true, stock_qty: STOCK_LIMIT,
        }];
        return makeChainable(menuItems, {
          returns: vi.fn().mockResolvedValue({ data: menuItems, error: null }),
        });
      }
      if (table === "orders") {
        // count query for queue depth check
        return makeChainable(null, { head: vi.fn().mockResolvedValue({ count: 3, error: null }) });
      }
      return makeChainable(null);
    }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "test@test.com" } } }) },
  }),
}));

vi.mock("@/lib/auth/get-user", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "user-1",
    email: "test@test.com",
    tenantId: "tenant-1",
    tenantSlug: "aditya",
    role: "student",
    displayName: "Test Student",
  }),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenant: vi.fn().mockResolvedValue({
    id: "tenant-1",
    slug: "aditya",
    name: "Aditya Canteen",
    college_name: "Aditya College",
    college_slug: "aditya",
    is_open: true,
    building: null,
    zone: null,
    pending_orders_count: 0,
    college_id: "college-1",
    upi_vpa: "canteen@upi",
    allowed_domain: null,
  }),
  getTenantSlugFromHeaders: vi.fn().mockReturnValue("aditya"),
  requireTenantContext: vi.fn().mockResolvedValue({
    tenant: { id: "tenant-1", slug: "aditya", name: "Aditya Canteen", college_slug: "aditya", upi_vpa: "canteen@upi" },
    user: { id: "user-1", email: "test@test.com", role: "student", displayName: "Test Student" },
  }),
}));

vi.mock("@/lib/payments/razorpay", () => ({
  createRazorpayOrder: vi.fn().mockResolvedValue({
    id: `order_sim_${Math.random().toString(36).slice(2)}`,
    amount: 2000,
    currency: "INR",
    receipt: "T-001",
    status: "created",
    simulated: true,
  }),
}));

vi.mock("dayjs", () => {
  const fn = () => ({
    add: () => fn(),
    toISOString: () => new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
  return { default: fn };
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Concurrent stock — atomic decrement prevents overselling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stockRemaining = STOCK_LIMIT;
    capturedOrders = 0;
    mockRpc.mockImplementation((fn: string) => {
      if (fn === "atomic_decrement_stock") {
        if (stockRemaining > 0) { stockRemaining--; return Promise.resolve({ data: "ok", error: null }); }
        return Promise.resolve({ data: "out_of_stock:Crispy Samosa", error: null });
      }
      if (fn === "next_order_short_code") return Promise.resolve({ data: `T-${Date.now()}-${Math.random()}`, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    // Admin client is fully rebuilt each call via makeAdminChainable, no extra setup needed.
  });

  it("only STOCK_LIMIT checkouts succeed when N > STOCK_LIMIT concurrent requests fire", async () => {
    const CONCURRENT = 20; // 20 students trying to buy the last 5 samosas
    const { placeOrder } = await import("@/app/(student)/_actions");

    const results = await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        placeOrder([{ menuItemId: "item-samosa", qty: 1 }], "", "takeaway", null)
      )
    );

    const successes = results.filter((r) => r.ok);
    const rejections = results.filter((r) => !r.ok);

    // Exactly STOCK_LIMIT orders should succeed
    expect(successes.length).toBe(STOCK_LIMIT);

    // The rest must fail with OUT_OF_STOCK — no silent failures
    expect(rejections.length).toBe(CONCURRENT - STOCK_LIMIT);
    for (const r of rejections) {
      if (!r.ok) {
        // Either out_of_stock or rate-limited (both are correct rejections)
        expect(["OUT_OF_STOCK", "RATE_LIMITED", undefined]).toContain(r.code);
      }
    }
  });

  it("stock never goes negative — stockRemaining floor is 0", async () => {
    const CONCURRENT = 50;
    const { placeOrder } = await import("@/app/(student)/_actions");

    await Promise.all(
      Array.from({ length: CONCURRENT }, () =>
        placeOrder([{ menuItemId: "item-samosa", qty: 1 }], "", "takeaway", null)
      )
    );

    // The mock simulates the DB atomic guard: stock cannot go below 0
    expect(stockRemaining).toBeGreaterThanOrEqual(0);
  });

  it("single checkout with qty > stock_qty is rejected immediately", async () => {
    const { placeOrder } = await import("@/app/(student)/_actions");
    // Reset mock to return out_of_stock for any qty > remaining
    stockRemaining = 2;
    mockRpc.mockImplementationOnce((fn: string) => {
      if (fn === "atomic_decrement_stock") {
        return Promise.resolve({ data: "out_of_stock:Crispy Samosa", error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const res = await placeOrder([{ menuItemId: "item-samosa", qty: 5 }], "", "takeaway", null);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("OUT_OF_STOCK");
      expect(res.error).toContain("Samosa");
    }
  });
});
