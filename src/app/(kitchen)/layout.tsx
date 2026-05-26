import Link from "next/link";
import { resolveTenant } from "@/lib/tenant";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "";
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();
  return (
    <div
      data-portal="kitchen"
      className="min-h-screen bg-cream-200 text-tomato-900 relative overflow-x-hidden flex flex-col"
    >
      <div className="paper-grain fixed inset-0 z-0" />
      <div className="relative z-10 flex-1">{children}</div>
      <footer className="relative z-10 border-t border-tomato-900/10 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-tomato-900/40">
          <span>
            Powered by <Link href="/" className="hover:text-tomato-500 transition-colors font-medium">Tray</Link>
            {" "}· Campus Edition · Payments by Razorpay
          </span>
          <span className="flex items-center gap-3">
            <Link href="/legal/terms" className="hover:text-tomato-900/70 transition-colors">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-tomato-900/70 transition-colors">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
