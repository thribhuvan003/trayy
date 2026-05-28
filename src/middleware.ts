import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { tenantSlugFromHost } from "@/lib/tenant";

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Edge-level in-memory cache for tenants and user roles to avoid database pressure
const tenantCache = new Map<string, { tenant: any; expiresAt: number }>();
const roleCache = new Map<string, { role: string | null; expiresAt: number }>();

async function getMiddlewareTenant(slug: string) {
  const now = Date.now();
  const cached = tenantCache.get(slug);
  if (cached && cached.expiresAt > now) {
    return cached.tenant;
  }
  try {
    const url = `${supabaseUrl}/rest/v1/rpc/resolve_tenant`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "apikey": supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_slug: slug }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.length === 0) return null;
    const tenant = data[0];
    tenantCache.set(slug, { tenant, expiresAt: now + 5 * 60 * 1000 }); // 5 minutes TTL
    return tenant;
  } catch (err) {
    console.error("Error resolving tenant in middleware:", err);
    return null;
  }
}

async function getMiddlewareUserRole(
  supabase: any,
  userId: string,
  tenantId: string,
  collegeId: string | null
) {
  const cacheKey = `${userId}:${tenantId}`;
  const now = Date.now();
  const cached = roleCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.role;
  }

  try {
    // 1. Check tenant_memberships first
    const { data: memData } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle();
    let role: string | null = memData ? memData.role : null;

    // 2. If no direct membership, check college_memberships for campus admin
    if (!role && collegeId) {
      const { data: colData } = await supabase
        .from("college_memberships")
        .select("is_active")
        .eq("user_id", userId)
        .eq("college_id", collegeId)
        .eq("is_active", true)
        .maybeSingle();
      if (colData) {
        role = "canteen_admin";
      }
    }

    roleCache.set(cacheKey, { role, expiresAt: now + 5 * 60 * 1000 }); // 5 minutes TTL
    return role;
  } catch (err) {
    console.error("Error getting user role in middleware:", err);
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Fast pass: skip static assets and webhook handlers — no tenant resolution needed
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(req.headers);

  // 1. Resolve tenant slug from path first, then subdomain.
  //    No query-param override — ?tenant= from anonymous requests would allow cross-tenant access.
  const canteenMatch = pathname.match(/^\/c\/([^/]+)(\/.*)?$/);
  const collegeMatch = pathname.match(/^\/college\/([^/]+)(\/.*)?$/);

  let tenantSlug: string | null = null;
  let collegeSlug: string | null = null;

  if (canteenMatch) {
    tenantSlug = canteenMatch[1]?.toLowerCase() ?? null;
  } else if (collegeMatch) {
    collegeSlug = collegeMatch[1]?.toLowerCase() ?? null;
  } else {
    tenantSlug = tenantSlugFromHost(req.headers.get("host"));
  }

  const resolvedTenantSlug = (tenantSlug || DEFAULT_TENANT_SLUG).toLowerCase();
  requestHeaders.set("x-tenant-slug", resolvedTenantSlug);
  if (collegeSlug) requestHeaders.set("x-college-slug", collegeSlug);

  // 2. Refresh Supabase auth tokens. Collect refreshed cookies so we can apply
  //    them to both the forwarded request headers AND the response SET-COOKIE headers.
  const refreshedCookies: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(set: { name: string; value: string; options: CookieOptions }[]) {
        for (const cookie of set) {
          refreshedCookies.push(cookie);
          req.cookies.set(cookie.name, cookie.value);
        }
      },
    },
  });

  // OPTIMIZATION: Only verify token if a Supabase session cookie exists.
  // This cuts redundant auth API calls on public/unauthenticated routes.
  const hasSessionCookie = req.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  console.log("Middleware path:", pathname, "hasSessionCookie:", hasSessionCookie);
  let user = null;
  if (hasSessionCookie) {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    if (error) console.log("getUser error:", error);
  }

  // 3. Edge-level role guard for kitchen and admin routes.
  //    Redirects unauthenticated or unauthorized users before the page even renders.
  const isKitchenPath =
    pathname.match(/^\/c\/([^/]+)\/kitchen(\/.*)?$/) || pathname.startsWith("/kitchen");
  const isAdminPath =
    pathname.match(/^\/c\/([^/]+)\/admin(\/.*)?$/) || pathname.startsWith("/admin");

  if (isKitchenPath || isAdminPath) {
    const targetSlug = resolvedTenantSlug;
    console.log("Edge role check - path:", pathname, "user:", user?.email);
    if (!user) {
      console.log("No user found, redirecting to login");
      return NextResponse.redirect(
        new URL(`/c/${targetSlug}/login?next=${encodeURIComponent(pathname)}`, req.url)
      );
    }
    const tenant = await getMiddlewareTenant(targetSlug);
    console.log("Resolved tenant in middleware:", tenant?.name);
    if (!tenant) {
      return new NextResponse("Tenant Not Found", { status: 404 });
    }
    const role = await getMiddlewareUserRole(supabase, user.id, tenant.id, tenant.college_id);
    console.log("Resolved user role:", role);

    if (isKitchenPath) {
      if (role !== "kitchen_staff" && role !== "canteen_admin" && role !== "super_admin") {
        console.log("Not kitchen staff, redirecting to unauthorised");
        return NextResponse.redirect(new URL(`/c/${targetSlug}/unauthorised`, req.url));
      }
    } else if (isAdminPath) {
      if (role !== "canteen_admin" && role !== "super_admin") {
        console.log("Not admin, redirecting to unauthorised");
        return NextResponse.redirect(new URL(`/c/${targetSlug}/unauthorised`, req.url));
      }
    }
  }

  // Apply refreshed cookies to the request so page handlers see the new token
  const cookieHeader = req.cookies
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  requestHeaders.set("cookie", cookieHeader);

  // 4. Build response — rewrite /c/[slug]/<rest> to internal portal routes.
  //    The browser URL stays as /c/[slug]/menu but Next.js serves /menu internally.
  let res: NextResponse;
  if (canteenMatch && canteenMatch[2] && canteenMatch[2] !== "/") {
    const rewriteUrl = url.clone();
    rewriteUrl.pathname = canteenMatch[2];
    res = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
  } else {
    res = NextResponse.next({ request: { headers: requestHeaders } });
  }

  res.headers.set("x-tenant-slug", resolvedTenantSlug);
  if (collegeSlug) res.headers.set("x-college-slug", collegeSlug);

  // 5. Apply refreshed session cookies to the browser response
  for (const { name, value, options } of refreshedCookies) {
    res.cookies.set(name, value, options);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)",
  ],
};
