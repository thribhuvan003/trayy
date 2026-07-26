import { describe, expect, it } from "vitest";
import { getLegacyDemoRedirect } from "@/lib/demo-routes";

describe("getLegacyDemoRedirect", () => {
  it.each([
    ["/c/aditya/menu", "/demo/student"],
    ["/c/aditya/menu/", "/demo/student"],
    ["/C/ADITYA/KITCHEN", "/demo/kitchen"],
    ["/c/aditya/admin/dashboard", "/demo/admin"],
  ])("maps the legacy demo URL %s", (pathname, target) => {
    expect(getLegacyDemoRedirect(pathname)).toBe(target);
  });

  it.each([
    "/c/real-outlet/menu",
    "/c/aditya/admin",
    "/c/aditya/admin/orders",
    "/c/aditya/kitchen/history",
    "/college/aditya",
  ])("does not bypass a real or non-demo route: %s", (pathname) => {
    expect(getLegacyDemoRedirect(pathname)).toBeNull();
  });
});
