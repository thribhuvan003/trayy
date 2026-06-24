"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useInView,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  useReducedMotion,
  wrap,
} from "framer-motion";

/**
 * Scroll-velocity reactive marquee (react-bits / 21st.dev "ScrollVelocity" pattern).
 * Auto-drifts; scroll speed boosts and skews it, scroll direction flips it.
 * The ticker's signature effect — deliberately distinct from the hero line-mask.
 */
function VelocityMarquee({
  children,
  baseVelocity = 2,
}: {
  children: React.ReactNode;
  baseVelocity?: number;
}) {
  const reduced = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 4], { clamp: false });
  const skewX = useTransform(smoothVelocity, [-2000, 2000], [-3, 3], { clamp: true });
  const x = useTransform(baseX, (v) => `${wrap(-25, 0, v)}%`);
  const directionFactor = useRef(1);

  useAnimationFrame((_t, delta) => {
    if (reduced) return;
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    if (velocityFactor.get() < 0) directionFactor.current = -1;
    else if (velocityFactor.get() > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="overflow-hidden border-b border-[var(--tray-border)] bg-[var(--tray-surface)]/40">
      <motion.div
        className="flex w-max items-center py-4 sm:py-5"
        style={{ x, skewX: reduced ? 0 : skewX }}
        aria-hidden
      >
        {children}
        {children}
        {children}
        {children}
      </motion.div>
    </div>
  );
}

const MARQUEE_ITEMS = [
  "12:47 PM · QUEUE LIVE",
  "UPI CONFIRMED · OTP READY",
  "0% COMMISSION · DIRECT SETTLEMENT",
  "300MS · MENU SYNC",
  "NORTH BLOCK · MAIN CANTEEN",
] as const;

const ease = [0.22, 1, 0.36, 1] as const;
const ODO_EASE = [0.16, 1, 0.3, 1] as const;

/** Slot-machine number: each digit column rolls into place on scroll-in. */
function OdoNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotion();
  const digits = String(value).split("").map(Number);
  return (
    <span ref={ref} className="inline-flex" style={{ fontVariantNumeric: "tabular-nums" }}>
      {digits.map((d, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-baseline"
          style={{ height: "1em", lineHeight: 1 }}
        >
          <motion.span
            className="flex flex-col"
            initial={{ y: "0%" }}
            animate={inView ? { y: `-${d * 10}%` } : { y: "0%" }}
            transition={reduced ? { duration: 0 } : { duration: 1.05, delay: i * 0.08, ease: ODO_EASE }}
          >
            {Array.from({ length: 10 }, (_, n) => (
              <span key={n} style={{ height: "1em", lineHeight: 1 }}>
                {n}
              </span>
            ))}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function CampusTicker() {
  const trackGroup = (
    <span className="flex shrink-0 items-center gap-10 pr-10">
      {MARQUEE_ITEMS.map((item) => (
        <span
          key={item}
          className="inline-flex shrink-0 items-center gap-3 font-code text-[0.9rem] uppercase tracking-[0.14em] text-[var(--tray-ink)]/75 sm:text-[1.05rem]"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--tray-clay)]" />
          {item}
        </span>
      ))}
    </span>
  );

  return (
    <section aria-labelledby="stats-heading" className="relative border-y border-[var(--tray-border)]">
      <VelocityMarquee>{trackGroup}</VelocityMarquee>

      <div className="px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl py-[var(--section-y)] lg:py-[var(--section-y-lg)]">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.42fr)_1px_minmax(0,1fr)] lg:items-start lg:gap-10">
            <header>
              <p className="font-code text-[0.65rem] uppercase tracking-[0.16em] text-[var(--tray-muted)]">
                Lunch window
              </p>
              <h2
                id="stats-heading"
                className="mt-3 font-cormorant text-[clamp(2rem,4vw,3.25rem)] font-medium leading-[1.02] tracking-[-0.02em] text-[var(--tray-ink)]"
              >
                What changes between
                <span className="text-[var(--tray-clay)]"> 12:30 and 1:15.</span>
              </h2>
              <p className="mt-4 max-w-xs font-bricolage text-[0.94rem] leading-[1.6] text-[var(--tray-muted)]">
                Peak-hour handoff on a real campus — not demo vanity metrics.
              </p>
              <p className="mt-10 font-code text-[0.62rem] uppercase tracking-[0.18em] text-[var(--tray-muted)]/70">
                Last synced · live demo
              </p>
            </header>

            <motion.div
              className="hidden origin-top bg-[var(--tray-border)] lg:block"
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, ease }}
            />

            <div>
              <motion.article
                className="flex flex-wrap items-end gap-x-6 gap-y-3 border-l-2 border-[var(--tray-clay)] pl-5 sm:pl-6"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.48, ease }}
              >
                <p className="flex items-baseline gap-2 font-cormorant text-[clamp(4rem,11vw,6.5rem)] leading-[0.82] tracking-[-0.04em] text-[var(--tray-ink)]">
                  <OdoNumber value={12} />
                  <span className="font-code text-[0.26em] font-medium tracking-[0.04em] text-[var(--tray-clay)]">
                    min
                  </span>
                </p>
                <div className="pb-1.5">
                  <p className="font-bricolage text-[1rem] font-semibold tracking-[-0.02em] text-[var(--tray-ink)]">
                    back in your break
                  </p>
                  <p className="mt-1 max-w-[22ch] font-code text-[0.68rem] uppercase leading-[1.5] tracking-[0.14em] text-[var(--tray-muted)]">
                    vs standing in line at North block, peak day
                  </p>
                </div>
              </motion.article>

              <motion.div
                className="mt-8 h-px origin-left bg-[var(--tray-border-strong)]"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.7, ease }}
              />

              <motion.div
                className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-x-12"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={{
                  hidden: {},
                  show: { transition: { delayChildren: 0.35, staggerChildren: 0.1 } },
                }}
              >
                <motion.article
                  className="border-l-2 border-[var(--tray-border-strong)] pl-4"
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease } },
                  }}
                >
                  <p className="flex items-baseline gap-1.5 font-cormorant text-[clamp(2.25rem,5vw,3rem)] leading-none tracking-[-0.03em] text-[var(--tray-ink)]">
                    <OdoNumber value={300} />
                    <span className="font-code text-[0.26em] font-medium tracking-[0.04em] text-[var(--tray-clay)]">ms</span>
                  </p>
                  <p className="mt-2 font-bricolage text-[0.92rem] font-semibold text-[var(--tray-ink)]">menu sync</p>
                  <p className="mt-1 font-code text-[0.65rem] uppercase tracking-[0.14em] text-[var(--tray-muted)]">
                    kitchen write → every student screen
                  </p>
                </motion.article>

                <motion.article
                  className="border-l-2 border-[var(--tray-clay)] pl-4"
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease } },
                  }}
                >
                  <p className="flex items-baseline gap-1.5 font-cormorant text-[clamp(2.25rem,5vw,3rem)] leading-none tracking-[-0.03em] text-[var(--tray-clay)]">
                    <OdoNumber value={0} />
                    <span className="font-code text-[0.26em] font-medium tracking-[0.04em] text-[var(--tray-clay)]">%</span>
                  </p>
                  <p className="mt-2 font-bricolage text-[0.92rem] font-semibold text-[var(--tray-ink)]">
                    order commission
                  </p>
                  <p className="mt-1 font-code text-[0.65rem] uppercase tracking-[0.14em] text-[var(--tray-muted)]">
                    UPI goes to the canteen merchant
                  </p>
                </motion.article>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}