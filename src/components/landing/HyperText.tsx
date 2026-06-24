"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
const rand = () => CHARS[Math.floor(Math.random() * CHARS.length)];

export type HyperTextVariant = "default" | "wave" | "glitch" | "matrix" | "typewriter";

type HyperTextProps = {
  text: string;
  className?: string;
  /** total animation time in ms */
  duration?: number;
  /** ms to wait after entering view before resolving */
  delay?: number;
  variant?: HyperTextVariant;
  as?: "span" | "h1" | "h2" | "h3";
};

const scramble = (text: string) =>
  text
    .split("")
    .map((c) => (c === " " ? " " : rand()))
    .join("");

/**
 * Decrypt/scramble text reveal. SSR-renders the real text (no hydration flash),
 * scrambles on the client after mount, then resolves once scrolled into view.
 * Respects prefers-reduced-motion (renders plain text, no animation).
 */
export function HyperText({
  text,
  className,
  duration = 900,
  delay = 0,
  variant = "default",
  as: Tag = "span",
}: HyperTextProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(text);

  // Client-only: pre-scramble after mount so the reveal has somewhere to go.
  useEffect(() => {
    if (reduced) return;
    setDisplay(variant === "typewriter" ? "" : scramble(text));
  }, [reduced, text, variant]);

  useEffect(() => {
    if (reduced || !inView) return;
    const chars = text.split("");
    const n = Math.max(chars.length, 1);
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    let interval: ReturnType<typeof setInterval> | undefined;

    const start = setTimeout(() => {
      if (variant === "typewriter") {
        chars.forEach((_, i) =>
          timers.push(
            setTimeout(() => setDisplay(text.slice(0, i + 1)), (duration / n) * i),
          ),
        );
      } else if (variant === "wave") {
        chars.forEach((_, i) =>
          timers.push(
            setTimeout(() => {
              setDisplay(chars.map((c, j) => (j <= i ? c : c === " " ? " " : rand())).join(""));
            }, (duration / n) * i),
          ),
        );
      } else if (variant === "matrix") {
        interval = setInterval(() => {
          setDisplay(chars.map((c) => (c === " " ? " " : Math.random() > 0.5 ? c : rand())).join(""));
        }, 50);
        timers.push(setTimeout(() => { if (interval) clearInterval(interval); setDisplay(text); }, duration));
      } else {
        // default + glitch: resolve left→right, glitch resolves faster/jitterier
        const speed = variant === "glitch" ? 2 : 1.5;
        let frame = 0;
        interval = setInterval(() => {
          frame += 1;
          const revealed = Math.floor(frame / (variant === "glitch" ? 1 : 2));
          setDisplay(chars.map((c, i) => (c === " " ? " " : i < revealed ? c : rand())).join(""));
          if (revealed >= n) { if (interval) clearInterval(interval); setDisplay(text); }
        }, duration / (n * speed));
      }
    }, delay);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, [inView, reduced, text, duration, delay, variant]);

  return (
    <Tag ref={ref as React.Ref<never>} className={className} aria-label={text}>
      {display || " "}
    </Tag>
  );
}
