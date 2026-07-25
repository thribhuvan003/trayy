// @ts-nocheck — focused Supabase mocks intentionally omit SDK internals
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map([["x-tenant-slug", "audit-counter"]])),
  cookies: vi.fn().mockResolvedValue({ set: vi.fn() }),
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
  },
  featureFlags: { razorpayLive: false, upstashLive: false },
}));
vi.mock("@/lib/logging", () => {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withContext: vi.fn(),
  };
  return { logger, withRequestContext: () => logger };
});
vi.mock("@/lib/rate-limit/tenant", () => ({
  tenantRateLimit: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/tenant", () => ({
  requireTenantContext: vi.fn().mockResolvedValue({
    tenant: { id: "tenant-1", slug: "audit-counter", name: "Audit Counter" },
  }),
  requireTenantContextForJob: vi.fn(),
  resolveTenant: vi.fn(),
}));
vi.mock("@/lib/auth/get-user", () => ({
  requireRole: vi.fn().mockResolvedValue({
    id: "staff-1",
    role: "kitchen_staff",
    tenantId: "tenant-1",
  }),
}));
vi.mock("@/app/(student)/_actions", () => ({
  initiateRefundForOrder: vi.fn(),
}));
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));
vi.mock("@/lib/utils", () => ({
  randomOtp: vi.fn(),
  cn: vi.fn(),
}));

const state = vi.hoisted(() => ({
  paymentError: null as { message: string } | null,
  deletedOrderIds: [] as string[],
  rpcCalls: [] as string[],
}));

function eqChain(onFinal?: () => void) {
  const chain: any = {};
  chain.eq = (_column: string, value: unknown) => {
    if (typeof value === "string" && value.startsWith("order-")) onFinal?.();
    return chain;
  };
  chain.then = (resolve: (value: unknown) => void) =>
    Promise.resolve({ data: null, error: null }).then(resolve);
  return chain;
}

function buildAdmin() {
  return {
    rpc: vi.fn(async (name: string) => {
      state.rpcCalls.push(name);
      if (name === "next_order_short_code") {
        return { data: "T-2401", error: null };
      }
      return { data: "ok", error: null };
    }),
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({
            returns: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "item-1",
                  name: "Dosa",
                  price_paise: 8000,
                  diet: "veg",
                  status: "live",
                  in_stock: true,
                  stock_qty: 2,
                },
              ],
              error: null,
            }),
          })),
        })),
      })),
      insert: vi.fn((payload: any) => {
        if (table === "orders") {
          return {
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: "order-1", short_code: payload.short_code },
                error: null,
              }),
            })),
          };
        }
        if (table === "payments") {
          return Promise.resolve({ data: null, error: state.paymentError });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      delete: vi.fn(() =>
        eqChain(() => {
          if (table === "orders") state.deletedOrderIds.push("order-1");
        })
      ),
    })),
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: vi.fn(() => buildAdmin()),
}));

import { createWalkInOrder } from "@/app/(kitchen)/_actions";

const request = {
  items: [{ itemId: "item-1", qty: 1 }],
  customerName: "Walk-in",
  orderType: "takeaway" as const,
  paymentMethod: "cash" as const,
};

describe("createWalkInOrder", () => {
  beforeEach(() => {
    state.paymentError = null;
    state.deletedOrderIds.length = 0;
    state.rpcCalls.length = 0;
  });

  it("uses collision-safe allocation and atomic finite-stock reservation", async () => {
    await expect(createWalkInOrder(request)).resolves.toEqual({
      ok: true,
      orderId: "order-1",
      shortCode: "T-2401",
    });
    expect(state.rpcCalls).toEqual([
      "next_order_short_code",
      "atomic_decrement_stock",
    ]);
    expect(state.deletedOrderIds).toEqual([]);
  });

  it("removes the provisional order before stock changes when payment logging fails", async () => {
    state.paymentError = { message: "payment insert unavailable" };

    const result = await createWalkInOrder(request);

    expect(result.ok).toBe(false);
    expect(state.deletedOrderIds).toEqual(["order-1"]);
    expect(state.rpcCalls).toEqual(["next_order_short_code"]);
  });
});
