"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  ClipboardList,
  Copy,
  ExternalLink,
  LayoutGrid,
  LineChart,
  ListOrdered,
  LogOut,
  MoreHorizontal,
  QrCode,
  Settings,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

/** Desktop sidebar — Indian owner mental model labels */
const NAV_ITEMS = [
  { group: "Today" },
  { key: "dashboard", label: "Today", icon: LayoutGrid, kbd: "G T" },
  { key: "orders", label: "Orders", icon: ClipboardList, kbd: "G R" },
  { key: "menu", label: "Menu", icon: BookOpen, kbd: "G M" },
  { key: "qr", label: "QR poster", icon: QrCode, kbd: "G Q" },
  { group: "Manage" },
  { key: "staff", label: "Staff", icon: Users, kbd: "G S" },
  { key: "analytics", label: "Insights", icon: LineChart, kbd: "G I" },
  { key: "settings", label: "Settings", icon: Settings, kbd: "G ," },
] as const;

function OrderingLinkBanner({ tenantSlug }: { tenantSlug: string }) {
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
  const [moreOpen, setMoreOpen] = useState(false);

  function navHref(key: string) {
    return `/c/${tenantSlug}/admin/${key}`;
  }
  function isActive(key: string) {
    return (
      pathname === `/admin/${key}` ||
      pathname?.startsWith(`/admin/${key}/`) ||
      pathname === `/c/${tenantSlug}/admin/${key}` ||
      pathname?.startsWith(`/c/${tenantSlug}/admin/${key}/`)
    );
  }

  const moreActive =
    isActive("staff") || isActive("analytics") || isActive("settings");

  return (
    <div
      className="relative z-10 flex transition-colors duration-200"
      style={{ background: "var(--admin-bg)", minHeight: "100vh" }}
    >
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-[248px] shrink-0 sticky top-0 self-start h-screen flex-col transition-colors duration-200"
        style={{
          background: "var(--admin-bg-2)",
          borderRight: "1px solid var(--admin-line)",
        }}
      >
        <div
          style={{
            padding: "18px 14px 14px",
            borderBottom: "1px solid var(--admin-line)",
            marginBottom: "14px",
          }}
        >
          <Link
            href={`/c/${tenantSlug}/admin/dashboard`}
            className="inline-flex items-center gap-2.5 font-semibold text-[18px] tracking-tight"
            style={{ color: "var(--admin-ink)", letterSpacing: "-0.025em" }}
          >
            <span
              className="inline-flex items-center justify-center font-bold text-[15px] shrink-0"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "var(--admin-rose, #d52821)",
                color: "#fff",
                fontFamily: "var(--portal-font-display)",
                fontStyle: "italic",
                boxShadow: "0 2px 0 var(--admin-ink)",
              }}
            >
              T
            </span>
            <span style={{ fontFamily: "var(--portal-font-display)", fontWeight: 600 }}>
              Tray
              <span className="italic font-medium" style={{ color: "var(--admin-rose, #d52821)", marginLeft: -1 }}>
                .
              </span>
            </span>
          </Link>
          <div
            className="mt-2 font-mono uppercase font-semibold"
            style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--admin-ink-3)" }}
          >
            {tenantName}
          </div>
          <div
            className="mt-1 font-mono"
            style={{ fontSize: 9, letterSpacing: "0.08em", color: "var(--admin-ink-3)", opacity: 0.8 }}
          >
            Aaj ka hisaab · owner phone
          </div>
        </div>

        <nav className="flex-1 px-[14px] flex flex-col gap-0.5 text-[13.5px]">
          {NAV_ITEMS.map((n, i) =>
            "group" in n ? (
              <div
                key={i}
                className="font-mono font-semibold"
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
                  style={{
                    opacity: isActive(n.key) ? 1 : 0.65,
                    color: isActive(n.key) ? "var(--admin-lime)" : undefined,
                    flexShrink: 0,
                  }}
                />
                <span>{n.label}</span>
              </Link>
            )
          )}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <OrderingLinkBanner tenantSlug={tenantSlug} />
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
              >
                <span>{pl.label}</span>
                <ExternalLink size={10} />
              </Link>
            ))}
          </div>
          <div
            className="flex items-center gap-2.5 mx-[14px] mb-[14px] mt-2 rounded-lg"
            style={{
              padding: "8px 10px",
              background: "var(--admin-bg-3)",
              border: "1px solid var(--admin-line)",
            }}
          >
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
              <div className="truncate font-semibold" style={{ fontSize: 12.5, color: "var(--admin-ink)" }}>
                {userEmail ?? "admin"}
              </div>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--admin-ink-3)" }}>
                {userRole ?? "canteen_admin"}
              </div>
            </div>
            <button
              type="button"
              aria-label="Sign out"
              onClick={() =>
                fetch("/auth/signout", { method: "POST" }).then(() => {
                  window.location.href = "/";
                })
              }
              className="inline-flex items-center justify-center rounded-md cursor-pointer"
              style={{ height: 28, width: 28, color: "var(--admin-ink-3)", background: "transparent", border: "none" }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-3"
          style={{
            height: 52,
            padding: "0 16px",
            background: "var(--admin-bg)",
            opacity: 0.97,
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid var(--admin-line)",
          }}
        >
          <div className="min-w-0">
            <div className="lg:hidden font-semibold truncate" style={{ fontSize: 15, color: "var(--admin-ink)" }}>
              {tenantName}
            </div>
            <div
              className="hidden sm:block font-mono"
              style={{ fontSize: 11, color: "var(--admin-ink-3)" }}
            >
              <span style={{ color: "var(--admin-lime)" }}>{tenantSlug}</span>
              <span className="hidden md:inline"> · aaj ka hisaab</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-[color:var(--admin-ink-3)] border-[color:var(--admin-line-2)] hover:bg-[color:var(--admin-bg-3)]" />
            <Link
              href={`/c/${tenantSlug}/kitchen`}
              className="inline-flex items-center gap-1.5 font-mono uppercase tracking-wider"
              style={{
                height: 36,
                padding: "0 12px",
                borderRadius: 7,
                border: "1px solid var(--admin-line-2)",
                fontSize: 11,
                color: "var(--admin-ink-2)",
              }}
            >
              <Activity size={11} /> Kitchen
            </Link>
          </div>
        </header>

        {/* pb so fixed bottom nav never covers CTAs */}
        <main className="px-4 sm:px-8 py-5 pb-28 lg:pb-8 flex-1">{children}</main>

        <footer className="hidden lg:block border-t mt-auto" style={{ borderColor: "var(--admin-line)" }}>
          <div
            className="mx-auto max-w-7xl px-8 py-4 flex flex-wrap items-center justify-between gap-2 font-mono"
            style={{ fontSize: 11, color: "var(--admin-ink-3)" }}
          >
            <span>
              Powered by{" "}
              <Link href="/" className="font-medium" style={{ color: "var(--admin-ink-2)" }}>
                Tray
              </Link>
              {" "}· phone + aaj ka hisaab
            </span>
            <span className="flex items-center gap-3">
              <Link href="/legal/terms">Terms</Link>
              <Link href="/legal/privacy">Privacy</Link>
            </span>
          </div>
        </footer>

        {/* More sheet (phone) */}
        {moreOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setMoreOpen(false)}
            role="presentation"
          >
            <div
              className="rounded-t-2xl p-4 pb-8 flex flex-col gap-1"
              style={{
                background: "var(--admin-bg-2)",
                borderTop: "1px solid var(--admin-line)",
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="More admin tools"
            >
              <div
                className="font-mono uppercase mb-2 px-2"
                style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--admin-ink-3)" }}
              >
                More
              </div>
              {[
                { href: navHref("staff"), label: "Staff · invites & kitchen hands", icon: Users },
                { href: navHref("analytics"), label: "Insights · 30-day numbers", icon: LineChart },
                { href: navHref("settings"), label: "Settings · UPI, hours, modes", icon: Settings },
                { href: `/c/${tenantSlug}/kitchen`, label: "Kitchen queue", icon: Activity },
                { href: `/c/${tenantSlug}/menu`, label: "Student menu", icon: ExternalLink },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3.5 font-medium"
                  style={{
                    background: "var(--admin-bg-3)",
                    color: "var(--admin-ink)",
                    fontSize: 14,
                    minHeight: 52,
                  }}
                >
                  <item.icon size={18} style={{ color: "var(--admin-lime)", flexShrink: 0 }} />
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="mt-2 py-3 rounded-xl font-semibold"
                style={{
                  background: "transparent",
                  border: "1px solid var(--admin-line-2)",
                  color: "var(--admin-ink-2)",
                  fontSize: 14,
                  minHeight: 48,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Mobile bottom nav: Today · Orders · Menu · QR · More */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-xl"
          style={{
            borderColor: "var(--admin-line)",
            background: "var(--admin-bg-2)",
            paddingBottom: "env(safe-area-inset-bottom, 0)",
          }}
        >
          <div className="grid grid-cols-5">
            {(
              [
                {
                  href: `/c/${tenantSlug}/admin/dashboard`,
                  match: "dashboard",
                  icon: LayoutGrid,
                  label: "Today",
                },
                {
                  href: `/c/${tenantSlug}/admin/orders`,
                  match: "orders",
                  icon: ListOrdered,
                  label: "Orders",
                },
                {
                  href: `/c/${tenantSlug}/admin/menu`,
                  match: "menu",
                  icon: BookOpen,
                  label: "Menu",
                },
                {
                  href: `/c/${tenantSlug}/admin/qr`,
                  match: "qr",
                  icon: QrCode,
                  label: "QR",
                },
              ] as const
            ).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 font-mono uppercase tracking-wider"
                style={{
                  fontSize: 10,
                  minHeight: 56,
                  color: isActive(n.match) ? "var(--admin-lime)" : "var(--admin-ink-3)",
                }}
              >
                <n.icon size={16} />
                {n.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 py-2.5 font-mono uppercase tracking-wider"
              style={{
                fontSize: 10,
                minHeight: 56,
                color: moreActive || moreOpen ? "var(--admin-lime)" : "var(--admin-ink-3)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              aria-label="More"
              aria-expanded={moreOpen}
            >
              <MoreHorizontal size={16} />
              More
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
