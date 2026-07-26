// @ts-nocheck — the query double models only the Supabase methods used here
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminClient: vi.fn(),
  getCurrentUser: vi.fn(),
  requireTenantContext: vi.fn(),
  rateLimit: vi.fn(),
  tenantRateLimit: vi.fn(),
  fetchRazorpayOrderStatus: vi.fn(),
  fetchRazorpayOrderPayments: vi.fn(),
  initiateRazorpayRefund: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminClient: mocks.getAdminClient }));
vi.mock("@/lib/supabase/server", () => ({ getServerClient: vi.fn() }));
vi.mock("@/lib/auth/get-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/tenant", () => ({
  requireTenantContext: mocks.requireTenantContext,
  requireTenantContextForJob: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("@/lib/rate-limit/tenant", () => ({ tenantRateLimit: mocks.tenantRateLimit }));
vi.mock("@/lib/payments/razorpay", () => ({
  createRazorpayOrder: vi.fn(),
  initiateRazorpayRefund: mocks.initiateRazorpayRefund,
  fetchRazorpayOrderStatus: mocks.fetchRazorpayOrderStatus,
  fetchRazorpayOrderPayments: mocks.fetchRazorpayOrderPayments,
}));
vi.mock("@/lib/payments/upi-verify", () => ({ pickVerifyPaise: vi.fn(() => 1) }));
vi.mock("@/lib/notifications/sms", () => ({ notifyAdminNewOrder: vi.fn() }));
vi.mock("@/lib/logging", () => {
  const log = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withContext: vi.fn(),
  };
  log.withContext.mockReturnValue(log);
  return { logger: log, withRequestContext: () => log };
});

import {
  cancelOrderByStudent,
  initiateRefundForOrder,
  verifyPaymentNow,
} from "@/app/(student)/_actions";

const TENANT = { id: "tenant-a", slug: "audit-counter", name: "Audit Counter" };
const USER = {
  id: "user-a",
  email: "user@example.com",
  displayName: "User",
  tenantId: TENANT.id,
  tenantSlug: TENANT.slug,
  role: "student",
};

type Result = { data?: unknown; error?: unknown };
type Operation = {
  table: string;
  kind: string;
  payload?: unknown;
  filters: Array<[string, unknown]>;
};

function makeAdminClient(responses: Record<string, Result[]>) {
  const operations: Operation[] = [];

  const take = (op: Operation): Result => {
    const key = `${op.kind}:${op.table}`;
    return responses[key]?.shift() ?? { data: null, error: null };
  };

  const query = (op: Operation) => {
    const api: any = {
      eq(column: string, value: unknown) {
        op.filters.push([column, value]);
        return api;
      },
      in() {
        return api;
      },
      gt() {
        return api;
      },
      order() {
        return api;
      },
      limit() {
        return api;
      },
      select() {
        return api;
      },
      maybeSingle() {
        return Promise.resolve(take(op));
      },
      single() {
        return Promise.resolve(take(op));
      },
      then(resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) {
        return Promise.resolve(take(op)).then(resolve, reject);
      },
    };
    return api;
  };

  const client = {
    rpc(fn: string, payload: unknown) {
      const op = { table: fn, kind: "rpc", payload, filters: [] };
      operations.push(op);
      return Promise.resolve(take(op));
    },
    from(table: string) {
      return {
        select() {
          const op = { table, kind: "select", filters: [] };
          operations.push(op);
          return query(op);
        },
        insert(payload: unknown) {
          const op = { table, kind: "insert", payload, filters: [] };
          operations.push(op);
          return query(op);
        },
        update(payload: unknown) {
          const op = { table, kind: "update", payload, filters: [] };
          operations.push(op);
          return query(op);
        },
        delete() {
          const op = { table, kind: "delete", filters: [] };
          operations.push(op);
          return query(op);
        },
        upsert(payload: unknown) {
          const op = { table, kind: "upsert", payload, filters: [] };
          operations.push(op);
          return query(op);
        },
      };
    },
  };

  return { client, operations };
}

describe("payment and cancellation integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTenantContext.mockResolvedValue({ tenant: TENANT, slug: TENANT.slug });
    mocks.getCurrentUser.mockResolvedValue(USER);
    mocks.rateLimit.mockResolvedValue({ success: true });
    mocks.tenantRateLimit.mockResolvedValue({ success: true });
    mocks.fetchRazorpayOrderStatus.mockResolvedValue("unknown");
    mocks.fetchRazorpayOrderPayments.mockResolvedValue(null);
  });

  it("does not refund when the cancellation compare-and-set loses the race", async () => {
    const db = makeAdminClient({
      "select:orders": [{
        data: {
          id: "order-a",
          user_id: USER.id,
          status: "placed",
          placed_at: new Date().toISOString(),
          total_paise: 10000,
        },
        error: null,
      }],
      "update:orders": [{ data: null, error: null }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    const result = await cancelOrderByStudent("order-a");

    expect(result.ok).toBe(false);
    expect(db.operations.filter((op) => op.table === "payments")).toHaveLength(0);
    expect(db.operations.filter((op) => op.table === "order_status_logs")).toHaveLength(0);
  });

  it("captures direct UPI through one atomic RPC, without direct ledger or order writes", async () => {
    const db = makeAdminClient({
      "select:orders": [{
        data: {
          id: "order-a",
          user_id: USER.id,
          status: "pending_payment",
          payment_expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
        error: null,
      }],
      "select:tenants": [{ data: { payment_mode: "direct_upi" }, error: null }],
      "select:idempotency_keys": [{ data: null, error: null }],
      "insert:idempotency_keys": [{ data: {}, error: null }],
      "rpc:safe_claim_direct_upi": [{ data: "claimed", error: null }],
      "update:idempotency_keys": [{ data: {}, error: null }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(verifyPaymentNow("order-a")).resolves.toEqual({ status: "paid" });

    const claim = db.operations.find(
      (op) => op.table === "safe_claim_direct_upi" && op.kind === "rpc"
    );
    expect(claim?.payload).toMatchObject({
      p_order_id: "order-a",
      p_tenant_id: TENANT.id,
      p_user_id: USER.id,
      p_payment_id: "pay_upi_ordera",
      p_raw_event_id: "upi_trust_order-a",
    });
    expect(
      db.operations.some(
        (op) =>
          ["payments", "orders", "order_events", "order_status_logs"].includes(op.table) &&
          ["insert", "upsert", "update"].includes(op.kind)
      )
    ).toBe(false);
  });

  it("keeps a direct-UPI order pending and releases idempotency after an atomic claim failure", async () => {
    const db = makeAdminClient({
      "select:orders": [{
        data: {
          id: "order-a",
          user_id: USER.id,
          status: "pending_payment",
          payment_expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
        error: null,
      }],
      "select:tenants": [{ data: { payment_mode: "direct_upi" }, error: null }],
      "select:idempotency_keys": [{ data: null, error: null }],
      "insert:idempotency_keys": [{ data: {}, error: null }],
      "rpc:safe_claim_direct_upi": [{
        data: null,
        error: { message: "transaction rolled back" },
      }],
      "delete:idempotency_keys": [{ data: {}, error: null }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(verifyPaymentNow("order-a")).resolves.toEqual({ status: "pending" });
    expect(
      db.operations.some(
        (op) => op.table === "idempotency_keys" && op.kind === "delete"
      )
    ).toBe(true);
    expect(
      db.operations.some(
        (op) =>
          ["payments", "orders", "order_events", "order_status_logs"].includes(op.table) &&
          ["insert", "upsert", "update"].includes(op.kind)
      )
    ).toBe(false);
  });

  it("never fabricates a captured Razorpay payment when the capture lookup is empty", async () => {
    mocks.fetchRazorpayOrderStatus.mockResolvedValue("paid");
    mocks.fetchRazorpayOrderPayments.mockResolvedValue(null);
    const db = makeAdminClient({
      "select:orders": [{
        data: {
          id: "order-a",
          user_id: USER.id,
          status: "pending_payment",
          payment_expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
        error: null,
      }],
      "select:tenants": [{ data: { payment_mode: "razorpay" }, error: null }],
      "select:idempotency_keys": [{ data: null, error: null }],
      "insert:idempotency_keys": [{ data: {}, error: null }],
      "select:payments": [{
        data: {
          razorpay_order_id: "order_real",
          razorpay_payment_id: null,
          amount_paise: 10000,
          status: "initiated",
        },
        error: null,
      }],
      "delete:idempotency_keys": [{ data: {}, error: null }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(verifyPaymentNow("order-a")).resolves.toEqual({ status: "pending" });
    expect(db.operations.some((op) => op.table === "safe_capture_payment")).toBe(false);
    expect(
      db.operations.some(
        (op) => op.table === "idempotency_keys" && op.kind === "delete"
      )
    ).toBe(true);
  });

  it("does not report paid when the atomic Razorpay capture RPC errors", async () => {
    mocks.fetchRazorpayOrderStatus.mockResolvedValue("paid");
    mocks.fetchRazorpayOrderPayments.mockResolvedValue({
      paymentId: "pay_real",
      amountPaise: 10000,
    });
    const db = makeAdminClient({
      "select:orders": [{
        data: {
          id: "order-a",
          user_id: USER.id,
          status: "pending_payment",
          payment_expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
        error: null,
      }],
      "select:tenants": [{ data: { payment_mode: "razorpay" }, error: null }],
      "select:idempotency_keys": [{ data: null, error: null }],
      "insert:idempotency_keys": [{ data: {}, error: null }],
      "select:payments": [{
        data: {
          razorpay_order_id: "order_real",
          razorpay_payment_id: null,
          amount_paise: 10000,
          status: "initiated",
        },
        error: null,
      }],
      "rpc:safe_capture_payment": [{
        data: null,
        error: { message: "database unavailable" },
      }],
      "delete:idempotency_keys": [{ data: {}, error: null }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(verifyPaymentNow("order-a")).resolves.toEqual({ status: "pending" });
    expect(
      db.operations.some(
        (op) => op.table === "idempotency_keys" && op.kind === "update"
      )
    ).toBe(false);
  });

  it("does not report paid for a non-success capture RPC result", async () => {
    mocks.fetchRazorpayOrderStatus.mockResolvedValue("paid");
    mocks.fetchRazorpayOrderPayments.mockResolvedValue({
      paymentId: "pay_real",
      amountPaise: 10000,
    });
    const db = makeAdminClient({
      "select:orders": [{
        data: {
          id: "order-a",
          user_id: USER.id,
          status: "pending_payment",
          payment_expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
        error: null,
      }],
      "select:tenants": [{ data: { payment_mode: "razorpay" }, error: null }],
      "select:idempotency_keys": [{ data: null, error: null }],
      "insert:idempotency_keys": [{ data: {}, error: null }],
      "select:payments": [{
        data: {
          razorpay_order_id: "order_real",
          razorpay_payment_id: null,
          amount_paise: 10000,
          status: "initiated",
        },
        error: null,
      }],
      "rpc:safe_capture_payment": [{ data: "not_found", error: null }],
      "delete:idempotency_keys": [{ data: {}, error: null }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(verifyPaymentNow("order-a")).resolves.toEqual({ status: "pending" });
  });

  it("accepts already_captured only when the database contains durable capture proof", async () => {
    mocks.fetchRazorpayOrderStatus.mockResolvedValue("paid");
    mocks.fetchRazorpayOrderPayments.mockResolvedValue({
      paymentId: "pay_real",
      amountPaise: 10000,
    });
    const db = makeAdminClient({
      "select:orders": [{
        data: {
          id: "order-a",
          user_id: USER.id,
          status: "pending_payment",
          payment_expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
        error: null,
      }],
      "select:tenants": [{ data: { payment_mode: "razorpay" }, error: null }],
      "select:idempotency_keys": [{ data: null, error: null }],
      "insert:idempotency_keys": [{ data: {}, error: null }],
      "select:payments": [
        {
          data: {
            razorpay_order_id: "order_real",
            razorpay_payment_id: null,
            amount_paise: 10000,
            status: "initiated",
          },
          error: null,
        },
        {
          data: { status: "captured", razorpay_payment_id: "pay_real" },
          error: null,
        },
      ],
      "rpc:safe_capture_payment": [{ data: "already_captured", error: null }],
      "update:idempotency_keys": [{ data: {}, error: null }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(verifyPaymentNow("order-a")).resolves.toEqual({ status: "paid" });
  });

  it("records the direct-UPI refund obligation through one atomic RPC", async () => {
    const db = makeAdminClient({
      "select:payments": [{
        data: {
          id: "payment-a",
          razorpay_payment_id: "pay_upi_order-a",
          amount_paise: 10000,
          status: "initiated",
        },
        error: null,
      }],
      "rpc:safe_mark_direct_upi_refund_owed": [{ data: "recorded", error: null }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(initiateRefundForOrder("order-a", TENANT.id)).resolves.toEqual({
      ok: false,
      state: "manual_required",
      error: "Payment was made directly by UPI; the canteen must return it manually.",
    });

    const lookup = db.operations.find(
      (op) => op.table === "payments" && op.kind === "select"
    );
    expect(lookup?.filters).not.toContainEqual(["status", "captured"]);
    expect(
      db.operations.find(
        (op) => op.table === "safe_mark_direct_upi_refund_owed" && op.kind === "rpc"
      )?.payload
    ).toEqual({
      p_payment_id: "payment-a",
      p_order_id: "order-a",
      p_tenant_id: TENANT.id,
    });
    expect(
      db.operations.some(
        (op) =>
          ["payments", "order_events"].includes(op.table) &&
          ["insert", "update"].includes(op.kind)
      )
    ).toBe(false);
  });

  it("reports failure when the direct-UPI refund obligation cannot be recorded atomically", async () => {
    const db = makeAdminClient({
      "select:payments": [{
        data: {
          id: "payment-a",
          razorpay_payment_id: "pay_upi_order-a",
          amount_paise: 10000,
          status: "captured",
        },
        error: null,
      }],
      "rpc:safe_mark_direct_upi_refund_owed": [{
        data: null,
        error: { message: "database unavailable" },
      }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(initiateRefundForOrder("order-a", TENANT.id)).resolves.toEqual({
      ok: false,
      state: "pending_reconciliation",
      error: "Failed to record manual refund obligation",
    });
  });

  it("does not claim a gateway refund was recorded when the payment update fails", async () => {
    mocks.initiateRazorpayRefund.mockResolvedValue({
      refundId: "rfnd_real",
      simulated: false,
    });
    const db = makeAdminClient({
      "select:payments": [{
        data: {
          id: "payment-a",
          razorpay_payment_id: "pay_real",
          amount_paise: 10000,
          status: "captured",
        },
        error: null,
      }],
      "update:payments": [{
        data: null,
        error: { message: "write failed" },
      }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(initiateRefundForOrder("order-a", TENANT.id)).resolves.toEqual({
      ok: false,
      state: "pending_reconciliation",
      error: "Refund was initiated, but its payment record needs reconciliation.",
      refundId: "rfnd_real",
    });
    expect(db.operations.some((op) => op.table === "orders" && op.kind === "update")).toBe(false);
  });

  it("does not claim a gateway refund was recorded when the order update fails", async () => {
    mocks.initiateRazorpayRefund.mockResolvedValue({
      refundId: "rfnd_real",
      simulated: false,
    });
    const db = makeAdminClient({
      "select:payments": [{
        data: {
          id: "payment-a",
          razorpay_payment_id: "pay_real",
          amount_paise: 10000,
          status: "captured",
        },
        error: null,
      }],
      "update:payments": [{ data: { id: "payment-a" }, error: null }],
      "update:orders": [{ data: null, error: { message: "order write failed" } }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(initiateRefundForOrder("order-a", TENANT.id)).resolves.toEqual({
      ok: false,
      state: "pending_reconciliation",
      error: "Refund was initiated, but the order status needs reconciliation.",
      refundId: "rfnd_real",
    });
    expect(db.operations.some((op) => op.table === "order_events")).toBe(false);
  });

  it("does not claim a gateway refund was recorded when its audit event fails", async () => {
    mocks.initiateRazorpayRefund.mockResolvedValue({
      refundId: "rfnd_real",
      simulated: false,
    });
    const db = makeAdminClient({
      "select:payments": [{
        data: {
          id: "payment-a",
          razorpay_payment_id: "pay_real",
          amount_paise: 10000,
          status: "captured",
        },
        error: null,
      }],
      "update:payments": [{ data: { id: "payment-a" }, error: null }],
      "update:orders": [{ data: { id: "order-a" }, error: null }],
      "insert:order_events": [{ data: null, error: { message: "event write failed" } }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(initiateRefundForOrder("order-a", TENANT.id)).resolves.toEqual({
      ok: false,
      state: "pending_reconciliation",
      error: "Refund was initiated, but its audit event needs reconciliation.",
      refundId: "rfnd_real",
    });
  });

  it("propagates a refund warning after cancellation when durable tracking fails", async () => {
    const db = makeAdminClient({
      "select:orders": [{
        data: {
          id: "order-a",
          user_id: USER.id,
          status: "placed",
          placed_at: new Date().toISOString(),
          total_paise: 10000,
        },
        error: null,
      }],
      "update:orders": [{ data: { id: "order-a" }, error: null }],
      "select:payments": [{
        data: {
          id: "payment-a",
          razorpay_payment_id: "pay_upi_order-a",
          amount_paise: 10000,
          status: "captured",
        },
        error: null,
      }],
      "rpc:safe_mark_direct_upi_refund_owed": [{
        data: null,
        error: { message: "database unavailable" },
      }],
    });
    mocks.getAdminClient.mockReturnValue(db.client);

    await expect(cancelOrderByStudent("order-a")).resolves.toEqual({
      ok: true,
      refundStatus: "pending_reconciliation",
      warning: "Failed to record manual refund obligation",
    });
  });
});
