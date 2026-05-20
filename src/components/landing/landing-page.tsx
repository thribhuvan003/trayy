import Link from "next/link";
import type { ResolvedTenant } from "@/lib/tenant";
import { LandingLineLeave } from "@/components/landing/landing-line-leave";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LandingHamburger } from "@/components/landing/landing-hamburger";
import { LandingAnimations } from "@/components/landing/landing-animations";

// Slate Ember (Palette C) — warm stone dusk, ember + sky accents. Newsreader headlines.
// Council + brand-research-landing: food-adjacent dark editorial, distinct from Monsoon Paper / flat light SaaS.
// Scoped to .tray-landing only.

const SCOPED_CSS = `
.tray-landing {
  --tl-bg: #0d0c0a;
  --tl-bg-2: #16140f;
  --tl-bg-3: #1f1c16;
  --tl-bg-4: #2a261e;
  --tl-line: rgba(242, 235, 227, 0.1);
  --tl-line-2: rgba(242, 235, 227, 0.18);
  --tl-ink: #f2ebe3;
  --tl-ink-2: rgba(242, 235, 227, 0.78);
  --tl-ink-3: rgba(242, 235, 227, 0.58);
  --tl-ink-4: rgba(242, 235, 227, 0.38);
  --tl-accent: #e8a86a;
  --tl-accent-cool: #9ec4ff;
  --tl-persimmon: #e8a86a;
  /* Portal rims — demo token audit (student / kitchen / admin) */
  --tl-student: #5cb1ff;
  --tl-kitchen: #d52821;
  --tl-kitchen-bright: #ef5749;
  --tl-admin: #cdfa50;
  --tl-good: #6dd4a0;
  --tl-section-glow: rgba(232, 168, 106, 0.12);
  /* Editorial card shell — §02 diagram (tl-diagram) + portal preview row */
  --tl-editorial-card-bg: var(--tl-bg-3);
  --tl-editorial-card-border: var(--tl-line);
  --tl-editorial-card-radius: 18px;
  --tl-editorial-card-top-hair: 1px dashed rgba(242, 235, 227, 0.22);

  /* Type scale — Newsreader display / Manrope body / JetBrains Mono labels */
  --tl-display: var(--font-newsreader), ui-serif, Georgia;
  --tl-sans: var(--font-manrope), var(--font-geist), ui-sans-serif, system-ui;
  --tl-mono: var(--font-jetbrains), var(--font-geist-mono), ui-monospace, Menlo, monospace;
  --tl-display-lg: clamp(3rem, 9.5vw, 8.25rem);
  --tl-display-md: clamp(2.5rem, 7vw, 6rem);
  --tl-display-sm: clamp(2rem, 5vw, 3.25rem);
  --tl-measure: 58ch;
  --tl-measure-lede: 52ch;
  --tl-measure-pull: 42ch;
  --tl-lh-body: 1.62;
  --tl-lh-display: 1.02;
  --tl-lh-h2: 1;
  --tl-size-2xs: 0.8125rem;
  --tl-size-xs: 0.875rem;
  --tl-size-sm: 1rem;
  --tl-size-base: 1.125rem;
  --tl-size-md: 1.25rem;
  --tl-size-lg: 1.375rem;
  /* Shared horizontal inset — nav, .tl-wrap, full-bleed sections that nest .tl-wrap */
  --tl-gutter: 24px;
  --tl-max: 1280px;
  --tl-scroll-anchor: 96px;

  background: linear-gradient(165deg, var(--tl-bg) 0%, var(--tl-bg-2) 42%, var(--tl-bg-3) 100%);
  color: var(--tl-ink);
  font-family: var(--tl-sans);
  font-feature-settings: "ss01", "kern";
  font-variant-numeric: lining-nums tabular-nums;
  font-size: var(--tl-size-base);
  line-height: 1.62;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  min-height: 100dvh;
}
@media (min-width: 768px) {
  .tray-landing { --tl-gutter: 56px; }
}
.tray-landing ::selection { background: rgba(232, 168, 106, 0.35); color: var(--tl-bg); }
.tray-landing .tl-serif { font-family: var(--font-newsreader), ui-serif, Georgia; font-weight: 400; }
.tray-landing .tl-italic { font-family: var(--font-newsreader), ui-serif, Georgia; font-style: italic; font-weight: 400; }
.tray-landing .tl-mono { font-family: var(--font-jetbrains), var(--font-geist-mono), ui-monospace, Menlo, monospace; font-feature-settings: "ss01"; }

.tray-landing .tl-grain {
  position: fixed; inset: -30%; pointer-events: none; z-index: 1; opacity: .045; mix-blend-mode: soft-light;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.tray-landing .tl-ambient { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.tray-landing .tl-ambient-shift { position: absolute; inset: -8%; will-change: transform; }
.tray-landing .tl-orb {
  position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5;
  will-change: transform;
}
.tray-landing .tl-orb-a {
  width: min(52vw, 520px); height: min(52vw, 520px);
  left: -12%; top: 8%;
  background: radial-gradient(circle, rgba(232, 168, 106, 0.22) 0%, transparent 68%);
}
.tray-landing .tl-orb-b {
  width: min(44vw, 440px); height: min(44vw, 440px);
  right: -8%; top: 42%;
  background: radial-gradient(circle, rgba(158, 196, 255, 0.18) 0%, transparent 70%);
}
.tray-landing .tl-orb-c {
  width: min(36vw, 360px); height: min(36vw, 360px);
  left: 38%; bottom: -8%;
  background: radial-gradient(circle, rgba(109, 212, 160, 0.14) 0%, transparent 72%);
  opacity: 0.45;
}

.tray-landing .tl-wrap { max-width: var(--tl-max); margin: 0 auto; padding: 0 var(--tl-gutter); position: relative; z-index: 2; }

/* Nav — liquid glass: inset highlight + refracted edge */
.tray-landing .tl-nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(20px) saturate(1.35);
  -webkit-backdrop-filter: blur(20px) saturate(1.35);
  background: color-mix(in srgb, var(--tl-bg) 72%, transparent);
  border-bottom: 1px solid var(--tl-line);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    inset 0 -1px 0 rgba(0, 0, 0, 0.35);
  transition: background .25s ease, box-shadow .25s ease, border-color .25s ease;
}
.tray-landing .tl-nav-inner {
  max-width: var(--tl-max); margin: 0 auto; padding: 12px var(--tl-gutter);
  display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 12px 8px;
  min-height: 56px;
}
@media (min-width: 900px) {
  .tray-landing .tl-nav-inner {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 20px 32px;
  }
}
.tray-landing .tl-scroll-progress { position: fixed; top: 0; left: 0; right: 0; height: 2px; z-index: 60; background: linear-gradient(90deg, var(--tl-student) 0%, var(--tl-accent) 55%, var(--tl-kitchen) 100%); transform: scaleX(0); transform-origin: 0% 50%; pointer-events: none; }
.tray-landing .tl-nav.is-scrolled {
  background: color-mix(in srgb, var(--tl-bg-2) 88%, transparent);
  border-bottom-color: var(--tl-line-2);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 8px 32px rgba(0, 0, 0, 0.45);
}
.tray-landing .tl-nav.is-scrolled-deep {
  backdrop-filter: blur(32px) saturate(1.65);
  -webkit-backdrop-filter: blur(32px) saturate(1.65);
  background: color-mix(in srgb, var(--tl-bg-3) 92%, transparent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 12px 40px rgba(0, 0, 0, 0.5);
}
.tray-landing .tl-nav.is-scrolled .tl-nav-inner { padding-top: 8px; padding-bottom: 8px; min-height: 52px; }
.tray-landing .tl-brand { font-family: var(--tl-display); font-size: clamp(1.5rem, 4vw, 1.75rem); letter-spacing: -0.03em; font-weight: 400; color: var(--tl-ink); text-decoration: none; white-space: nowrap; justify-self: start; line-height: 1; }
.tray-landing .tl-brand:hover { color: var(--tl-accent); }
.tray-landing .tl-nav-links { display: none; gap: 28px; font-size: var(--tl-size-sm); font-weight: 500; color: var(--tl-ink-2); align-items: center; justify-self: center; position: relative; }
@media (min-width: 900px) { .tray-landing .tl-nav-links { display: flex; } }

/* Mobile hamburger button */
.tray-landing .tl-hamburger {
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  gap: 5px; width: 44px; height: 44px; background: none; border: none; cursor: pointer;
  color: var(--tl-ink-2); padding: 8px; border-radius: 8px; flex-shrink: 0;
  transition: color .15s, background .15s; touch-action: manipulation;
}
.tray-landing .tl-hamburger:hover { color: var(--tl-ink); background: rgba(255,255,255,.06); }
.tray-landing .tl-hamburger:focus-visible { outline: 2px solid var(--tl-accent); outline-offset: 3px; }
.tray-landing .tl-hamburger .tl-bar-a,
.tray-landing .tl-hamburger .tl-bar-b,
.tray-landing .tl-hamburger .tl-bar-c {
  width: 20px; height: 1.5px; background: currentColor; border-radius: 999px;
  transition: transform .22s ease, opacity .18s ease;
}
.tray-landing .tl-hamburger[aria-expanded="true"] .tl-bar-a { transform: translateY(6.5px) rotate(45deg); }
.tray-landing .tl-hamburger[aria-expanded="true"] .tl-bar-b { opacity: 0; }
.tray-landing .tl-hamburger[aria-expanded="true"] .tl-bar-c { transform: translateY(-6.5px) rotate(-45deg); }
@media (min-width: 900px) { .tray-landing .tl-hamburger { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-hamburger .tl-bar-a,
  .tray-landing .tl-hamburger .tl-bar-b,
  .tray-landing .tl-hamburger .tl-bar-c { transition: none; }
}

/* Mobile nav overlay */
.tray-landing .tl-mobile-overlay {
  position: fixed; inset: 0; z-index: 49;
  background: color-mix(in srgb, var(--tl-bg) 96%, transparent);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px;
  opacity: 0; pointer-events: none;
  transition: opacity .25s ease;
}
.tray-landing .tl-mobile-overlay.is-open { opacity: 1; pointer-events: auto; }
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-mobile-overlay { transition: none; }
}
.tray-landing .tl-mobile-overlay a {
  font-family: var(--tl-display); font-size: clamp(2rem, 8vw, 3.5rem); font-weight: 400;
  letter-spacing: -0.03em; color: var(--tl-ink-2); padding: 8px 20px; border-radius: 8px;
  transition: color .15s; text-align: center; line-height: 1.1;
}
.tray-landing .tl-mobile-overlay a:hover { color: var(--tl-ink); }
.tray-landing .tl-mobile-overlay .tl-mobile-divider {
  width: 40px; height: 1px; background: var(--tl-line-2); margin: 8px 0;
}
.tray-landing .tl-mobile-overlay .tl-mobile-cta-row {
  display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 12px;
}
@media (min-width: 900px) { .tray-landing .tl-mobile-overlay { display: none; } }
.tray-landing .tl-nav-pill {
  position: absolute; bottom: -7px; left: 0; height: 2px; width: 0; border-radius: 999px;
  background: linear-gradient(90deg, var(--tl-student), var(--tl-accent));
  pointer-events: none; opacity: 0; will-change: transform, width;
}
.tray-landing .tl-nav-links.has-pill .tl-nav-pill { opacity: 1; }
.tray-landing .tl-nav-links a {
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 4px;
  touch-action: manipulation;
}
.tray-landing .tl-nav-links a:hover { color: var(--tl-ink); }
.tray-landing .tl-nav-cta { display: flex; gap: 8px; align-items: center; justify-self: end; flex-shrink: 0; }
@media (min-width: 480px) { .tray-landing .tl-nav-cta { gap: 10px; } }
.tray-landing .tl-nav-cta .tl-btn { padding: 9px 16px; font-size: var(--tl-size-xs); }
@media (min-width: 480px) { .tray-landing .tl-nav-cta .tl-btn { padding: 11px 20px; font-size: var(--tl-size-sm); } }
/* Hide sign-in on mobile — it lives in the overlay */
.tray-landing .tl-nav-signin { display: none; }
@media (min-width: 900px) { .tray-landing .tl-nav-signin { display: inline-flex; } }

.tray-landing .tl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 11px 20px; border-radius: 999px; font-size: var(--tl-size-sm); font-weight: 600; border: 1px solid transparent; transition: background .15s, color .15s, border-color .15s, box-shadow .2s; line-height: 1.2; font-family: inherit; cursor: pointer; touch-action: manipulation; will-change: transform; }
.tray-landing .tl-btn-pri {
  background: #f2ebe3;
  color: #0d0c0a;
  border-color: rgba(242, 235, 227, 0.35);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 0 0 0 rgba(232, 168, 106, 0);
  position: relative;
}
.tray-landing .tl-btn-pri:hover {
  background: #faf6ef;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 28px rgba(232, 168, 106, 0.22);
}
.tray-landing .tl-btn-pri[data-magnetic] { will-change: transform; }
.tray-landing .tl-btn-ghost { color: var(--tl-ink); background: rgba(255, 255, 255, 0.06); border-color: var(--tl-line-2); }
.tray-landing .tl-btn-ghost:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--tl-accent-cool); color: var(--tl-ink); }
.tray-landing .tl-btn-lg { padding: 15px 26px; font-size: var(--tl-size-base); }

.tray-landing a:focus { outline: none; }
.tray-landing a:focus-visible,
.tray-landing .tl-btn:focus-visible,
.tray-landing .tl-brand:focus-visible {
  outline: 2px solid var(--tl-accent);
  outline-offset: 3px;
}

.tray-landing .tl-skip {
  position: absolute;
  left: -9999px;
  top: 12px;
  z-index: 100;
  padding: 10px 16px;
  background: #f2ebe3;
  color: #0d0c0a;
  border-radius: 8px;
  font-size: var(--tl-size-sm);
  font-weight: 600;
}
.tray-landing .tl-skip:focus-visible {
  left: 12px;
  outline: 2px solid var(--tl-accent);
  outline-offset: 2px;
}

/* Hero — same Slate Ember / editorial surface as portal cards (tl-editorial-card-*) */
.tray-landing .tl-hero {
  padding: 40px 0 48px;
  position: relative;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tl-editorial-card-bg) 92%, var(--tl-bg)) 0%, var(--tl-bg-2) 52%, var(--tl-bg) 100%);
  border-bottom: 1px solid var(--tl-editorial-card-border);
}
@media (min-width: 768px) { .tray-landing .tl-hero { padding: 48px 0 56px; } }
.tray-landing .tl-hero-glow {
  position: absolute; left: 50%; top: -220px; width: min(1100px, 120vw); height: 900px; border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(232, 168, 106, 0.16) 0%, rgba(158, 196, 255, 0.1) 42%, transparent 70%);
  transform: translateX(-50%); pointer-events: none; z-index: 0; will-change: transform;
}
.tray-landing .tl-hero-glow::before,
.tray-landing .tl-hero-glow::after {
  content: ""; position: absolute; border-radius: 50%; filter: blur(72px); pointer-events: none;
}
.tray-landing .tl-hero-glow::before {
  width: min(42vw, 320px); height: min(42vw, 320px); right: 8%; top: 18%;
  background: radial-gradient(circle, rgba(232, 168, 106, 0.18) 0%, transparent 68%);
}
.tray-landing .tl-hero-glow::after {
  width: min(36vw, 260px); height: min(36vw, 260px); left: 12%; bottom: 8%;
  background: radial-gradient(circle, rgba(158, 196, 255, 0.14) 0%, transparent 70%);
}
.tray-landing .tl-hero > :not(.tl-hero-glow):not(.tl-hero-ribbon) { position: relative; z-index: 1; }
.tray-landing .tl-h1 {
  display: flex; flex-direction: column; gap: 0.08em; max-width: none; line-height: var(--tl-lh-display);
  font-family: var(--tl-display); font-weight: 400;
  font-size: var(--tl-display-lg); letter-spacing: -0.028em; margin: 0 0 28px;
  min-height: clamp(4.5rem, 16vw, 12rem);
  text-wrap: balance;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35), 0 28px 64px rgba(0, 0, 0, 0.22);
}
@media (min-width: 960px) {
  .tray-landing .tl-h1 { max-width: 18ch; }
}
.tray-landing .tl-h1-line { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 0.26em; row-gap: 0; }
/* Second line scales down for clearer cadence (single typographic gesture, not gradient tricks) */
.tray-landing .tl-h1-line--secondary {
  font-size: clamp(2.35rem, 6.75vw, 5.35rem);
  letter-spacing: -0.032em;
  line-height: 1.04;
}
.tray-landing .tl-h1 .tl-word {
  display: inline-block; transform-origin: 50% 100%; white-space: nowrap;
  clip-path: inset(100% 0% 0% 0%);
}
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-h1 .tl-word { clip-path: inset(0% 0% 0% 0%); }
}
.tray-landing.tl-motion-ready .tl-h1 .tl-word { clip-path: inset(0% 0% 0% 0%); }
.tray-landing.tl-motion-ready #system .tl-section-num,
.tray-landing.tl-motion-ready #system .tl-section-head,
.tray-landing.tl-motion-ready #system .tl-portal-phase-strip,
.tray-landing.tl-motion-ready #system .tl-portal { clip-path: inset(0% 0% 0% 0%); opacity: 1; }
.tray-landing .tl-h1 .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing [data-reveal] { will-change: transform, opacity; }
.tray-landing #system,
.tray-landing #sync,
.tray-landing #where,
.tray-landing #pull,
.tray-landing #flow,
.tray-landing #stack,
.tray-landing .tl-closing {
  scroll-margin-top: var(--tl-scroll-anchor);
}

/* Hash-nav “arrival” pulse — GSAP animates ring only; hosts must not clip transformed headlines */
.tray-landing .tl-arrival-host { position: relative; overflow: visible; }
.tray-landing .tl-arrival-ring {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 12;
  border-radius: 2px;
  box-shadow:
    inset 0 0 0 2px rgba(232, 168, 106, 0.52),
    0 0 72px rgba(232, 168, 106, 0.12);
  opacity: 0;
  transform: scale(0.994);
  will-change: opacity, transform;
}
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-h1 { text-shadow: none; }
  .tray-landing [data-reveal], .tray-landing .tl-h1 .tl-word { opacity: 1 !important; transform: none !important; }
  .tray-landing #system .tl-section-num,
  .tray-landing #system .tl-section-head,
  .tray-landing #system .tl-portal-phase-strip,
  .tray-landing #system .tl-portal { clip-path: inset(0% 0% 0% 0%) !important; opacity: 1 !important; }
  .tray-landing .tl-footer-mark-c { opacity: 1 !important; transform: none !important; }
  .tray-landing .tl-orb { display: none; }
  .tray-landing .tl-hero-glow::before, .tray-landing .tl-hero-glow::after { display: none; }
  .tray-landing .tl-browser-chrome { transform: none !important; }
  .tray-landing .tl-portal:hover { transform: none !important; box-shadow: none !important; }
  .tray-landing .tl-portal::after { opacity: 0 !important; }
}
.tray-landing.tl-anim-init .tl-hero-top,
.tray-landing.tl-anim-init .tl-h1 .tl-word,
.tray-landing.tl-anim-init .tl-hero-lede,
.tray-landing.tl-anim-init .tl-hero-cta .tl-row,
.tray-landing.tl-anim-init .tl-note,
.tray-landing.tl-anim-init .tl-trust,
.tray-landing.tl-anim-init .tl-hero-stat { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .tray-landing.tl-anim-init .tl-hero-top,
  .tray-landing.tl-anim-init .tl-h1 .tl-word,
  .tray-landing.tl-anim-init .tl-hero-lede,
  .tray-landing.tl-anim-init .tl-hero-cta .tl-row,
  .tray-landing.tl-anim-init .tl-note,
  .tray-landing.tl-anim-init .tl-trust,
  .tray-landing.tl-anim-init .tl-hero-stat { opacity: 1; }
}
.tray-landing .tl-ticker { overflow: hidden; border-block: 1px solid var(--tl-line); background: color-mix(in srgb, var(--tl-bg-2) 78%, var(--tl-bg)); position: relative; z-index: 2; mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
.tray-landing .tl-ticker[data-tl-scroll="1"] .tl-ticker-item {
  opacity: 0;
  transform: translate3d(0, 14px, 0);
  will-change: transform, opacity;
}
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-ticker[data-tl-scroll="1"] .tl-ticker-item {
    opacity: 1;
    transform: none;
    will-change: auto;
  }
}
.tray-landing.tl-motion-ready .tl-ticker[data-tl-scroll="1"].tl-ticker-revealed .tl-ticker-item {
  will-change: auto;
}
.tray-landing .tl-ticker-track { display: flex; width: max-content; animation: tlTicker 42s linear infinite; }
.tray-landing .tl-ticker:hover .tl-ticker-track { animation-play-state: paused; }
.tray-landing .tl-ticker-item { flex-shrink: 0; padding: 16px 32px; font-family: var(--tl-mono); font-size: var(--tl-size-2xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--tl-ink-3); white-space: nowrap; }
.tray-landing .tl-ticker-item em { font-style: normal; color: var(--tl-accent); font-weight: 600; }
@keyframes tlTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-ticker-track { animation: none; flex-wrap: wrap; width: 100%; justify-content: center; }
}
.tray-landing .tl-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; font-family: var(--tl-mono); font-size: var(--tl-size-2xs); letter-spacing: 0.14em; text-transform: uppercase; color: var(--tl-ink-3); padding-bottom: 18px; border-bottom: 1px solid var(--tl-line); margin-bottom: 28px; font-weight: 600; flex-wrap: wrap; }
.tray-landing .tl-hero-top .tl-l, .tray-landing .tl-hero-top .tl-r { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.tray-landing .tl-hero-brandline { text-transform: none; letter-spacing: 0.06em; color: var(--tl-ink-2); }
.tray-landing .tl-live { display: inline-flex; align-items: center; gap: 8px; color: var(--tl-good); text-transform: none; letter-spacing: 0.02em; font-family: var(--tl-sans); font-weight: 600; font-size: var(--tl-size-xs); }
.tray-landing .tl-live .tl-d { width: 7px; height: 7px; border-radius: 50%; background: var(--tl-good); animation: tlLiveEmber 2.4s ease-in-out infinite; }
@keyframes tlLiveEmber {
  0%, 100% { box-shadow: 0 0 0 0 rgba(232, 168, 106, 0.35), 0 0 6px rgba(109, 212, 160, 0.45); }
  55% { box-shadow: 0 0 0 9px rgba(232, 168, 106, 0), 0 0 10px rgba(109, 212, 160, 0.6); }
}
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-live .tl-d { animation: none; }
}

.tray-landing .tl-hero-meta { display: grid; grid-template-columns: 1fr; gap: 24px; align-items: flex-end; margin-bottom: 32px; }
@media (min-width: 960px) { .tray-landing .tl-hero-meta { grid-template-columns: 1.2fr 1fr; gap: 48px; } }
.tray-landing .tl-measure { max-width: var(--tl-measure); }
.tray-landing .tl-hero-lede {
  font-size: var(--tl-size-md);
  line-height: 1.5;
  letter-spacing: -0.007em;
  color: color-mix(in srgb, var(--tl-ink) 10%, var(--tl-ink-2) 90%);
  max-width: min(var(--tl-measure-lede), 52ch);
  font-weight: 400;
}
@media (min-width: 768px) {
  .tray-landing .tl-hero-lede { font-size: var(--tl-size-lg); line-height: 1.45; letter-spacing: -0.008em; }
}
.tray-landing .tl-hero-lede .tl-em { color: var(--tl-ink); font-weight: 600; }
.tray-landing .tl-hero-cta { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
@media (min-width: 960px) { .tray-landing .tl-hero-cta { align-items: flex-end; } }
.tray-landing .tl-hero-cta .tl-row { display: flex; gap: 12px; flex-wrap: wrap; }
.tray-landing .tl-hero-cta .tl-note { font-family: var(--tl-mono); font-size: var(--tl-size-2xs); color: var(--tl-ink-3); letter-spacing: 0.1em; text-align: left; font-weight: 600; }
@media (min-width: 960px) { .tray-landing .tl-hero-cta .tl-note { text-align: right; } }

/* Social proof trust strip — inline with CTA column */
.tray-landing .tl-trust {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-family: var(--tl-mono); font-size: var(--tl-size-2xs); color: var(--tl-ink-3);
  letter-spacing: 0.08em; font-weight: 600; margin-top: 2px;
}
.tray-landing .tl-trust .tl-trust-dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--tl-good);
  box-shadow: 0 0 8px var(--tl-good); flex-shrink: 0;
}
.tray-landing .tl-trust .tl-trust-places {
  color: var(--tl-ink-2); letter-spacing: 0.04em;
}

.tray-landing .tl-hero-stats {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; padding: 22px 0 0; margin-top: 4px;
  border-top: var(--tl-editorial-card-top-hair);
}
@media (min-width: 768px) { .tray-landing .tl-hero-stats { grid-template-columns: repeat(4, 1fr); padding-top: 28px; } }
.tray-landing .tl-hero-stat {
  position: relative; padding: 16px 16px 16px 0; border-right: 1px solid var(--tl-line);
  display: flex; flex-direction: column; gap: 4px;
}
.tray-landing .tl-hero-stat:first-child::before {
  content: ""; position: absolute; top: -28px; left: 0; width: 8px; height: 8px; border-radius: 50%;
  background: rgba(232, 168, 106, 0.12); border: 1px dashed rgba(242, 235, 227, 0.24);
}
@media (min-width: 768px) { .tray-landing .tl-hero-stat { padding: 0 24px 0 0; } .tray-landing .tl-hero-stat:not(:first-child) { padding-left: 24px; } }
.tray-landing .tl-hero-stat:nth-child(2n) { border-right: 0; }
@media (min-width: 768px) { .tray-landing .tl-hero-stat:nth-child(2n) { border-right: 1px solid var(--tl-line); } .tray-landing .tl-hero-stat:last-child { border-right: 0; } }
.tray-landing .tl-hero-stat .tl-v { font-family: var(--tl-display); font-size: clamp(2rem, 5vw, 3rem); letter-spacing: -0.025em; line-height: 1; font-weight: 400; }
.tray-landing .tl-hero-stat .tl-v .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-hero-stat .tl-l { font-family: var(--tl-mono); font-size: var(--tl-size-2xs); letter-spacing: 0.12em; text-transform: uppercase; color: var(--tl-ink-3); font-weight: 600; line-height: 1.35; }

/* Section heads */
.tray-landing .tl-section { padding: 80px 0; position: relative; }
@media (min-width: 768px) { .tray-landing .tl-section { padding: 120px 0; } }
/* Extra air after ticker: first long read beats generic equal section stacks */
.tray-landing #system.tl-section {
  padding-top: clamp(96px, 12vw, 132px);
}
@media (min-width: 768px) {
  .tray-landing #system.tl-section { padding-top: clamp(120px, 14vw, 168px); }
}
.tray-landing .tl-section::before,
.tray-landing .tl-sync::before {
  content: ""; position: absolute; left: 50%; top: 0; width: min(900px, 100%); height: 320px;
  transform: translateX(-50%); pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse 70% 80% at 50% 0%, var(--tl-section-glow), transparent 72%);
}
.tray-landing #system { --tl-section-glow: rgba(92, 177, 255, 0.14); }
.tray-landing .tl-sync { --tl-section-glow: rgba(232, 168, 106, 0.16); }
.tray-landing #where { --tl-section-glow: rgba(205, 250, 80, 0.09); }
.tray-landing .tl-pull { --tl-section-glow: rgba(232, 168, 106, 0.18); }
.tray-landing #flow { --tl-section-glow: rgba(213, 40, 33, 0.11); }
.tray-landing #stack { --tl-section-glow: rgba(158, 196, 255, 0.1); }
.tray-landing .tl-pull { position: relative; }
.tray-landing .tl-pull::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse 60% 80% at 8% 45%, var(--tl-section-glow), transparent 72%);
}
.tray-landing .tl-pull > .tl-wrap { position: relative; z-index: 1; }
.tray-landing .tl-section > .tl-wrap,
.tray-landing .tl-sync > .tl-wrap { position: relative; z-index: 1; }
.tray-landing .tl-section-num { font-family: var(--tl-mono); font-size: var(--tl-size-2xs); letter-spacing: 0.14em; text-transform: uppercase; color: var(--tl-ink-3); display: flex; align-items: center; gap: 10px; margin-bottom: 20px; font-weight: 600; padding-top: 0.04em; }
.tray-landing .tl-section-num .tl-bar { width: 24px; height: 1px; background: var(--tl-ink-4); }
.tray-landing .tl-section-num .tl-num { color: var(--tl-persimmon); font-weight: 600; }
.tray-landing .tl-section-head { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: flex-end; margin-bottom: 40px; }
@media (min-width: 900px) { .tray-landing .tl-section-head { grid-template-columns: 1.3fr 1fr; gap: 80px; margin-bottom: 56px; } }
.tray-landing .tl-section-head h2 { margin: 0; font-family: var(--tl-display); font-weight: 400; font-size: var(--tl-display-md); letter-spacing: -0.03em; line-height: var(--tl-lh-h2); text-wrap: balance; padding-top: 0.08em; }
.tray-landing .tl-section-head h2 .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-section-head .tl-side { color: var(--tl-ink-2); max-width: min(var(--tl-measure), 48ch); font-size: var(--tl-size-base); line-height: 1.62; }
@media (min-width: 768px) { .tray-landing .tl-section-head .tl-side { font-size: var(--tl-size-md); } }

.tray-landing .tl-portal-phase-strip {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px;
  font-family: var(--tl-mono); font-size: var(--tl-size-2xs); letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--tl-ink-2); font-weight: 600; margin: 0 0 28px; padding: 12px 16px;
  border: 1px solid var(--tl-line); border-radius: 12px; background: var(--tl-bg-2); max-width: 100%;
}
@media (min-width: 768px) { .tray-landing .tl-portal-phase-strip { margin-bottom: 36px; padding: 14px 20px; font-size: var(--tl-size-xs); } }
.tray-landing .tl-portal-phase-strip .tl-portal-phase-sep { color: var(--tl-ink-4); font-weight: 500; letter-spacing: 0.04em; }

/* Portal preview cards */
.tray-landing .tl-portals { display: grid; grid-template-columns: 1fr; gap: 18px; }
@media (min-width: 720px) { .tray-landing .tl-portals { grid-template-columns: repeat(3, 1fr); } }
.tray-landing .tl-portal {
  --tl-spot: rgba(0, 0, 0, 0.2);
  background: var(--tl-editorial-card-bg);
  border: 1px solid var(--tl-editorial-card-border);
  border-radius: var(--tl-editorial-card-radius);
  border-top: var(--tl-editorial-card-top-hair);
  overflow: hidden;
  display: flex; flex-direction: column; position: relative;
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.16s ease, box-shadow 0.18s cubic-bezier(0.22, 1, 0.36, 1);
  transform-style: preserve-3d;
}
.tray-landing .tl-portal[data-c="student"] { --tl-spot: var(--tl-student); }
.tray-landing .tl-portal[data-c="kitchen"] { --tl-spot: var(--tl-kitchen-bright); }
.tray-landing .tl-portal[data-c="admin"] { --tl-spot: var(--tl-admin); }
.tray-landing .tl-portal::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 8;
  opacity: 0; transition: opacity 0.22s ease;
  background: radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 12%), color-mix(in srgb, var(--tl-spot) 14%, transparent), transparent 55%);
}
.tray-landing .tl-portal.is-lift::after { opacity: 1; }
@media (hover: hover) {
  .tray-landing .tl-portal:hover::after { opacity: 0.65; }
}
@media (hover: hover) {
  .tray-landing .tl-portal:hover { transform: translateY(-14px) scale(1.012); border-color: var(--tl-ink-4); box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22); }
  .tray-landing .tl-portal[data-c="student"]:hover,
  .tray-landing .tl-portal[data-c="student"].is-lift { box-shadow: 0 20px 44px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(92, 177, 255, 0.45), 0 -2px 0 var(--tl-student); }
  .tray-landing .tl-portal[data-c="kitchen"]:hover,
  .tray-landing .tl-portal[data-c="kitchen"].is-lift { box-shadow: 0 20px 44px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(239, 87, 73, 0.42), 0 -2px 0 var(--tl-kitchen-bright); }
  .tray-landing .tl-portal[data-c="admin"]:hover,
  .tray-landing .tl-portal[data-c="admin"].is-lift { box-shadow: 0 20px 44px rgba(0, 0, 0, 0.24), 0 0 0 1px rgba(205, 250, 80, 0.32), 0 -2px 0 var(--tl-admin); }
}
.tray-landing .tl-portal-head {
  padding: 20px 22px 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px;
  border-bottom: 1px solid var(--tl-line);
}
.tray-landing .tl-portal-head .tl-ix { font-family: var(--tl-mono); font-size: var(--tl-size-2xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--tl-ink-3); font-weight: 600; line-height: 1.35; max-width: min(100%, 20rem); }
.tray-landing .tl-portal-head h3 { font-family: var(--tl-display); font-size: 1.75rem; letter-spacing: -0.025em; margin: 8px 0 0; font-weight: 400; line-height: 1.06; color: var(--tl-ink); }
@media (min-width: 768px) { .tray-landing .tl-portal-head h3 { font-size: 2rem; } }
.tray-landing .tl-portal-head h3 .tl-it { font-style: italic; }
.tray-landing .tl-portal-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
.tray-landing .tl-portal[data-c="student"] .tl-portal-dot { background: var(--tl-student); box-shadow: 0 0 14px var(--tl-student); }
.tray-landing .tl-portal[data-c="kitchen"] .tl-portal-dot { background: var(--tl-kitchen); box-shadow: 0 0 16px var(--tl-kitchen-bright); }
.tray-landing .tl-portal[data-c="admin"] .tl-portal-dot { background: var(--tl-admin); box-shadow: 0 0 14px var(--tl-admin); }
.tray-landing .tl-portal[data-c="student"] .tl-portal-head h3 .tl-it { color: var(--tl-student); }
.tray-landing .tl-portal[data-c="kitchen"] .tl-portal-head h3 .tl-it { color: var(--tl-kitchen); }
.tray-landing .tl-portal[data-c="admin"] .tl-portal-head h3 .tl-it { color: var(--tl-admin); }

.tray-landing .tl-portal-frame {
  position: relative; height: 280px; overflow: hidden;
  background: var(--tl-bg-2);
  border-bottom: 1px solid var(--tl-line);
  transform-style: preserve-3d; will-change: transform;
}
.tray-landing .tl-portal[data-c="kitchen"] .tl-portal-frame::after {
  content: ""; position: absolute; left: 50%; top: 42%; width: min(88%, 340px); height: 55%;
  transform: translate(-50%, -50%); border-radius: 50%; pointer-events: none; z-index: 1;
  background: radial-gradient(ellipse at center, rgba(232, 168, 106, 0.12) 0%, rgba(158, 196, 255, 0.08) 42%, transparent 72%);
  filter: blur(72px); opacity: 0.42;
}
.tray-landing .tl-portal-frame::before {
  content: ""; position: absolute; inset: 0; z-index: 6; pointer-events: none; opacity: 0;
  background: linear-gradient(118deg, transparent 40%, rgba(232, 168, 106, 0.06) 50%, transparent 60%);
  transform: translateX(-130%);
}
.tray-landing .tl-portal.is-shine .tl-portal-frame::before {
  opacity: 0.55; transform: translateX(130%);
  transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s;
}
.tray-landing .tl-hero-ribbon {
  position: absolute; left: -6%; top: 38%; width: 112%; height: 3px; z-index: 0; pointer-events: none;
  border-radius: 2px; opacity: 0.7;
  background: linear-gradient(90deg, transparent 0%, rgba(242, 235, 227, 0.1) 14%, rgba(158, 196, 255, 0.38) 50%, rgba(242, 235, 227, 0.1) 86%, transparent 100%);
  transform: rotate(-0.45deg);
}
.tray-landing .tl-flow-accent {
  position: absolute; left: 0; right: 0; top: 0; height: 3px; z-index: 2; pointer-events: none;
  transform-origin: 0% 50%; transform: scaleX(0);
  background: linear-gradient(90deg, var(--tl-accent-cool) 0%, var(--tl-accent) 55%, var(--tl-kitchen-bright) 100%);
  opacity: 0.85;
}
@media (min-width: 720px) { .tray-landing .tl-portal-frame { height: 420px; } }
.tray-landing .tl-portal[data-c="student"].is-lift { border-color: rgba(92, 177, 255, 0.4); box-shadow: 0 22px 48px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(92, 177, 255, 0.2); }
.tray-landing .tl-portal[data-c="kitchen"].is-lift { border-color: rgba(239, 87, 73, 0.38); box-shadow: 0 22px 48px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(239, 87, 73, 0.18); }
.tray-landing .tl-portal[data-c="admin"].is-lift { border-color: rgba(205, 250, 80, 0.32); box-shadow: 0 22px 48px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(205, 250, 80, 0.14); }
.tray-landing .tl-browser-chrome { display: flex; flex-direction: column; height: 100%; background: #060810; box-shadow: inset 0 0 0 1px rgba(242, 235, 227, 0.12); }
.tray-landing .tl-browser-bar {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: #0a0d14;
  flex-shrink: 0; z-index: 4;
}
.tray-landing .tl-browser-dots { display: flex; gap: 6px; }
.tray-landing .tl-browser-dots span { width: 9px; height: 9px; border-radius: 50%; background: var(--tl-ink-4); }
.tray-landing .tl-browser-dots span:nth-child(1) { background: #ff5f57; }
.tray-landing .tl-browser-dots span:nth-child(2) { background: #febc2e; }
.tray-landing .tl-browser-dots span:nth-child(3) { background: #28c840; }
.tray-landing .tl-browser-phase {
  flex: 1; font-family: var(--tl-mono); font-size: var(--tl-size-2xs); color: rgba(247, 243, 234, 0.88);
  background: #12161f; border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 6px; padding: 7px 12px;
  letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tray-landing .tl-browser-viewport { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.tray-landing .tl-portal-frame iframe { position: absolute; top: 0; left: 0; width: 200%; height: 200%; transform: scale(0.5); transform-origin: 0 0; border: 0; pointer-events: none; background: var(--tl-bg-3); }
.tray-landing .tl-portal-frame .tl-portal-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 65%, color-mix(in srgb, var(--tl-editorial-card-bg) 88%, transparent) 100%);
  pointer-events: none; z-index: 2;
}
.tray-landing .tl-portal-frame .tl-device-tag { position: absolute; top: 52px; left: 14px; font-family: var(--tl-mono); font-size: var(--tl-size-2xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--tl-ink-2); background: rgba(10, 9, 7, 0.92); padding: 5px 11px; border-radius: 5px; font-weight: 600; z-index: 3; border: 1px solid var(--tl-line); }

.tray-landing .tl-portal-body { padding: 18px 22px 22px; display: flex; flex-direction: column; gap: 12px; }
.tray-landing .tl-portal-body p { color: var(--tl-ink-2); font-size: var(--tl-size-sm); line-height: 1.6; margin: 0; max-width: 52ch; }
@media (min-width: 768px) { .tray-landing .tl-portal-body p { font-size: var(--tl-size-base); } }
.tray-landing .tl-feat-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tray-landing .tl-feat-tag { padding: 5px 10px; background: var(--tl-bg-3); border: 1px solid var(--tl-line); border-radius: 5px; font-family: var(--tl-mono); font-size: var(--tl-size-xs); color: var(--tl-ink-2); font-weight: 600; letter-spacing: 0.04em; }
.tray-landing .tl-portal .tl-feat-tag { background: var(--tl-bg-2); }
.tray-landing .tl-portal-open {
  display: flex; align-items: center; justify-content: space-between; min-height: 44px; padding: 13px 18px;
  background: var(--tl-bg-2);
  border: 1px solid var(--tl-line); border-radius: 10px; margin-top: auto; font-size: var(--tl-size-sm); font-weight: 600; transition: all .2s; color: var(--tl-ink); touch-action: manipulation; cursor: pointer;
}
.tray-landing .tl-portal-open:focus-visible { outline: 2px solid var(--tl-accent); outline-offset: 3px; }
.tray-landing .tl-portal-open:hover { background: var(--tl-bg-4); border-color: var(--tl-ink-4); }
.tray-landing .tl-portal[data-c="student"] .tl-portal-open:hover { border-color: var(--tl-student); color: var(--tl-student); }
.tray-landing .tl-portal[data-c="kitchen"] .tl-portal-open:hover { border-color: var(--tl-kitchen); color: var(--tl-kitchen); }
.tray-landing .tl-portal[data-c="admin"] .tl-portal-open:hover { border-color: var(--tl-admin); color: var(--tl-admin); }
.tray-landing .tl-portal-open .tl-arrow { transition: transform .2s; }
.tray-landing .tl-portal-open:hover .tl-arrow { transform: translateX(4px); }

/* Sync section */
.tray-landing .tl-queue-ribbon {
  position: absolute; left: -4%; top: 72px; width: 108%; height: 3px; z-index: 0; pointer-events: none;
  border-radius: 2px; opacity: 0.75;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(242, 235, 227, 0.12) 12%,
    rgba(158, 196, 255, 0.4) 48%,
    rgba(242, 235, 227, 0.12) 88%,
    transparent 100%
  );
  transform: rotate(-0.55deg);
}
.tray-landing .tl-sync {
  padding: 120px 0 96px;
  background: var(--tl-bg-2);
  border-top: 1px solid var(--tl-line);
  border-bottom: 1px solid var(--tl-line);
  position: relative;
  overflow: visible;
}
@media (min-width: 768px) { .tray-landing .tl-sync { padding: 168px 0 140px; } }
.tray-landing .tl-sync-grid { display: grid; grid-template-columns: 1fr; gap: 48px; align-items: start; }
@media (min-width: 960px) { .tray-landing .tl-sync-grid { grid-template-columns: 1fr 1.4fr; gap: 64px; align-items: start; } }
.tray-landing .tl-sync-grid h2 {
  font-family: var(--tl-display);
  font-weight: 400;
  font-size: var(--tl-display-md);
  line-height: var(--tl-lh-h2);
  letter-spacing: -0.03em;
  margin: 0 0 24px;
  padding-top: 0.1em;
}
.tray-landing .tl-sync-grid h2 .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-sync-copy { min-width: 0; }
.tray-landing .tl-sync-grid .tl-lede { font-size: var(--tl-size-md); line-height: var(--tl-lh-body); color: var(--tl-ink-2); margin: 0 0 24px; max-width: min(var(--tl-measure), 48ch); }
@media (min-width: 768px) { .tray-landing .tl-sync-grid .tl-lede { font-size: var(--tl-size-lg); } }
.tray-landing .tl-sync-meta { display: flex; flex-direction: column; gap: 10px; font-family: var(--tl-mono); font-size: var(--tl-size-xs); color: var(--tl-ink-2); font-weight: 600; max-width: min(var(--tl-measure), 48ch); }
.tray-landing .tl-sync-meta .tl-row { display: flex; align-items: flex-start; gap: 12px; }
.tray-landing .tl-sync-meta .tl-k { color: var(--tl-persimmon); width: 56px; flex-shrink: 0; letter-spacing: 0.1em; padding-top: 1px; }
.tray-landing .tl-sync-meta .tl-row > span:last-child { line-height: 1.45; }

.tray-landing .tl-diagram {
  background: var(--tl-editorial-card-bg);
  border: 1px solid var(--tl-editorial-card-border);
  border-radius: var(--tl-editorial-card-radius);
  padding: 24px;
  position: relative; display: flex; flex-direction: column; gap: 14px; overflow: hidden;
  border-top: var(--tl-editorial-card-top-hair);
}
@media (min-width: 768px) { .tray-landing .tl-diagram { padding: 32px; gap: 18px; } }
@media (min-width: 960px) {
  .tray-landing .tl-sync .tl-diagram {
    margin-left: clamp(8px, 2.2vw, 40px);
  }
}
.tray-landing .tl-node { padding: 14px 18px; background: var(--tl-bg-2); border: 1px solid var(--tl-line); border-radius: 12px; display: flex; align-items: center; gap: 14px; position: relative; transition: transform .2s; }
.tray-landing .tl-node .tl-ic { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: var(--tl-mono); font-weight: 700; font-size: var(--tl-size-sm); flex-shrink: 0; }
.tray-landing .tl-node .tl-info { flex: 1; min-width: 0; }
.tray-landing .tl-node .tl-info .tl-n { font-size: var(--tl-size-sm); font-weight: 600; }
.tray-landing .tl-node .tl-info .tl-d { font-family: var(--tl-mono); font-size: var(--tl-size-2xs); color: var(--tl-ink-3); letter-spacing: 0.04em; margin-top: 2px; }
.tray-landing .tl-node .tl-role { font-family: var(--tl-mono); font-size: var(--tl-size-xs); letter-spacing: 0.08em; font-weight: 600; text-transform: uppercase; padding: 4px 9px; border-radius: 5px; white-space: nowrap; }
.tray-landing .tl-node[data-c="kitchen"] .tl-ic, .tray-landing .tl-node[data-c="kitchen"] .tl-role { color: var(--tl-kitchen); background: rgba(213, 40, 33, 0.16); }
.tray-landing .tl-node[data-c="student"] .tl-ic, .tray-landing .tl-node[data-c="student"] .tl-role { color: var(--tl-student); background: rgba(92, 177, 255, 0.16); }
.tray-landing .tl-node[data-c="admin"] .tl-ic, .tray-landing .tl-node[data-c="admin"] .tl-role { color: var(--tl-admin); background: rgba(205, 250, 80, 0.16); }
.tray-landing .tl-node[data-c="db"] .tl-ic, .tray-landing .tl-node[data-c="db"] .tl-role { color: var(--tl-persimmon); background: rgba(239, 106, 58, 0.16); }
.tray-landing .tl-arr { display: flex; align-items: center; justify-content: center; gap: 12px; font-family: var(--tl-mono); font-size: var(--tl-size-xs); color: var(--tl-ink-3); letter-spacing: 0.04em; padding: 4px 0; font-weight: 600; }
.tray-landing .tl-arr .tl-line { height: 1px; background: var(--tl-line-2); flex: 1; }
.tray-landing .tl-arr .tl-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tl-persimmon); box-shadow: 0 0 10px var(--tl-persimmon); animation: tlTravel 3s infinite; }
@keyframes tlTravel { 0%, 100% { opacity: .4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }

/* Pull quote — left-led, grid-aligned (not centered testimonial slab) */
.tray-landing .tl-pull {
  padding: 80px 0;
  border-top: 1px solid var(--tl-line);
}
@media (min-width: 768px) { .tray-landing .tl-pull { padding: 120px 0; } }
.tray-landing .tl-pull-quote {
  margin: 0;
  margin-inline: 0;
  padding: 0;
  border: 0;
  max-width: min(var(--tl-measure-pull), 100%);
}
.tray-landing .tl-pull p {
  font-family: var(--tl-display);
  font-size: clamp(2rem, 4.2vw, 3.65rem);
  line-height: var(--tl-lh-display);
  letter-spacing: -0.025em;
  margin: 0;
  font-weight: 400;
  color: var(--tl-ink);
  text-align: left;
  text-wrap: balance;
}
.tray-landing .tl-pull p .tl-pull-line { display: block; clip-path: inset(100% 0% 0% 0%); }
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-pull p .tl-pull-line { clip-path: inset(0% 0% 0% 0%); }
}
.tray-landing.tl-motion-ready .tl-pull p .tl-pull-line { clip-path: inset(0% 0% 0% 0%); }
.tray-landing .tl-pull p .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-pull .tl-cite {
  margin-top: 28px;
  font-family: var(--tl-mono);
  font-size: var(--tl-size-xs);
  color: var(--tl-ink-3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 600;
  text-align: left;
}

/* Flow */
.tray-landing .tl-flow { display: grid; grid-template-columns: 1fr; border: 1px solid var(--tl-line); border-radius: 18px; overflow: hidden; background: var(--tl-bg-2); }
@media (min-width: 720px) { .tray-landing .tl-flow { grid-template-columns: repeat(4, 1fr); } }
.tray-landing .tl-flow-step { padding: 28px 24px; border-bottom: 1px solid var(--tl-line); min-height: 220px; display: flex; flex-direction: column; gap: 12px; }
@media (min-width: 720px) { .tray-landing .tl-flow-step { padding: 32px 28px; border-bottom: 0; border-right: 1px solid var(--tl-line); min-height: 280px; gap: 14px; } .tray-landing .tl-flow-step:last-child { border-right: 0; } }
.tray-landing .tl-flow-step:last-child { border-bottom: 0; }
.tray-landing .tl-flow-step .tl-ix { font-family: var(--tl-mono); font-size: var(--tl-size-2xs); color: var(--tl-ink-3); letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; }
.tray-landing .tl-flow-step .tl-num { font-family: var(--tl-display); font-size: 4rem; letter-spacing: -0.03em; color: var(--tl-persimmon); line-height: .9; font-weight: 400; font-style: italic; margin: auto 0; }
@media (min-width: 768px) { .tray-landing .tl-flow-step .tl-num { font-size: 5rem; } }
.tray-landing .tl-flow-step h3 { font-family: var(--tl-display); font-size: 1.5rem; letter-spacing: -0.02em; margin: 0; font-weight: 400; line-height: 1.1; }
@media (min-width: 768px) { .tray-landing .tl-flow-step h3 { font-size: 1.625rem; } }
.tray-landing .tl-flow-step h3 .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-flow-step p { color: var(--tl-ink-2); font-size: var(--tl-size-sm); line-height: 1.58; margin: 0; max-width: 32ch; }
@media (min-width: 768px) { .tray-landing .tl-flow-step p { font-size: var(--tl-size-base); } }
.tray-landing .tl-flow-step .tl-tag { margin-top: auto; font-family: var(--tl-mono); font-size: var(--tl-size-xs); color: var(--tl-ink-3); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }

/* Stack */
.tray-landing .tl-stack { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 720px) { .tray-landing .tl-stack { grid-template-columns: repeat(4, 1fr); } }
.tray-landing .tl-stack-card { padding: 20px; background: var(--tl-bg-2); border: 1px solid var(--tl-line); border-radius: 12px; display: flex; flex-direction: column; gap: 8px; transition: border-color .2s, background .2s, transform .25s ease, box-shadow .25s ease; }
.tray-landing .tl-stack-card:hover { border-color: var(--tl-line-2); background: var(--tl-bg-3); transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35); }
.tray-landing .tl-portal-frame { perspective: 1200px; }
.tray-landing .tl-browser-chrome { transform-style: preserve-3d; will-change: transform; }
.tray-landing .tl-stack-card .tl-n { font-weight: 600; font-size: var(--tl-size-sm); color: var(--tl-ink); }
@media (min-width: 768px) { .tray-landing .tl-stack-card .tl-n { font-size: var(--tl-size-base); } }
.tray-landing .tl-stack-card .tl-r { font-family: var(--tl-mono); font-size: var(--tl-size-2xs); color: var(--tl-ink-3); letter-spacing: 0.06em; font-weight: 600; }

/* Closing — same content edge as other .tl-wrap sections */
.tray-landing .tl-closing {
  padding: 120px 0; text-align: left; position: relative; overflow: hidden;
  border-top: 1px dashed rgba(242, 235, 227, 0.22);
}
@media (min-width: 768px) { .tray-landing .tl-closing { padding: 180px 0; } }
.tray-landing .tl-closing::before { content: ""; position: absolute; left: 50%; top: 0; width: 800px; height: 400px; background: radial-gradient(ellipse at center top, rgba(232, 168, 106, 0.18), transparent 70%); transform: translateX(-50%); }
.tray-landing .tl-closing .tl-wrap { position: relative; z-index: 2; }
.tray-landing .tl-closing .tl-section-num { margin-bottom: 24px; }
.tray-landing .tl-closing h2 { font-family: var(--tl-display); font-weight: 400; font-size: clamp(4rem, 12vw, 10rem); line-height: 0.92; letter-spacing: -0.04em; margin: 0 0 24px; color: var(--tl-ink); position: relative; z-index: 2; max-width: 12ch; }
.tray-landing .tl-closing h2 .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-closing p { color: var(--tl-ink-2); font-size: var(--tl-size-md); max-width: min(var(--tl-measure), 48ch); margin: 0 0 36px; position: relative; z-index: 2; padding: 0; line-height: 1.58; }
@media (min-width: 768px) { .tray-landing .tl-closing p { font-size: var(--tl-size-lg); } }
.tray-landing .tl-closing .tl-cta-row { display: flex; gap: 14px; justify-content: flex-start; flex-wrap: wrap; position: relative; z-index: 2; padding: 0; }

/* Footer — Newsreader brand + blurb; Manrope column labels + links; balanced grid vs dead 2fr */
.tray-landing .tl-footer { padding-block: 56px 24px; border-top: 1px solid var(--tl-line); background: var(--tl-bg-2); }
@media (min-width: 768px) { .tray-landing .tl-footer { padding-block: 72px 32px; } }
.tray-landing .tl-footer-row1 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
  margin-bottom: 40px;
  align-items: start;
}
@media (min-width: 640px) {
  .tray-landing .tl-footer-row1 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 32px 24px;
    margin-bottom: 48px;
  }
  .tray-landing .tl-footer-brand { grid-column: 1 / -1; }
}
@media (min-width: 900px) {
  .tray-landing .tl-footer-row1 {
    grid-template-columns: minmax(220px, 1.2fr) repeat(3, minmax(0, 1fr));
    gap: clamp(32px, 3.5vw, 44px) clamp(20px, 2.5vw, 32px);
    margin-bottom: 56px;
  }
  .tray-landing .tl-footer-brand { grid-column: auto; }
}
.tray-landing .tl-footer-brand .tl-brand {
  font-family: var(--tl-display);
  font-size: clamp(1.625rem, 3.8vw, 2rem);
  letter-spacing: -0.03em;
}
.tray-landing .tl-footer h4 {
  font-family: var(--tl-sans);
  font-size: 0.8125rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--tl-ink-3);
  margin: 0 0 16px;
  font-weight: 700;
  line-height: 1.25;
}
@media (min-width: 900px) {
  .tray-landing .tl-footer h4 { font-size: 0.875rem; letter-spacing: 0.1em; margin-bottom: 18px; }
}
.tray-landing .tl-footer .tl-links {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: var(--tl-sans);
  font-size: 1.0625rem;
  font-weight: 500;
  line-height: 1.5;
  color: var(--tl-ink-2);
}
@media (min-width: 900px) {
  .tray-landing .tl-footer .tl-links { font-size: 1.125rem; gap: 14px; }
}
.tray-landing .tl-footer .tl-links a { font-weight: 500; transition: color 0.15s ease; }
.tray-landing .tl-footer .tl-links a:hover { color: var(--tl-ink); }
.tray-landing .tl-footer-tag {
  font-family: var(--tl-display), ui-serif, Georgia, serif;
  font-size: 1.125rem;
  font-weight: 400;
  color: var(--tl-ink-2);
  max-width: min(40ch, 100%);
  line-height: 1.55;
  margin-top: 16px;
  letter-spacing: -0.02em;
}
@media (min-width: 768px) {
  .tray-landing .tl-footer-tag { font-size: 1.25rem; line-height: 1.52; margin-top: 18px; }
}
@media (min-width: 900px) {
  .tray-landing .tl-footer-tag { font-size: 1.3125rem; max-width: min(42ch, 100%); }
}
.tray-landing .tl-footer-mark {
  display: flex; justify-content: flex-end; align-items: baseline; width: 100%;
  font-family: var(--tl-display); font-size: clamp(7.5rem, 22vw, 15rem); line-height: 0.86; letter-spacing: -0.04em;
  text-align: right; font-weight: 400; user-select: none;
  margin: 28px 0 0; overflow: hidden; border-top: 1px solid var(--tl-line);
  padding-block: 28px 12px;
  padding-inline-end: var(--tl-gutter);
  transform-origin: 100% 50%;
}
/* Split spans: letter-spacing on .tl-footer-mark does not apply between sibling char boxes */
.tray-landing .tl-footer-mark-inner { display: inline-flex; align-items: baseline; gap: 0; letter-spacing: 0; }
.tray-landing .tl-footer-mark-c {
  display: inline-block;
  font-variant-numeric: lining-nums;
  padding: 0;
  min-width: 0;
  width: auto;
}
.tray-landing .tl-footer-mark-c:first-child { margin-inline-end: -0.06em; }
.tray-landing .tl-footer-mark-c + .tl-footer-mark-c { margin-inline-start: -0.1em; }
.tray-landing .tl-footer-mark .tl-footer-mark-t { color: color-mix(in srgb, var(--tl-accent) 48%, transparent); }
.tray-landing .tl-footer-mark .tl-footer-mark-ray { font-style: italic; color: color-mix(in srgb, var(--tl-ink) 11%, transparent); }

.tray-landing .tl-line-leave { padding: 80px 0; position: relative; z-index: 2; }
@media (min-width: 768px) { .tray-landing .tl-line-leave { padding: 120px 0; } }
.tray-landing .tl-line-leave-grid { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: start; }
@media (min-width: 900px) { .tray-landing .tl-line-leave-grid { grid-template-columns: 1.1fr 1fr; gap: 48px; } }
.tray-landing .tl-line-leave-title { font-family: var(--tl-display); font-size: clamp(2rem, 5vw, 3rem); letter-spacing: -0.03em; margin: 0 0 12px; font-weight: 400; line-height: 1.05; padding-top: 0.08em; }
.tray-landing .tl-line-leave-title .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-line-leave-lede { color: var(--tl-ink-2); font-size: var(--tl-size-base); line-height: 1.58; margin: 0; max-width: min(var(--tl-measure), 48ch); }
@media (min-width: 768px) { .tray-landing .tl-line-leave-lede { font-size: var(--tl-size-md); } }
.tray-landing .tl-line-leave-panel { display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 16px; border: 1px solid var(--tl-line); background: var(--tl-bg-2); }
.tray-landing .tl-line-chip { text-align: left; padding: 14px 18px; border-radius: 12px; border: 1px solid var(--tl-line); background: var(--tl-bg-3); font-size: var(--tl-size-sm); font-weight: 600; transition: border-color .2s, background .2s, transform .15s; }
@media (min-width: 768px) { .tray-landing .tl-line-chip { font-size: var(--tl-size-base); } }
.tray-landing .tl-line-chip:hover { border-color: var(--tl-ink-4); }
.tray-landing .tl-line-chip.is-on { border-color: rgba(232, 168, 106, 0.45); background: rgba(232, 168, 106, 0.12); color: var(--tl-ink); }
.tray-landing .tl-line-chip:focus-visible { outline: 2px solid var(--tl-accent); outline-offset: 2px; }
.tray-landing .tl-nav-links a { transition: color .15s; position: relative; }
.tray-landing .tl-nav-links a::after { content: ""; position: absolute; left: 0; right: 0; bottom: -4px; height: 1px; background: var(--tl-accent); transform: scaleX(0); transition: transform .2s ease; }
.tray-landing .tl-nav-links a:hover::after { transform: scaleX(1); }
.tray-landing .tl-nav-links.has-pill a.is-active::after { transform: scaleX(0); }
.tray-landing .tl-nav-links a.is-active { color: var(--tl-ink); }
.tray-landing .tl-closing .tl-btn-pri { position: relative; }
@media (pointer: coarse) {
  .tray-landing .tl-btn:active { transform: scale(0.96); transition-duration: 0.08s; }
}
.tray-landing .tl-line-hint { margin: 8px 2px 0; font-size: var(--tl-size-sm); line-height: 1.55; color: var(--tl-ink-2); min-height: 3em; transition: opacity .28s ease, transform .28s ease; }
.tray-landing .tl-line-hint.is-fading { opacity: 0; transform: translateY(6px); }
.tray-landing .tl-hero-stat .tl-stat-num { font-variant-numeric: tabular-nums; }
@media (min-width: 768px) { .tray-landing .tl-line-hint { font-size: var(--tl-size-base); } }
.tray-landing .tl-footer-bot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 14px 20px; align-items: center; padding: 20px 0 0; max-width: 100%; font-family: var(--tl-mono); font-size: var(--tl-size-2xs); color: var(--tl-ink-4); letter-spacing: 0.08em; font-weight: 600; }

/* ─── Ambient orb drift — pure CSS, GPU-composited, no JS ─────────────────
   Three orbs drift at different speeds and directions. GSAP parallax in
   landing-motion.tsx adds scroll-linked translation on top of these.       */
@keyframes tlDriftA {
  0%, 100% { transform: translate(0px, 0px); }
  33%       { transform: translate(30px, -20px); }
  66%       { transform: translate(-15px, 18px); }
}
@keyframes tlDriftB {
  0%, 100% { transform: translate(0px, 0px); }
  30%       { transform: translate(-24px, 16px); }
  65%       { transform: translate(18px, -14px); }
}
@keyframes tlDriftC {
  0%, 100% { transform: translate(0px, 0px); }
  40%       { transform: translate(20px, 10px); }
  70%       { transform: translate(-12px, -18px); }
}
.tray-landing .tl-orb-a { animation: tlDriftA 18s ease-in-out infinite; }
.tray-landing .tl-orb-b { animation: tlDriftB 24s ease-in-out infinite; }
.tray-landing .tl-orb-c { animation: tlDriftC 20s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-orb-a,
  .tray-landing .tl-orb-b,
  .tray-landing .tl-orb-c { animation: none; }
}

/* ─── Portal dot continuous pulse ────────────────────────────────────────── */
@keyframes tlDotPulse {
  0%, 100% { transform: scale(1);    opacity: 1; }
  50%       { transform: scale(1.45); opacity: 0.75; }
}
.tray-landing .tl-portal-dot--pulse {
  animation: tlDotPulse 2.2s ease-in-out infinite;
  will-change: transform, opacity;
}
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-portal-dot--pulse { animation: none; }
}

/* ─── CTA shimmer sweep ────────────────────────────────────────────────────
   Semi-transparent highlight sweeps left to right on primary button hover. */
@keyframes tlShimmer {
  0%   { transform: translateX(-130%); }
  100% { transform: translateX(130%); }
}
.tray-landing .tl-btn-pri { overflow: hidden; }
.tray-landing .tl-btn-pri::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255, 255, 255, 0.22) 50%,
    transparent 70%
  );
  transform: translateX(-130%);
  pointer-events: none;
  z-index: 2;
}
.tray-landing .tl-btn-pri.tl-btn-shimmer::before {
  animation: tlShimmer 0.62s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-btn-pri::before { display: none; }
}

/* ─── Flow step sequential highlight ──────────────────────────────────────
   Steps gain .tl-flow-step--active from FlowStepHighlighter client component.
   The italic step number transition (0.8 → 1.0 scale) is applied inline.  */
.tray-landing .tl-flow-step {
  transition: background 0.35s ease, border-color 0.35s ease;
}
.tray-landing .tl-flow-step--active {
  background: color-mix(in srgb, var(--tl-bg-3) 60%, var(--tl-bg-2));
  border-color: rgba(242, 235, 227, 0.18);
}
@media (min-width: 720px) {
  .tray-landing .tl-flow-step--active {
    border-right-color: rgba(232, 168, 106, 0.28);
  }
}
.tray-landing .tl-flow-step--active .tl-ix { color: var(--tl-persimmon); transition: color 0.3s ease; }
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-flow-step { transition: none; }
  .tray-landing .tl-flow-step--active .tl-ix { transition: none; }
}

/* ─── Closing headline skew spring ────────────────────────────────────────
   Applied by ClosingSkew client component once GSAP's reveal completes.
   Uses a ::after pseudo on the closing wrapper so we don't fight GSAP's
   transform matrix on the h2 directly.
   We rotate the h2 via outline-offset trick — actually we use a CSS
   skewX on an inner wrapper via the parent class.                          */
.tray-landing .tl-closing--skew-enter h2 {
  --tl-h2-skew: -3deg;
  transform: skewX(var(--tl-h2-skew));
  transition: transform 0.72s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform;
}
.tray-landing .tl-closing--skew-settle h2 {
  --tl-h2-skew: 0deg;
  transform: skewX(var(--tl-h2-skew));
}
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-closing--skew-enter h2,
  .tray-landing .tl-closing--skew-settle h2 {
    transform: none;
    transition: none;
  }
}
`;

function BrandMark() {
  return (
    <Link href="/" className="tl-brand">
      Tray
    </Link>
  );
}

function PortalPreview({ src, title, phaseLabel }: { src: string; title: string; phaseLabel?: string }) {
  return (
    <div className="tl-browser-chrome">
      <div className="tl-browser-bar" aria-hidden>
        <div className="tl-browser-dots">
          <span />
          <span />
          <span />
        </div>
        {phaseLabel ? <span className="tl-browser-phase">{phaseLabel}</span> : null}
      </div>
      <div className="tl-browser-viewport">
        <iframe
          src={src}
          title={title}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin"
          scrolling="no"
        />
        <span className="tl-portal-overlay" />
      </div>
    </div>
  );
}

const TICKER_ITEMS = [
  "Hostel mess · 47 orders live",
  "Night canteen · queue 3 min",
  "Sports cafe · specials updated",
  "UPI confirmed · avg 8s",
  "OTP verified · handover 12:04",
  "Kitchen SLA · 94% on time",
  "Multi-canteen · one campus",
  "Realtime sync · 240ms p95",
] as const;

function HeroLine({
  words,
  italicFrom,
  lineClassName,
}: {
  words: string[];
  italicFrom?: number;
  lineClassName?: string;
}) {
  return (
    <span className={lineClassName ? `tl-h1-line ${lineClassName}` : "tl-h1-line"}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className={italicFrom !== undefined && i >= italicFrom ? "tl-word tl-it" : "tl-word"}>
          {w}
        </span>
      ))}
    </span>
  );
}

/**
 * Contextual banner shown when `?msg=no-college` is present in the URL —
 * the user authenticated but has no canteen memberships. The message
 * distinguishes the two root causes:
 *   1. Domain-restricted institution — email domain not registered yet.
 *   2. Truly no canteen exists for this account.
 */
function NoCollegeBanner() {
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(92vw, 560px)",
        background: "#fffbeb",
        border: "1.5px solid #f59e0b",
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
        <circle cx="10" cy="10" r="9" stroke="#f59e0b" strokeWidth="1.5" />
        <path d="M10 6v5M10 13.5v.01" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div>
        <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: "#92400e" }}>
          No canteen found for your account
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#78350f", lineHeight: 1.55 }}>
          If your institution restricts ordering by email domain, ask your admin to add{" "}
          <strong>@{"{your domain}"}</strong> in the canteen settings.
          Otherwise,{" "}
          <Link href="/college/aditya" style={{ color: "#b45309", fontWeight: 600 }}>
            browse all canteens
          </Link>{" "}
          or contact your institution to get set up on Tray.
        </p>
      </div>
    </div>
  );
}

export function LandingPage({ tenant, msg }: { tenant: ResolvedTenant | null; msg?: string }) {
  void tenant;
  const tickerDoubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="tray-landing">
      <style dangerouslySetInnerHTML={{ __html: SCOPED_CSS }} />
      {msg === "no-college" && <NoCollegeBanner />}
      <div className="tl-grain" />
      <div className="tl-ambient" aria-hidden>
        <div className="tl-ambient-shift">
          <span className="tl-orb tl-orb-a" />
          <span className="tl-orb tl-orb-b" />
          <span className="tl-orb tl-orb-c" />
        </div>
      </div>
      <div className="tl-scroll-progress" aria-hidden />
      <LandingMotion />
      <LandingAnimations />
      <a href="#main" className="tl-skip">
        Skip to content
      </a>

      <nav className="tl-nav">
        <div className="tl-nav-inner">
          <BrandMark />
          <div className="tl-nav-links">
            <span className="tl-nav-pill" aria-hidden />
            <a href="#system">System</a>
            <a href="#sync">How it syncs</a>
            <a href="#flow">How it works</a>
            <a href="#stack">Stack</a>
          </div>
          <div className="tl-nav-cta">
            <Link href="/login" className="tl-btn tl-btn-ghost tl-nav-signin">Sign in</Link>
            <a href="https://trayy.vercel.app/demo/index.html" className="tl-btn tl-btn-pri">Live demo</a>
            <LandingHamburger />
          </div>
        </div>
      </nav>

      <main id="main">
      <section className="tl-hero tl-wrap">
        <div className="tl-hero-glow" aria-hidden />
        <div className="tl-hero-ribbon" aria-hidden />
        <div className="tl-hero-top">
          <div className="tl-l">
            <span className="tl-hero-brandline">Tray · v3.0</span>
            <span style={{ color: "var(--tl-ink-4)" }}>/</span>
            <span>CAMPUS EDITION</span>
          </div>
          <div className="tl-r">
            <span className="tl-live"><span className="tl-d" />Kitchen open</span>
          </div>
        </div>
        <h1 className="tl-h1">
          <HeroLine words={["Students", "order."]} />
          <HeroLine words={["Kitchen", "prepares."]} italicFrom={1} lineClassName="tl-h1-line--secondary" />
        </h1>
        <div className="tl-hero-meta">
          <p className="tl-hero-lede tl-measure">
            Students browse, pay by UPI, and walk straight to the counter with a four-digit code.{" "}
            <span className="tl-em">Kitchen runs a live queue. Admin tracks every rupee — scoped to their canteen.</span>
          </p>
          <div className="tl-hero-cta">
            <div className="tl-row">
              <a href="https://trayy.vercel.app/c/aditya/menu" className="tl-btn tl-btn-pri tl-btn-lg" data-magnetic>
                Try the student app →
              </a>
              <Link href="/get-started" className="tl-btn tl-btn-pri tl-btn-lg">Set up my canteen — free</Link>
            </div>
            <div className="tl-note">DEMO IS LIVE · NO SIGN-UP · 90-SECOND TOUR</div>
            <div className="tl-trust">
              <span className="tl-trust-dot" aria-hidden />
              <span>Live at</span>
              <span className="tl-trust-places">Aditya Engineering College · Main Canteen · Hostel 1 Mess · Night Canteen</span>
            </div>
          </div>
        </div>
        <div className="tl-hero-stats">
          <div className="tl-hero-stat" data-count="12"><div className="tl-v"><span className="tl-stat-num">12</span><span className="tl-it">min</span></div><div className="tl-l">Saved per lunch</div></div>
          <div className="tl-hero-stat" data-count="3"><div className="tl-v"><span className="tl-stat-num">3</span></div><div className="tl-l">Role-based portals</div></div>
          <div className="tl-hero-stat"><div className="tl-v">UPI</div><div className="tl-l">Native payments</div></div>
          <div className="tl-hero-stat"><div className="tl-v">OTP</div><div className="tl-l">Verified handover</div></div>
        </div>
      </section>

      <div className="tl-ticker" data-tl-scroll="1" aria-hidden>
        <div className="tl-ticker-track">
          {tickerDoubled.map((item, i) => (
            <span key={`${item}-${i}`} className="tl-ticker-item">
              <em>●</em> {item}
            </span>
          ))}
        </div>
      </div>

      <section className="tl-section tl-wrap tl-arrival-host" id="system">
        <div className="tl-section-num"><span className="tl-bar" /><span className="tl-num">01</span> / The system</div>
        <div className="tl-section-head">
          <h2>Three portals,<br /><span className="tl-it">one source of truth.</span></h2>
          <div className="tl-side">
            Tray runs as a single application with three role-based views. The same data drives every screen.{" "}
            <strong style={{ color: "var(--tl-ink)" }}>Open any portal below</strong>. They are fully functional, no install required.
          </div>
        </div>

        <p className="tl-portal-phase-strip" aria-label="Service flow: College, then Prepare, then Handover">
          <span>College</span>
          <span className="tl-portal-phase-sep" aria-hidden>
            →
          </span>
          <span>Prepare</span>
          <span className="tl-portal-phase-sep" aria-hidden>
            →
          </span>
          <span>Handover</span>
        </p>

        <div className="tl-portals">
          <article className="tl-portal" data-c="student">
            <div className="tl-portal-head">
              <div>
                <span className="tl-portal-ix tl-ix">01 · College</span>
                <h3>Order &<br /><span className="tl-it">collect.</span></h3>
              </div>
              <span className="tl-portal-dot" />
            </div>
            <div className="tl-portal-frame">
              <PortalPreview src="/demo/student.html" title="Student app preview" phaseLabel="College" />
            </div>
            <div className="tl-portal-body">
              <p>
                Dine-in or takeaway up front (QSR-style), veg lane, UPI checkout, pickup-window ETA, and OTP handover:
                full laptop layout with sidebar cart on wide screens.
              </p>
              <div className="tl-feat-tags">
                <span className="tl-feat-tag">Dine · Takeaway</span>
                <span className="tl-feat-tag">UPI · QR</span>
                <span className="tl-feat-tag">Pickup window</span>
                <span className="tl-feat-tag">Veg lane</span>
              </div>
              <a href="https://trayy.vercel.app/c/aditya/menu" className="tl-portal-open">
                <span>Open the student app</span>
                <span className="tl-arrow">→</span>
              </a>
            </div>
          </article>

          <article className="tl-portal" data-c="kitchen">
            <div className="tl-portal-head">
              <div>
                <span className="tl-portal-ix tl-ix">02–03</span>
                <h3>Prepare &<br /><span className="tl-it">hand over.</span></h3>
              </div>
              <span className="tl-portal-dot" />
            </div>
            <div className="tl-portal-frame">
              <PortalPreview src="/demo/kitchen.html" title="Kitchen view preview" />
            </div>
            <div className="tl-portal-body">
              <p>Live queue with preparation timers, status updates, and OTP verification on every handover. Add today's specials → push to every student instantly.</p>
              <div className="tl-feat-tags">
                <span className="tl-feat-tag">Live queue</span>
                <span className="tl-feat-tag">SLA timers</span>
                <span className="tl-feat-tag">Add specials</span>
                <span className="tl-feat-tag">OTP verify</span>
              </div>
              <a href="https://trayy.vercel.app/c/aditya/kitchen" className="tl-portal-open">
                <span>Open the kitchen view</span>
                <span className="tl-arrow">→</span>
              </a>
            </div>
          </article>

          <article className="tl-portal" data-c="admin">
            <div className="tl-portal-head">
              <div>
                <span className="tl-portal-ix tl-ix">04</span>
                <h3>Run the<br /><span className="tl-it">operation.</span></h3>
              </div>
              <span className="tl-portal-dot" />
            </div>
            <div className="tl-portal-frame">
              <span className="tl-device-tag">🖥 Desktop · 1440×</span>
              <PortalPreview src="/demo/admin.html" title="Admin console preview" />
            </div>
            <div className="tl-portal-body">
              <p>Daily revenue, peak hours, top items, full order history, and menu management in one polished web console. Every event from every portal, live.</p>
              <div className="tl-feat-tags">
                <span className="tl-feat-tag">Revenue · live</span>
                <span className="tl-feat-tag">Peak heatmap</span>
                <span className="tl-feat-tag">Audit log</span>
                <span className="tl-feat-tag">⌘K search</span>
              </div>
              <a href="https://trayy.vercel.app/c/aditya/admin/dashboard" className="tl-portal-open">
                <span>Open the admin console</span>
                <span className="tl-arrow">→</span>
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="tl-sync tl-arrival-host" id="sync">
        <div className="tl-queue-ribbon" aria-hidden />
        <div className="tl-wrap">
          <div className="tl-section-num"><span className="tl-bar" /><span className="tl-num">02</span> / The connected canteen</div>
          <div className="tl-sync-grid">
            <div className="tl-sync-copy">
              <h2>Add a special.<br /><span className="tl-it">Watch it land everywhere.</span></h2>
              <p className="tl-lede">
                Kitchen posts a special: every student phone updates in under 300 ms; admin gets the audit row.
                One source, three screens, no refresh.
              </p>
              <div className="tl-sync-meta">
                <div className="tl-row"><span className="tl-k">PIPE</span><span>Postgres repl → Realtime</span></div>
                <div className="tl-row"><span className="tl-k">p95</span><span>~240 ms</span></div>
                <div className="tl-row"><span className="tl-k">BACKUP</span><span>Long-poll when WS drops</span></div>
              </div>
            </div>
            <div className="tl-diagram">
              <div className="tl-node" data-c="kitchen">
                <div className="tl-ic">K</div>
                <div className="tl-info">
                  <div className="tl-n">Kitchen pushes a special</div>
                  <div className="tl-d">POST /api/menu/special</div>
                </div>
                <span className="tl-role">SOURCE</span>
              </div>
              <div className="tl-arr"><div className="tl-line" /><span className="tl-dot" /><span>WRITE · RLS-enforced</span><div className="tl-line" /></div>
              <div className="tl-node" data-c="db">
                <div className="tl-ic">DB</div>
                <div className="tl-info">
                  <div className="tl-n">Postgres · menu_items table</div>
                  <div className="tl-d">tenant_id scoped · row inserted</div>
                </div>
                <span className="tl-role">SOURCE OF TRUTH</span>
              </div>
              <div className="tl-arr"><div className="tl-line" /><span className="tl-dot" style={{ animationDelay: ".4s" }} /><span>FAN OUT · WebSocket</span><div className="tl-line" /></div>
              <div className="tl-node" data-c="student">
                <div className="tl-ic">S</div>
                <div className="tl-info">
                  <div className="tl-n">Student phones receive update</div>
                  <div className="tl-d">~240 ms · subscribed devices</div>
                </div>
                <span className="tl-role">CLIENT</span>
              </div>
              <div className="tl-node" data-c="admin">
                <div className="tl-ic">A</div>
                <div className="tl-info">
                  <div className="tl-n">Admin audit-log row</div>
                  <div className="tl-d">menu.add · audit logged</div>
                </div>
                <span className="tl-role">CLIENT</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingLineLeave />

      <section className="tl-pull tl-arrival-host" id="pull">
        <div className="tl-wrap">
          <div className="tl-section-num"><span className="tl-bar" /><span className="tl-num">·</span> / From the counter</div>
          <blockquote className="tl-pull-quote">
            <p>
              <span className="tl-pull-line">We stopped shouting over the crowd.</span>
              <span className="tl-pull-line">The board calls the order; they show a code.</span>
              <span className="tl-pull-line">
                <span className="tl-it">Lunch</span> ends on time.
              </span>
            </p>
            <footer className="tl-cite">Kitchen supervisor · campus canteen</footer>
          </blockquote>
        </div>
      </section>

      <section className="tl-section tl-wrap tl-arrival-host" id="flow">
        <div className="tl-flow-accent" aria-hidden />
        <div className="tl-section-num"><span className="tl-bar" /><span className="tl-num">03</span> / How it works</div>
        <div className="tl-section-head">
          <h2>Phone to plate,<br /><span className="tl-it">in eleven minutes.</span></h2>
          <div className="tl-side">Four touchpoints. The student walks straight to the counter. The kitchen never repeats a name. Everyone gets their hour back.</div>
        </div>
        <div className="tl-flow">
          <div className="tl-flow-step">
            <div className="tl-ix">01 · 11:42</div>
            <div className="tl-num">01</div>
            <h3>Browse the <span className="tl-it">menu.</span></h3>
            <p>Live availability, prep times, veg/non-veg filters. Add to cart with one tap.</p>
            <div className="tl-tag">→ STATUS: CART</div>
          </div>
          <div className="tl-flow-step">
            <div className="tl-ix">02 · 11:43</div>
            <div className="tl-num">02</div>
            <h3>Pay by <span className="tl-it">UPI.</span></h3>
            <p>Single-use QR with exact amount. Webhook confirms automatically.</p>
            <div className="tl-tag">→ STATUS: PAID</div>
          </div>
          <div className="tl-flow-step">
            <div className="tl-ix">03 · 11:46</div>
            <div className="tl-num">03</div>
            <h3>Track <span className="tl-it">live.</span></h3>
            <p>Queued → preparing → ready, updated by the kitchen in under 250 ms.</p>
            <div className="tl-tag">→ STATUS: PREPARING</div>
          </div>
          <div className="tl-flow-step">
            <div className="tl-ix">04 · 11:53</div>
            <div className="tl-num">04</div>
            <h3>Collect with <span className="tl-it">OTP.</span></h3>
            <p>Read the four-digit code at the counter. Staff verifies, marks complete.</p>
            <div className="tl-tag">✓ ORDER CLOSED</div>
          </div>
        </div>
      </section>

      <section className="tl-section tl-wrap tl-arrival-host" id="stack">
        <div className="tl-section-num"><span className="tl-bar" /><span className="tl-num">04</span> / Built with</div>
        <div className="tl-section-head">
          <h2>
            <span className="tl-anim-stack-line">A boring stack,</span>
            <br />
            <span className="tl-it">on purpose.</span>
          </h2>
          <div className="tl-side">Everything is on a free tier until you have real users. No exotic infrastructure. No vendor lock-in surprises.</div>
        </div>
        <div className="tl-stack">
          {[
            ["Next.js 15", "FRAMEWORK · APP ROUTER + RSC"],
            ["TypeScript", "LANGUAGE · STRICT MODE"],
            ["Tailwind CSS", "STYLING · DESIGN TOKENS"],
            ["Supabase", "DB · AUTH · STORAGE"],
            ["Postgres + RLS", "DATA · MULTI-TENANT"],
            ["Supabase Realtime", "LIVE · WEBSOCKETS"],
            ["Razorpay", "PAYMENTS · UPI"],
            ["Vercel · Edge", "HOSTING · CDN"],
          ].map(([n, r]) => (
            <div key={n} className="tl-stack-card">
              <span className="tl-n">{n}</span>
              <span className="tl-r">{r}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="tl-closing">
        <div className="tl-wrap">
          <div className="tl-section-num">
            <span className="tl-bar" /><span className="tl-num">DEMO</span> / Live · clickable · no sign-up
          </div>
          <h2>Skip the<br /><span className="tl-it">queue.</span></h2>
          <p>Three screens. One lunch service. Built for college canteens that are tired of printed tokens.</p>
          <div className="tl-cta-row">
            <a href="https://trayy.vercel.app/c/aditya/menu" className="tl-btn tl-btn-pri tl-btn-lg" data-magnetic>
              Try the student app →
            </a>
            <a href="https://trayy.vercel.app/c/aditya/kitchen" className="tl-btn tl-btn-ghost tl-btn-lg">Kitchen view</a>
            <a href="https://trayy.vercel.app/c/aditya/admin/dashboard" className="tl-btn tl-btn-ghost tl-btn-lg">Admin dashboard</a>
          </div>
        </div>
      </section>
      </main>

      <footer className="tl-footer tl-wrap">
        <div className="tl-footer-row1">
          <div className="tl-footer-brand">
            <BrandMark />
            <p className="tl-footer-tag">A canteen ordering system for college and university campuses. Self-hostable, multi-tenant, source-available.</p>
          </div>
          <div>
            <h4>Product</h4>
            <div className="tl-links">
              <a href="https://trayy.vercel.app/c/aditya/menu">Student app</a>
              <a href="https://trayy.vercel.app/c/aditya/kitchen">Kitchen view</a>
              <a href="https://trayy.vercel.app/c/aditya/admin/dashboard">Admin console</a>
              <Link href="/get-started">Get started</Link>
            </div>
          </div>
          <div>
            <h4>Resources</h4>
            <div className="tl-links">
              <a href="https://github.com/thribhuvan003/Tray/blob/main/README.md" target="_blank" rel="noreferrer">README</a>
              <a href="https://github.com/thribhuvan003/Tray/tree/main/docs/adr" target="_blank" rel="noreferrer">Architecture</a>
              <a href="https://github.com/thribhuvan003/Tray/blob/main/SECURITY.md" target="_blank" rel="noreferrer">Security</a>
              <a href="https://github.com/thribhuvan003/Tray/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Contributing</a>
            </div>
          </div>
          <div>
            <h4>Contact</h4>
            <div className="tl-links">
              <a href="https://github.com/thribhuvan003/Tray" target="_blank" rel="noreferrer">github.com/thribhuvan003</a>
            </div>
          </div>
        </div>
        <div className="tl-footer-mark" aria-hidden="true">
          <span className="tl-footer-mark-inner">
            {(["T", "r", "a", "y"] as const).map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                className={
                  i === 0
                    ? "tl-footer-mark-c tl-footer-mark-t"
                    : "tl-footer-mark-c tl-footer-mark-ray"
                }
                data-tl-footer-char
              >
                {ch}
              </span>
            ))}
          </span>
        </div>
        <div className="tl-footer-bot">
          <span>BUILT FOR CAMPUS CANTEENS · MADE IN INDIA</span>
          <span>v3.0 · 2026</span>
        </div>
      </footer>
    </div>
  );
}
