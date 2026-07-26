const LEGACY_DEMO_ROUTES: Readonly<Record<string, string>> = {
  "/c/aditya/menu": "/demo/student",
  "/c/aditya/kitchen": "/demo/kitchen",
  "/c/aditya/admin/dashboard": "/demo/admin",
};

/**
 * Maps the public demo URLs used by older documentation and shared links to
 * the isolated, browser-only demos. Exact matching is intentional: no real
 * tenant or protected route is allowed to bypass authentication.
 */
export function getLegacyDemoRedirect(pathname: string): string | null {
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "").toLowerCase() : pathname;

  return LEGACY_DEMO_ROUTES[normalized] ?? null;
}
