// @ts-nocheck — mock objects intentionally omit Supabase client internals
/**
 * webhook-idempotency.test.ts
 *
 * Unit tests for the Razorpay webhook handler at
 * src/app/api/webhooks/razorpay/route.ts
 *
 * Strategy: all Supabase calls and external helpers are vi.mock'd so we never
 * hit the network.  The handler is imported after the mocks are in place.
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";
import crypto from "node:crypto";

// ── 1. Mock server-only marker (Next.js adds this; Node doesn't recognise it) ─
vi.mock("server-only", () => ({}));

// ── 2. Mock @/lib/env ──────────────────────────────────────────────────────────
// vi.hoisted runs before vi.mock hoisting so these values are safe to use in factories
const { FAKE_WEBHOOK_SECRET, FAKE_SERVICE_ROLE_KEY, FAKE_SUPABASE_URL } = vi.hoisted(() => ({
  FAKE_WEBHOOK_SECRET: "test_webhook_secret_32chars_long!",
  FAKE_SERVICE_ROLE_KEY: "service_role_test_key",
  FAKE_SUPABASE_URL: "https://test.supabase.co",
}));

vi.mock("@/lib/env", () => ({
  env: {
    RAZORPAY_WEBHOOK_SECRET: FAKE_WEBHOOK_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: FAKE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon_test_key",
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
  const loggerInstance = {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    withContext: () => loggerInstance,
  };
  return {
    logger: loggerInstance,
    withRequestContext: () => loggerInstance,
  };
});

// ── 4. Mock @/lib/rate-limit ──────────────────────────────────────────────────
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 99 }),
}));

// ── 5. Mock @/lib/payments/razorpay (signature verifier) ─────────────────────
import * as razorpayLib from "@/lib/payments/razorpay";
vi.mock("@/lib/payments/razorpay", () => ({
  verifyWebhookSignature: vi.fn(),
}));
const mockVerify = razorpayLib.verifyWebhookSignature as MockedFunction<typeof razorpayLib.verifyWebhookSignature>;

// ── 6. Mock @/lib/supabase/admin ──────────────────────────────────────────────
// We build a chainable mock that stores calls for inspection.
const mockRpc = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

// Build the fluent chain: from(t).select(c).eq(f,v).maybeSingle()
const chainEnd = { maybeSingle: mockMaybeSingle };
mockEq.mockReturnValue(chainEnd);
mockSelect.mockReturnValue({ eq: mockEq });
const insertChain = { error: null };
mockFrom.mockImplementation((table: string) => ({
  select: mockSelect,
  insert: vi.fn().mockResolvedValue(insertChain),
  rpc: mockRpc,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn().mockImplementation(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

import * as adminLib from "@/lib/supabase/admin";
const mockGetAdminClient = adminLib.getAdminClient as MockedFunction<typeof adminLib.getAdminClient>;

// ── 7. Import the handler under test (after all mocks are registered) ─────────
import { POST } from "@/app/api/webhooks/razorpay/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: object, signature: string, headers: Record<string, string> = {}): Request {
  const raw = JSON.stringify(body);
  return new Request("http://localhost/api/webhooks/razorpay", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      "x-razorpay-signature": signature,
      ...headers,
    },
    body: raw,
  });
}

function validHmac(body: object): string {
  return crypto
    .createHmac("sha256", FAKE_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest("hex");
}

const BASE_PAYMENT_CAPTURED_BODY = {
  event: "payment.captured",
  created_at: 1700000000,
  payload: {
    payment: {
      entity: {
        id: "pay_abc123",
        order_id: "order_rzp_001",
        status: "captured",
        amount: 5000,
        notes: { tenant: "iitb", order: "order-db-uuid-001" },
      },
    },
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Razorpay webhook handler — signature guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // By default verifyWebhookSignature passes
    mockVerify.mockReturnValue(true);
    // By default orders table returns a valid order row
    mockMaybeSingle.mockResolvedValue({
      data: { id: "order-db-uuid-001", tenant_id: "tenant-uuid-001", status: "pending_payment" },
      error: null,
    });
  });

  it("returns 400 when the HMAC signature is wrong", async () => {
    mockVerify.mockReturnValue(false);
    const body = BASE_PAYMENT_CAPTURED_BODY;
    const req = makeRequest(body, "bad_signature_here");
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns 400 when the x-razorpay-signature header is missing entirely", async () => {
    const body = BASE_PAYMENT_CAPTURED_BODY;
    const raw = JSON.stringify(body);
    const req = new Request("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.2.3.4",
        // intentionally no x-razorpay-signature
      },
      body: raw,
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});

describe("Razorpay webhook handler — payment.captured idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerify.mockReturnValue(true);
  });

  it("calls safe_capture_payment RPC when order is in pending_payment state", async () => {
    // Order is found and in valid state
    const captureRpc = vi.fn().mockResolvedValue({ data: "captured", error: null });
    const insertFn = vi.fn().mockResolvedValue({ error: null });

    // getAdminClient called twice: once for order lookup, once for scoped capture
    mockGetAdminClient.mockImplementation(() => ({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: "order-db-uuid-001", tenant_id: "tenant-uuid-001", status: "pending_payment" },
                  error: null,
                }),
            }),
            maybeSingle: () =>
              Promise.resolve({
                data: { id: "order-db-uuid-001", tenant_id: "tenant-uuid-001", status: "pending_payment" },
                error: null,
              }),
          }),
        }),
        insert: insertFn,
      }),
      rpc: captureRpc,
    }));

    const body = BASE_PAYMENT_CAPTURED_BODY;
    const req = makeRequest(body, validHmac(body));
    const res = await POST(req as any);
    // Handler should return 200 ok
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // The capture RPC must have been called
    expect(captureRpc).toHaveBeenCalledWith(
      "safe_capture_payment",
      expect.objectContaining({
        p_order_id: "order-db-uuid-001",
        p_tenant_id: "tenant-uuid-001",
        p_razorpay_oid: "order_rzp_001",
      })
    );
  });

  it("returns 200 ok (no-op) when safe_capture_payment returns 'already_captured' (duplicate webhook)", async () => {
    // Simulates a second delivery of the same captured event
    const captureRpc = vi.fn().mockResolvedValue({ data: "already_captured", error: null });
    const insertFn = vi.fn().mockResolvedValue({ error: null });

    mockGetAdminClient.mockImplementation(() => ({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: "order-db-uuid-001", tenant_id: "tenant-uuid-001", status: "placed" },
                  error: null,
                }),
            }),
            maybeSingle: () =>
              Promise.resolve({
                data: { id: "order-db-uuid-001", tenant_id: "tenant-uuid-001", status: "placed" },
                error: null,
              }),
          }),
        }),
        insert: insertFn,
      }),
      rpc: captureRpc,
    }));

    const body = BASE_PAYMENT_CAPTURED_BODY;
    const req = makeRequest(body, validHmac(body));
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // RPC was still called — idempotency is enforced inside the DB function, not here
    expect(captureRpc).toHaveBeenCalled();
  });
});

describe("Razorpay webhook handler — payment.failed event", () => {
  it("calls safe_fail_payment RPC and returns 200", async () => {
    mockVerify.mockReturnValue(true);
    const failRpc = vi.fn().mockResolvedValue({ data: "failed", error: null });
    const insertFn = vi.fn().mockResolvedValue({ error: null });

    mockGetAdminClient.mockImplementation(() => ({
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: "order-db-uuid-001", tenant_id: "tenant-uuid-001", status: "pending_payment" },
                  error: null,
                }),
            }),
            maybeSingle: () =>
              Promise.resolve({
                data: { id: "order-db-uuid-001", tenant_id: "tenant-uuid-001", status: "pending_payment" },
                error: null,
              }),
          }),
        }),
        insert: insertFn,
      }),
      rpc: failRpc,
    }));

    const body = {
      event: "payment.failed",
      created_at: 1700000001,
      payload: {
        payment: {
          entity: {
            id: "pay_fail_001",
            order_id: "order_rzp_001",
            status: "failed",
            amount: 5000,
            notes: { tenant: "iitb", order: "order-db-uuid-001" },
          },
        },
      },
    };

    const req = makeRequest(body, validHmac(body));
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // Must invoke the fail RPC, NOT the capture RPC
    expect(failRpc).toHaveBeenCalledWith(
      "safe_fail_payment",
      expect.objectContaining({
        p_order_id: "order-db-uuid-001",
        p_tenant_id: "tenant-uuid-001",
        p_razorpay_oid: "order_rzp_001",
      })
    );
    // Confirm capture RPC was NOT called
    const callsToCapture = failRpc.mock.calls.filter(([fn]) => fn === "safe_capture_payment");
    expect(callsToCapture).toHaveLength(0);
  });
});

describe("Razorpay webhook handler — missing order / DLQ path", () => {
  it("queues to webhook_dlq and returns 200 skipped when order row is not found", async () => {
    mockVerify.mockReturnValue(true);
    const dlqInsert = vi.fn().mockResolvedValue({ error: null });

    mockGetAdminClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === "webhook_dlq") {
          return { insert: dlqInsert };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      },
      rpc: vi.fn(),
    }));

    const body = BASE_PAYMENT_CAPTURED_BODY;
    const req = makeRequest(body, validHmac(body));
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(true);
    // DLQ insert must have been attempted
    expect(dlqInsert).toHaveBeenCalled();
  });
});

describe("Razorpay webhook handler — payload skipping", () => {
  beforeEach(() => {
    mockVerify.mockReturnValue(true);
  });

  it("returns 200 skipped when payment entity has no order_id", async () => {
    mockGetAdminClient.mockImplementation(() => ({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
      rpc: vi.fn(),
    }));

    const body = {
      event: "payment.captured",
      created_at: 1700000000,
      payload: {
        payment: {
          entity: {
            id: "pay_no_order",
            // no order_id
            status: "captured",
            amount: 5000,
            notes: {},
          },
        },
      },
    };
    const req = makeRequest(body, validHmac(body));
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(true);
  });

  it("returns 200 skipped when payment notes are missing tenant/order", async () => {
    mockGetAdminClient.mockImplementation(() => ({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
      rpc: vi.fn(),
    }));

    const body = {
      event: "payment.captured",
      created_at: 1700000000,
      payload: {
        payment: {
          entity: {
            id: "pay_no_notes",
            order_id: "order_rzp_001",
            status: "captured",
            amount: 5000,
            notes: {}, // missing tenant + order
          },
        },
      },
    };
    const req = makeRequest(body, validHmac(body));
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe(true);
  });
});
