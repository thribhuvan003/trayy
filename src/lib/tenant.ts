import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/db/types";

export type ResolvedTenant = {
  id: string;
  slug: string;
  name: string;
  college_name: string;
  hero_tagline: string | null;
  logo_url: string | null;
  allowed_domain: string | null;
  upi_vpa: string | null;
};

const RESERVED_SUBDOMAINS = new Set(["www", "app", "admin", "api", "auth", "static"]);

// Hosts that look subdomain-y but aren't tenant subdomains. *.vercel.app
// is a preview/prod alias, not a college; we treat it as "no tenant" so the
// caller falls back to DEFAULT_TENANT_SLUG.
const NON_TENANT_HOST_SUFFIXES = [".vercel.app", ".vercel.sh"];

export function tenantSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const clean = host.split(":")[0]?.toLowerCase() ?? "";
  if (!clean) return null;
  if (clean === "localhost" || clean === "127.0.0.1") return null;
  if (NON_TENANT_HOST_SUFFIXES.some((s) => clean.endsWith(s))) return null;
  const parts = clean.split(".");
  if (parts.length < 2) return null;
  if (clean.endsWith(".localhost")) {
    return parts[0] && !RESERVED_SUBDOMAINS.has(parts[0]) ? parts[0] : null;
  }
  if (parts.length >= 3) {
    const sub = parts[0];
    return sub && !RESERVED_SUBDOMAINS.has(sub) ? sub : null;
  }
  return null;
}

// Anon-key client that bypasses cookies — used purely to resolve the public
// tenant record from the slug. Cached per request by React.
const _resolverClient = () =>
  createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export const resolveTenant = cache(async (slug: string): Promise<ResolvedTenant | null> => {
  const client = _resolverClient();
  const { data, error } = await client.rpc("resolve_tenant", { p_slug: slug });
  if (error || !data || data.length === 0) return null;
  const row = data[0] as unknown as {
    id: string;
    slug: string;
    name: string;
    college_name: string;
    hero_tagline: string | null;
    logo_url: string | null;
    allowed_domain: string | null;
    upi_vpa: string | null;
  };
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    college_name: row.college_name,
    hero_tagline: row.hero_tagline,
    logo_url: row.logo_url,
    allowed_domain: row.allowed_domain ?? null,
    upi_vpa: row.upi_vpa ?? null,
  };
});
