"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { RevealItem, SectionReveal, SyncPipelineVisual } from "@/lib/motion/tray-framer";

export function SyncSection() {
  const scrollTrackRef = useRef<HTMLDivElement>(null);

  return (
    <SectionReveal as="div" id="sync" className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
      <div ref={scrollTrackRef} className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.42fr_0.58fr] lg:items-start lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <RevealItem>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[var(--tray-border-strong)]" aria-hidden />
                <p className="font-code text-[0.68rem] tracking-[0.08em] text-[var(--tray-muted)]">
                  Sync
                </p>
              </div>
            </RevealItem>

            <RevealItem>
              <h2 className="mt-5 font-editorial text-[clamp(2.2rem,4.6vw,3.6rem)] font-normal leading-[1.04] tracking-[-0.03em] text-[var(--tray-ink)]">
                One change.
                <br />
                <span className="italic text-[var(--tray-clay)]">Every screen.</span>
              </h2>
            </RevealItem>

            <RevealItem>
              <p className="mt-5 max-w-sm text-[0.96rem] leading-[1.65] text-[var(--tray-muted)]">
                Mark a dish sold out in the kitchen. The student menu, live queue, and admin
                totals update from the same write — no polling, no manual refresh.
              </p>
            </RevealItem>

            <RevealItem>
              <p className="mt-6 max-w-xs border-l-2 border-[var(--tray-clay)]/30 pl-4 font-code text-[0.62rem] leading-[1.7] tracking-[0.02em] text-[var(--tray-muted)]">
                Supabase Realtime · Postgres row locks · tenant-scoped channels
              </p>
            </RevealItem>
          </div>

          <RevealItem variant="card" className="lg:sticky lg:top-28 lg:self-start">
            <SyncPipelineVisual
              scrollRoot={scrollTrackRef}
              className="min-h-[320px] border border-[var(--tray-border)] bg-[var(--tray-surface-strong)]"
            />
          </RevealItem>
        </div>

        <div className="h-[55vh] sm:h-[60vh] lg:h-[72vh]" aria-hidden="true" />
      </div>
    </SectionReveal>
  );
}