"use client";

import Link from "next/link";
import { Clock, History, User } from "lucide-react";
import { useEffect, useState } from "react";
import type { ResolvedTenant } from "@/lib/tenant";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function StudentTopBar({ tenant }: { tenant: ResolvedTenant }) {
  const [t, setT] = useState<string>("");
  useEffect(() => {
    const tick = () =>
      setT(
        new Intl.DateTimeFormat("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }).format(new Date())
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-[color:var(--color-paper)]/85 backdrop-blur-xl border-b border-[color:var(--color-line)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <Link href={`/c/${tenant.slug}/menu`} className="inline-flex items-center gap-2 font-display text-[17px] tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-ocean-500 text-white font-mono text-[11px] font-bold">T</span>
          <span className="font-medium">Tray<span className="italic text-ocean-500">.</span></span>
        </Link>
        <div className="hidden sm:flex flex-col items-center text-center flex-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55">
            {tenant.college_name}
          </div>
          <div className="text-[11px] font-mono tabular text-[color:var(--color-ink)]/45 flex items-center gap-1.5">
            <Clock size={10} />
            Lunch · {t || "--:--"} IST
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href={`/c/${tenant.slug}/orders`}
            aria-label="My orders"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-line)] hover:border-ocean-500 hover:text-ocean-500 transition-colors"
          >
            <History size={15} />
          </Link>
          <Link
            href={`/c/${tenant.slug}/login`}
            aria-label="Account"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-line)] hover:border-ocean-500 hover:text-ocean-500 transition-colors"
          >
            <User size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
