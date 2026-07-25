/**
 * Recover the tenant-qualified dashboard from an admin pathname.
 *
 * Admin routes always live below /c/:slug/admin. Falling back to the old
 * /admin/dashboard path drops tenant context and is rewritten to a 404.
 */
export function adminDashboardHref(pathname: string | null | undefined): string {
  const match = pathname?.match(/^\/c\/([a-z0-9-]+)\/admin(?:\/|$)/i);
  return match ? `/c/${match[1]}/admin/dashboard` : "/";
}
