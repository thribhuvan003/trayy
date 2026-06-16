"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";
import { prefersReducedMotion, registerTrayGsap } from "@/lib/motion/tray-motion";
import {
  MotionCTA,
  OrderJourneyVisual,
  tm,
  CountUp,
  staggerContainer,
  fadeUpVar,
  softFadeUp,
} from "@/lib/motion/tray-framer";
import { LiquidButton } from "../LiquidButton";

const HERO_CHIPS = [
  {
    title: "Any canteen, one tray",
    text: "Students move between active campus counters without changing accounts.",
  },
  {
    title: "UPI to kitchen in seconds",
    text: "Payment confirmation and order state stay visible across every portal.",
  },
  {
    title: "Live queue, no refresh",
    text: "Kitchen tickets, pickup codes, and admin views update from one source.",
  },
  {
    title: "Code pickup",
    text: "A short pickup code replaces paper tokens and counter shouting.",
  },
];

const METRICS = [
  { end: 12, prefix: "~", suffix: " min", label: "saved per lunch" },
  { end: 240, prefix: "~", suffix: " ms", label: "realtime sync" },
  { end: 0, suffix: "%", label: "Tray commission" },
];

export function TrayHero() {
  const blobRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      registerTrayGsap();
      if (prefersReducedMotion()) return;

      const blobA = blobRef.current?.querySelector("[data-blob-a]") as HTMLElement;
      const blobB = blobRef.current?.querySelector("[data-blob-b]") as HTMLElement;

      if (blobA) {
        gsap.to(blobA, { y: -120, scrollTrigger: { trigger: blobRef.current, start: "top top", end: "bottom top", scrub: 1.4 } });
        gsap.to(blobA, {
          xPercent: 12,
          yPercent: -8,
          duration: 22,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
      if (blobB) {
        gsap.to(blobB, { y: -80, scrollTrigger: { trigger: blobRef.current, start: "top top", end: "bottom top", scrub: 0.9 } });
        gsap.to(blobB, {
          xPercent: -10,
          yPercent: 12,
          duration: 28,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    },
    { scope: blobRef }
  );

  return (
    <motion.section
      className="relative isolate px-4 pb-10 pt-10 sm:px-8 sm:pt-20 lg:px-10 lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-24"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {/* Parallax blobs */}
      <div ref={blobRef} className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div data-blob-a className="absolute -left-32 top-10 h-[28rem] w-[28rem] rounded-full will-change-transform" style={{ background: "rgba(184,83,26,0.18)", filter: "blur(5rem)" }} />
        <div data-blob-b className="absolute -right-24 top-16 h-[32rem] w-[32rem] rounded-full will-change-transform" style={{ background: "rgba(42,110,58,0.12)", filter: "blur(6rem)" }} />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 lg:gap-14 grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        {/* Left: copy */}
        <div>
          {/* Eyebrow */}
          <motion.div variants={softFadeUp} className="mb-5 flex flex-wrap items-center gap-3">
            <p
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[0.75rem] font-code uppercase tracking-[0.2em]"
              style={{
                color: "var(--tray-muted)",
                border: "1px solid var(--tray-border)",
                background: "rgba(255,255,255,0.45)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--tray-clay)" }} />
              Campus Edition · Live
            </p>
          </motion.div>

          {/* H1 — LCP element: plain DOM + CSS entrance so it paints on first
              frame (not gated behind framer/gsap hydration). */}
          <h1
            className="tl-h1 tl-hero-rise max-w-4xl uppercase"
            style={{
              fontFamily: "var(--font-krona-one), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2rem, 4.4vw, 4.6rem)",
              lineHeight: 1.3,
              letterSpacing: "-0.03em",
            }}
          >
            <span className="tl-word inline-block mr-[0.2em]">Multi-tenant</span>{" "}
            <span className="tl-word inline-block mr-[0.2em]">canteen</span>{" "}
            <span className="tl-word inline-block mr-[0.2em]">management</span>{" "}
            <span className="tl-word inline-block mr-[0.2em]">for</span>{" "}
            <span className="tl-word inline-block" style={{ fontFamily: "var(--font-newsreader), serif", fontStyle: "italic", textTransform: "none", color: "var(--tray-clay)", fontWeight: "normal" }}>
              colleges.
            </span>
          </h1>

          {/* Subtitle — plain DOM + CSS entrance (see H1 note). */}
          <p
            className="tl-hero-rise-delay mt-6 max-w-lg text-base leading-[1.65] opacity-65"
            style={{ fontFamily: "var(--font-geist)" }}
          >
            Give students fast, cashless ordering while admins get real-time orders,
            analytics, and per-college billing. One system for every campus counter.
          </p>

          {/* Feature chips */}
          <motion.div variants={softFadeUp}>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2">
              {HERO_CHIPS.map((chip, index) => (
                <motion.div
                  key={chip.title}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.97 },
                    show: { opacity: 1, y: 0, scale: 1, transition: { delay: 0.1 + index * 0.08, duration: 0.5, ease: tm.ease } },
                  }}
                  whileHover={{ y: -6, scale: 1.02, boxShadow: "0 20px 40px rgba(26,22,20,0.12)" }}
                  className="group rounded-[1.5rem] border p-5 transition-all"
                  style={{ border: "1px solid var(--tray-border)", background: "rgba(255,255,255,0.48)" }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full transition-transform group-hover:scale-125"
                      style={{ background: index % 2 === 0 ? "var(--tray-clay)" : "var(--tray-green)" }}
                    />
                    <span>
                      <span className="block text-sm font-semibold tracking-tight" style={{ fontFamily: "var(--font-jakarta)" }}>
                        {chip.title}
                      </span>
                      <span className="mt-1 block text-sm leading-[1.6] opacity-65" style={{ fontFamily: "var(--font-geist)" }}>
                        {chip.text}
                      </span>
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={softFadeUp}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <LiquidButton
                href="#portals"
                className="w-full sm:w-auto !px-9 !py-4 sm:!py-4.5 !text-[1rem] !font-bold tracking-tight shadow-md hover:shadow-lg transition-shadow duration-300 justify-center"
                style={{ fontFamily: "var(--font-geist)" }}
              >
                See how it works
              </LiquidButton>
              <MotionCTA
                href="/get-started"
                variant="secondary"
                className="w-full sm:w-auto rounded-full border-2 border-[var(--tray-border)] px-9 py-4 sm:py-4.5 text-[1rem] font-bold tracking-tight transition hover:bg-white/40 shadow-md hover:shadow-lg duration-300 text-center"
                style={{ fontFamily: "var(--font-geist)" } as React.CSSProperties}
              >
                I have a canteen
              </MotionCTA>
            </div>
          </motion.div>

          {/* Metrics strip */}
          <motion.div variants={softFadeUp} className="w-full">
            <div className="mt-12 grid grid-cols-3 gap-6 sm:gap-10 lg:gap-14 border-t border-[var(--tray-border)] pt-8 sm:pt-10">
              {METRICS.map((m) => (
                <div key={m.label} className="flex flex-col gap-2.5">
                  <div
                    className="flex items-baseline gap-1 leading-none font-bold"
                    style={{ color: "var(--tray-clay)" }}
                  >
                    {m.prefix && (
                      <span
                        style={{
                          fontFamily: "var(--font-newsreader), 'Newsreader', serif",
                          fontStyle: "italic",
                          fontSize: "clamp(1.15rem, 2.2vw, 1.65rem)",
                          color: "var(--tray-clay)",
                          opacity: 0.85,
                          textTransform: "none",
                        }}
                      >
                        {m.prefix}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: "var(--font-bricolage), var(--font-barlow), sans-serif",
                        fontSize: "clamp(2.5rem, 5vw, 3.8rem)",
                        fontWeight: 800,
                        letterSpacing: "-0.015em",
                      }}
                    >
                      <CountUp end={m.end} />
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-newsreader), 'Newsreader', serif",
                        fontStyle: "italic",
                        fontSize: "clamp(1.15rem, 2.2vw, 1.65rem)",
                        color: "var(--tray-ink)",
                        opacity: 0.85,
                        textTransform: "none",
                      }}
                    >
                      {m.suffix.trim()}
                    </span>
                  </div>
                  <p
                    className="uppercase leading-tight"
                    style={{
                      fontFamily: "var(--font-dm-mono), monospace",
                      fontSize: "clamp(0.65rem, 1.1vw, 0.78rem)",
                      fontWeight: 600,
                      letterSpacing: "0.22em",
                      color: "var(--tray-muted)",
                    }}
                  >
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: live order journey visual */}
        <motion.div variants={softFadeUp} className="hidden lg:block">
          <OrderJourneyVisual />
        </motion.div>
      </div>
    </motion.section>
  );
}
