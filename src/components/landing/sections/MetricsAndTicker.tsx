"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/lib/motion/tray-framer";

const MARQUEE_ITEMS = [
  "12:47 PM · QUEUE LIVE",
  "UPI CONFIRMED · OTP READY",
  "0% COMMISSION · DIRECT SETTLEMENT",
  "300MS · MENU SYNC",
  "NORTH BLOCK · MAIN CANTEEN",
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

export function CampusTicker() {
  const track = MARQUEE_ITEMS.map((item) => (
    <span
      key={item}
      className="inline-flex shrink-0 items-center gap-2 font-code text-[0.6rem] uppercase tracking-[0.2em] text-[var(--tray-muted)]"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--tray-clay)]" />
      {item}
    </span>
  ));

  return (
    <section aria-labelledby="stats-heading" className="relative border-y border-[var(--tray-border)]">
      <motion.div
        className="overflow-hidden border-b border-[var(--tray-border)] bg-[var(--tray-surface)]/40"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <div className="tl-stats-marquee flex w-max items-center gap-10 py-2.5 sm:py-3" aria-hidden>
          <span className="flex shrink-0 items-center gap-10 px-5 sm:px-8">{track}</span>
          <span className="flex shrink-0 items-center gap-10">{track}</span>
        </div>
      </motion.div>

      <div className="px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl py-12 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.4fr)_1px_minmax(0,1fr)] lg:items-start lg:gap-12">
            <header>
              <p className="font-code text-[0.65rem] uppercase tracking-[0.16em] text-[var(--tray-muted)]">
                Lunch window
              </p>
              <h2
                id="stats-heading"
                className="mt-3 font-cormorant text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.02] tracking-[-0.02em] text-[var(--tray-ink)]"
              >
                What changes between
                <span className="italic text-[var(--tray-accent)]"> 12:30 and 1:15.</span>
              </h2>
              <p className="mt-4 max-w-xs font-bricolage text-[0.94rem] leading-[1.6] text-[var(--tray-muted)]">
                Peak-hour handoff on a real campus — not demo vanity metrics.
              </p>
              <p className="mt-6 font-code text-[0.62rem] uppercase tracking-[0.18em] text-[var(--tray-muted)]/70">
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
                className="border-l-2 border-[var(--tray-accent)] pl-5 sm:pl-6"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.48, ease }}
              >
                <p className="font-cormorant text-[clamp(4rem,11vw,6.5rem)] leading-[0.88] tracking-[-0.04em] text-[var(--tray-ink)]">
                  <CountUp end={12} suffix="" duration={1100} />
                  <span className="ml-1 font-code text-[clamp(1rem,2.5vw,1.35rem)] tracking-[0.08em] text-[var(--tray-muted)]">
                    min
                  </span>
                </p>
                <p className="mt-3 font-bricolage text-[1rem] font-semibold tracking-[-0.02em] text-[var(--tray-ink)]">
                  back in the break
                </p>
                <p className="mt-1 font-code text-[0.68rem] uppercase tracking-[0.14em] text-[var(--tray-muted)]">
                  vs standing in line at North block, peak day
                </p>
              </motion.article>

              <motion.div
                className="mt-8 grid gap-8 border-t border-dashed border-[var(--tray-border)] pt-8 sm:grid-cols-2 sm:gap-x-12"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={{
                  hidden: {},
                  show: { transition: { delayChildren: 0.35, staggerChildren: 0.1 } },
                }}
              >
                <motion.article
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease } },
                  }}
                >
                  <p className="font-cormorant text-[clamp(2.25rem,5vw,3rem)] leading-none tracking-[-0.03em] text-[var(--tray-ink)]">
                    <CountUp end={300} suffix="" duration={900} />
                    <span className="font-code text-[0.85rem] tracking-[0.1em] text-[var(--tray-muted)]">ms</span>
                  </p>
                  <p className="mt-2 font-bricolage text-[0.92rem] font-semibold text-[var(--tray-ink)]">menu sync</p>
                  <p className="mt-1 font-code text-[0.65rem] uppercase tracking-[0.14em] text-[var(--tray-muted)]">
                    kitchen write → every student screen
                  </p>
                </motion.article>

                <motion.article
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.38, ease } },
                  }}
                >
                  <p className="font-cormorant text-[clamp(2.25rem,5vw,3rem)] leading-none tracking-[-0.03em] text-[var(--tray-clay)]">
                    <CountUp end={0} suffix="" duration={700} />
                    <span className="font-code text-[0.85rem] tracking-[0.1em] text-[var(--tray-clay)]">%</span>
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