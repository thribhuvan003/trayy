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
//
// As the user scrolls through the #flow section, each step lights up in order:
//   step 1 → 25%  of section progress
//   step 2 → 50%
//   step 3 → 75%
//   step 4 → 100%
//
// We use a plain IntersectionObserver on each step for simplicity and
// zero-layout-shift (only class + CSS custom-property changes, no transforms).
// The large italic number scales 0.8 → 1.0 via CSS transition when active.

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

    // One observer per step; each becomes "active" when it crosses the
    // 40% viewport threshold (roughly middle of the viewport on mobile,
    // well before it exits on desktop).
    const observers: IntersectionObserver[] = [];

    const activate = (step: HTMLElement) => {
      // Deactivate all, then activate this one and those before it.
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
      // Reset initial state (scale 0.8 on number, dim opacity).
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
      // Clean up inline styles
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

  // Invisible sentinel — renders nothing visible.
  return <div ref={sentinelRef} style={{ display: "none" }} aria-hidden />;
}

// ─── Closing headline skew spring ──────────────────────────────────────────
//
// The "Skip the line." h2 enters with a skewX(-3deg) → skewX(0) spring.
//
// GSAP owns transform/opacity on the h2 itself (y + scale + clearProps on
// complete). To avoid fighting GSAP's matrix, we apply the skew to the
// .tl-closing wrapper's CSS variable and compose it at the h2 level using
// a CSS class added after GSAP finishes (detects via opacity reaching 1).

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

    // Poll (rAF) until GSAP has completed its opacity+transform reveal on h2.
    // GSAP calls clearProps("transform,filter") on complete, so we wait until:
    //   1. opacity >= 0.99 (fully revealed)
    //   2. No inline transform set by GSAP (clearProps has run)
    const poll = () => {
      if (hasRun.current) return;
      const h2 = closing.querySelector<HTMLElement>("h2");
      if (!h2) return;
      const opacity = parseFloat(getComputedStyle(h2).opacity);
      const hasInlineTransform = h2.style.transform !== "";
      if (opacity >= 0.99 && !hasInlineTransform) {
        hasRun.current = true;
        // Step 1: apply "from" state (skewed); needs to paint before settle.
        closing.classList.add("tl-closing--skew-enter");
        // Step 2: two frames later — guarantees at least one paint — spring settles.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            closing.classList.add("tl-closing--skew-settle");
          });
        });
      } else {
        rafRef.current = requestAnimationFrame(poll);
      }
    };

    // Start polling when the closing section enters view
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

// ─── CTA Shimmer — adds shimmer on .tl-btn-pri hover ───────────────────────
//
// A light gradient sweeps left→right on hover via CSS class toggle.
// The shimmer keyframe is defined in landing-page.tsx SCOPED_CSS.
// This component handles focus-keyboard safety by using pointer events only.

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
      // Remove after animation completes (600ms matches keyframe)
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
//
// The colored status dot (student=blue, kitchen=tomato, admin=lime) in each
// portal header pulses continuously via CSS animation. We add the class so
// the animation can be defined in SCOPED_CSS without touching SSR markup.
// (The dots already have box-shadow glow from CSS — we add scale+opacity pulse.)

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

// ─── Root export: mount all animation controllers ──────────────────────────

export function LandingAnimations() {
  return (
    <>
      <FlowStepHighlighter />
      <ClosingSkew />
      <CtaShimmer />
      <PortalDotPulse />
    </>
  );
}
