// @ts-nocheck — focused Server Action mocks intentionally omit SDK internals
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireTenantContext: vi.fn(),
  requireRole: vi.fn(),
  tenantRateLimit: vi.fn(),
  sendEmail: vi.fn(),
  getAdminClient: vi.fn(),
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/tenant", () => ({
  requireTenantContext: mocks.requireTenantContext,
}));
vi.mock("@/lib/auth/get-user", () => ({
  requireRole: mocks.requireRole,
}));
vi.mock("@/lib/rate-limit/tenant", () => ({
  tenantRateLimit: mocks.tenantRateLimit,
}));
vi.mock("@/lib/email/resend", () => ({
  sendEmail: mocks.sendEmail,
}));
vi.mock("@/lib/env", () => ({
  env: { APP_URL: "https://trayy.vercel.app" },
}));
vi.mock("@/lib/logging", () => ({ logger: mocks.logger }));
vi.mock("@/lib/supabase/admin", () => ({
  getAdminClient: mocks.getAdminClient,
}));
vi.mock("@/app/(student)/_actions", () => ({
  initiateRefundForOrder: vi.fn(),
}));

import { inviteStaff } from "@/app/(admin)/admin/_actions";

const TENANT = {
  id: "tenant-a",
  slug: "audit-counter",
  name: "Audit Counter",
};
const ADMIN = {
  id: "admin-a",
  role: "canteen_admin",
  tenantId: TENANT.id,
};

function adminClient(rollbackError: unknown = null) {
  const inviteInsert = vi.fn().mockResolvedValue({ error: null });
  const rollbackTenantEq = vi.fn().mockResolvedValue({ error: rollbackError });
  const rollbackTokenEq = vi.fn(() => ({ eq: rollbackTenantEq }));
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: vi.fn((table: string) => {
      if (table === "staff_invites") {
        return {
          insert: inviteInsert,
          delete: vi.fn(() => ({ eq: rollbackTokenEq })),
        };
      }
      if (table === "audit_logs") return { insert: auditInsert };
      return {};
    }),
  };
  return { client, inviteInsert, rollbackTokenEq, rollbackTenantEq, auditInsert };
}

describe("inviteStaff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTenantContext.mockResolvedValue({ tenant: TENANT, slug: TENANT.slug });
    mocks.requireRole.mockResolvedValue(ADMIN);
    mocks.tenantRateLimit.mockResolvedValue({ success: true });
    mocks.sendEmail.mockResolvedValue({ id: "mail-a", queued: true });
  });

  it("normalizes email and revalidates the tenant-qualified staff page", async () => {
    const db = adminClient();
    mocks.getAdminClient.mockReturnValue(db.client);

    const result = await inviteStaff(" Staff@Example.COM ", "kitchen_staff");

    expect(result.ok).toBe(true);
    expect(db.inviteInsert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: TENANT.id, email: "staff@example.com" })
    );
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "staff@example.com" })
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/c/audit-counter/admin/staff"
    );
  });

  it("does not throw or leave a pending row when email delivery fails", async () => {
    const db = adminClient();
    mocks.getAdminClient.mockReturnValue(db.client);
    mocks.sendEmail.mockRejectedValue(new Error("Resend unavailable"));

    const result = await inviteStaff("staff@example.com", "kitchen_staff");

    expect(result).toEqual({
      ok: false,
      error: "Email delivery failed. No invite was created — please try again.",
      deliveryFailed: true,
    });
    expect(db.rollbackTokenEq).toHaveBeenCalledWith("token", expect.any(String));
    expect(db.rollbackTenantEq).toHaveBeenCalledWith("tenant_id", TENANT.id);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("returns the usable link if delivery and compensating delete both fail", async () => {
    const db = adminClient({ message: "database unavailable" });
    mocks.getAdminClient.mockReturnValue(db.client);
    mocks.sendEmail.mockRejectedValue(new Error("Resend unavailable"));

    const result = await inviteStaff("staff@example.com", "canteen_admin");

    expect(result.ok).toBe(false);
    expect(result.deliveryFailed).toBe(true);
    expect(result.url).toMatch(
      /^https:\/\/trayy\.vercel\.app\/auth\/invite\/[a-f0-9]{48}$/
    );
  });
});
