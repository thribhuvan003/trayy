"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, ClipboardList, LayoutGrid, LineChart, ListOrdered, LogOut, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV = [
  { group: "Operations" },
  { href: "/admin/dashboard", label: "Overview", icon: LayoutGrid, kbd: "G O" },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, kbd: "G R" },
  { href: "/admin/menu", label: "Menu", icon: BookOpen, kbd: "G M" },
  { href: "/admin/staff", label: "Staff", icon: Users, kbd: "G S" },
  { href: "/admin/analytics", label: "Insights", icon: LineChart, kbd: "G I" },
  { href: "/admin/settings", label: "Settings", icon: Settings, kbd: "G ," },
];

export function AdminShell({
  tenantName,
  tenantSlug,
  userEmail,
  children,
}: {
  tenantName: string;
  tenantSlug: string;
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="relative z-10 flex">
      <aside className="hidden lg:flex w-[220px] shrink-0 border-r border-graphite-200/10 sticky top-0 self-start h-screen flex-col">
        <div className="px-4 pt-5 pb-3">
          <Link href={`/c/${tenantSlug}/admin/dashboard`} className="inline-flex items-center gap-2 font-display text-[17px] tracking-tight text-graphite-200">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-lime text-graphite-900 font-mono text-[11px] font-bold">T</span>
            <span className="font-medium">Tray<span className="italic text-lime">.</span></span>
          </Link>
          <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.14em] text-graphite-400">
            {tenantName}
          </div>
        </div>
        <nav className="flex-1 px-2 flex flex-col gap-0.5 text-[13px]">
          {NAV.map((n, i) =>
            "group" in n ? (
              <div key={i} className="px-2 pt-4 pb-1 text-[10px] font-mono uppercase tracking-[0.14em] text-graphite-400 font-semibold">
                {n.group}
              </div>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "group flex items-center gap-2.5 px-2 h-8 rounded-md transition-colors",
                  pathname === n.href || pathname?.startsWith(n.href + "/")
                    ? "bg-lime/10 text-lime"
                    : "text-graphite-300 hover:bg-graphite-200/[0.06] hover:text-graphite-200"
                )}
              >
                <n.icon size={14} strokeWidth={1.6} className="opacity-80" />
                <span className="font-medium">{n.label}</span>
                {n.kbd && (
                  <span className="ml-auto px-1 py-0.5 text-[9px] font-mono rounded border border-graphite-200/15 text-graphite-400">
                    {n.kbd}
                  </span>
                )}
              </Link>
            )
          )}
        </nav>
        <div className="p-3 border-t border-graphite-200/10 flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-lime/15 text-lime inline-flex items-center justify-center text-[12px] font-mono font-semibold">
            {(userEmail ?? "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="text-[11px] flex-1 min-w-0">
            <div className="text-graphite-300 truncate">{userEmail ?? "admin"}</div>
            <div className="text-graphite-400">canteen_admin</div>
          </div>
          <Link
            href="/auth/signout"
            aria-label="Sign out"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-graphite-400 hover:text-graphite-200 hover:bg-graphite-200/[0.06]"
          >
            <LogOut size={13} />
          </Link>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-graphite-900/80 backdrop-blur-xl border-b border-graphite-200/10">
          <div className="px-5 sm:px-6 h-12 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-mono text-graphite-400">
              <div className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              WS connected
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">
                <span className="text-lime">{tenantSlug}</span>.tray.app/admin
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle className="text-graphite-200" />
              <Link
                href={`/c/${tenantSlug}/kitchen`}
                className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono uppercase tracking-wider text-graphite-300 hover:border-lime hover:text-lime transition-colors"
              >
                <Activity size={11} /> Kitchen
              </Link>
            </div>
          </div>
        </header>
        <main className="px-5 sm:px-6 py-6">{children}</main>
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-graphite-200/10 bg-graphite-900/95 backdrop-blur-xl">
          <div className="grid grid-cols-6">
            {[
              { href: `/c/${tenantSlug}/admin/dashboard`, match: "/admin/dashboard", icon: LayoutGrid, label: "Home" },
              { href: `/c/${tenantSlug}/admin/orders`, match: "/admin/orders", icon: ListOrdered, label: "Orders" },
              { href: `/c/${tenantSlug}/admin/menu`, match: "/admin/menu", icon: BookOpen, label: "Menu" },
              { href: `/c/${tenantSlug}/admin/staff`, match: "/admin/staff", icon: Users, label: "Staff" },
              { href: `/c/${tenantSlug}/admin/analytics`, match: "/admin/analytics", icon: LineChart, label: "Insights" },
              { href: `/c/${tenantSlug}/admin/settings`, match: "/admin/settings", icon: Settings, label: "Settings" },
            ].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-mono uppercase tracking-wider",
                  pathname?.startsWith(n.match) ? "text-lime" : "text-graphite-400"
                )}
              >
                <n.icon size={15} />
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
