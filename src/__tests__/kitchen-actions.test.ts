// @ts-nocheck — mock objects intentionally omit Supabase client internals
/**
 * kitchen-actions.test.ts
 *
 * Unit tests for kitchen staff server actions at
 * src/app/(kitchen)/_actions.ts
 *
 * Tests cover:
 * - markPreparing: valid transition from placed → success + event emitted
 * - markPreparing: invalid source status → returns error
 * - rejectOrder: stores reason in order_status_logs
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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

// ── 4. Mock rate limiter ──────────────────────────────────────────────────────
vi.mock("@/lib/rate-limit/tenant", () => ({
  tenantRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99 }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99 }),
}));

// ── 5. Mock tenant resolution ─────────────────────────────────────────────────
// vi.hoisted runs before vi.mock hoisting so factories can reference these values
const { FAKE_TENANT, FAKE_STAFF_USER } = vi.hoisted(() => ({
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
  FAKE_STAFF_USER: {
    id: "staff-uuid-001",
    email: "staff@iitb.ac.in",
    displayName: "Kitchen Staff",
    role: "kitchen_staff",
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
  getCurrentUser: vi.fn().mockResolvedValue(FAKE_STAFF_USER),
  requireRole: vi.fn().mockResolvedValue(FAKE_STAFF_USER),
}));

// ── 7. Mock the student actions (refund helper used by rejectOrder) ───────────
vi.mock("@/app/(student)/_actions", () => ({
  initiateRefundForOrder: vi.fn().mockResolvedValue({ ok: true, refundId: "rfnd_sim_test" }),
}));

// ── 8. Mock bcryptjs ──────────────────────────────────────────────────────────
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$hashedotp"),
    compare: vi.fn().mockResolvedValue(true),
  },
  hash: vi.fn().mockResolvedValue("$2b$10$hashedotp"),
  compare: vi.fn().mockResolvedValue(true),
}));

// ── 9. Mock @/lib/utils (randomOtp) ─────────────────────────────────────────
vi.mock("@/lib/utils", () => ({
  randomOtp: vi.fn().mockReturnValue("123456"),
  cn: vi.fn(),
}));

// ── 10. Build configurable Supabase admin mock ────────────────────────────────
// Each test controls what maybeSingle() returns via these module-level vars.
let mockOrderRow: { status: string; ready_at?: string | null } | null = null;
const insertedStatusLogs: unknown[] = [];
const insertedOrderEvents: unknown[] = [];
const insertedAuditLogs: unknown[] = [];
let mockOrderUpdateError: { message: string } | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn().mockImplementation(() => buildKitchenAdminMock()),
}));

function buildKitchenAdminMock() {
  return {
    from: (table: string) => {
      return {
        select: (cols?: string) => ({
          eq: (col: string, val: unknown) => ({
            eq: (col2: string, val2: unknown) => ({
              maybeSingle: () => Promise.resolve({ data: mockOrderRow, error: null }),
              order: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
              in: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
            }),
            maybeSingle: () => {
              if (table === "orders") return Promise.resolve({ data: mockOrderRow, error: null });
              if (table === "staff_profiles")
                return Promise.resolve({
                  data: { locked_until: null, is_active: true },
                  error: null,
                });
              if (table === "menu_items")
                return Promise.resolve({ data: null, error: null });
              return Promise.resolve({ data: null, error: null });
            },
            in: (_col2: string, _vals: unknown[]) => ({
              gte: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
            }),
            returns: () => Promise.resolve({ data: [], error: null }),
          }),
          in: () => ({
            gte: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
        insert: (data: unknown) => {
          if (table === "order_status_logs") insertedStatusLogs.push(data);
          if (table === "order_events") insertedOrderEvents.push(data);
          if (table === "audit_logs") insertedAuditLogs.push(data);
          return Promise.resolve({ data: {}, error: null });
        },
        update: (payload: unknown) => ({
          eq: (col: string, val: unknown) => ({
            eq: (col2: string, val2: unknown) => {
              if (mockOrderUpdateError) return Promise.resolve({ data: null, error: mockOrderUpdateError });
              return Promise.resolve({ data: {}, error: null });
            },
          }),
        }),
        upsert: () => Promise.resolve({ data: {}, error: null }),
        delete: () => ({ eq: () => Promise.resolve({ data: {}, error: null }) }),
        rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      };
    },
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
  };
}

// ── Import actions under test ─────────────────────────────────────────────────
import { markPreparing, rejectOrder } from "@/app/(kitchen)/_actions";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("markPreparing — valid transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedStatusLogs.length = 0;
    insertedOrderEvents.length = 0;
    insertedAuditLogs.length = 0;
    mockOrderUpdateError = null;
  });

  it("returns ok:true when order is in 'placed' status", async () => {
    mockOrderRow = { status: "placed" };
    const result = await markPreparing("order-uuid-001");
    expect(result.ok).toBe(true);
  });

  it("emits an order_events row with event_type 'preparing'", async () => {
    mockOrderRow = { status: "placed" };
    await markPreparing("order-uuid-001");
    const preparingEvents = insertedOrderEvents.filter(
      (e: any) => e.event_type === "preparing"
    );
    expect(preparingEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("inserts an order_status_logs row from 'placed' to 'preparing'", async () => {
    mockOrderRow = { status: "placed" };
    await markPreparing("order-uuid-001");
    const log = insertedStatusLogs.find(
      (l: any) => l.from_status === "placed" && l.to_status === "preparing"
    );
    expect(log).toBeDefined();
  });
});

describe("markPreparing — invalid transition", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedStatusLogs.length = 0;
    insertedOrderEvents.length = 0;
    mockOrderUpdateError = null;
  });

  it("returns ok:false with an error message when order is in 'collected' status", async () => {
    mockOrderRow = { status: "collected" };
    const result = await markPreparing("order-uuid-001");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // The handler returns: `Cannot start an order in "${cur.status}"`
      expect(result.error).toMatch(/collected/i);
    }
  });

  it("returns ok:false when order is already 'preparing'", async () => {
    mockOrderRow = { status: "preparing" };
    const result = await markPreparing("order-uuid-001");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/preparing/i);
    }
  });

  it("returns ok:false when order is in 'ready' status", async () => {
    mockOrderRow = { status: "ready" };
    const result = await markPreparing("order-uuid-001");
    expect(result.ok).toBe(false);
  });

  it("returns ok:false with 'Order not found' when order does not exist", async () => {
    mockOrderRow = null;
    const result = await markPreparing("nonexistent-order");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/not found/i);
    }
  });
});

describe("rejectOrder — reason logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedStatusLogs.length = 0;
    insertedOrderEvents.length = 0;
    insertedAuditLogs.length = 0;
    mockOrderUpdateError = null;
  });

  it("returns ok:true when order is in 'placed' status", async () => {
    mockOrderRow = { status: "placed" };
    const result = await rejectOrder("order-uuid-001", "Wrong item packed");
    expect(result.ok).toBe(true);
  });

  it("stores the rejection reason in order_status_logs", async () => {
    mockOrderRow = { status: "placed" };
    const reason = "Gas cylinder empty — kitchen shutting down";
    await rejectOrder("order-uuid-001", reason);
    const log = insertedStatusLogs.find(
      (l: any) => l.to_status === "rejected" && l.note === reason
    );
    expect(log).toBeDefined();
  });

  it("stores the rejection reason in audit_logs meta", async () => {
    mockOrderRow = { status: "placed" };
    const reason = "Storm closed the canteen";
    await rejectOrder("order-uuid-001", reason);
    const auditEntry = insertedAuditLogs.find(
      (a: any) => a.action === "order.rejected" && a.meta?.reason === reason
    );
    expect(auditEntry).toBeDefined();
  });

  it("truncates reason at 200 characters in logs", async () => {
    mockOrderRow = { status: "placed" };
    const longReason = "A".repeat(250); // 250 chars — over the 200-char limit
    await rejectOrder("order-uuid-001", longReason);
    const log = insertedStatusLogs.find((l: any) => l.to_status === "rejected");
    expect(log).toBeDefined();
    if (log) {
      expect((log as any).note.length).toBeLessThanOrEqual(200);
    }
  });

  it("emits an order_events row with event_type 'rejected'", async () => {
    mockOrderRow = { status: "placed" };
    await rejectOrder("order-uuid-001", "Out of ingredients");
    const event = insertedOrderEvents.find((e: any) => e.event_type === "rejected");
    expect(event).toBeDefined();
  });

  it("returns ok:false when order is in terminal 'collected' state", async () => {
    mockOrderRow = { status: "collected" };
    const result = await rejectOrder("order-uuid-001", "Mistake");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/collected/i);
    }
  });

  it("returns ok:false when order is in terminal 'rejected' state", async () => {
    mockOrderRow = { status: "rejected" };
    const result = await rejectOrder("order-uuid-001", "Retry reject");
    expect(result.ok).toBe(false);
  });

  it("can reject an order that is in 'preparing' status", async () => {
    mockOrderRow = { status: "preparing" };
    const result = await rejectOrder("order-uuid-001", "Found hair in food");
    expect(result.ok).toBe(true);
  });
});
