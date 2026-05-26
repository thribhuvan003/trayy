"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, ClipboardList, Copy, ExternalLink, LayoutGrid, LineChart, ListOrdered, LogOut, Settings, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_ITEMS = [
  { group: "Operations" },
  { key: "dashboard", label: "Overview", icon: LayoutGrid, kbd: "G O" },
  { key: "orders", label: "Orders", icon: ClipboardList, kbd: "G R" },
  { key: "menu", label: "Menu", icon: BookOpen, kbd: "G M" },
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
    <div className="mx-2 mb-2 rounded-lg border border-[#cdfa50]/20 bg-[#cdfa50]/[0.06] px-3 py-2.5">
      <div className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#cdfa50]/70 mb-1.5">
        Student ordering link
      </div>
      <div className="flex items-center gap-1.5">
        <a
          href={`/c/${tenantSlug}/menu`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 text-[11px] font-mono text-[#aab3c5] hover:text-[#cdfa50] truncate transition-colors"
        >
          /c/{tenantSlug}/menu
        </a>
        <button
          type="button"
          onClick={copyLink}
          title="Copy link"
          className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded text-[#6d7689] hover:text-[#cdfa50] hover:bg-[#cdfa50]/10 transition-colors"
        >
          <Copy size={11} />
        </button>
        <a
          href={`/c/${tenantSlug}/menu`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded text-[#6d7689] hover:text-[#cdfa50] hover:bg-[#cdfa50]/10 transition-colors"
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
  children,
}: {
  tenantName: string;
  tenantSlug: string;
  userEmail: string | null;
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
    <div className="relative z-10 flex" style={{ background: "#0b0e14", minHeight: "100vh" }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex w-[248px] shrink-0 sticky top-0 self-start h-screen flex-col"
        style={{
          background: "#11151d",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Brand */}
        <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: "14px" }}>
          <Link
            href={`/c/${tenantSlug}/admin/dashboard`}
            className="inline-flex items-center gap-2.5 font-semibold text-[18px] tracking-tight"
            style={{ color: "#eef1f7", letterSpacing: "-0.025em" }}
          >
            {/* 28px lime square brand mark with glow */}
            <span
              className="inline-flex items-center justify-center font-mono font-bold text-[13px] shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "#cdfa50",
                color: "#0b0e14",
                boxShadow: "0 0 20px rgba(205,250,80,0.32)",
              }}
            >
              T
            </span>
            Tray<span className="italic font-medium" style={{ color: "#cdfa50", marginLeft: -2 }}>.</span>
          </Link>
          <div
            className="mt-2 font-mono uppercase font-semibold"
            style={{ fontSize: 10, letterSpacing: "0.14em", color: "#6d7689" }}
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
                className="font-mono font-semibold"
                style={{
                  padding: "14px 10px 6px",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "#6d7689",
                }}
              >
                {n.group}
              </div>
            ) : (
              <Link
                key={n.key}
                href={navHref(n.key)}
                className="group flex items-center gap-[11px] rounded-[7px] font-medium transition-colors"
                style={{
                  padding: "8px 11px",
                  background: isActive(n.key) ? "rgba(205,250,80,0.12)" : "transparent",
                  color: isActive(n.key) ? "#cdfa50" : "#aab3c5",
                  fontWeight: isActive(n.key) ? 600 : 500,
                }}
              >
                <n.icon
                  size={15}
                  strokeWidth={1.6}
                  style={{ opacity: isActive(n.key) ? 1 : 0.65, color: isActive(n.key) ? "#cdfa50" : undefined, flexShrink: 0 }}
                />
                <span>{n.label}</span>
                {"kbd" in n && n.kbd && (
                  <span
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity font-mono font-medium"
                    style={{
                      fontSize: 10,
                      padding: "1px 5px",
                      background: isActive(n.key) ? "rgba(205,250,80,0.06)" : "#171c26",
                      border: `1px solid ${isActive(n.key) ? "rgba(205,250,80,0.18)" : "rgba(255,255,255,0.13)"}`,
                      borderRadius: 4,
                      color: isActive(n.key) ? "#cdfa50" : "#6d7689",
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
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "14px 14px 0" }}>
            {[
              { label: "Kitchen", href: `/c/${tenantSlug}/kitchen` },
              { label: "Student menu", href: `/c/${tenantSlug}/menu` },
            ].map((pl) => (
              <Link
                key={pl.href}
                href={pl.href}
                className="flex items-center justify-between rounded-md transition-colors"
                style={{
                  padding: "7px 11px",
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  fontSize: 11,
                  color: "#6d7689",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#171c26"; (e.currentTarget as HTMLElement).style.color = "#eef1f7"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "#6d7689"; }}
              >
                <span>{pl.label}</span>
                <ExternalLink size={10} />
              </Link>
            ))}
          </div>

          {/* User row */}
          <div
            className="flex items-center gap-2.5 mx-[14px] mb-[14px] mt-2 rounded-lg"
            style={{
              padding: "8px 10px",
              background: "#171c26",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {/* Avatar: lime→mint gradient */}
            <div
              className="shrink-0 inline-flex items-center justify-center rounded-full font-mono font-bold text-[12px]"
              style={{
                width: 30,
                height: 30,
                background: "linear-gradient(135deg, #cdfa50, #3fe6a3)",
                color: "#0b0e14",
              }}
            >
              {(userEmail ?? "A").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0" style={{ lineHeight: 1.2 }}>
              <div className="truncate font-semibold" style={{ fontSize: 12.5, color: "#eef1f7" }}>
                {userEmail ?? "admin"}
              </div>
              <div
                className="font-mono"
                style={{ fontSize: 10, color: "#6d7689", letterSpacing: "0.04em" }}
              >
                canteen_admin
              </div>
            </div>
            <Link
              href="/auth/signout"
              aria-label="Sign out"
              className="inline-flex items-center justify-center rounded-md transition-colors"
              style={{ height: 28, width: 28, color: "#6d7689" }}
            >
              <LogOut size={13} />
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Topbar: sticky, blur backdrop, border-bottom */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-3"
          style={{
            height: 52,
            padding: "0 32px",
            background: "rgba(11,14,20,0.85)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Left: tenant context */}
          <div
            className="flex items-center gap-2 font-mono"
            style={{ fontSize: 11, color: "#6d7689" }}
          >
            <span className="hidden sm:inline">
              <span style={{ color: "#cdfa50" }}>{tenantSlug}</span>.tray.app/admin
            </span>
          </div>
          {/* Right: theme toggle + kitchen link */}
          <div className="flex items-center gap-2">
            <ThemeToggle className="text-[#aab3c5]" />
            <Link
              href={`/c/${tenantSlug}/kitchen`}
              className="hidden md:inline-flex items-center gap-1.5 font-mono uppercase tracking-wider transition-colors"
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 7,
                border: "1px solid rgba(255,255,255,0.13)",
                fontSize: 11,
                color: "#aab3c5",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#cdfa50"; (e.currentTarget as HTMLElement).style.color = "#cdfa50"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.13)"; (e.currentTarget as HTMLElement).style.color = "#aab3c5"; }}
            >
              <Activity size={11} /> Kitchen
            </Link>
          </div>
        </header>

        <main className="px-5 sm:px-8 py-6">{children}</main>

        {/* Footer */}
        <footer
          className="hidden lg:block border-t mt-auto"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="mx-auto max-w-7xl px-8 py-4 flex flex-wrap items-center justify-between gap-2 font-mono"
            style={{ fontSize: 11, color: "#6d7689" }}
          >
            <span>
              Powered by{" "}
              <Link href="/" className="font-medium transition-colors" style={{ color: "#aab3c5" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#cdfa50"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#aab3c5"; }}
              >Tray</Link>
              {" "}· Campus Edition · Payments by Razorpay
            </span>
            <span className="flex items-center gap-3">
              <Link href="/legal/terms" className="transition-colors hover:text-[#aab3c5]">Terms</Link>
              <Link href="/legal/privacy" className="transition-colors hover:text-[#aab3c5]">Privacy</Link>
            </span>
          </div>
        </footer>

        {/* Mobile bottom nav */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-xl"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            background: "rgba(11,14,20,0.95)",
          }}
        >
          <div className="grid grid-cols-5">
            {[
              { href: `/c/${tenantSlug}/admin/dashboard`, match: "/admin/dashboard", icon: LayoutGrid, label: "Home" },
              { href: `/c/${tenantSlug}/admin/orders`, match: "/admin/orders", icon: ListOrdered, label: "Orders" },
              { href: `/c/${tenantSlug}/admin/menu`, match: "/admin/menu", icon: BookOpen, label: "Menu" },
              { href: `/c/${tenantSlug}/admin/staff`, match: "/admin/staff", icon: Users, label: "Staff" },
              { href: `/c/${tenantSlug}/admin/settings`, match: "/admin/settings", icon: Settings, label: "Settings" },
            ].map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 font-mono uppercase tracking-wider"
                style={{
                  fontSize: 12,
                  color: pathname?.startsWith(n.match) ? "#cdfa50" : "#6d7689",
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
