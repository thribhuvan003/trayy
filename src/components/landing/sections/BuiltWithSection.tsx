"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
  type Variants,
} from "framer-motion";
import { SectionReveal, tm } from "@/lib/motion/tray-framer";

const quoteLines = [
  "We stopped shouting",
  "over the crowd. The",
  "board calls the order;",
  "they show a code.",
] as const;

const stack = [
  ["Next.js 15", "framework / app router"],
  ["TypeScript", "language / strict mode"],
  ["Tailwind 4", "styling / design tokens"],
  ["Supabase", "db / auth / realtime"],
  ["Postgres + RLS", "data / multi-tenant"],
  ["Razorpay", "payments / UPI"],
  ["Vercel Edge", "hosting / CDN"],
  ["Realtime queues", "live / websocket"],
] as const;

const lineReveal: Variants = {
  hidden: { y: "112%", opacity: 0, filter: "blur(8px)" },
  show: {
    y: "0%",
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.72, ease: tm.easeSharp },
  },
};

export function BuiltWithSection() {
  return (
    <>
      <KitchenProofSection />
      <StackProofSection />
    </>
  );
}

function KitchenProofSection() {
  const reduce = useReducedMotion();

  return (
    <SectionReveal
      as="section"
      className="tl-kitchen-proof relative overflow-hidden bg-[var(--tray-ink)] px-5 py-[clamp(5rem,9vw,8.5rem)] text-[var(--tray-cream)] sm:px-8 lg:px-10"
      amount={0.35}
    >
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] origin-left bg-[var(--tray-clay)]"
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={reduce ? undefined : { scaleX: 1 }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: 0.86, ease: tm.easeSharp }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, currentColor 1px, transparent 1px), linear-gradient(0deg, currentColor 1px, transparent 1px)",
          backgroundSize: "96px 96px",
        }}
      />
      <div className="relative mx-auto max-w-4xl">
        <motion.p
          variants={lineReveal}
          className="font-code text-[0.64rem] uppercase tracking-[0.28em] text-[rgba(250,248,243,0.42)]"
        >
          From the kitchen
        </motion.p>

        <motion.blockquote
          className="mt-7 font-editorial text-[clamp(3rem,9vw,6.8rem)] font-black italic leading-[0.92] tracking-[-0.035em]"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
        >
          {quoteLines.map((line) => (
            <span key={line} className="block overflow-hidden pb-[0.09em]">
              <motion.span variants={lineReveal} className="block">
                {line}
              </motion.span>
            </span>
          ))}
          <span className="block overflow-hidden pb-[0.09em]">
            <motion.span variants={lineReveal} className="block">
              <span className="text-[#ff1f12]">Lunch</span> ends on time.
            </motion.span>
          </span>
        </motion.blockquote>

        <motion.p
          variants={lineReveal}
          className="mt-5 font-code text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(250,248,243,0.35)]"
        >
          Kitchen supervisor / campus canteen
        </motion.p>
      </div>
    </SectionReveal>
  );
}

function StackProofSection() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 55%"],
  });

  return (
    <section
      ref={ref}
      id="built-with"
      className="tl-built-with relative overflow-hidden px-5 py-[clamp(5rem,9vw,8rem)] sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-4xl">
        <motion.p
          style={{
            opacity: useTransform(scrollYProgress, [0, 0.12], [0, 1]),
            y: useTransform(scrollYProgress, [0, 0.12], [18, 0]),
          }}
          className="font-code text-[0.66rem] uppercase tracking-[0.22em] text-[var(--tray-muted)]"
        >
          05 / built with
        </motion.p>

        <motion.h2
          style={{
            opacity: useTransform(scrollYProgress, [0.03, 0.22], [0, 1]),
            y: useTransform(scrollYProgress, [0.03, 0.22], [28, 0]),
          }}
          className="mt-5 max-w-3xl font-editorial text-[clamp(3.3rem,8vw,6.2rem)] font-black leading-[0.9] tracking-[-0.05em] text-[var(--tray-ink)]"
        >
          A boring stack,
          <br />
          <span className="text-[#f20f0f]">on purpose.</span>
        </motion.h2>

        <motion.p
          style={{
            opacity: useTransform(scrollYProgress, [0.12, 0.28], [0, 1]),
            y: useTransform(scrollYProgress, [0.12, 0.28], [18, 0]),
          }}
          className="mt-6 max-w-xl font-code text-[0.78rem] leading-7 text-[var(--tray-muted)]"
        >
          Everything runs on boring infra until the campus has real users. No exotic infra. No lock-in surprise.
        </motion.p>

        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stack.map(([name, detail], index) => (
            <StackCard
              key={name}
              name={name}
              detail={detail}
              index={index}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StackCard({
  name,
  detail,
  index,
  progress,
}: {
  name: string;
  detail: string;
  index: number;
  progress: MotionValue<number>;
}) {
  const start = 0.06 + index * 0.035;
  const end = start + 0.14;
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [34, 0]);
  const scale = useTransform(progress, [start, end], [0.94, 1]);

  return (
    <motion.article
      style={{ opacity, y, scale }}
      className="group min-h-[5.3rem] rounded-[var(--tray-radius-md)] border border-[var(--tray-border)] bg-[var(--tray-surface-strong)] px-4 py-4 shadow-[0_18px_42px_rgba(16,20,25,0.06)] transition-colors duration-300 hover:border-[var(--tray-ink)]"
    >
      <h3 className="flex flex-wrap gap-x-1.5 font-ui text-[0.92rem] font-black tracking-0 text-[var(--tray-ink)]">
        {name.split(" ").map((part) => (
          <span key={part}>{part}</span>
        ))}
      </h3>
      <p className="mt-2 font-code text-[0.54rem] uppercase tracking-[0.18em] text-[var(--tray-muted)]">
        {detail}
      </p>
    </motion.article>
  );
}
