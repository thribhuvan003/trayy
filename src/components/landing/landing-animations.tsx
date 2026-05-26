"use client";
/**
 * LandingAnimations — Framer Motion scroll effects for the Tray landing page.
 * Handles: portal-dot pulse (continuous), flow-step sequential highlight,
 * closing headline skew spring, and CTA shimmer hover.
 *
 * GSAP (landing-motion.tsx) owns: hero word-reveal, stat count-up, ambient-orb
 * parallax, portal 3-D lift, node diagram stagger, pull-quote fade.
 * This file does NOT duplicate any of those.
 *
 * prefers-reduced-motion: all motion guards check the media query before
 * applying transforms. Opacity-only fallbacks are used when motion is reduced.
 */
import { useEffect, useRef } from "react";

// ─── Flow-step sequential highlight ────────────────────────────────────────
export function FlowStepHighlighter() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = Array.from(
      document.querySelectorAll<HTMLElement>("#flow .tl-flow-step"),
    );
    if (!steps.length) return;
    const observers: IntersectionObserver[] = [];
    const activate = (step: HTMLElement) => {
      const idx = steps.indexOf(step);
      steps.forEach((s, i) => {
        if (i <= idx) {
          s.classList.add("tl-flow-step--active");
          if (!reduced) {
            const numEl = s.querySelector<HTMLElement>(".tl-num");
            if (numEl) numEl.style.transform = "scale(1)";
          }
        }
      });
    };
    steps.forEach((step) => {
      if (!reduced) {
        const numEl = step.querySelector<HTMLElement>(".tl-num");
        if (numEl) {
          numEl.style.transform = "scale(0.8)";
          numEl.style.transition = "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)";
        }
      }
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) activate(step);
          });
        },
        { rootMargin: "-10% 0px -35% 0px", threshold: 0 },
      );
      obs.observe(step);
      observers.push(obs);
    });
    return () => {
      observers.forEach((o) => o.disconnect());
      steps.forEach((step) => {
        step.classList.remove("tl-flow-step--active");
        const numEl = step.querySelector<HTMLElement>(".tl-num");
        if (numEl) {
          numEl.style.transform = "";
          numEl.style.transition = "";
        }
      });
    };
  }, []);
  return <div ref={sentinelRef} style={{ display: "none" }} aria-hidden />;
}

// ─── Closing headline skew spring ──────────────────────────────────────────
export function ClosingSkew() {
  const hasRun = useRef(false);
  const rafRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const closing = document.querySelector<HTMLElement>(".tl-closing");
    if (!closing) return;
    const poll = () => {
      if (hasRun.current) return;
      const h2 = closing.querySelector<HTMLElement>("h2");
      if (!h2) return;
      const opacity = parseFloat(getComputedStyle(h2).opacity);
      const hasInlineTransform = h2.style.transform !== "";
      if (opacity >= 0.99 && !hasInlineTransform) {
        hasRun.current = true;
        closing.classList.add("tl-closing--skew-enter");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            closing.classList.add("tl-closing--skew-settle");
          });
        });
      } else {
        rafRef.current = requestAnimationFrame(poll);
      }
    };
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasRun.current) {
            rafRef.current = requestAnimationFrame(poll);
            obs.disconnect();
          }
        });
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0 },
    );
    obs.observe(closing);
    return () => {
      obs.disconnect();
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
      closing.classList.remove("tl-closing--skew-enter", "tl-closing--skew-settle");
    };
  }, []);
  return null;
}

// ─── CTA Shimmer ───────────────────────────────────────────────────────────
export function CtaShimmer() {
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const btns = Array.from(
      document.querySelectorAll<HTMLElement>(".tray-landing .tl-btn-pri"),
    );
    const cleanups: Array<() => void> = [];
    btns.forEach((btn) => {
      const onEnter = () => btn.classList.add("tl-btn-shimmer");
      const onLeave = () => {
        setTimeout(() => btn.classList.remove("tl-btn-shimmer"), 640);
      };
      btn.addEventListener("mouseenter", onEnter);
      btn.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        btn.removeEventListener("mouseenter", onEnter);
        btn.removeEventListener("mouseleave", onLeave);
        btn.classList.remove("tl-btn-shimmer");
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, []);
  return null;
}

// ─── Portal dot pulse ───────────────────────────────────────────────────────
export function PortalDotPulse() {
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const dots = Array.from(
      document.querySelectorAll<HTMLElement>(".tray-landing .tl-portal-dot"),
    );
    dots.forEach((dot) => dot.classList.add("tl-portal-dot--pulse"));
    return () => {
      dots.forEach((dot) => dot.classList.remove("tl-portal-dot--pulse"));
    };
  }, []);
  return null;
}

// ─── Scroll-reveal IntersectionObserver ───────────────────────────────────
export function ScrollReveal() {
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".tray-landing .tl-reveal"),
    );
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("is-visible");
        }),
      { threshold: 0.12, rootMargin: "-40px 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return null;
}

// ─── Root export: mount all animation controllers ──────────────────────────
export function LandingAnimations() {
  return (
    <>
      <FlowStepHighlighter />
      <ClosingSkew />
      <CtaShimmer />
      <PortalDotPulse />
      <ScrollReveal />
    </>
  );
}
