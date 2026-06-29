"use client";

import { useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
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

const handoffRows = [
  ["A-217", "Masala dosa", "Ready", "OTP 4821"],
  ["B-044", "Veg thali", "Prep 04m", "Paid"],
  ["C-103", "Filter coffee", "Called", "Counter 2"],
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
      className="tl-kitchen-proof relative overflow-hidden px-5 py-[clamp(3rem,4.8vw,4.4rem)] text-[var(--tray-cream)] sm:px-8 lg:px-10"
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
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(21rem,0.7fr)]">
        <div>
          <motion.p
            variants={lineReveal}
            className="font-code text-[0.64rem] uppercase tracking-[0.28em] text-[rgba(250,248,243,0.42)]"
          >
            From the kitchen
          </motion.p>

          <motion.blockquote
            className="mt-5 max-w-[14.5ch] font-editorial text-[clamp(2.25rem,5.2vw,4.25rem)] font-black italic leading-[0.96] tracking-[-0.02em]"
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
                <span className="text-[#ff3a22]">Lunch</span> ends on time.
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

        <KitchenHandoffBoard reduce={reduce} />
      </div>
    </SectionReveal>
  );
}

function KitchenHandoffBoard({ reduce }: { reduce: boolean | null }) {
  return (
    <motion.aside
      variants={{
        hidden: { opacity: 0, x: 28, filter: "blur(8px)" },
        show: {
          opacity: 1,
          x: 0,
          filter: "blur(0px)",
          transition: { duration: 0.68, ease: tm.easeSharp, delay: 0.2 },
        },
      }}
      className="relative overflow-hidden rounded-[var(--tray-radius-md)] border border-[rgba(251,252,248,0.16)] bg-[rgba(251,252,248,0.055)] p-4 shadow-[0_26px_80px_rgba(0,0,0,0.22)] backdrop-blur"
    >
      {!reduce && (
        <motion.span
          aria-hidden
          className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,58,34,0.95),transparent)]"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-code text-[0.58rem] uppercase tracking-[0.2em] text-[rgba(250,248,243,0.42)]">
            Live handoff board
          </p>
          <p className="mt-1 font-ui text-sm font-semibold text-[var(--tray-cream)]">
            Kitchen queue / OTP pickup
          </p>
        </div>
        <span className="rounded-full border border-[rgba(63,230,163,0.28)] bg-[rgba(63,230,163,0.12)] px-2.5 py-1 font-code text-[0.58rem] uppercase tracking-[0.12em] text-[#72f0b9]">
          Live
        </span>
      </div>

      <div className="space-y-2.5">
        {handoffRows.map(([code, item, state, meta], index) => (
          <motion.div
            key={code}
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.46, delay: 0.32 + index * 0.08, ease: tm.ease },
              },
            }}
            className="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-[var(--tray-radius-sm)] border border-[rgba(251,252,248,0.1)] bg-[rgba(16,20,25,0.22)] px-3 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,58,34,0.42)] hover:bg-[rgba(251,252,248,0.09)]"
          >
            <span className="font-code text-[0.68rem] text-[rgba(250,248,243,0.52)]">{code}</span>
            <span className="min-w-0">
              <span className="block truncate font-ui text-sm font-semibold text-[var(--tray-cream)]">
                {item}
              </span>
              <span className="mt-1 block font-code text-[0.55rem] uppercase tracking-[0.14em] text-[rgba(250,248,243,0.35)]">
                {meta}
              </span>
            </span>
            <span className="rounded-[var(--tray-radius-sm)] bg-[rgba(255,58,34,0.12)] px-2 py-1 font-code text-[0.58rem] uppercase tracking-[0.1em] text-[#ff725f]">
              {state}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div
        variants={lineReveal}
        className="mt-4 border-t border-[rgba(251,252,248,0.1)] pt-4 font-code text-[0.6rem] uppercase tracking-[0.14em] text-[rgba(250,248,243,0.36)]"
      >
        Board calls order / student shows code / queue closes clean.
      </motion.div>
    </motion.aside>
  );
}

function StackProofSection() {
  const ref = useRef<HTMLElement | null>(null);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 55%"],
  });

  function revealCard(index: number) {
    setRevealedCards((current) => (current.includes(index) ? current : [...current, index]));
  }

  return (
    <section
      ref={ref}
      id="built-with"
      className="tl-built-with relative overflow-hidden px-5 py-[clamp(3.75rem,6.5vw,5.75rem)] sm:px-8 lg:px-10"
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
          className="mt-5 max-w-3xl font-editorial text-[clamp(2.65rem,5.7vw,4.85rem)] font-black leading-[0.92] tracking-[-0.035em] text-[var(--tray-ink)]"
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
              revealed={revealedCards.includes(index)}
              onReveal={() => revealCard(index)}
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
  revealed,
  onReveal,
}: {
  name: string;
  detail: string;
  index: number;
  revealed: boolean;
  onReveal: () => void;
}) {
  return (
    <motion.article
      tabIndex={0}
      onPointerEnter={onReveal}
      onMouseOver={onReveal}
      onMouseMove={onReveal}
      onMouseEnter={onReveal}
      onFocus={onReveal}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ delay: index * 0.035, duration: 0.42, ease: tm.easeSharp }}
      className={`group relative min-h-[5.45rem] overflow-hidden rounded-[var(--tray-radius-md)] border px-4 py-4 outline-none transition-all duration-300 hover:-translate-y-0.5 hover:border-solid hover:border-[var(--tray-ink)] hover:bg-[var(--tray-surface-strong)] hover:shadow-[0_18px_42px_rgba(16,20,25,0.08)] focus-visible:-translate-y-0.5 focus-visible:border-solid focus-visible:border-[var(--tray-ink)] focus-visible:bg-[var(--tray-surface-strong)] focus-visible:shadow-[0_18px_42px_rgba(16,20,25,0.08)] ${
        revealed
          ? "border-solid border-[var(--tray-border-strong)] bg-[var(--tray-surface-strong)] shadow-[0_18px_42px_rgba(16,20,25,0.08)]"
          : "border-dashed border-[rgba(16,20,25,0.2)] bg-[rgba(251,252,248,0.26)]"
      }`}
    >
      <span
        aria-hidden
        className={`absolute right-3 top-3 font-code text-[0.58rem] uppercase tracking-[0.16em] text-[var(--tray-muted)] transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0 ${
          revealed ? "opacity-0" : "opacity-45"
        }`}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <div
        className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100 group-hover:blur-0 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:blur-0 ${
          revealed ? "translate-y-0 opacity-100 blur-0" : "translate-y-3 opacity-0 blur-[3px]"
        }`}
      >
        <h3 className="flex flex-wrap gap-x-1.5 font-ui text-[0.92rem] font-black tracking-0 text-[var(--tray-ink)]">
          {name.split(" ").map((part) => (
            <span key={part}>{part}</span>
          ))}
        </h3>
        <p className="mt-2 font-code text-[0.54rem] uppercase tracking-[0.18em] text-[var(--tray-muted)]">
          {detail}
        </p>
      </div>
    </motion.article>
  );
}
