import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
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

export type CollegeCanteen = {
  slug: string;
  name: string;
  hero_tagline: string | null;
  building: string | null;
  zone: string | null;
  mess_type: string | null;
  is_open: boolean;
  paused_until: string | null;
  opens_at: string | null;
  closes_at: string | null;
  logo_url: string | null;
  pending_orders_count: number;
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

// Edge-cached tenant lookup: 500 concurrent students hitting /c/iitb-h9/menu within
// a minute trigger ONE Supabase call, not 500. React.cache() is still wrapped on top
// so within a single request the same slug resolves once.
const fetchTenantUncached = async (slug: string): Promise<ResolvedTenant | null> => {
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
};

const fetchTenantEdgeCached = unstable_cache(
  fetchTenantUncached,
  ["resolve-tenant"],
  { revalidate: 60, tags: ["tenant"] }
);

export const resolveTenant = cache(async (slug: string): Promise<ResolvedTenant | null> => {
  return fetchTenantEdgeCached(slug);
});

// College portal: list all canteens at a college with live wait/open status.
const fetchCollegeCanteensUncached = async (collegeSlug: string): Promise<CollegeCanteen[]> => {
  const client = _resolverClient();
  const { data, error } = await client.rpc("college_canteens", { p_college_slug: collegeSlug });
  if (error || !data) return [];
  return data as unknown as CollegeCanteen[];
};

const fetchCollegeCanteensCached = unstable_cache(
  fetchCollegeCanteensUncached,
  ["college-canteens"],
  { revalidate: 30, tags: ["college-canteens"] }
);

export const collegeCanteens = cache(async (slug: string): Promise<CollegeCanteen[]> => {
  return fetchCollegeCanteensCached(slug);
});
