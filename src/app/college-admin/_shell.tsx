"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, LayoutGrid, LogOut, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/college-admin", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/college-admin/canteens", label: "Canteens", icon: Building2, exact: false },
  { href: "/college-admin/reports", label: "Reports", icon: PieChart, exact: false },
];

export function CollegeAdminShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="relative z-10 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 border-r border-graphite-200/10 sticky top-0 self-start h-screen flex-col">
        <div className="px-4 pt-5 pb-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-display text-[17px] tracking-tight text-graphite-200"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-lime text-graphite-900 font-mono text-[11px] font-bold">
              T
            </span>
            <span className="font-medium">
              Tray<span className="italic text-lime">.</span>
            </span>
          </Link>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.14em] text-graphite-400">
            College Admin
          </div>
        </div>
        <nav className="flex-1 px-2 flex flex-col gap-0.5 text-[13px]">
          <div className="px-2 pt-4 pb-1 text-[10px] font-mono uppercase tracking-[0.14em] text-graphite-400 font-semibold">
            Portal
          </div>
          {NAV.map((n) => {
            const active = n.exact
              ? pathname === n.href
              : pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "group flex items-center gap-2.5 px-2 h-8 rounded-md transition-colors",
                  active
                    ? "bg-lime/10 text-lime"
                    : "text-graphite-300 hover:bg-graphite-200/[0.06] hover:text-graphite-200"
                )}
              >
                <n.icon size={14} strokeWidth={1.6} className="opacity-80" />
                <span className="font-medium">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-graphite-200/10 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-lime/15 text-lime inline-flex items-center justify-center text-[12px] font-mono font-semibold">
            {(userEmail ?? "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="text-[11px] flex-1 min-w-0">
            <div className="text-graphite-300 truncate">{userEmail ?? "admin"}</div>
            <div className="text-graphite-400">college_admin</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-graphite-400 hover:text-graphite-200 hover:bg-graphite-200/[0.06]"
          >
            <LogOut size={13} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-graphite-900/80 backdrop-blur-xl border-b border-graphite-200/10">
          <div className="px-5 sm:px-6 h-12 flex items-center justify-between gap-3">
            <div className="text-[11px] font-mono text-graphite-400">
              tray.app/college-admin
            </div>
          </div>
        </header>
        <main className="px-5 sm:px-6 py-6">{children}</main>

        {/* Mobile nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-graphite-200/10 bg-graphite-900/95 backdrop-blur-xl">
          <div className="grid grid-cols-3">
            {NAV.map((n) => {
              const active = n.exact
                ? pathname === n.href
                : pathname?.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-mono uppercase tracking-wider",
                    active ? "text-lime" : "text-graphite-400"
                  )}
                >
                  <n.icon size={15} />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
