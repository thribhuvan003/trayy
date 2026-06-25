"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { MotionCTA, OrderJourneyVisual } from "@/lib/motion/tray-framer";

const RECEIPT_ROWS = [
  { n: "01", text: "One login, every canteen on campus" },
  { n: "02", text: "Pay by UPI → kitchen cooks → pickup by OTP" },
  { n: "03", text: "Built for 12:45, not delivery apps" },
] as const;

const rowEase = [0.22, 1, 0.36, 1] as const;

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
      initial={{ opacity: 0, filter: "blur(8px)", y: 12 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{ duration: 0.55, ease: rowEase, delay }}
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
  const visualY = useTransform(scrollYProgress, [0, 1], [0, -40]);

  return (
    <section
      ref={sectionRef}
      className="relative isolate px-5 pb-[var(--section-y)] pt-12 sm:px-8 sm:pt-16 lg:px-10 lg:pb-[var(--section-y-lg)] lg:pt-20"
    >
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start lg:gap-16">
        <div>
          <BlurFade
            delay={0.05}
            className="mb-5 font-code text-[0.625rem] uppercase tracking-[0.16em] text-[var(--tray-muted)] lg:hidden"
          >
            Campus canteen · UPI · OTP pickup
          </BlurFade>

          <h1
            className="max-w-[13ch] font-editorial text-[clamp(2.5rem,5.4vw,4.75rem)] font-medium leading-[0.97] tracking-[-0.02em] text-[var(--tray-ink)]"
            style={{ textWrap: "balance" }}
          >
            <span className="tl-line">
              <span className="tl-line-in" style={{ animationDelay: "0.05s" }}>
                Pay from your <span className="text-[var(--tray-clay)]">phone.</span>
              </span>
            </span>
            <span className="tl-line">
              <span className="tl-line-in" style={{ animationDelay: "0.16s" }}>
                Collect before the <span className="text-[var(--tray-clay)]">bell.</span>
              </span>
            </span>
          </h1>

          <BlurFade delay={0.28}>
            <p className="mt-6 max-w-[40ch] font-bricolage text-[1rem] leading-[1.65] text-[var(--tray-muted)]">
              One queue for every counter. Kitchen, student, and admin stay on the same order — right through the lunch rush.
            </p>
          </BlurFade>

          <motion.ul
            className="mt-9 divide-y divide-[var(--tray-border)] border-y border-[var(--tray-border)]"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
            }}
          >
            {RECEIPT_ROWS.map((row) => (
              <motion.li
                key={row.n}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: rowEase } },
                }}
                className="flex items-baseline gap-4 py-3.5"
              >
                <span className="w-6 shrink-0 font-code text-[0.6875rem] font-medium tracking-[0.1em] text-[var(--tray-clay)]">
                  {row.n}
                </span>
                <span className="font-bricolage text-[0.9375rem] leading-6 text-[var(--tray-ink)]/88">
                  {row.text}
                </span>
              </motion.li>
            ))}
          </motion.ul>

          <BlurFade
            delay={0.42}
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

          <motion.a
            href="#portals"
            className="mt-4 inline-flex font-code text-[0.625rem] uppercase tracking-[0.14em] text-[var(--tray-muted)] underline-offset-4 hover:text-[var(--tray-ink)] hover:underline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.36, delay: 0.34 }}
          >
            See the three live demos ↓
          </motion.a>
        </div>

        <motion.div
          className="tl-hero-visual lg:sticky lg:top-[calc(var(--tray-nav-h)+5.5rem)] lg:rotate-[0.6deg]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: rowEase, delay: 0.14 }}
          style={reduced ? undefined : { y: visualY }}
        >
          <div className="border-2 border-[var(--tray-ink)] bg-[var(--tray-cream)] p-1 shadow-[4px_4px_0_var(--tray-shadow)]">
            <div className="border-b border-dashed border-[var(--tray-border-strong)] px-3 py-2">
              <p className="font-code text-[0.5625rem] uppercase tracking-[0.2em] text-[var(--tray-muted)]">
                Live order flow
              </p>
            </div>
            <OrderJourneyVisual className="rounded-none border-0 shadow-none" />
          </div>
          <p className="mt-3 text-center font-code text-[0.5625rem] uppercase tracking-[0.18em] text-[var(--tray-muted)] sm:text-left">
            Student view · order #2841
          </p>
        </motion.div>
      </div>
    </section>
  );
}