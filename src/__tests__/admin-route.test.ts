import { describe, expect, it } from "vitest";
import { adminDashboardHref } from "@/lib/auth/admin-route";

describe("adminDashboardHref", () => {
  it("keeps the current tenant when recovering from an admin error", () => {
    expect(adminDashboardHref("/c/audit-counter/admin/staff")).toBe(
      "/c/audit-counter/admin/dashboard"
    );
  });

  it("does not send an unscoped route to the broken /admin/dashboard path", () => {
    expect(adminDashboardHref("/admin/staff")).toBe("/");
    expect(adminDashboardHref(null)).toBe("/");
  });
});
