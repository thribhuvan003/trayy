"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

/**
 * Mobile hamburger + full-height overlay for the Tray landing nav.
 * Renders only when the viewport is < 900px (hamburger is display:none
 * above that in landing-page SCOPED_CSS).
 */
export function LandingHamburger() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        className="tl-hamburger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="tl-mobile-overlay"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="tl-bar-a" />
        <span className="tl-bar-b" />
        <span className="tl-bar-c" />
      </button>
      <div
        id="tl-mobile-overlay"
        className={`tl-mobile-overlay${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <a href="#system" onClick={close}>System</a>
        <a href="#sync" onClick={close}>How it syncs</a>
        <a href="#flow" onClick={close}>How it works</a>
        <a href="#stack" onClick={close}>Stack</a>
        <span className="tl-mobile-divider" aria-hidden />
        <div className="tl-mobile-cta-row">
          <Link href="/login" className="tl-btn tl-btn-ghost" onClick={close}>Sign in</Link>
          <a href="/demo/student.html" className="tl-btn tl-btn-pri" onClick={close}>Live demo</a>
        </div>
      </div>
    </>
  );
}
