import { getTenantSlugFromHeaders } from "@/lib/tenant";

export function getExportTenantSlug(
  url: Pick<URL, "searchParams">,
  h: { get: (name: string) => string | null }
) {
  // API routes do not carry a tenant in their pathname. An explicit slug is
  // therefore authoritative; a production DEFAULT_TENANT_SLUG header must not
  // shadow it. Authorization is still checked against the resolved tenant.
  return (
    url.searchParams.get("slug")?.trim().toLowerCase() ||
    getTenantSlugFromHeaders(h)
  );
}
