"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

const trustItems = [
  {
    tag: "UPI",
    accent: "var(--tray-accent)",
    title: "Direct settlements",
    desc: "Student payment hits the canteen merchant VPA. No platform wallet, no float sitting with Tray.",
    foot: "merchant@upi · same receipt students see",
  },
  {
    tag: "RLS",
    accent: "var(--tray-accent)",
    title: "Tenant isolation",
    desc: "Menus, orders, and profiles are scoped per campus. Row-level security on every Postgres query.",
    foot: "one college ≠ another college's data",
  },
  {
    tag: "REV",
    accent: "var(--tray-clay)",
    title: "Zero order commission",
    desc: "Tray is campus infrastructure, not a delivery aggregator. The canteen keeps what the student pays.",
    foot: "no per-order platform fee",
  },
  {
    tag: "OTP",
    accent: "var(--tray-accent)",
    title: "Verifiable pickup",
    desc: "Four-digit code ties payment to handoff. Kitchen confirms; student shows code at counter.",
    foot: "reduces wrong-order disputes",
  },
] as const;

const ease = [0.22, 1, 0.36, 1] as const;
const easeSharp = [0.16, 1, 0.3, 1] as const;

// ── Heading column: eyebrow fades, rule draws, heading rises as one block ──────
const headStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
};
const eyebrowVar: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};
const ruleVar: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.6, ease: easeSharp } },
};
const headingVar: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.62, ease } },
};
const noteVar: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

// ── Row assembly: divider draws, badge ticks, text clip-wipes — staggered ──────
const rowsStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13 } },
};
const dividerVar: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.55, ease: easeSharp } },
};
const badgeVar: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.32, ease, delay: 0.12 } },
};
const rowTextVar: Variants = {
  hidden: { y: "115%" },
  show: { y: "0%", transition: { duration: 0.6, ease: easeSharp, delay: 0.12 } },
};

export function TrustSection() {
  const reduce = useReducedMotion();
  const viewport = { once: true, amount: 0.2 } as const;

  return (
    <section id="trust" className="px-5 py-[var(--section-y)] sm:px-8 lg:px-10 lg:py-[var(--section-y-lg)]">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
          {/* ── Heading column ── */}
          <motion.aside
            className="lg:sticky lg:top-28 lg:self-start"
            initial={reduce ? undefined : "hidden"}
            whileInView={reduce ? undefined : "show"}
            viewport={viewport}
            variants={headStagger}
          >
            <motion.p
              variants={eyebrowVar}
              className="font-code text-[0.65rem] uppercase tracking-[0.16em] text-[var(--tray-muted)]"
            >
              Money & data
            </motion.p>

            <motion.div
              variants={ruleVar}
              className="mt-4 h-px w-12 origin-left bg-[var(--tray-clay)]"
            />

            <motion.h2
              variants={headingVar}
              className="mt-5 max-w-[14ch] font-cormorant text-[clamp(2.2rem,4.5vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.03em] text-[var(--tray-ink)]"
            >
              Built for auditors.
              <span className="text-[var(--tray-clay)]"> Used by hungry students.</span>
            </motion.h2>

            <motion.p
              variants={noteVar}
              className="mt-5 max-w-sm font-bricolage text-[0.96rem] leading-[1.65] text-[var(--tray-muted)]"
            >
              Deans ask where UPI lands. IT asks about tenant boundaries. Canteen managers ask about margins.
            </motion.p>

            <motion.div
              variants={noteVar}
              className="mt-8 border border-dashed border-[var(--tray-border)] px-4 py-3.5"
            >
              <p className="font-code text-[0.68rem] uppercase leading-[1.7] tracking-[0.12em] text-[var(--tray-muted)]">
                Tray does not hold student funds.
                <br />
                Settlements go merchant → canteen UPI.
              </p>
            </motion.div>
          </motion.aside>

          {/* ── Sequential row assembly ── */}
          <motion.ol
            initial={reduce ? undefined : "hidden"}
            whileInView={reduce ? undefined : "show"}
            viewport={viewport}
            variants={rowsStagger}
          >
            {trustItems.map((item) => (
              <motion.li
                key={item.tag}
                variants={rowsStagger}
                className="group grid gap-4 py-7 sm:grid-cols-[4.5rem_1fr] sm:gap-6 sm:py-8"
              >
                {/* drawn divider — spans full row width */}
                <motion.div
                  variants={dividerVar}
                  className="h-px w-full origin-left bg-[var(--tray-border)] sm:col-span-2"
                />

                <motion.span
                  variants={badgeVar}
                  className="font-code inline-flex h-fit w-fit rounded-sm border px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em]"
                  style={{
                    borderColor: `color-mix(in srgb, ${item.accent} 35%, transparent)`,
                    background: `color-mix(in srgb, ${item.accent} 6%, transparent)`,
                    color: item.accent,
                  }}
                >
                  {item.tag}
                </motion.span>

                <div className="border-l border-transparent pl-0 transition-colors group-hover:border-[var(--tray-border)] sm:border-l sm:pl-5">
                  <span className="block overflow-hidden">
                    <motion.h3
                      variants={rowTextVar}
                      className="font-bricolage text-[1.05rem] font-semibold tracking-[-0.02em] text-[var(--tray-ink)]"
                    >
                      {item.title}
                    </motion.h3>
                  </span>
                  <p className="mt-2 max-w-xl text-[0.92rem] leading-[1.65] text-[var(--tray-muted)]">
                    {item.desc}
                  </p>
                  <p className="mt-2 font-code text-[0.65rem] uppercase tracking-[0.12em] text-[var(--tray-clay)]">
                    {item.foot}
                  </p>
                </div>
              </motion.li>
            ))}

            {/* closing hairline — no trailing dead space */}
            <motion.div
              variants={dividerVar}
              className="h-px w-full origin-left bg-[var(--tray-border)]"
            />
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
