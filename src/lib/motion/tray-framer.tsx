"use client";

/**
 * Tray landing page animation primitives — built on framer-motion.
 * Palette adapted to sand/clay/ink instead of the dark theme.
 * Keep PiranhaPortalsSection on GSAP (horizontal pin scroll).
 */

import React, { ReactNode, useEffect, useState, useRef, useMemo } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  AnimatePresence,
  type Variants,
  type HTMLMotionProps,
} from "framer-motion";

// ── Motion tokens ─────────────────────────────────────────────────────────────
export const tm = {
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  easeSharp: [0.16, 1, 0.3, 1] as [number, number, number, number],
  fast: 0.22,
  base: 0.6,
  slow: 0.9,
  stagger: 0.08,
};

// ── Variant presets ───────────────────────────────────────────────────────────
export const fadeUpVar: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.48, ease: tm.ease } },
};

export const softFadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: tm.ease } },
};

export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: tm.ease } },
};

export const maskLine: Variants = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.72, ease: tm.easeSharp } },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.06, staggerChildren: tm.stagger } },
};

// ── SectionReveal — scroll-triggered stagger container ────────────────────────
type MotionDivProps = HTMLMotionProps<"div"> & { children: ReactNode };

type SectionRevealProps = MotionDivProps & {
  amount?: number;
  delay?: number;
  as?: "section" | "div" | "footer";
};

export const SectionReveal = React.forwardRef<HTMLElement, SectionRevealProps>(function SectionReveal(
  { children, className, amount = 0.18, delay = 0, as = "section", ...props },
  ref,
) {
  const Component =
    as === "footer" ? motion.footer : as === "div" ? motion.div : motion.section;

  return (
    <Component
      ref={ref as React.Ref<HTMLDivElement>}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        show: { transition: { delay, staggerChildren: tm.stagger } },
      }}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
});

// ── SectionFx — connective section-to-section entrance ────────────────────────
// Rises + fades a whole section into view as you scroll. Layered under each
// section's own signature effect to make the page feel alive between sections.
export function SectionFx({
  children,
  className,
  amount = 0.18,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 40 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── RevealItem — individual animated child ────────────────────────────────────
export function RevealItem({
  children,
  className,
  variant = "fade",
  ...props
}: MotionDivProps & { variant?: "fade" | "card" | "soft" }) {
  const v = variant === "card" ? cardReveal : variant === "soft" ? softFadeUp : fadeUpVar;
  return <motion.div variants={v} className={className} {...props}>{children}</motion.div>;
}

// ── HeadlineReveal — masked line-by-line reveal ───────────────────────────────
export function HeadlineReveal({
  lines,
  as = "h1",
  className,
  lineClassName,
  style,
}: {
  lines: (string | ReactNode)[];
  as?: "h1" | "h2" | "h3";
  className?: string;
  lineClassName?: string;
  style?: React.CSSProperties;
}) {
  const Comp = as === "h1" ? motion.h1 : as === "h2" ? motion.h2 : motion.h3;
  return (
    <Comp variants={staggerContainer} className={className} style={style}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.02em]">
          <motion.span variants={maskLine} className={`block ${lineClassName ?? ""}`}>
            {line}
          </motion.span>
        </span>
      ))}
    </Comp>
  );
}

// ── AnimatedNav — scroll-aware sticky glass header ────────────────────────────
export function AnimatedNav({
  children,
  className,
  style,
}: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 48], ["#faf8f3", "#f4f0e6"]);
  const borderO = useTransform(scrollY, [0, 48], [0, 1]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: tm.ease }}
      style={{ backgroundColor: bg, ...style }}
      className={`relative ${className ?? ""}`}
    >
      <motion.div
        style={{ opacity: borderO }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[var(--tray-border-strong)]"
      />
      {children}
    </motion.div>
  );
}

// ── MotionCTA — button with shine sweep + arrow nudge ─────────────────────────
export function MotionCTA({
  children,
  className,
  style,
  href,
  onClick,
  variant = "primary",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  [key: string]: unknown;
}) {
  const reduce = useReducedMotion();

  const content = (
    <span className="relative flex items-center gap-2">
      {children}
      {!reduce && (
        <motion.span
          aria-hidden
          className="inline-block opacity-70"
          variants={{ rest: { x: 0 }, hover: { x: 3 } }}
          transition={{ duration: tm.fast, ease: tm.ease }}
        >
          →
        </motion.span>
      )}
    </span>
  );

  const motionProps = {
    initial: "rest",
    animate: "rest",
    whileHover: "hover",
    whileTap: { y: 1 },
    transition: { duration: tm.fast, ease: tm.ease },
    className: `relative overflow-hidden ${className ?? ""}`,
    style,
    ...rest,
  };

  if (href) return <motion.a href={href} {...motionProps}>{content}</motion.a>;
  return <motion.button type="button" onClick={onClick} {...motionProps}>{content}</motion.button>;
}

// ── CountUp metric ────────────────────────────────────────────────────────────
export function CountUp({
  end,
  suffix = "",
  prefix = "",
  duration = 1200,
  className,
}: {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.7 });
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setValue(end); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, end, duration]);

  return <span ref={ref} className={className}>{prefix}{value}{suffix}</span>;
}

// ── Realtime pipeline visual (scroll-scrubbed) ────────────────────────────────
const SYNC_STEPS = [
  { tag: "Kitchen", title: "Change saved", body: "New item, price edit, or sold-out toggle committed." },
  { tag: "Database", title: "Row written", body: "Postgres holds the single source of truth." },
  { tag: "Broadcast", title: "Channel fans out", body: "Supabase Realtime pushes to subscribed clients." },
  { tag: "Portals", title: "Screens update", body: "Student menu, kitchen queue, and admin totals — no refresh." },
] as const;

export function SyncPipelineVisual({
  className,
  scrollRoot,
}: {
  className?: string;
  scrollRoot?: React.RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: scrollRoot ?? containerRef,
    offset: ["start 0.88", "end 0.12"],
  });

  const packetX = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const trackFill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (reduce) return;
    const step = Math.min(SYNC_STEPS.length - 1, Math.floor(v * SYNC_STEPS.length));
    setActiveStep(step);
  });

  useEffect(() => {
    if (reduce) setActiveStep(SYNC_STEPS.length - 1);
  }, [reduce]);

  return (
    <motion.div
      ref={containerRef}
      variants={cardReveal}
      className={`rounded-lg border p-5 sm:p-7 ${className ?? ""}`}
      style={{ border: "1px solid var(--tray-border)", background: "var(--tray-surface-strong)" }}
    >
      <div className="relative mb-10 hidden sm:block">
        <div
          className="absolute left-[6%] right-[6%] top-[7px] h-px"
          style={{ background: "var(--tray-border)" }}
        />
        <motion.div
          className="absolute left-[6%] top-[7px] h-px origin-left"
          style={{ background: "var(--tray-clay)", width: trackFill }}
        />
        <motion.div
          className="absolute top-[3px] h-[9px] w-[9px] -translate-x-1/2 rounded-sm"
          style={{
            left: packetX,
            background: "var(--tray-clay)",
            boxShadow: reduce ? "none" : "0 0 0 3px color-mix(in srgb, var(--tray-clay) 22%, transparent)",
          }}
        />
        <div className="grid grid-cols-4">
          {SYNC_STEPS.map((step, i) => {
            const on = activeStep === i;
            const passed = activeStep > i;
            return (
              <div key={step.tag} className="flex justify-center">
                <motion.div
                  animate={{
                    scale: on ? 1.15 : 1,
                    backgroundColor: on
                      ? "var(--tray-clay)"
                      : passed
                        ? "color-mix(in srgb, var(--tray-clay) 28%, var(--tray-surface-strong))"
                        : "var(--tray-surface)",
                    borderColor: on ? "var(--tray-clay)" : "var(--tray-border)",
                  }}
                  transition={{ duration: 0.32, ease: tm.ease }}
                  className="relative z-10 h-[15px] w-[15px] rounded-sm border"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 sm:gap-5">
        {SYNC_STEPS.map((step, i) => {
          const on = activeStep === i;
          const passed = activeStep > i;
          return (
            <motion.div
              key={step.tag}
              animate={{
                opacity: on ? 1 : passed ? 0.78 : 0.42,
                y: on ? -2 : 0,
              }}
              transition={{ duration: 0.32, ease: tm.ease }}
              className="flex flex-col gap-2 border-t border-[var(--tray-border)] pt-4 sm:border-t-0 sm:pt-0"
            >
              <div className="flex items-center gap-2 sm:hidden">
                <motion.div
                  animate={{
                    backgroundColor: on ? "var(--tray-clay)" : "var(--tray-surface)",
                    borderColor: on ? "var(--tray-clay)" : "var(--tray-border)",
                  }}
                  className="h-2.5 w-2.5 rounded-sm border"
                />
                <p className="font-code text-[0.62rem] tracking-[0.06em] text-[var(--tray-muted)]">
                  {step.tag}
                </p>
              </div>
              <p className="hidden font-code text-[0.62rem] tracking-[0.06em] text-[var(--tray-muted)] sm:block">
                {step.tag}
              </p>
              <p
                className="font-ui text-[0.98rem] font-semibold leading-snug tracking-tight text-[var(--tray-ink)]"
                style={{ color: on ? "var(--tray-ink)" : undefined }}
              >
                {step.title}
              </p>
              <p className="text-[0.82rem] leading-[1.55] text-[var(--tray-muted)]">{step.body}</p>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-7 font-code text-[0.6rem] tracking-[0.04em] text-[var(--tray-muted)]">
        {reduce ? "All four stages complete." : "Scroll to move the update through the pipeline."}
      </p>
    </motion.div>
  );
}

// ── Order journey visual for hero ─────────────────────────────────────────────
const ORDER_STEPS = [
  { label: "Added to tray", title: "Paneer Roti · ₹80", state: "CART", color: "var(--color-ocean-500, #6E86AB)" },
  { label: "UPI confirmed",  title: "Payment received", state: "PAID", color: "var(--tray-green, #2A6E3A)" },
  { label: "Kitchen live",   title: "Batch 4 preparing", state: "PREP", color: "var(--tray-clay)" },
  { label: "OTP ready",      title: "Code 7342 · collect", state: "READY", color: "var(--tray-green, #2A6E3A)" },
];

export function OrderJourneyVisual({ className }: { className?: string }) {
  const [step, setStep] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setStep(s => (s + 1) % ORDER_STEPS.length), 1600);
    return () => clearInterval(id);
  }, [reduce]);

  const current = ORDER_STEPS[step];

  return (
    <motion.div
      variants={cardReveal}
      className={`overflow-hidden rounded-xl border ${className ?? ""}`}
      style={{ border: "1px solid var(--tray-border)", background: "var(--tray-cream)" }}
    >
      <div className="border-b p-7" style={{ borderColor: "var(--tray-border)" }}>
        <p className="text-[0.78rem] uppercase tracking-[0.28em]" style={{ fontFamily: "var(--font-dm-mono)", color: "var(--tray-muted)" }}>
          Live order
        </p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[1.2rem] font-semibold tracking-tight" style={{ fontFamily: "var(--font-jakarta)", color: "var(--tray-ink)" }}>
            Lunch order
          </p>
          <span className="flex items-center gap-1.5 text-[0.78rem] uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-dm-mono)", color: "var(--tray-green, #2A6E3A)" }}>
            <motion.span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--tray-green, #2A6E3A)" }} animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
            Kitchen open
          </span>
        </div>
      </div>

      <div className="space-y-3.5 p-6">
        {["Paneer Roti", "Masala Chai", "Samosa"].map((item, i) => (
          <motion.div
            key={item}
            animate={{ opacity: i <= Math.min(step, 2) ? 1 : 0.45 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between rounded-xl px-5 py-3.5"
            style={{ background: i <= Math.min(step, 2) ? "rgba(255,255,255,0.7)" : "rgba(87,87,87,0.06)", border: "1px solid var(--tray-border)" }}
          >
            <span className="text-[1.05rem] font-medium" style={{ color: "var(--tray-ink)" }}>{item}</span>
            <AnimatePresence mode="wait">
              {i <= Math.min(step, 2) ? (
                <motion.span key="added" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.2 }}
                  className="rounded-full px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em]"
                  style={{ background: "rgba(42,110,58,0.12)", color: "var(--tray-green, #2A6E3A)", fontFamily: "var(--font-dm-mono)" }}>
                  Added ✓
                </motion.span>
              ) : (
                <motion.span key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-full px-3 py-1 text-[0.7rem] uppercase tracking-[0.14em]"
                  style={{ background: "rgba(87,87,87,0.08)", color: "var(--tray-muted)", fontFamily: "var(--font-dm-mono)" }}>
                  Add
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      <div className="m-6 rounded-[1.25rem] border overflow-hidden" style={{ background: current.state === "READY" ? "rgba(42,110,58,0.04)" : "rgba(255,255,255,0.50)", borderColor: current.state === "READY" ? "rgba(42,110,58,0.3)" : "var(--tray-border)", transition: "all 0.4s ease" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.state}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.32, ease: tm.ease }}
            className={current.state === "READY" ? "p-8" : "p-6"}
          >
            {current.state === "READY" ? (
              <div className="flex flex-col items-center justify-center text-center relative overflow-hidden">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--tray-green)]/10 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--tray-green)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--tray-green)]" />
                  {current.label}
                </span>
                <div
                  className="mt-4 text-5xl font-bold tracking-[0.28em] text-[var(--tray-green)]"
                  style={{ fontFamily: "var(--font-hero-punch)" }}
                >
                  7342
                </div>
                <p className="mt-3 text-[1.05rem] font-semibold text-[var(--tray-ink)]">
                  Show this at the counter
                </p>
                <p className="mt-1 text-[0.88rem] text-[var(--tray-muted)]">
                  No shouting. No paper slip.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.78rem] uppercase tracking-[0.24em]" style={{ fontFamily: "var(--font-dm-mono)", color: current.color }}>
                    {current.label}
                  </p>
                  <p className="mt-1 text-[1.2rem] font-semibold" style={{ fontFamily: "var(--font-jakarta)", color: "var(--tray-ink)" }}>
                    {current.title}
                  </p>
                </div>
                <span className="rounded-xl border px-4.5 py-2.5 text-[0.78rem] font-bold uppercase tracking-[0.14em]"
                  style={{ fontFamily: "var(--font-dm-mono)", background: "rgba(255,255,255,0.60)", color: current.color, borderColor: "var(--tray-border)" }}>
                  {current.state}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Marquee ticker ────────────────────────────────────────────────────────────
export function MotionTicker({
  items,
  className,
  speed = 28,
  reverse = false,
}: {
  items: string[];
  className?: string;
  speed?: number;
  reverse?: boolean;
}) {
  const reduce = useReducedMotion();
  const doubled = useMemo(() => [...items, ...items], [items]);

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12" style={{ background: "linear-gradient(to right,var(--tray-bg),transparent)" }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12" style={{ background: "linear-gradient(to left,var(--tray-bg),transparent)" }} />
      <motion.div
        className="flex w-max gap-3"
        animate={reduce ? undefined : { x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        {doubled.map((item, i) => (
          <motion.span
            key={`${item}-${i}`}
            whileHover={{ y: -2 }}
            transition={{ duration: tm.fast }}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[0.68rem] uppercase tracking-[0.2em]"
            style={{ border: "1px solid var(--tray-border)", background: "rgba(255,255,255,0.45)", color: "var(--tray-muted)", fontFamily: "var(--font-dm-mono)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--tray-clay)" }} />
            {item}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Scroll progress bar ──────────────────────────────────────────────────────
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  return (
    <motion.div
      className="fixed inset-x-0 top-0 z-[100] h-[2px] origin-left"
      style={{ scaleX, background: "var(--tray-accent)" }}
    />
  );
}

// ── Hover card wrapper ────────────────────────────────────────────────────────
export function HoverCard({
  children,
  className,
  style,
}: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div
      variants={cardReveal}
      whileHover={{
        y: -8,
        scale: 1.02,
        boxShadow: "0 32px 80px rgba(26,22,20,0.18)",
        transition: { duration: 0.28, ease: tm.ease },
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: tm.fast, ease: tm.ease }}
      className={className}
      style={{ ...style, transformStyle: "preserve-3d", position: "relative", overflow: "hidden" }}
    >
      {/* Content Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {children}
      </div>
    </motion.div>
  );
}
