"use client";

import React from "react";

type RevealProps = {
  as?: "section" | "div";
  className?: string;
  children: React.ReactNode;
  delayMs?: number;
  from?: "up" | "left" | "right" | "scale" | "none";
} & React.HTMLAttributes<HTMLElement>;

/**
 * Optional entrance motion. Content is ALWAYS visible (fail-open).
 * Never leaves opacity:0 — that caused missing demos / giant empty gaps.
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
  const [shown, setShown] = React.useState(true);

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
      setShown(true);
      return;
    }

    // Start visible; only re-play motion if we want (keep shown true always)
    setShown(true);

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add("lp-inview");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -4% 0px", threshold: 0.02 }
    );
    io.observe(el);

    // Safety: mark inview even if observer is flaky
    const t = window.setTimeout(() => el.classList.add("lp-inview"), 600);

    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      className={`lp-reveal lp-reveal--${from} ${shown ? "lp-revealed" : ""} ${className}`}
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
