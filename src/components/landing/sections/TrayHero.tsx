"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { MotionCTA, OrderJourneyVisual } from "@/lib/motion/tray-framer";

const SIGNALS = [
  ["01", "Campus", "one college, many counters"],
  ["02", "Student", "active canteens only"],
  ["03", "Kitchen", "isolated live queue"],
  ["04", "Admin", "scope-safe controls"],
] as const;

const HANDOFF = [
  "student selects counter",
  "upi confirmed",
  "kitchen ticket opens",
  "otp handoff logged",
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

function BlurFade({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: "blur(8px)", y: 14 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.58, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

export function TrayHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const visualY = useTransform(scrollYProgress, [0, 1], [0, -44]);
  const railY = useTransform(scrollYProgress, [0, 1], [0, 28]);

  return (
    <section
      ref={sectionRef}
      className="tl-hero relative isolate overflow-hidden px-5 pb-[calc(var(--section-y)+1.5rem)] pt-12 sm:px-8 sm:pt-16 lg:px-10 lg:pb-[calc(var(--section-y-lg)+1rem)] lg:pt-20"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[var(--tray-border-strong)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-[max(1.25rem,calc((100vw-80rem)/2))] top-20 hidden h-[72%] w-px bg-[var(--tray-border-strong)] lg:block"
        style={reduced ? undefined : { y: railY }}
      />

      <div className="mx-auto grid max-w-7xl gap-12 overflow-hidden lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-start lg:gap-16">
        <div className="min-w-0 lg:pl-10">
          <BlurFade
            delay={0.04}
            className="mb-5 inline-flex items-center gap-2 border border-[var(--tray-border)] bg-[var(--tray-surface-strong)] px-3 py-2 font-code text-[0.58rem] uppercase tracking-[0.14em] text-[var(--tray-muted)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--tray-clay)]" />
            Campus ops console / live service
          </BlurFade>

          <h1
            aria-label="Food ops for one campus."
            className="max-w-[11.5ch] font-editorial text-[clamp(3.1rem,7.2vw,6.6rem)] font-semibold leading-[0.88] text-[var(--tray-ink)]"
            style={{ textWrap: "balance" }}
          >
            <span className="tl-line">
              <span className="tl-line-in" style={{ animationDelay: "0.05s" }}>
                Food ops
              </span>
            </span>
            <span className="tl-line">
              <span className="tl-line-in" style={{ animationDelay: "0.16s" }}>
                for one
              </span>
            </span>
            <span className="tl-line">
              <span className="tl-line-in text-[var(--tray-clay)]" style={{ animationDelay: "0.27s" }}>
                campus.
              </span>
            </span>
          </h1>

          <BlurFade delay={0.32}>
            <p className="mt-6 max-w-[45ch] font-bricolage text-[1.02rem] leading-[1.68] text-[var(--tray-muted)]">
              Tray runs the college food loop: students see every open canteen, kitchen teams stay inside their own queue, and admins control only their assigned scope.
            </p>
          </BlurFade>

          <BlurFade delay={0.4}>
            <div className="mt-8 grid max-w-2xl border border-[var(--tray-border)] bg-[var(--tray-surface-strong)] sm:grid-cols-4">
              {SIGNALS.map(([n, title, body]) => (
                <div key={n} className="border-b border-[var(--tray-border)] p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                  <p className="font-code text-[0.58rem] text-[var(--tray-clay)]">{n}</p>
                  <p className="mt-3 font-ui text-[0.92rem] font-semibold text-[var(--tray-ink)]">{title}</p>
                  <p className="mt-1 max-w-[18ch] font-code text-[0.58rem] uppercase leading-[1.45] tracking-[0.08em] text-[var(--tray-muted)]">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </BlurFade>

          <BlurFade
            delay={0.48}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
          >
            <MotionCTA
              href="#portals"
              variant="primary"
              className="tl-cta-primary w-full rounded-[var(--tray-radius-md)] bg-[var(--tray-ink)] px-7 py-3.5 text-center font-bricolage text-[0.9375rem] font-semibold text-[var(--tray-cream)] sm:w-auto"
            >
              Open live demos
            </MotionCTA>
            <MotionCTA
              href="/get-started"
              variant="secondary"
              className="tl-cta-secondary w-full rounded-[var(--tray-radius-md)] border-2 border-[var(--tray-ink)] bg-transparent px-7 py-3.5 text-center font-bricolage text-[0.9375rem] font-semibold text-[var(--tray-ink)] sm:w-auto"
            >
              I run a canteen
            </MotionCTA>
          </BlurFade>
        </div>

        <motion.div
          className="tl-hero-visual min-w-0 w-full lg:sticky lg:top-[calc(var(--tray-nav-h)+5.5rem)]"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.14 }}
          style={reduced ? undefined : { y: visualY }}
        >
          <div className="border-2 border-[var(--tray-ink)] bg-[var(--tray-surface-strong)] p-1 shadow-[6px_6px_0_var(--tray-shadow)]">
            <div className="flex items-center justify-between border-b border-dashed border-[var(--tray-border-strong)] px-3 py-2">
              <p className="font-code text-[0.5625rem] uppercase tracking-[0.18em] text-[var(--tray-muted)]">
                Order state packet
              </p>
              <span className="font-code text-[0.56rem] uppercase tracking-[0.14em] text-[var(--tray-clay)]">
                live
              </span>
            </div>
            <OrderJourneyVisual className="rounded-none border-0 shadow-none" />
          </div>

          <div className="mt-4 overflow-hidden border border-[var(--tray-border)] bg-[var(--tray-surface-strong)]">
            <motion.div
              className="flex w-max items-center gap-5 px-4 py-3"
              animate={reduced ? undefined : { x: ["0%", "-50%"] }}
              transition={{ duration: 18, ease: "linear", repeat: Infinity }}
            >
              {[...HANDOFF, ...HANDOFF].map((item, i) => (
                <span key={`${item}-${i}`} className="inline-flex items-center gap-2 font-code text-[0.58rem] uppercase tracking-[0.14em] text-[var(--tray-muted)]">
                  <span className="h-1.5 w-1.5 bg-[var(--tray-clay)]" />
                  {item}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
