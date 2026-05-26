import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { tenantSlugFromHost } from "@/lib/tenant";

// Path-based tenant routing: `/c/[slug]/...` for canteens, `/college/[slug]/...` for college portal.
// Subdomain routing (`<slug>.tray.local`) is kept as a fallback for custom domains.
//
// This is the entry point that makes the core promise real:
// "One login → each admin gets their own URL/subdomain + their own dedicated-feeling system + their own data."
// Every request must resolve to a tenant early and reliably so downstream code can enforce isolation.
export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;
  const requestHeaders = new Headers(req.headers);

  // 1. Resolve tenant from path first, then subdomain. No query-param override —
  //    accepting ?tenant= from anonymous requests would allow cross-tenant data access.
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

  const resolvedTenantSlug = (tenantSlug ?? "").toLowerCase();
  requestHeaders.set("x-tenant-slug", resolvedTenantSlug);
  if (collegeSlug) requestHeaders.set("x-college-slug", collegeSlug);

  // 2. If `/c/[slug]/<rest>`, rewrite internally to the existing portal routes.
  //    URL in the browser stays as /c/[slug]/menu — but Next serves /menu under the hood.
  //    Bare `/c/[slug]` falls through to the canteen-landing page at app/c/[slug]/page.tsx.
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

  // 3. Refresh Supabase auth cookies (required by @supabase/ssr to keep sessions alive).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(set: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value, options } of set) {
            res.cookies.set(name, value, options);
          }
        },
      },
    }
  );
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
