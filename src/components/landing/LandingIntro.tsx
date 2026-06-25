"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimate } from "framer-motion";

/**
 * Branded entry curtain: a cream overlay holds the T logomark, then slides up to
 * reveal the page and fires "tray-intro-start" so the hero/GSAP animations begin.
 *
 * Safety: the page always renders underneath (no opacity gating). The reveal is
 * guaranteed to complete via (a) try/catch around the sequence, (b) a 3s JS
 * failsafe, and (c) a pure-CSS keyframe failsafe (#intro-curtain auto-lifts at 4s)
 * for the no-JS / failed-hydration case. Reduced-motion finishes instantly.
 */
function finishIntro() {
  if (typeof window === "undefined") return;
  (window as { __trayIntroStarted?: boolean }).__trayIntroStarted = true;
  document.documentElement.classList.add("tl-intro-done");
  document.body.style.overflow = "";
  window.dispatchEvent(new CustomEvent("tray-intro-start"));
}

export function LandingIntro() {
  const [scope, animate] = useAnimate();
  const [done, setDone] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      finishIntro();
      setDone(true);
      return;
    }

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      finishIntro();
    };

    document.body.style.overflow = "hidden";

    // Hard failsafe — the curtain can never trap the page.
    const failsafe = setTimeout(() => {
      start();
      setDone(true);
    }, 3000);

    const seq = async () => {
      try {
        await new Promise((r) => setTimeout(r, 120));
        await animate("#intro-mark", { scale: [0.9, 1.04, 1] }, { duration: 0.5, ease: [0.22, 1, 0.36, 1] });
        await animate("#intro-curtain", { y: "-100%" }, { duration: 0.72, ease: [0.76, 0, 0.24, 1] });
        start();
        await animate("#intro-curtain", { opacity: 0 }, { duration: 0.2 });
      } catch {
        start();
      } finally {
        clearTimeout(failsafe);
        setDone(true);
      }
    };

    seq();

    return () => clearTimeout(failsafe);
  }, [animate]);

  if (done) return null;

  return (
    <div ref={scope}>
      <motion.div
        id="intro-curtain"
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: "var(--tray-cream, #F4EFE6)" }}
        initial={{ y: "0%" }}
      >
        <div id="intro-mark" className="flex flex-col items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-xl border-[3px] border-[var(--tray-ink)] text-2xl font-bold text-[var(--tray-ink)]"
            style={{ fontFamily: "var(--font-hero-display)" }}
          >
            T
          </div>
          <span
            className="text-xl font-semibold tracking-[-0.04em] text-[var(--tray-ink)]"
            style={{ fontFamily: "var(--font-hero-display)" }}
          >
            Tray
          </span>
          <motion.div
            className="h-[1.5px] rounded-full bg-[var(--tray-clay)]"
            initial={{ width: 0 }}
            animate={{ width: 56 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>
    </div>
  );
}
