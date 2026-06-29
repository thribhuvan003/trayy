"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { RevealItem, SectionReveal } from "@/lib/motion/tray-framer";

const SYNC_STEPS = [
  { tag: "Kitchen", title: "Change saved", body: "New item, price edit, or sold-out toggle is committed." },
  { tag: "Database", title: "Row written", body: "Postgres holds the single source of truth." },
  { tag: "Broadcast", title: "Channel fans out", body: "Supabase Realtime pushes to subscribed clients." },
  { tag: "Portals", title: "Screens update", body: "Student menu, kitchen queue, and admin totals — no refresh." },
] as const;

export function SyncSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Scroll-LINKED scrub: progress is driven by the section's position in the
  // viewport — no spacer needed. The pipeline fills as the section passes through.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.8", "end 0.6"],
  });

  // Connector line fills left→right with scroll. Reduced-motion = fully filled.
  const lineFill = useTransform(scrollYProgress, [0.04, 0.96], ["0%", "100%"]);

  return (
    <SectionReveal
      as="div"
      id="sync"
      ref={sectionRef}
      className="tl-sync px-5 py-[var(--section-y)] sm:px-8 lg:px-10 lg:py-[var(--section-y-lg)]"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.42fr_0.58fr] lg:items-center lg:gap-16">
          {/* Left — heading / body */}
          <div>
            <RevealItem>
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-[var(--tray-border-strong)]" aria-hidden />
                <p className="font-code text-[0.68rem] tracking-[0.08em] text-[var(--tray-muted)]">
                  State propagation
                </p>
              </div>
            </RevealItem>

            {reduce ? (
              <h2
                aria-label="One write. Every screen."
                className="mt-5 font-editorial text-[clamp(2.2rem,4.6vw,3.6rem)] font-normal leading-[1.04] tracking-[-0.03em] text-[var(--tray-ink)]"
              >
                One write.
                <br />
                <span className="text-[var(--tray-clay)]">Every screen.</span>
              </h2>
            ) : (
              <motion.h2
                aria-label="One write. Every screen."
                className="mt-5 font-editorial text-[clamp(2.2rem,4.6vw,3.6rem)] font-normal leading-[1.04] tracking-[-0.03em] text-[var(--tray-ink)]"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14 } } }}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.5 }}
              >
                <span className="block overflow-hidden pb-[0.04em]">
                  <motion.span
                    className="block"
                    variants={{ hidden: { y: "110%" }, show: { y: "0%", transition: { duration: 0.68, ease: [0.16, 1, 0.3, 1] } } }}
                  >
                    One write.
                  </motion.span>
                </span>
                <span className="block overflow-hidden pb-[0.04em]">
                  <motion.span
                    className="block text-[var(--tray-clay)]"
                    variants={{ hidden: { y: "110%" }, show: { y: "0%", transition: { duration: 0.68, ease: [0.16, 1, 0.3, 1] } } }}
                  >
                    Every screen.
                  </motion.span>
                </span>
              </motion.h2>
            )}

            <RevealItem>
              <p className="mt-5 max-w-sm font-bricolage text-[0.96rem] leading-[1.65] text-[var(--tray-muted)]">
                Mark a dish sold out in the kitchen. The student menu, live queue, and admin
                totals move from the same write, so the product feels like one system.
              </p>
            </RevealItem>

            <RevealItem>
              <p className="mt-6 max-w-xs border-l-2 border-[var(--tray-clay)]/30 pl-4 font-code text-[0.62rem] leading-[1.7] tracking-[0.02em] text-[var(--tray-muted)]">
                Supabase Realtime / Postgres row locks / tenant-scoped channels
              </p>
            </RevealItem>
          </div>

          {/* Right — scroll-scrubbed 4-stage pipeline */}
          <RevealItem variant="card">
            <div
              className="rounded-lg border p-5 sm:p-7"
              style={{ border: "1px solid var(--tray-border)", background: "var(--tray-surface-strong)" }}
            >
              {/* Connector + dots (desktop) */}
              <div className="relative mb-9 hidden sm:block">
                <div
                  className="absolute left-[6%] right-[6%] top-[7px] h-px"
                  style={{ background: "var(--tray-border)" }}
                  aria-hidden
                />
                <motion.div
                  className="absolute left-[6%] top-[7px] h-px origin-left"
                  style={{
                    width: reduce ? "88%" : lineFill,
                    maxWidth: "88%",
                    background: "var(--tray-clay)",
                  }}
                  aria-hidden
                />
                <div className="grid grid-cols-4">
                  {SYNC_STEPS.map((step, i) => (
                    <div key={step.tag} className="flex justify-center">
                      <PipelineDot index={i} progress={scrollYProgress} reduce={reduce} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage copy */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 sm:gap-5">
                {SYNC_STEPS.map((step, i) => (
                  <PipelineStage
                    key={step.tag}
                    step={step}
                    index={i}
                    progress={scrollYProgress}
                    reduce={reduce}
                  />
                ))}
              </div>

              <p className="mt-7 font-code text-[0.6rem] tracking-[0.04em] text-[var(--tray-muted)]">
                {reduce ? "All four stages complete." : "Scroll to move the update through the pipeline."}
              </p>
            </div>
          </RevealItem>
        </div>
      </div>
    </SectionReveal>
  );
}

// Activation window for stage `index`: the dot fills / text brightens as scroll
// progress crosses its slot. Staggered so stages light up in sequence.
function stageRange(index: number): [number, number] {
  const slot = 1 / SYNC_STEPS.length;
  const start = index * slot;
  return [start, start + slot * 0.6];
}

function PipelineDot({
  index,
  progress,
  reduce,
}: {
  index: number;
  progress: MotionValue<number>;
  reduce: boolean | null;
}) {
  const [start, end] = stageRange(index);
  const fill = useTransform(progress, [start, end], [0, 1]);
  const scale = useTransform(fill, [0, 1], [1, 1.15]);
  const background = useTransform(
    fill,
    [0, 1],
    ["var(--tray-surface)", "var(--tray-clay)"],
  );
  const borderColor = useTransform(
    fill,
    [0, 1],
    ["var(--tray-border)", "var(--tray-clay)"],
  );

  if (reduce) {
    return (
      <div
        className="relative z-10 h-[15px] w-[15px] rounded-sm border"
        style={{ background: "var(--tray-clay)", borderColor: "var(--tray-clay)" }}
      />
    );
  }

  return (
    <motion.div
      className="relative z-10 h-[15px] w-[15px] rounded-sm border"
      style={{ scale, background, borderColor }}
    />
  );
}

function PipelineStage({
  step,
  index,
  progress,
  reduce,
}: {
  step: (typeof SYNC_STEPS)[number];
  index: number;
  progress: MotionValue<number>;
  reduce: boolean | null;
}) {
  const [start, end] = stageRange(index);
  const fill = useTransform(progress, [start, end], [0, 1]);
  const opacity = useTransform(fill, [0, 1], [0.42, 1]);
  const titleColor = useTransform(
    fill,
    [0, 1],
    ["var(--tray-muted)", "var(--tray-ink)"],
  );
  const dotBg = useTransform(fill, [0, 1], ["var(--tray-surface)", "var(--tray-clay)"]);
  const dotBorder = useTransform(fill, [0, 1], ["var(--tray-border)", "var(--tray-clay)"]);

  return (
    <motion.div
      style={{ opacity: reduce ? 1 : opacity }}
      className="flex flex-col gap-2 border-t border-[var(--tray-border)] pt-4 sm:border-t-0 sm:pt-0"
    >
      {/* Mobile inline dot */}
      <div className="flex items-center gap-2 sm:hidden">
        <motion.div
          className="h-2.5 w-2.5 rounded-sm border"
          style={
            reduce
              ? { background: "var(--tray-clay)", borderColor: "var(--tray-clay)" }
              : { background: dotBg, borderColor: dotBorder }
          }
        />
        <p className="font-code text-[0.62rem] tracking-[0.06em] text-[var(--tray-muted)]">
          {step.tag}
        </p>
      </div>
      <p className="hidden font-code text-[0.62rem] tracking-[0.06em] text-[var(--tray-muted)] sm:block">
        {step.tag}
      </p>
      <motion.p
        className="font-ui text-[0.98rem] font-semibold leading-snug tracking-tight"
        style={{ color: reduce ? "var(--tray-ink)" : titleColor }}
      >
        {step.title}
      </motion.p>
      <p className="font-bricolage text-[0.82rem] leading-[1.55] text-[var(--tray-muted)]">
        {step.body}
      </p>
    </motion.div>
  );
}
