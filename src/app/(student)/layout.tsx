import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveTenant } from "@/lib/tenant";
import { StudentTopBar } from "@/components/portal-student/top-bar";
import { CartDrawerConditional } from "@/components/portal-student/cart-drawer-conditional";
import { CartTenantSync } from "@/components/portal-student/cart-tenant-sync";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "";
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();
  return (
    <div data-portal="student" className="min-h-screen bg-[color:var(--color-paper)] text-[color:var(--color-ink)] antialiased flex flex-col">
      <CartTenantSync slug={tenant.slug} />
      <StudentTopBar tenant={tenant} />
      {/* Desktop reserves a 20rem right column for the sticky cart sidebar.
          Mobile stays single-column; the CartDrawer self-promotes to a
          floating button + Vaul drawer below the lg breakpoint. */}
      <main className="flex-1 pb-32 sm:pb-20 lg:pb-12 lg:grid lg:grid-cols-[1fr,20rem] lg:gap-6 lg:max-w-7xl lg:mx-auto lg:px-6">
        <div className="min-w-0">{children}</div>
        <CartDrawerConditional tenantSlug={tenant.slug} tenantName={tenant.name} />
      </main>
      <footer className="border-t border-[color:var(--color-line)] mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[color:var(--color-ink)]/45">
          <span>
            Powered by <Link href="/" className="hover:text-ocean-500 transition-colors font-medium">Tray</Link>
            {" "}· Campus Edition · Payments by Razorpay
          </span>
          <span className="flex items-center gap-3">
            <Link href="/legal/terms" className="hover:text-ocean-500 transition-colors">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-ocean-500 transition-colors">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
