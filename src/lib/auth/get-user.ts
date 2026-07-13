import "server-only";
import { cache } from "react";
import { getServerClient } from "@/lib/supabase/server";
import { resolveTenant, getTenantSlugFromHeaders } from "@/lib/tenant";
import { headers } from "next/headers";
import { logger } from "@/lib/logging";
import type { MemberRole } from "@/lib/db/types";

export type CurrentUser = {
  id: string;
  email: string | null;
  tenantId: string;
  tenantSlug: string;
  role: MemberRole | null;
  displayName: string | null;
};

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

  const supabase = await getServerClient(tenant.id);
  // Server-side authorization must validate the token with Supabase Auth.
  // getSession() only reads local cookie state and can be stale; fail closed if
  // the auth service cannot prove the user for this request.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    logger.warn("auth.getUser failed", { tenant_id: tenant.id, error: error.message });
    return null;
  }
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
    email: user.email ?? null,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    role: m?.role ?? null,
    displayName: m?.display_name ?? null,
  };
});

export async function requireRole(roles: MemberRole[]) {
  const u = await getCurrentUser();
  if (!u || !u.role || !roles.includes(u.role)) {
    return null;
  }
  return u;
}
