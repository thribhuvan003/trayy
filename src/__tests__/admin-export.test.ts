// @ts-nocheck — focused route-handler mocks intentionally omit SDK internals
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveTenant: vi.fn(),
  requireRoleForTenant: vi.fn(),
  getServerClient: vi.fn(),
  getTenantSlugFromHeaders: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Map([["x-tenant-slug", "default-tenant"]])),
}));
vi.mock("@/lib/tenant", () => ({
  resolveTenant: mocks.resolveTenant,
  getTenantSlugFromHeaders: mocks.getTenantSlugFromHeaders,
}));
vi.mock("@/lib/auth/get-user", () => ({
  requireRoleForTenant: mocks.requireRoleForTenant,
}));
vi.mock("@/lib/supabase/server", () => ({
  getServerClient: mocks.getServerClient,
}));
vi.mock("@/lib/logging", () => ({
  logger: { error: vi.fn() },
}));

import { GET } from "@/app/api/admin/export/orders/route";
import { getExportTenantSlug } from "@/lib/admin-export";

const TENANT = { id: "tenant-a", slug: "audit-counter", name: "Audit Counter" };
const ADMIN = { id: "admin-a", role: "canteen_admin", tenantId: TENANT.id };

function ordersClient(rows: unknown[] = []) {
  const query = {
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    gte: vi.fn(() => query),
    lte: vi.fn(() => query),
    returns: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
  return { client: { from: vi.fn(() => ({ select: vi.fn(() => query) })) }, query };
}

describe("admin order CSV export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTenantSlugFromHeaders.mockReturnValue("default-tenant");
    mocks.resolveTenant.mockResolvedValue(TENANT);
    mocks.requireRoleForTenant.mockResolvedValue(ADMIN);
    mocks.getServerClient.mockReturnValue(ordersClient().client);
  });

  it("prefers the explicit API slug over a default middleware header", () => {
    const url = new URL("https://trayy.vercel.app/api/admin/export/orders?slug=Audit-Counter");
    expect(getExportTenantSlug(url, new Map())).toBe("audit-counter");
  });

  it("authorizes and queries against the same explicit tenant", async () => {
    const { client, query } = ordersClient([
      {
        id: "order-1",
        short_code: "T-2401",
        placed_at: "2026-07-25T00:00:00.000Z",
        collected_at: null,
        status: "ready",
        total_paise: 12500,
        customer_name: "=HYPERLINK(\"https://attacker.invalid\")",
        order_type: "takeaway",
        table_label: null,
      },
    ]);
    mocks.getServerClient.mockReturnValue(client);

    const response = await GET(
      new NextRequest(
        "https://trayy.vercel.app/api/admin/export/orders?slug=audit-counter&from=2026-07-25"
      )
    );

    expect(response.status).toBe(200);
    expect(mocks.resolveTenant).toHaveBeenCalledWith("audit-counter");
    expect(mocks.requireRoleForTenant).toHaveBeenCalledWith(TENANT, [
      "canteen_admin",
      "super_admin",
    ]);
    expect(mocks.getServerClient).toHaveBeenCalledWith(TENANT.id);
    expect(query.eq).toHaveBeenCalledWith("tenant_id", TENANT.id);
    const csv = await response.text();
    expect(csv).toContain("T-2401");
    expect(csv).toContain(`"'=HYPERLINK(""https://attacker.invalid"")"`);
  });

  it("returns forbidden instead of exporting another tenant without membership", async () => {
    mocks.requireRoleForTenant.mockResolvedValue(null);
    const response = await GET(
      new NextRequest("https://trayy.vercel.app/api/admin/export/orders?slug=audit-counter")
    );
    expect(response.status).toBe(403);
    expect(mocks.getServerClient).not.toHaveBeenCalled();
  });
});
