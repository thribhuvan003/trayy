import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveTenant, collegeCanteens, getTenantSlugFromHeaders } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { StudentTopBar } from "@/components/portal-student/top-bar";
import { CartDrawerConditional } from "@/components/portal-student/cart-drawer-conditional";
import { CartTenantSync } from "@/components/portal-student/cart-tenant-sync";
import { OrderReadyListener } from "@/components/portal-student/order-ready-listener";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const slug = getTenantSlugFromHeaders(h);
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();

  // Fetch sibling canteens — use cached version (30s TTL)
  const siblings = tenant.college_slug
    ? await collegeCanteens(tenant.college_slug).catch(() => [])
    : [];

  if (siblings.length > 0) {
    try {
      const admin = getAdminClient();
      // Scope to only the sibling slugs — avoids full-table scan across all tenants
      const siblingSlugSet = siblings.map((s) => s.slug);
      const { data: counts } = await admin
        .from("menu_items")
        .select("id, tenants!inner(slug)")
        .in("tenants.slug", siblingSlugSet)
        .eq("status", "live");

      if (counts) {
        const dishCountsMap: Record<string, number> = {};
        for (const item of counts) {
          const s = (item.tenants as any)?.slug;
          if (s) {
            dishCountsMap[s] = (dishCountsMap[s] || 0) + 1;
          }
        }
        for (const sib of siblings) {
          sib.dishCount = dishCountsMap[sib.slug] ?? 0;
        }
      }
    } catch (err) {
      console.error("Failed to fetch dish counts for siblings:", err);
    }
  }

  // Auth is optional on the student portal (browse without sign-in is fine).
  // We pass the user id to OrderReadyListener so it can subscribe; nullable
  // means the listener no-ops for guests.
  const user = await getCurrentUser();

  return (
    <div
      data-portal="student"
      className="min-h-screen font-sans bg-[color:var(--color-paper)] text-[color:var(--color-ink)] antialiased"
    >
      <CartTenantSync slug={tenant.slug} />
      <OrderReadyListener userId={user?.id ?? null} tenantSlug={tenant.slug} tenantId={tenant.id} />
      <StudentTopBar tenant={tenant} siblings={siblings} user={user} />
      {/* Desktop reserves a 20rem right column for the sticky cart sidebar.
          Mobile stays single-column; the CartDrawer self-promotes to a
          floating button + Vaul drawer below the lg breakpoint. */}
      <main
        className="w-full max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-7 lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start lg:pb-12"
        style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="min-w-0">{children}</div>
        <CartDrawerConditional tenantSlug={tenant.slug} tenantName={tenant.name} />
      </main>
    </div>
  );
}
