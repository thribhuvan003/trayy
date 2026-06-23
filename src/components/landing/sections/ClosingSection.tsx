"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MotionCTA, RevealItem, SectionReveal } from "@/lib/motion/tray-framer";

export function ClosingSection() {
  return (
    <SectionReveal
      id="closing"
      as="div"
      className="tl-closing px-5 pb-24 pt-4 sm:px-8 lg:px-10 lg:pb-32"
    >
      <div className="mx-auto max-w-7xl border-t border-[var(--tray-border)] pt-12 lg:pt-16">
        <RevealItem>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="max-w-lg">
              <p className="font-code text-[0.68rem] tracking-[0.08em] text-[var(--tray-muted)]">
                Next step
              </p>
              <h2 className="mt-3 font-ui text-[clamp(1.65rem,3.2vw,2.35rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--tray-ink)]">
                The demos answer most of it.
              </h2>
              <p className="mt-3 text-[0.92rem] leading-[1.6] text-[var(--tray-muted)]">
                Static campus data. No signup to explore student, kitchen, and admin views.
              </p>
            </div>

            <motion.div
              className="flex flex-col gap-4 sm:flex-row sm:items-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            >
              <MotionCTA
                href="#portals"
                variant="primary"
                className="tl-cta-primary rounded-[var(--tray-radius-md)] bg-[var(--tray-ink)] px-7 py-3.5 text-center font-bricolage text-sm font-semibold text-[var(--tray-cream)]"
              >
                Open live demos
              </MotionCTA>
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
            </motion.div>
          </div>
        </RevealItem>
      </div>
    </SectionReveal>
  );
}