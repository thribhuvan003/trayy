import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
  requireRole: vi.fn(),
  getAdminClient: vi.fn(),
  tenantRateLimit: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  requireTenantContext: mocks.requireTenantContext,
}));

vi.mock("@/lib/auth/get-user", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

vi.mock("@/lib/rate-limit/tenant", () => ({
  tenantRateLimit: mocks.tenantRateLimit,
}));

vi.mock("@/lib/env", () => ({
  env: {
    APP_URL: "http://localhost:3000",
  },
  featureFlags: {
    razorpayLive: false,
  },
}));

vi.mock("@/lib/logging", () => {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    withContext: vi.fn(),
  };
  logger.withContext.mockReturnValue(logger);
  return { logger };
});

vi.mock("@/lib/email/resend", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/app/(student)/_actions", () => ({
  initiateRefundForOrder: vi.fn(),
}));

import {
  pauseCanteen,
  updateCanteenHours,
  updateCanteenSettings,
} from "@/app/(admin)/admin/_actions";

const VALID_SETTINGS = {
  guestOrdersEnabled: true,
  upiVpa: "canteen@okaxis",
} as const;

describe("admin settings validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTenantContext.mockResolvedValue({
      tenant: {
        id: "tenant-001",
        slug: "test-canteen",
        name: "Test Canteen",
      },
    });
    mocks.requireRole.mockResolvedValue({
      id: "admin-001",
      role: "canteen_admin",
    });
    mocks.tenantRateLimit.mockResolvedValue({ success: true });
  });

  it.each([
    {
      label: "opening time",
      input: { isOpen: true, opensAt: "24:00", closesAt: "18:00" },
      error: "Opening time must use a valid 24-hour HH:MM value",
    },
    {
      label: "closing time",
      input: { isOpen: true, opensAt: "09:00", closesAt: "18:60" },
      error: "Closing time must use a valid 24-hour HH:MM value",
    },
  ])("rejects an invalid $label before any write", async ({ input, error }) => {
    await expect(updateCanteenHours(input)).resolves.toEqual({ ok: false, error });
    expect(mocks.tenantRateLimit).not.toHaveBeenCalled();
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("rejects unsupported pause durations before any write", async () => {
    await expect(pauseCanteen(45)).resolves.toEqual({
      ok: false,
      error: "Choose a supported pause duration",
    });
    expect(mocks.tenantRateLimit).not.toHaveBeenCalled();
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("rejects malformed UPI VPAs before any write", async () => {
    await expect(
      updateCanteenSettings({
        ...VALID_SETTINGS,
        upiVpa: "not-a-vpa",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Enter a valid UPI ID, such as canteen@okaxis",
    });
    expect(mocks.tenantRateLimit).not.toHaveBeenCalled();
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("rejects malformed admin phone numbers before any write", async () => {
    await expect(
      updateCanteenSettings({
        ...VALID_SETTINGS,
        adminPhone: "+12",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Enter a valid phone number with country code, for example +919876543210",
    });
    expect(mocks.tenantRateLimit).not.toHaveBeenCalled();
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("rejects Direct UPI with prepaid token mode", async () => {
    await expect(
      updateCanteenSettings({
        ...VALID_SETTINGS,
        paymentMode: "direct_upi",
        orderMode: "token_prepaid",
      })
    ).resolves.toEqual({
      ok: false,
      error:
        "Token counter requires Razorpay Automatic so every PAID token is verified. Use Kitchen board with Direct UPI.",
    });
    expect(mocks.tenantRateLimit).not.toHaveBeenCalled();
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("rejects Razorpay mode when live gateway keys are unavailable", async () => {
    await expect(
      updateCanteenSettings({
        ...VALID_SETTINGS,
        paymentMode: "razorpay",
      })
    ).resolves.toEqual({
      ok: false,
      error: "Razorpay Automatic is unavailable until live gateway keys are configured",
    });
    expect(mocks.tenantRateLimit).not.toHaveBeenCalled();
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });
});
