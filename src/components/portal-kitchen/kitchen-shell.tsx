"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  BellOff,
  ChefHat,
  Clock3,
  History,
  ListOrdered,
  Sparkles,
  TrendingUp,
  UserRoundCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

const cp = (slug: string, path: string) => `/c/${slug}${path}`;

type NavKey = "queue" | "specials" | "history" | "insights";

export function KitchenShell({
  tenantName,
  tenantSlug,
  clock,
  wsConnected,
  incomingCount,
  activeNav = "queue",
  headerActions,
  soundsOn,
  onSoundsToggle,
  children,
}: {
  tenantName: string;
  tenantSlug: string;
  clock: string;
  wsConnected: boolean;
  incomingCount: number;
  activeNav?: NavKey;
  headerActions?: ReactNode;
  soundsOn?: boolean;
  onSoundsToggle?: () => void;
  children: ReactNode;
}) {
  const dateLine = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const serviceLabel = (() => {
    const h = new Date().getHours();
    if (h < 11) return "Breakfast Service";
    if (h < 15) return "Lunch Service";
    if (h < 18) return "Evening Snacks";
    return "Dinner Service";
  })();

  const nav: { key: NavKey; label: string; icon: ReactNode; href?: string; badge?: number }[] = [
    { key: "queue", label: "Live queue", icon: <ListOrdered size={16} />, badge: incomingCount },
    { key: "specials", label: "Today's specials", icon: <Sparkles size={16} />, href: cp(tenantSlug, "/admin/menu") },
    { key: "history", label: "History", icon: <History size={16} />, href: cp(tenantSlug, "/kitchen/history") },
    { key: "insights", label: "Insights", icon: <TrendingUp size={16} />, href: cp(tenantSlug, "/admin/analytics") },
  ];

  return (
    <div className="app relative z-10 grid min-h-screen lg:grid-cols-[228px_1fr]">
      <aside className="sb hidden lg:flex flex-col gap-1 border-r border-tomato-900/10 bg-cream-50 px-4 py-[18px] sticky top-0 h-screen">
        <Link href="/" className="brand flex items-center gap-2 border-b border-tomato-900/10 pb-[18px] mb-3.5 px-2 pt-1.5 font-display text-[22px] font-medium tracking-[-0.02em] text-tomato-900 hover:text-tomato-500 transition-colors" title="Tray home">
          <span className="brand-mark inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-tomato-500 font-display text-[18px] italic font-medium text-cream-50 shadow-[inset_0_-3px_0_rgba(0,0,0,0.14)]">T</span>
          Tray<span className="dot italic text-tomato-500 -ml-0.5">.</span>
        </Link>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-tomato-900/55 px-2 py-3 font-semibold">Kitchen</div>
        {nav.map((item) => {
          const active = item.key === activeNav;
          const className = cn(
            "sb-link flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium transition-[background-color,color] duration-150",
            active ? "bg-tomato-900 text-cream-50 font-semibold" : "text-tomato-900/75 hover:bg-cream-300/80 hover:text-tomato-900",
          );
          const inner = (
            <>
              <span className={cn("opacity-80", active && "opacity-100")}>{item.icon}</span>
              {item.label}
              {item.badge != null && item.badge > 0 ? (
                <span className={cn("ml-auto font-mono text-[10px] font-bold px-1.5 py-0.5 rounded", active ? "bg-cream-50 text-tomato-900" : "bg-tomato-500 text-cream-50")}>
                  {item.badge}
                </span>
              ) : null}
            </>
          );
          if (item.href) return <Link key={item.key} href={item.href} className={className}>{inner}</Link>;
          return <div key={item.key} className={className} aria-current={active ? "page" : undefined}>{inner}</div>;
        })}
        <div className="mt-auto flex flex-col gap-3 border-t border-tomato-900/10 pt-[18px]">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-tomato-900/55 px-2 font-semibold">Other portals</div>
          <div className="sb-portals flex flex-col gap-1">
            <Link href={cp(tenantSlug, "/menu")} className="flex items-center justify-between rounded px-2 py-1.5 font-mono text-[11px] tracking-wide text-tomato-900/55 transition-colors hover:bg-cream-300/80 hover:text-tomato-900">
              Student ordering <span>→</span>
            </Link>
            <Link href={cp(tenantSlug, "/admin/dashboard")} className="flex items-center justify-between rounded px-2 py-1.5 font-mono text-[11px] tracking-wide text-tomato-900/55 transition-colors hover:bg-cream-300/80 hover:text-tomato-900">
              Admin console <span>→</span>
            </Link>
          </div>
          <div className="flex items-center gap-2.5 px-2 py-1.5 text-[13px]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tomato-500 font-display text-sm font-medium text-cream-50"><ChefHat size={14} /></span>
            <span className="flex flex-col leading-tight">
              <span className="font-semibold text-tomato-900">{tenantName}</span>
              <span className="font-mono text-[10px] tracking-wide text-tomato-900/55 uppercase">Kitchen staff</span>
            </span>
          </div>
        </div>
      </aside>

      <nav className="kitchen-mobile-bar fixed bottom-0 left-0 right-0 z-40 flex lg:hidden border-t border-tomato-900/15 bg-cream-50/95 backdrop-blur-md" aria-label="Kitchen quick navigation">
        <Link href={cp(tenantSlug, "/kitchen")} className={cn("relative flex flex-1 flex-col items-center justify-center gap-0.5 min-h-14 py-2 text-[10px] font-mono font-semibold uppercase tracking-wide", activeNav === "queue" ? "text-tomato-500" : "text-tomato-900/60")}>
          <ListOrdered size={20} aria-hidden />
          <span>Queue</span>
          {incomingCount > 0 ? <span className="absolute top-1.5 ml-8 min-w-[18px] rounded-full bg-tomato-500 px-1 text-[9px] font-bold text-cream-50 tabular">{incomingCount > 99 ? "99+" : incomingCount}</span> : null}
        </Link>
        <Link href={cp(tenantSlug, "/kitchen/history")} className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 min-h-14 py-2 text-[10px] font-mono font-semibold uppercase tracking-wide", activeNav === "history" ? "text-tomato-500" : "text-tomato-900/60")}>
          <History size={20} aria-hidden />
          <span>History</span>
        </Link>
        {onSoundsToggle != null && soundsOn != null ? (
          <button type="button" onClick={onSoundsToggle} className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 min-h-14 min-w-[48px] py-2 text-[10px] font-mono font-semibold uppercase tracking-wide", soundsOn ? "text-tomato-500" : "text-tomato-900/60")} aria-label={soundsOn ? "Mute chime" : "Unmute chime"}>
            {soundsOn ? <Bell size={20} aria-hidden /> : <BellOff size={20} aria-hidden />}
            <span>Sounds</span>
          </button>
        ) : null}
        <Link href={cp(tenantSlug, "/kitchen/staff-select")} className="flex flex-1 flex-col items-center justify-center gap-0.5 min-h-14 min-w-[48px] py-2 text-[10px] font-mono font-semibold uppercase tracking-wide text-tomato-900/60">
          <UserRoundCog size={20} aria-hidden />
          <span>Staff</span>
        </Link>
      </nav>

      <div className="main min-w-0 overflow-x-hidden px-6 pt-6 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-16 md:px-8">
        <header className="page-head flex flex-wrap items-end justify-between gap-4 border-b border-tomato-900/10 pb-[18px] mb-6">
          <div className="l min-w-0">
            <span className="eyebrow font-mono text-[11px] uppercase tracking-[0.16em] text-tomato-900/55 font-medium">
              {dateLine} · {tenantName} · {serviceLabel}
            </span>
            <h1 className="mt-1.5 font-display text-[clamp(2rem,5vw,3rem)] lg:text-[48px] font-medium tracking-[-0.03em] leading-none">
              Kitchen <span className="it italic text-tomato-500">queue.</span>
            </h1>
            <div className="sub mt-1 flex flex-wrap items-center gap-3.5 font-mono text-[11px] uppercase tracking-[0.1em] text-tomato-900/55">
              <span className="clk tabular font-semibold text-tomato-900 flex items-center gap-1">
                <Clock3 size={12} /> {clock}
              </span>
              <span className={cn("live inline-flex items-center gap-1.5 normal-case tracking-normal font-sans font-semibold", wsConnected ? "text-olive-700" : "text-amber-700")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", wsConnected ? "bg-olive-700 animate-pulse" : "bg-amber-500")} />
                {wsConnected ? "Connected · WS" : "Reconnecting"}
              </span>
            </div>
          </div>
          {headerActions ? <div className="r flex flex-wrap items-center gap-2">{headerActions}</div> : null}
        </header>
        {children}
      </div>
    </div>
  );
}
