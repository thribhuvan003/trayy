"use client";

import { useEffect, useState } from "react";

const KEY = "tray_landing_intro_seen";

/**
 * First-visit flash only. SSR + first client paint both return null
 * (avoids hydration mismatch from sessionStorage).
 */
export function LandingIntro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        sessionStorage.setItem(KEY, "1");
        return;
      }
    } catch {
      return;
    }

    setShow(true);
    const t = window.setTimeout(() => {
      try {
        sessionStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
      setShow(false);
    }, 650);

    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div className="lp-intro" aria-hidden>
      <div className="lp-intro-mark">
        <span className="lp-intro-tray">tray</span>
        <span className="lp-intro-slash">/</span>
        <span className="lp-intro-stamp">street</span>
      </div>
      <span className="lp-intro-bar" />
    </div>
  );
}
