"use client";

import React from "react";

type RevealProps = {
  as?: "section" | "div";
  className?: string;
  children: React.ReactNode;
  delayMs?: number;
  /** Entrance direction when section enters viewport */
  from?: "up" | "left" | "right" | "scale" | "none";
} & React.HTMLAttributes<HTMLElement>;

/**
 * Section-to-section enter motion.
 * Plays once when the band crosses into view.
 * Fail-open: after safety timeout, always shows content (never stuck blank).
 */
export function Reveal({
  as: Tag = "section",
  className = "",
  children,
  delayMs = 0,
  from = "up",
  style,
  ...rest
}: RevealProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* ignore */
    }

    if (reduced || typeof IntersectionObserver === "undefined") {
      el.classList.add("lp-inview");
      return;
    }

    // Already on screen (e.g. tall display / deep-link): show, no hide flash
    const rect = el.getBoundingClientRect();
    const alreadyIn =
      rect.top < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.08;
    if (alreadyIn) {
      el.classList.add("lp-inview");
      return;
    }

    // Below fold: arm pre-state, then play when scrolled into view
    el.classList.add("lp-reveal-armed");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.06) {
            // Double rAF so browser paints pre-state before transition
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                el.classList.add("lp-inview");
              });
            });
            io.disconnect();
            break;
          }
        }
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: [0, 0.08, 0.15, 0.25],
      }
    );
    io.observe(el);

    // Fail-open — never leave a section invisible
    const safety = window.setTimeout(() => {
      el.classList.add("lp-inview");
    }, 3200);

    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`lp-reveal lp-reveal--${from} ${className}`}
      style={{
        ...style,
        ["--lp-reveal-delay" as string]: `${delayMs}ms`,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
