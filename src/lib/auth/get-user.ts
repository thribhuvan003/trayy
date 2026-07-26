import "server-only";
import { cache } from "react";
import { getServerClient } from "@/lib/supabase/server";
import { resolveTenant, getTenantSlugFromHeaders, type ResolvedTenant } from "@/lib/tenant";
import { headers } from "next/headers";
import type { MemberRole } from "@/lib/db/types";
import { getVerifiedAuthUser } from "@/lib/auth/verified-user";

export type CurrentUser = {
  id: string;
  email: string | null;
  tenantId: string;
  tenantSlug: string;
  role: MemberRole | null;
  displayName: string | null;
};

export async function getCurrentUserForTenant(
  tenant: Pick<ResolvedTenant, "id" | "slug">
): Promise<CurrentUser | null> {
  const supabase = await getServerClient(tenant.id);
  const user = await getVerifiedAuthUser(supabase);
  if (!user) return null;

  const { data: m } = await supabase
    .from("tenant_memberships")
    .select("role, display_name")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .maybeSingle<{ role: MemberRole; display_name: string | null }>();

  return {
    id: user.id,
    email: user.email,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role: m?.role ?? null,
    displayName: m?.display_name ?? null,
  };
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const h = await headers();
  // Use the shared resolver (x-tenant-slug → referer pathname → host), never the
  // raw header. Next.js Server Actions don't always preserve the middleware-set
  // x-tenant-slug header; reading it raw returned "" → null tenant → null user,
  // which bounced signed-in admins to /login mid-session and made role detection
  // inconsistent. getTenantSlugFromHeaders recovers the slug from the referer.
  const slug = getTenantSlugFromHeaders(h);
  const tenant = slug ? await resolveTenant(slug) : null;
  if (!tenant) return null;

  return getCurrentUserForTenant(tenant);
});

export async function requireRole(roles: MemberRole[]) {
  const u = await getCurrentUser();
  if (!u || !u.role || !roles.includes(u.role)) {
    return null;
  }
  return u;
}

/**
 * Authorize against an already-resolved tenant instead of re-deriving tenant
 * context from middleware headers. Route handlers with an explicit tenant
 * parameter must use this to prevent default-host headers from shadowing the
 * requested tenant and to keep membership checks tenant-bound.
 */
export async function requireRoleForTenant(
  tenant: Pick<ResolvedTenant, "id" | "slug">,
  roles: MemberRole[]
) {
  const u = await getCurrentUserForTenant(tenant);
  if (!u || !u.role || !roles.includes(u.role)) {
    return null;
  }
  return u;
}
