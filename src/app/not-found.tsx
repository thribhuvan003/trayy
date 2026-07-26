"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  prefersReducedMotion,
  registerTrayGsap,
  scrambleText,
} from "@/lib/motion/tray-motion";

export default function NotFound() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      registerTrayGsap();
      if (prefersReducedMotion()) return;

      const digits = rootRef.current?.querySelector("[data-404]") as HTMLElement;
      const chip   = rootRef.current?.querySelector("[data-status-chip]") as HTMLElement;

      gsap
        .timeline()
        .fromTo(
          "[data-ticket]",
          { y: -50, rotate: -2, opacity: 0 },
          { y: 0, rotate: 0, opacity: 1, duration: 0.75, ease: "power4.out" }
        )
        .add(() => scrambleText(digits, "404", { duration: 0.9 }))
        .fromTo(
          "[data-404-copy]",
          { y: 22, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.55, stagger: 0.08 },
          "-=0.4"
        )
        .call(() => {
          if (chip) chip.textContent = "Order not found";
        });
    },
    { scope: rootRef }
  );

  return (
    <main
      ref={rootRef}
      className="tray-page grid min-h-svh place-items-center px-5 py-10"
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
        {/* Left — copy */}
        <div>
          <p className="font-code mb-4 text-xs uppercase tracking-[0.3em] text-[var(--tray-muted)]">
            Error · 404 · Counter closed
          </p>

          <h1
            data-404-copy
            className="font-editorial text-[clamp(4rem,10vw,10rem)] font-black leading-[0.84] tracking-[-0.08em]"
          >
            Order not found.
          </h1>

          <p data-404-copy className="mt-6 max-w-xl text-lg leading-8 opacity-70">
            This counter does not exist, or the order was already picked up.
          </p>

          <div data-404-copy className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex justify-center rounded-full bg-[var(--tray-ink)] px-7 py-4 text-sm font-semibold text-[var(--tray-cream)] transition hover:opacity-85"
            >
              Back to Tray
            </Link>
            <Link
              href="/demo/student"
              className="inline-flex justify-center rounded-full border border-[var(--tray-border)] px-7 py-4 text-sm font-semibold transition hover:bg-white/30"
            >
              Open live demo
            </Link>
          </div>
        </div>

        {/* Right — receipt ticket */}
        <div
          data-ticket
          className="rounded-[2rem] border border-[var(--tray-border)] bg-white/60 p-6 shadow-[0_28px_90px_var(--tray-shadow)]"
        >
          <div className="flex items-center justify-between border-b border-dashed border-[var(--tray-border)] pb-5">
            <div>
              <p className="font-code text-[0.68rem] uppercase tracking-[0.2em] text-[var(--tray-muted)]">
                Receipt
              </p>
              <p className="mt-1 text-xl font-semibold">Order #404</p>
            </div>
            <span
              data-status-chip
              className="font-code rounded-full bg-[var(--tray-clay)]/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-[var(--tray-clay)]"
            >
              Searching
            </span>
          </div>

          {/* Scramble digits */}
          <div
            data-404
            className="font-editorial py-12 text-center text-[clamp(7rem,18vw,14rem)] font-black leading-none tracking-[-0.08em]"
          >
            000
          </div>

          <div className="grid gap-3 border-t border-dashed border-[var(--tray-border)] pt-5">
            {([
              ["Status",  "Missing"],
              ["Counter", "Closed"],
              ["OTP",     "4 0 4"],
              ["Total",   "₹0"],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="font-code text-xs uppercase tracking-[0.18em] text-[var(--tray-muted)]">
                  {label}
                </span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
