"use client";

import React from "react";
import Link from "next/link";

/**
 * Masthead with a real mobile menu.
 * Under 720px the inline nav is hidden, so every link lives in a
 * disclosure panel instead of silently disappearing.
 */
export function Masthead() {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <header className="lp-masthead">
      <div className="lp-masthead-inner">
        <a href="#top" className="lp-brand" onClick={close}>
          <span className="lp-brand-name">Tray</span>
          <span className="lp-brand-tag">Street edition</span>
        </a>
        <nav className="lp-nav" aria-label="Main">
          <a href="#how" className="lp-nav-link">
            How
          </a>
          <a href="#demos" className="lp-nav-link">
            Try demos
          </a>
          <a href="#trust" className="lp-nav-link">
            For owners
          </a>
          <Link href="/get-started" className="lp-nav-link lp-nav-link--cta">
            Set up my stall
          </Link>
        </nav>
        <div className="lp-masthead-actions">
          <Link href="/login" className="lp-signin">
            Sign in
          </Link>
          <Link href="/get-started" className="lp-masthead-cta">
            Set up my stall
          </Link>
          <button
            type="button"
            className="lp-menu-btn"
            aria-expanded={open}
            aria-controls="lp-mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Close ✕" : "Menu ☰"}
          </button>
        </div>
      </div>

      <div id="lp-mobile-menu" className="lp-mobile-menu" hidden={!open}>
        <nav className="lp-mobile-menu-list" aria-label="Mobile">
          <a href="#how" className="lp-mobile-link" onClick={close}>
            How it works
          </a>
          <a href="#demos" className="lp-mobile-link" onClick={close}>
            Try the demos
          </a>
          <a href="#trust" className="lp-mobile-link" onClick={close}>
            For owners
          </a>
          <Link href="/login" className="lp-mobile-link" onClick={close}>
            Sign in
          </Link>
          <Link
            href="/get-started"
            className="lp-mobile-link lp-mobile-link--cta"
            onClick={close}
          >
            Set up my stall →
          </Link>
        </nav>
      </div>
    </header>
  );
}
