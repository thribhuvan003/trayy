"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { RevealItem, SectionReveal, tm } from "@/lib/motion/tray-framer";

// Word-by-word rise — distinct from Hero (per-line clause wipe) and Ticker (marquee).
// Each word sits in its own clip mask and lifts up with a soft blur, staggered.
const headlineGroup: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.05, staggerChildren: 0.055 } },
};

const wordRise: Variants = {
  hidden: { y: "115%", opacity: 0, filter: "blur(6px)" },
  show: {
    y: "0%",
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.62, ease: tm.easeSharp },
  },
};

// "The demos answer most of it." — "answer" carries the clay accent.
const HEADLINE: { text: string; accent?: boolean }[] = [
  { text: "The" },
  { text: "demos" },
  { text: "answer", accent: true },
  { text: "most" },
  { text: "of" },
  { text: "it." },
];

export function ClosingSection() {
  const reduce = useReducedMotion();

  return (
    <SectionReveal
      id="closing"
      as="div"
      className="tl-closing relative px-5 py-[var(--section-y)] sm:px-8 lg:px-10 lg:py-[var(--section-y-lg)]"
    >
      {!reduce && (
        <motion.div
          className="absolute left-0 right-0 top-0 h-px origin-left bg-[var(--tray-clay)]"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
      <div className="mx-auto max-w-7xl border-t border-[var(--tray-border)] pt-12 lg:pt-16">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
          <div className="max-w-xl">
            <RevealItem>
              <p className="font-code text-[0.68rem] uppercase tracking-[0.16em] text-[var(--tray-muted)]">
                Next step
              </p>
            </RevealItem>

            {reduce ? (
              <h2 className="mt-4 font-editorial text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--tray-ink)]">
                The demos <span className="text-[var(--tray-clay)]">answer</span> most of it.
              </h2>
            ) : (
              <motion.h2
                variants={headlineGroup}
                className="mt-4 flex flex-wrap font-editorial text-[clamp(1.8rem,3.6vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--tray-ink)]"
              >
                {HEADLINE.map((word, i) => (
                  <span key={i} className="mr-[0.28em] inline-flex overflow-hidden pb-[0.04em]">
                    <motion.span
                      variants={wordRise}
                      className={`inline-block ${word.accent ? "text-[var(--tray-clay)]" : ""}`}
                    >
                      {word.text}
                    </motion.span>
                  </span>
                ))}
              </motion.h2>
            )}

            <RevealItem>
              <p className="mt-4 text-[0.95rem] leading-[1.6] text-[var(--tray-muted)]">
                Static campus data. No signup to explore student, kitchen, and admin views.
              </p>
            </RevealItem>
          </div>

          <RevealItem className="flex flex-col gap-5 sm:flex-row sm:items-center lg:pb-1">
            <PrimaryCTA reduce={reduce} />
            <Link
              href="/get-started"
              className="group inline-flex items-center justify-center gap-1.5 px-2 py-3.5 text-sm font-medium text-[var(--tray-muted)] transition-colors hover:text-[var(--tray-ink)]"
            >
              I run a canteen
              <span
                aria-hidden
                className="inline-block transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          </RevealItem>
        </div>
      </div>
    </SectionReveal>
  );
}

// Primary CTA — ink base with a clay fill-sweep that wipes left→right on hover,
// plus an arrow that slides. The label stays cream the whole time.
function PrimaryCTA({ reduce }: { reduce: boolean | null }) {
  return (
    <motion.div
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap={{ y: 1 }}
      className="relative inline-flex"
    >
      <Link
        href="#portals"
        className="relative inline-flex items-center gap-2 overflow-hidden rounded-[var(--tray-radius-md)] bg-[var(--tray-ink)] px-7 py-3.5 font-bricolage text-sm font-semibold text-[var(--tray-cream)]"
      >
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-0 origin-left bg-[var(--tray-clay)]"
            variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
            transition={{ duration: 0.42, ease: tm.easeSharp }}
            style={{ transformOrigin: "left center" }}
          />
        )}
        <span className="relative">Open live demos</span>
        <motion.span
          aria-hidden
          className="relative inline-block"
          variants={{ rest: { x: 0 }, hover: { x: reduce ? 0 : 4 } }}
          transition={{ duration: tm.fast, ease: tm.ease }}
        >
          →
        </motion.span>
      </Link>
    </motion.div>
  );
}
