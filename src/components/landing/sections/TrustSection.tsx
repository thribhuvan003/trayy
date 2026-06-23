"use client";

import { RevealItem } from "@/lib/motion/tray-framer";
import { motion } from "framer-motion";

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

export function TrustSection() {
  return (
    <section id="trust" className="px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)] lg:gap-16 lg:items-start">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <RevealItem>
              <p className="font-code text-[0.65rem] uppercase tracking-[0.16em] text-[var(--tray-muted)]">
                Money & data
              </p>
            </RevealItem>
            <RevealItem>
              <h2 className="mt-3 max-w-[14ch] font-cormorant text-[clamp(2.2rem,4.5vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.03em] text-[var(--tray-ink)]">
                Built for auditors.
                <span className="italic text-[var(--tray-accent)]"> Used by hungry students.</span>
              </h2>
            </RevealItem>
            <RevealItem variant="soft">
              <p className="mt-4 max-w-sm font-bricolage text-[0.96rem] leading-[1.65] text-[var(--tray-muted)]">
                Deans ask where UPI lands. IT asks about tenant boundaries. Canteen managers ask about margins.
              </p>
            </RevealItem>
            <RevealItem variant="soft">
              <div className="mt-8 border border-dashed border-[var(--tray-border)] px-4 py-3.5">
                <p className="font-code text-[0.68rem] leading-[1.7] uppercase tracking-[0.12em] text-[var(--tray-muted)]">
                  Tray does not hold student funds.
                  <br />
                  Settlements go merchant → canteen UPI.
                </p>
              </div>
            </RevealItem>
          </aside>

          <motion.ol
            className="divide-y divide-[var(--tray-border)] border-y border-[var(--tray-border)]"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.12 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          >
            {trustItems.map((item) => (
              <motion.li
                key={item.tag}
                variants={{
                  hidden: { opacity: 0, x: 16 },
                  show: { opacity: 1, x: 0, transition: { duration: 0.38, ease } },
                }}
                className="group grid gap-4 py-7 sm:grid-cols-[4.5rem_1fr] sm:gap-6 sm:py-8"
              >
                <motion.span
                  variants={{
                    hidden: { opacity: 0, x: -8 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.28, delay: 0.05 } },
                  }}
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
                  <h3 className="font-bricolage text-[1.05rem] font-semibold tracking-[-0.02em] text-[var(--tray-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-[0.92rem] leading-[1.65] text-[var(--tray-muted)]">
                    {item.desc}
                  </p>
                  <p className="mt-2 font-code text-[0.65rem] uppercase tracking-[0.12em] text-[var(--tray-clay)]">
                    {item.foot}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}