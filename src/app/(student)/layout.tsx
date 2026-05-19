import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveTenant } from "@/lib/tenant";
import { StudentTopBar } from "@/components/portal-student/top-bar";
import { CartDrawer } from "@/components/portal-student/cart-drawer";
import { CartTenantSync } from "@/components/portal-student/cart-tenant-sync";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();
  return (
    <div data-portal="student" className="min-h-screen bg-[color:var(--color-paper)] text-[color:var(--color-ink)] antialiased">
      <CartTenantSync slug={tenant.slug} />
      <StudentTopBar tenant={tenant} />
      {/* Desktop reserves a 20rem right column for the sticky cart sidebar.
          Mobile stays single-column; the CartDrawer self-promotes to a
          floating button + Vaul drawer below the lg breakpoint. */}
      <main className="pb-32 sm:pb-20 lg:pb-12 lg:grid lg:grid-cols-[1fr,20rem] lg:gap-6 lg:max-w-7xl lg:mx-auto lg:px-6">
        <div className="min-w-0">{children}</div>
        <CartDrawer tenantUpi={tenant.name} />
      </main>
    </div>
  );
}
