"use client";

import Link from "next/link";
import { ArrowLeft, Clock, History, User, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ResolvedTenant } from "@/lib/tenant";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getBrowserClient } from "@/lib/supabase/browser";

function currentServiceLabel(): string {
  // Extract the current IST hour directly from a UTC offset calculation.
  const nowUtcMs = Date.now();
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // UTC+5:30
  const h = new Date(nowUtcMs + istOffsetMs).getUTCHours();
  if (h < 11) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 18) return "Evening";
  return "Dinner";
}

export function StudentTopBar({ tenant }: { tenant: ResolvedTenant }) {
  const [t, setT] = useState<string>("");
  const [serviceLabel, setServiceLabel] = useState<string>(() => currentServiceLabel());
  const [isSignedIn, setIsSignedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getBrowserClient().auth.getSession().then(({ data }) => {
      setIsSignedIn(!!data.session);
    });
  }, []);
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
    const id = setInterval(() => {
      tick();
      setServiceLabel(currentServiceLabel());
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-[color:var(--color-paper)]/85 backdrop-blur-xl border-b border-[color:var(--color-line)]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            aria-label="Go back"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push(`/c/${tenant.slug}/menu`);
              }
            }}
            className="inline-flex items-center gap-1 text-[12px] font-mono text-[color:var(--color-ink)]/50 hover:text-[color:var(--color-ink)] transition-colors"
          >
            <ArrowLeft size={13} /> Back
          </button>
          <Link href={`/c/${tenant.slug}/menu`} className="inline-flex items-center gap-2 font-display text-[17px] tracking-tight">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-ocean-500 text-white font-mono text-[11px] font-bold">T</span>
            <span className="font-medium">Tray<span className="italic text-ocean-500">.</span></span>
          </Link>
        </div>
        <div className="flex flex-col items-center text-center flex-1">
          <div
            className="text-[13px] font-semibold tracking-tight text-[color:var(--color-ink)] truncate max-w-[180px] sm:max-w-none"
            style={{ fontFamily: "var(--font-jakarta, var(--font-manrope))" }}
          >
            {tenant.name}
          </div>
          <div
            className="hidden sm:flex text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-ink)]/50 truncate max-w-[220px]"
            style={{ fontFamily: "var(--font-barlow, var(--font-manrope))" }}
          >
            {tenant.college_name}
          </div>
          <div className="text-[10px] font-mono tabular text-[color:var(--color-ink)]/45 flex items-center gap-1.5 sm:hidden">
            <Clock size={10} />
            {t || "--:--"} IST
          </div>
          <div className="hidden sm:flex text-[11px] font-mono tabular text-[color:var(--color-ink)]/45 items-center gap-1.5">
            <Clock size={10} />
            {serviceLabel} · {t || "--:--"} IST
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
          {isSignedIn ? (
            <button
              type="button"
              aria-label="Sign out"
              onClick={() => {
                getBrowserClient().auth.signOut().then(() => {
                  router.push(`/c/${tenant.slug}/login`);
                });
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-line)] hover:border-rose-500 hover:text-rose-500 transition-colors"
            >
              <LogOut size={15} />
            </button>
          ) : (
            <Link
              href={`/c/${tenant.slug}/login`}
              aria-label="Sign in"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-line)] hover:border-ocean-500 hover:text-ocean-500 transition-colors"
            >
              <User size={15} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
