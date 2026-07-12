"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, ClipboardList, Copy, ExternalLink, LayoutGrid, LineChart, ListOrdered, LogOut, QrCode, Settings, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_ITEMS = [
  { group: "Operations" },
  { key: "dashboard", label: "Overview", icon: LayoutGrid, kbd: "G O" },
  { key: "orders", label: "Orders", icon: ClipboardList, kbd: "G R" },
  { key: "menu", label: "Menu", icon: BookOpen, kbd: "G M" },
  { key: "qr", label: "QR poster", icon: QrCode, kbd: "G Q" },
  { key: "staff", label: "Staff", icon: Users, kbd: "G S" },
  { key: "analytics", label: "Insights", icon: LineChart, kbd: "G I" },
  { key: "settings", label: "Settings", icon: Settings, kbd: "G ," },
] as const;

function OrderingLinkBanner({ tenantSlug }: { tenantSlug: string }) {
  const orderingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${tenantSlug}/menu`
      : `/c/${tenantSlug}/menu`;

  function copyLink() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/c/${tenantSlug}/menu`
        : `/c/${tenantSlug}/menu`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  return (
    <div className="mx-2 mb-2 rounded-lg border border-[var(--admin-lime)]/20 bg-[var(--admin-lime)]/[0.06] px-3 py-2.5">
      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--admin-lime)]/70 mb-1.5">
        Student ordering link
      </div>
      <div className="flex items-center gap-1.5">
        <a
          href={`/c/${tenantSlug}/menu`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 text-[11px] font-mono text-[var(--admin-ink-2)] hover:text-[var(--admin-lime)] truncate transition-colors"
        >
          /c/{tenantSlug}/menu
        </a>
        <button
          type="button"
          onClick={copyLink}
          title="Copy link"
          className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded text-[var(--admin-ink-3)] hover:text-[var(--admin-lime)] hover:bg-[var(--admin-lime)]/10 transition-colors"
        >
          <Copy size={11} />
        </button>
        <a
          href={`/c/${tenantSlug}/menu`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded text-[var(--admin-ink-3)] hover:text-[var(--admin-lime)] hover:bg-[var(--admin-lime)]/10 transition-colors"
        >
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}

export function AdminShell({
  tenantName,
  tenantSlug,
  userEmail,
  userRole,
  children,
}: {
  tenantName: string;
  tenantSlug: string;
  userEmail: string | null;
  userRole?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function navHref(key: string) {
    return `/c/${tenantSlug}/admin/${key}`;
  }
  function isActive(key: string) {
    const match = `/admin/${key}`;
    return pathname === match || pathname?.startsWith(match + "/") ||
      pathname === `/c/${tenantSlug}/admin/${key}` ||
      pathname?.startsWith(`/c/${tenantSlug}/admin/${key}/`);
  }

  return (
    <div className="relative z-10 flex transition-colors duration-200" style={{ background: "var(--admin-bg)", minHeight: "100vh" }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex w-[248px] shrink-0 sticky top-0 self-start h-screen flex-col transition-colors duration-200"
        style={{
          background: "var(--admin-bg-2)",
          borderRight: "1px solid var(--admin-line)",
        }}
      >
        {/* Brand */}
        <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid var(--admin-line)", marginBottom: "14px" }}>
          <Link
            href={`/c/${tenantSlug}/admin/dashboard`}
            className="inline-flex items-center gap-2.5 font-semibold text-[18px] tracking-tight"
            style={{ color: "var(--admin-ink)", letterSpacing: "-0.025em" }}
          >
            {/* 28px lime square brand mark with glow */}
            <span
              className="inline-flex items-center justify-center font-mono font-bold text-[13px] shrink-0 transition-all duration-200"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "var(--admin-lime)",
                color: "var(--admin-bg)",
                boxShadow: "0 0 20px var(--admin-lime-soft)",
              }}
            >
              T
            </span>
            Tray<span className="italic font-medium" style={{ color: "var(--admin-lime)", marginLeft: -2 }}>.</span>
          </Link>
          <div
            className="mt-2 font-mono uppercase font-semibold transition-colors duration-200"
            style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--admin-ink-3)" }}
          >
            {tenantName}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-[14px] flex flex-col gap-0.5 text-[13.5px]">
          {NAV_ITEMS.map((n, i) =>
            "group" in n ? (
              <div
                key={i}
                className="font-mono font-semibold transition-colors duration-200"
                style={{
                  padding: "14px 10px 6px",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--admin-ink-3)",
                }}
              >
                {n.group}
              </div>
            ) : (
              <Link
                key={n.key}
                href={navHref(n.key)}
                className="group flex items-center gap-[11px] rounded-[7px] font-medium transition-all duration-200"
                style={{
                  padding: "8px 11px",
                  background: isActive(n.key) ? "var(--admin-lime-soft)" : "transparent",
                  color: isActive(n.key) ? "var(--admin-lime)" : "var(--admin-ink-2)",
                  fontWeight: isActive(n.key) ? 600 : 500,
                }}
              >
                <n.icon
                  size={15}
                  strokeWidth={1.6}
                  style={{ opacity: isActive(n.key) ? 1 : 0.65, color: isActive(n.key) ? "var(--admin-lime)" : undefined, flexShrink: 0 }}
                />
                <span>{n.label}</span>
                {"kbd" in n && n.kbd && (
                  <span
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-all duration-200 font-mono font-medium"
                    style={{
                      fontSize: 10,
                      padding: "1px 5px",
                      background: isActive(n.key) ? "var(--admin-lime-soft)" : "var(--admin-bg-3)",
                      border: `1px solid ${isActive(n.key) ? "var(--admin-line-2)" : "var(--admin-line)"}`,
                      borderRadius: 4,
                      color: isActive(n.key) ? "var(--admin-lime)" : "var(--admin-ink-3)",
                    }}
                  >
                    {n.kbd}
                  </span>
                )}
              </Link>
            )
          )}
        </nav>

        {/* Bottom: ordering link + portal links + user */}
        <div style={{ marginTop: "auto" }}>
          <OrderingLinkBanner tenantSlug={tenantSlug} />

          {/* Portal quick-links in mono */}
          <div style={{ borderTop: "1px solid var(--admin-line)", padding: "14px 14px 0" }}>
            {[
              { label: "Kitchen", href: `/c/${tenantSlug}/kitchen` },
              { label: "Student menu", href: `/c/${tenantSlug}/menu` },
            ].map((pl) => (
              <Link
                key={pl.href}
                href={pl.href}
                className="flex items-center justify-between rounded-md transition-all duration-200"
                style={{
                  padding: "7px 11px",
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  fontSize: 11,
                  color: "var(--admin-ink-3)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--admin-bg-3)"; (e.currentTarget as HTMLElement).style.color = "var(--admin-ink)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "var(--admin-ink-3)"; }}
              >
                <span>{pl.label}</span>
                <ExternalLink size={10} />
              </Link>
            ))}
          </div>

          {/* User row */}
          <div
            className="flex items-center gap-2.5 mx-[14px] mb-[14px] mt-2 rounded-lg transition-all duration-200"
            style={{
              padding: "8px 10px",
              background: "var(--admin-bg-3)",
              border: "1px solid var(--admin-line)",
            }}
          >
            {/* Avatar: lime→mint gradient */}
            <div
              className="shrink-0 inline-flex items-center justify-center rounded-full font-mono font-bold text-[12px]"
              style={{
                width: 30,
                height: 30,
                background: "linear-gradient(135deg, var(--admin-lime), var(--admin-mint))",
                color: "var(--admin-bg)",
              }}
            >
              {(userEmail ?? "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0" style={{ lineHeight: 1.2 }}>
              <div className="truncate font-semibold transition-colors duration-200" style={{ fontSize: 12.5, color: "var(--admin-ink)" }}>
                {userEmail ?? "admin"}
              </div>
              <div
                className="font-mono transition-colors duration-200"
                style={{ fontSize: 10, color: "var(--admin-ink-3)", letterSpacing: "0.04em" }}
              >
                {userRole ?? "canteen_admin"}
              </div>
            </div>
            <button
              type="button"
              aria-label="Sign out"
              onClick={() => fetch("/auth/signout", { method: "POST" }).then(() => { window.location.href = "/"; })}
              className="inline-flex items-center justify-center rounded-md transition-colors cursor-pointer"
              style={{ height: 28, width: 28, color: "var(--admin-ink-3)", background: "transparent", border: "none" }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Topbar: sticky, blur backdrop, border-bottom */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-3 transition-colors duration-200"
          style={{
            height: 52,
            padding: "0 32px",
            background: "var(--admin-bg)",
            opacity: 0.95,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderBottom: "1px solid var(--admin-line)",
          }}
        >
          {/* Left: tenant context */}
          <div
            className="flex items-center gap-2 font-mono transition-colors duration-200"
            style={{ fontSize: 11, color: "var(--admin-ink-3)" }}
          >
            <span className="hidden sm:inline">
              <span style={{ color: "var(--admin-lime)" }}>{tenantSlug}</span>.tray.app/admin
            </span>
          </div>
          {/* Right: theme toggle + kitchen link */}
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-[color:var(--admin-ink-3)] border-[color:var(--admin-line-2)] hover:bg-[color:var(--admin-bg-3)]" />
            <Link
              href={`/c/${tenantSlug}/kitchen`}
              className="hidden md:inline-flex items-center gap-1.5 font-mono uppercase tracking-wider transition-all duration-200"
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 7,
                border: "1px solid var(--admin-line-2)",
                fontSize: 11,
                color: "var(--admin-ink-2)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--admin-lime)"; (e.currentTarget as HTMLElement).style.color = "var(--admin-lime)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--admin-line-2)"; (e.currentTarget as HTMLElement).style.color = "var(--admin-ink-2)"; }}
            >
              <Activity size={11} /> Kitchen
            </Link>
          </div>
        </header>

        <main className="px-5 sm:px-8 py-6">{children}</main>

        {/* Footer */}
        <footer
          className="hidden lg:block border-t mt-auto"
          style={{ borderColor: "var(--admin-line)" }}
        >
          <div
            className="mx-auto max-w-7xl px-8 py-4 flex flex-wrap items-center justify-between gap-2 font-mono"
            style={{ fontSize: 11, color: "var(--admin-ink-3)" }}
          >
            <span>
              Powered by{" "}
              <Link href="/" className="font-medium transition-colors" style={{ color: "var(--admin-ink-2)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--admin-lime)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--admin-ink-2)"; }}
              >Tray</Link>
              {" "}· Campus Edition · Payments by Razorpay
            </span>
            <span className="flex items-center gap-3">
              <Link href="/legal/terms" className="transition-colors hover:text-[var(--admin-ink-2)]">Terms</Link>
              <Link href="/legal/privacy" className="transition-colors hover:text-[var(--admin-ink-2)]">Privacy</Link>
            </span>
          </div>
        </footer>

        {/* Mobile bottom nav */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-xl"
          style={{
            borderColor: "var(--admin-line)",
            background: "var(--admin-bg-2)",
          }}
        >
          <div className="grid grid-cols-5">
            {[
              { href: `/c/${tenantSlug}/admin/dashboard`, match: `/c/${tenantSlug}/admin/dashboard`, icon: LayoutGrid, label: "Home" },
              { href: `/c/${tenantSlug}/admin/orders`, match: `/c/${tenantSlug}/admin/orders`, icon: ListOrdered, label: "Orders" },
              { href: `/c/${tenantSlug}/admin/menu`, match: `/c/${tenantSlug}/admin/menu`, icon: BookOpen, label: "Menu" },
              { href: `/c/${tenantSlug}/admin/staff`, match: `/c/${tenantSlug}/admin/staff`, icon: Users, label: "Staff" },
              { href: `/c/${tenantSlug}/admin/settings`, match: `/c/${tenantSlug}/admin/settings`, icon: Settings, label: "Settings" },
            ].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 font-mono uppercase tracking-wider"
                style={{
                  fontSize: 12,
                  color: pathname?.startsWith(n.match) ? "var(--admin-lime)" : "var(--admin-ink-3)",
                }}
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
