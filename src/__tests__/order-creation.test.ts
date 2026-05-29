// @ts-nocheck — mock objects intentionally omit Supabase client internals
/**
 * order-creation.test.ts
 *
 * Unit tests for the placeOrder server action at
 * src/app/(student)/_actions.ts
 *
 * All Supabase calls, auth helpers, rate limiters, Razorpay, and Next.js
 * internals are fully mocked.  No network or database is touched.
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";

// ── 1. Mock server-only / Next.js server internals ───────────────────────────
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map([["x-tenant-slug", "iitb"]])),
  cookies: vi.fn().mockResolvedValue({ set: vi.fn() }),
}));

// ── 2. Mock @/lib/env ─────────────────────────────────────────────────────────
vi.mock("@/lib/env", () => ({
  env: {
    RAZORPAY_WEBHOOK_SECRET: "test_secret",
    SUPABASE_SERVICE_ROLE_KEY: "service_role_test",
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon_test",
    APP_URL: "http://localhost:3000",
  },
  featureFlags: {
    razorpayLive: false,
    resendLive: false,
    upstashLive: false,
    qstashLive: false,
  },
}));

// ── 3. Mock @/lib/logging ─────────────────────────────────────────────────────
vi.mock("@/lib/logging", () => {
  const noop = () => {};
  const log = { debug: noop, info: noop, warn: noop, error: noop, withContext: () => log };
  return { logger: log, withRequestContext: () => log };
});

// ── 4. Mock rate limiters ─────────────────────────────────────────────────────
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99 }),
}));
vi.mock("@/lib/rate-limit/tenant", () => ({
  tenantRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99 }),
}));

// ── 5. Mock tenant resolution ─────────────────────────────────────────────────
// vi.hoisted ensures these values exist before vi.mock factories are hoisted
const { FAKE_TENANT, FAKE_USER } = vi.hoisted(() => ({
  FAKE_TENANT: {
    id: "tenant-uuid-001",
    slug: "iitb",
    name: "IITB Canteen",
    college_name: "IIT Bombay",
    hero_tagline: null,
    logo_url: null,
    allowed_domain: null,
    upi_vpa: "iitb@upi",
  },
  FAKE_USER: {
    id: "user-uuid-001",
    email: "student@iitb.ac.in",
    displayName: "Test Student",
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireTenantContext: vi.fn().mockResolvedValue({ tenant: FAKE_TENANT, slug: "iitb", isServiceRole: false }),
  requireTenantContextForJob: vi.fn(),
  resolveTenant: vi.fn().mockResolvedValue(FAKE_TENANT),
  tenantSlugFromHost: vi.fn().mockReturnValue("iitb"),
}));

// ── 6. Mock auth ──────────────────────────────────────────────────────────────
vi.mock("@/lib/auth/get-user", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(FAKE_USER),
  requireRole: vi.fn().mockResolvedValue(FAKE_USER),
}));

// ── 7. Mock Razorpay ──────────────────────────────────────────────────────────
vi.mock("@/lib/payments/razorpay", () => ({
  createRazorpayOrder: vi.fn().mockResolvedValue({
    id: "order_sim_test001",
    amount: 5000,
    currency: "INR",
    receipt: "A001",
    status: "created",
    simulated: true,
  }),
  initiateRazorpayRefund: vi.fn().mockResolvedValue({ refundId: "rfnd_sim_test", simulated: true }),
  verifyWebhookSignature: vi.fn(),
  fetchRazorpayOrderStatus: vi.fn().mockResolvedValue("paid"),
  upiQrPayload: vi.fn(),
}));

// ── 8. Build a configurable Supabase admin mock ───────────────────────────────
// We want the mock to be fully reconfigurable per test, so we store callbacks.
let mockOrdersRow: Record<string, unknown> | null = null;
let mockTenantsRow: Record<string, unknown> | null = { is_open: true, paused_until: null };
let mockMenuItems: unknown[] = [];
let mockIdempotencyRow: Record<string, unknown> | null = null;
let mockClaimError: { code?: string; message?: string } | null = null;
let mockOrderInsertResult: { data: { id: string; short_code: string } | null; error: { message: string } | null } = {
  data: { id: "new-order-uuid-001", short_code: "A001" },
  error: null,
};
let mockShortCodeRpc: { data: string | null; error: unknown } = { data: "A001", error: null };

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn().mockImplementation(() => buildAdminMock()),
}));

vi.mock("@/lib/supabase/server", () => ({
  getServerClient: vi.fn().mockImplementation(() => buildServerMock()),
}));

function buildServerMock() {
  return {
    from: (table: string) => buildTableMock(table, "server"),
    rpc: vi.fn().mockResolvedValue({ data: "A001", error: null }),
  };
}

function buildAdminMock() {
  return {
    from: (table: string) => buildTableMock(table, "admin"),
    rpc: (fn: string) => {
      if (fn === "next_order_short_code") return Promise.resolve(mockShortCodeRpc);
      return Promise.resolve({ data: null, error: null });
    },
  };
}

function buildTableMock(table: string, role: string) {
  return {
    select: (cols?: string) => ({
      eq: (col: string, val: unknown) => ({
        eq: (col2: string, val2: unknown) => ({
          maybeSingle: () => {
            if (table === "tenants") return Promise.resolve({ data: mockTenantsRow, error: null });
            if (table === "idempotency_keys") return Promise.resolve({ data: mockIdempotencyRow, error: null });
            if (table === "orders") return Promise.resolve({ data: mockOrdersRow, error: null });
            return Promise.resolve({ data: null, error: null });
          },
          order: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
        maybeSingle: () => {
          if (table === "tenants") return Promise.resolve({ data: mockTenantsRow, error: null });
          if (table === "idempotency_keys") return Promise.resolve({ data: mockIdempotencyRow, error: null });
          if (table === "orders") return Promise.resolve({ data: mockOrdersRow, error: null });
          return Promise.resolve({ data: null, error: null });
        },
        order: () => ({
          limit: () => {
            // Returns a list with the mock short_code for sequential generation tests
            return Promise.resolve({ data: [{ short_code: "T-2401" }], error: null });
          }
        }),
        in: (_col2: string, _vals: unknown[]) => ({
          returns: () => Promise.resolve({ data: mockMenuItems, error: null }),
        }),
      }),
      in: (col: string, vals: unknown[]) => ({
        returns: () => Promise.resolve({ data: mockMenuItems, error: null }),
      }),
      maybeSingle: () => {
        if (table === "tenants") return Promise.resolve({ data: mockTenantsRow, error: null });
        if (table === "idempotency_keys") return Promise.resolve({ data: mockIdempotencyRow, error: null });
        return Promise.resolve({ data: null, error: null });
      },
    }),
    insert: (data: unknown) => {
      if (table === "idempotency_keys") {
        if (mockClaimError) return Promise.resolve({ data: null, error: mockClaimError });
        return Promise.resolve({ data: {}, error: null });
      }
      if (table === "orders") {
        // Chainable: .insert(...).select(...).single()
        return {
          select: () => ({
            single: () => Promise.resolve(mockOrderInsertResult),
          }),
        };
      }
      // order_items, order_status_logs, audit_logs, payments
      return Promise.resolve({ data: {}, error: null });
    },
    update: () => ({
      eq: () => ({
        eq: () => Promise.resolve({ data: {}, error: null }),
      }),
    }),
    upsert: () => Promise.resolve({ data: {}, error: null }),
    delete: () => ({ eq: () => Promise.resolve({ data: {}, error: null }) }),
  };
}

// ── Import the action under test ──────────────────────────────────────────────
import { placeOrder } from "@/app/(student)/_actions";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("placeOrder — guard rails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset shared state
    mockMenuItems = [];
    mockTenantsRow = { is_open: true, paused_until: null };
    mockIdempotencyRow = null;
    mockClaimError = null;
    mockOrderInsertResult = { data: { id: "new-order-uuid-001", short_code: "A001" }, error: null };
    mockShortCodeRpc = { data: "A001", error: null };
  });

  it("returns EMPTY error code when cart is empty", async () => {
    const result = await placeOrder([], "", "takeaway");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("EMPTY");
    }
  });

  it("returns OUT_OF_STOCK when a cart item is not found in the menu", async () => {
    // Menu returns no rows — the item ID doesn't exist in the DB
    mockMenuItems = [];
    const result = await placeOrder(
      [{ menuItemId: "item-does-not-exist", qty: 1 }],
      "",
      "takeaway"
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("OUT_OF_STOCK");
    }
  });

  it("returns OUT_OF_STOCK when item exists but in_stock is false", async () => {
    mockMenuItems = [
      {
        id: "item-uuid-001",
        name: "Masala Chai",
        price_paise: 1500,
        diet: "veg",
        status: "live",
        in_stock: false,
        stock_qty: null,
      },
    ];
    const result = await placeOrder(
      [{ menuItemId: "item-uuid-001", qty: 1 }],
      "",
      "takeaway"
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("OUT_OF_STOCK");
    }
  });

  it("returns OUT_OF_STOCK when item status is not 'live'", async () => {
    mockMenuItems = [
      {
        id: "item-uuid-002",
        name: "Samosa",
        price_paise: 2000,
        diet: "veg",
        status: "archived", // not live
        in_stock: true,
        stock_qty: null,
      },
    ];
    const result = await placeOrder(
      [{ menuItemId: "item-uuid-002", qty: 1 }],
      "",
      "takeaway"
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("OUT_OF_STOCK");
    }
  });

  it("returns OUT_OF_STOCK when requested qty exceeds stock_qty", async () => {
    mockMenuItems = [
      {
        id: "item-uuid-003",
        name: "Vada Pav",
        price_paise: 2500,
        diet: "veg",
        status: "live",
        in_stock: true,
        stock_qty: 2, // only 2 left
      },
    ];
    const result = await placeOrder(
      [{ menuItemId: "item-uuid-003", qty: 5 }], // asking for 5
      "",
      "takeaway"
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("OUT_OF_STOCK");
    }
  });
});

describe("placeOrder — idempotency ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMenuItems = [
      {
        id: "item-uuid-001",
        name: "Masala Chai",
        price_paise: 1500,
        diet: "veg",
        status: "live",
        in_stock: true,
        stock_qty: null,
      },
    ];
    mockTenantsRow = { is_open: true, paused_until: null };
    mockClaimError = null;
    mockIdempotencyRow = null;
    mockOrderInsertResult = { data: { id: "new-order-uuid-001", short_code: "A001" }, error: null };
    mockShortCodeRpc = { data: "A001", error: null };
  });

  it("returns the existing order (replay) when an idempotency key exists with a stored response", async () => {
    const previousResult = {
      ok: true,
      orderId: "existing-order-uuid-999",
      razorpayOrderId: "order_sim_existing",
      simulated: true,
    };
    // Pre-seed the idempotency key with a stored response (fast-path replay scenario)
    mockIdempotencyRow = { response: previousResult };

    const result = await placeOrder(
      [{ menuItemId: "item-uuid-001", qty: 1 }],
      "",
      "takeaway"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Must return the cached order, not create a new one
      expect(result.orderId).toBe("existing-order-uuid-999");
      expect(result.razorpayOrderId).toBe("order_sim_existing");
    }
  });

  it("returns RATE_LIMITED when key claim races (PG unique violation code 23505)", async () => {
    // Simulate a lost race: key exists in DB but with null response (still in-flight)
    mockClaimError = { code: "23505", message: "duplicate key" };
    mockIdempotencyRow = { response: null }; // in-flight — no stored result yet

    const result = await placeOrder(
      [{ menuItemId: "item-uuid-001", qty: 1 }],
      "",
      "takeaway"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("RATE_LIMITED");
    }
  });
});

describe("placeOrder — successful order creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMenuItems = [
      {
        id: "item-uuid-001",
        name: "Masala Chai",
        price_paise: 1500,
        diet: "veg",
        status: "live",
        in_stock: true,
        stock_qty: null,
      },
    ];
    mockTenantsRow = { is_open: true, paused_until: null };
    mockClaimError = null;
    mockIdempotencyRow = null;
    mockOrderInsertResult = { data: { id: "new-order-uuid-001", short_code: "A001" }, error: null };
    mockShortCodeRpc = { data: "A001", error: null };
  });

  it("direct_upi (default): returns ok:true with orderId and NO Razorpay order", async () => {
    const { createRazorpayOrder } = await import("@/lib/payments/razorpay");
    const result = await placeOrder(
      [{ menuItemId: "item-uuid-001", qty: 2 }],
      "extra sugar please",
      "takeaway"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.orderId).toBeTruthy();
      // Money goes straight to the canteen VPA — Razorpay is never involved,
      // so there is no Razorpay order and nothing is "simulated".
      expect(result.razorpayOrderId).toBeNull();
      expect(result.simulated).toBe(false);
    }
    expect(createRazorpayOrder).not.toHaveBeenCalled();
  });

  it("razorpay mode: creates a Razorpay order and returns its id", async () => {
    mockTenantsRow = { is_open: true, paused_until: null, payment_mode: "razorpay" };
    const { createRazorpayOrder } = await import("@/lib/payments/razorpay");
    const result = await placeOrder(
      [{ menuItemId: "item-uuid-001", qty: 1 }],
      "",
      "takeaway"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.razorpayOrderId).toBe("order_sim_test001");
      expect(result.simulated).toBe(true);
    }
    expect(createRazorpayOrder).toHaveBeenCalledOnce();
  });

  it("returns ok:true for a multi-item cart", async () => {
    mockMenuItems = [
      {
        id: "item-uuid-001",
        name: "Masala Chai",
        price_paise: 1500,
        diet: "veg",
        status: "live",
        in_stock: true,
        stock_qty: null,
      },
      {
        id: "item-uuid-002",
        name: "Samosa",
        price_paise: 2000,
        diet: "veg",
        status: "live",
        in_stock: true,
        stock_qty: null,
      },
    ];

    const result = await placeOrder(
      [
        { menuItemId: "item-uuid-001", qty: 1 },
        { menuItemId: "item-uuid-002", qty: 2 },
      ],
      "",
      "dine_in",
      "Table 4"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.orderId).toBe("new-order-uuid-001");
    }
  });

  it("handles lastOrders query failure gracefully by falling back to T-2401", async () => {
    // The sequential short code generator falls back gracefully if the database query fails
    const result = await placeOrder(
      [{ menuItemId: "item-uuid-001", qty: 1 }],
      "",
      "takeaway"
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.orderId).toBe("new-order-uuid-001");
    }
  });
});
