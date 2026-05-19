import Link from "next/link";
import type { ResolvedTenant } from "@/lib/tenant";
import { LandingLineLeave } from "@/components/landing/landing-line-leave";
import { LandingMotion } from "@/components/landing/landing-motion";

// Pre-Monsoon Dusk — sky slate + bone + amber accent. Instrument Serif headlines.
// Scoped to .tray-landing only; student/kitchen/admin portals stay separate.

const SCOPED_CSS = `
.tray-landing {
  --tl-bg: #0d1220;
  --tl-bg-2: #141d38;
  --tl-bg-3: #1a2548;
  --tl-bg-4: #243060;
  --tl-line: rgba(232, 228, 220, 0.10);
  --tl-line-2: rgba(232, 228, 220, 0.18);
  --tl-ink: #e8e4dc;
  --tl-ink-2: rgba(232, 228, 220, 0.62);
  --tl-ink-3: rgba(232, 228, 220, 0.38);
  --tl-ink-4: rgba(232, 228, 220, 0.22);
  --tl-accent: #c4a882;
  --tl-persimmon: #c4a882;
  --tl-student: #7eb8ff;
  --tl-kitchen: #ff7b6e;
  --tl-admin: #b8e86a;
  --tl-good: #6dd4a0;

  background: linear-gradient(180deg, #0d1220 0%, #111827 42%, #141d38 100%);
  color: var(--tl-ink);
  font-family: var(--font-geist), var(--font-inter), ui-sans-serif, system-ui;
  font-feature-settings: "ss01";
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  min-height: 100vh;
}
.tray-landing ::selection { background: var(--tl-persimmon); color: var(--tl-bg); }
.tray-landing .tl-serif { font-family: var(--font-instrument-serif), ui-serif, Georgia; font-weight: 400; }
.tray-landing .tl-italic { font-family: var(--font-instrument-serif), ui-serif, Georgia; font-style: italic; font-weight: 400; }
.tray-landing .tl-mono { font-family: var(--font-geist-mono), var(--font-jetbrains), ui-monospace, Menlo, monospace; font-feature-settings: "ss01"; }

.tray-landing .tl-grain {
  position: fixed; inset: -30%; pointer-events: none; z-index: 1; opacity: .045; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.tray-landing .tl-wrap { max-width: 1280px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 2; }
@media (min-width: 768px) { .tray-landing .tl-wrap { padding: 0 56px; } }

/* Nav */
.tray-landing .tl-nav { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(20px) saturate(1.4); background: rgba(13, 18, 32, 0.78); border-bottom: 1px solid var(--tl-line); }
.tray-landing .tl-nav-inner { max-width: 1280px; margin: 0 auto; padding: 14px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
@media (min-width: 768px) { .tray-landing .tl-nav-inner { padding: 14px 56px; } }
.tray-landing .tl-brand { display: flex; align-items: center; gap: 10px; font-family: var(--font-instrument-serif), serif; font-size: 26px; letter-spacing: -0.02em; font-weight: 400; }
.tray-landing .tl-brand .tl-brand-dot { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-brand-mark { width: 32px; height: 32px; border-radius: 7px; background: linear-gradient(135deg, var(--tl-accent), #8a7358); display: inline-flex; align-items: center; justify-content: center; font-family: var(--font-instrument-serif), serif; font-weight: 400; font-size: 18px; color: var(--tl-bg); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .12); }
.tray-landing .tl-nav-links { display: none; gap: 32px; font-size: 14px; color: var(--tl-ink-2); }
@media (min-width: 900px) { .tray-landing .tl-nav-links { display: flex; } }
.tray-landing .tl-nav-links a:hover { color: var(--tl-ink); }
.tray-landing .tl-nav-cta { display: flex; gap: 10px; align-items: center; }

.tray-landing .tl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 18px; border-radius: 999px; font-size: 14px; font-weight: 500; border: 1px solid transparent; transition: transform .12s, background .15s, color .15s, border-color .15s; line-height: 1; font-family: inherit; cursor: pointer; }
.tray-landing .tl-btn-pri { background: var(--tl-ink); color: var(--tl-bg); border-color: var(--tl-ink); }
.tray-landing .tl-btn-pri:hover { background: #fff; transform: translateY(-1px); }
.tray-landing .tl-btn-ghost { color: var(--tl-ink); background: transparent; border-color: var(--tl-line-2); }
.tray-landing .tl-btn-ghost:hover { background: rgba(255, 255, 255, .05); border-color: var(--tl-ink-3); }
.tray-landing .tl-btn-lg { padding: 14px 24px; font-size: 15px; }

.tray-landing a:focus { outline: none; }
.tray-landing a:focus-visible,
.tray-landing .tl-btn:focus-visible {
  outline: 2px solid var(--tl-accent);
  outline-offset: 3px;
}

.tray-landing .tl-skip {
  position: absolute;
  left: -9999px;
  top: 12px;
  z-index: 100;
  padding: 10px 16px;
  background: var(--tl-ink);
  color: var(--tl-bg);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}
.tray-landing .tl-skip:focus {
  left: 12px;
}

/* Hero */
.tray-landing .tl-hero { padding: 80px 0 64px; position: relative; }
@media (min-width: 768px) { .tray-landing .tl-hero { padding: 96px 0 80px; } }
.tray-landing .tl-hero::before { content: ""; position: absolute; left: 50%; top: -220px; width: 1100px; height: 900px; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(126, 184, 255, 0.14) 0%, rgba(196, 168, 130, 0.08) 35%, transparent 68%); transform: translateX(-50%); pointer-events: none; z-index: 0; }
.tray-landing .tl-h1 .tl-word { display: inline-block; transform-origin: 50% 100%; }
.tray-landing [data-reveal] { will-change: transform, opacity; }
.tray-landing .tl-ticker { overflow: hidden; border-block: 1px solid var(--tl-line); background: rgba(20, 29, 56, 0.55); position: relative; z-index: 2; }
.tray-landing .tl-ticker-track { display: flex; width: max-content; animation: tlTicker 42s linear infinite; }
.tray-landing .tl-ticker:hover .tl-ticker-track { animation-play-state: paused; }
.tray-landing .tl-ticker-item { flex-shrink: 0; padding: 14px 28px; font-family: var(--font-geist-mono), monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--tl-ink-3); white-space: nowrap; }
.tray-landing .tl-ticker-item em { font-style: normal; color: var(--tl-accent); font-weight: 600; }
@keyframes tlTicker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) {
  .tray-landing .tl-ticker-track { animation: none; flex-wrap: wrap; width: 100%; justify-content: center; }
}
.tray-landing .tl-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; font-family: var(--font-geist-mono), monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--tl-ink-3); padding-bottom: 24px; border-bottom: 1px solid var(--tl-line); margin-bottom: 40px; font-weight: 500; flex-wrap: wrap; }
.tray-landing .tl-hero-top .tl-l, .tray-landing .tl-hero-top .tl-r { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.tray-landing .tl-live { display: inline-flex; align-items: center; gap: 8px; color: var(--tl-good); text-transform: none; letter-spacing: 0.02em; font-family: var(--font-geist), sans-serif; font-weight: 500; font-size: 12px; }
.tray-landing .tl-live .tl-d { width: 7px; height: 7px; border-radius: 50%; background: var(--tl-good); animation: tlLive 2s infinite; }
@keyframes tlLive { 0% { box-shadow: 0 0 0 0 rgba(124, 199, 136, 0.5); } 70% { box-shadow: 0 0 0 8px rgba(124, 199, 136, 0); } 100% { box-shadow: 0 0 0 0 rgba(124, 199, 136, 0); } }

.tray-landing .tl-h1 { font-family: var(--font-instrument-serif), serif; font-weight: 400; font-size: clamp(56px, 11vw, 160px); line-height: 0.9; letter-spacing: -0.035em; margin: 0 0 32px; max-width: 14ch; }
.tray-landing .tl-h1 .tl-it { font-style: italic; color: var(--tl-persimmon); }

.tray-landing .tl-hero-meta { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: flex-end; margin-bottom: 48px; }
@media (min-width: 960px) { .tray-landing .tl-hero-meta { grid-template-columns: 1.2fr 1fr; gap: 64px; } }
.tray-landing .tl-hero-lede { font-size: 17px; line-height: 1.55; color: var(--tl-ink-2); max-width: 48ch; font-weight: 400; }
@media (min-width: 768px) { .tray-landing .tl-hero-lede { font-size: 19px; } }
.tray-landing .tl-hero-lede .tl-em { color: var(--tl-ink); font-weight: 500; }
.tray-landing .tl-hero-cta { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
@media (min-width: 960px) { .tray-landing .tl-hero-cta { align-items: flex-end; } }
.tray-landing .tl-hero-cta .tl-row { display: flex; gap: 12px; flex-wrap: wrap; }
.tray-landing .tl-hero-cta .tl-note { font-family: var(--font-geist-mono), monospace; font-size: 11px; color: var(--tl-ink-3); letter-spacing: 0.08em; text-align: left; }
@media (min-width: 960px) { .tray-landing .tl-hero-cta .tl-note { text-align: right; } }

.tray-landing .tl-hero-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; padding: 24px 0 0; border-top: 1px solid var(--tl-line); }
@media (min-width: 768px) { .tray-landing .tl-hero-stats { grid-template-columns: repeat(4, 1fr); padding-top: 32px; } }
.tray-landing .tl-hero-stat { padding: 16px 16px 16px 0; border-right: 1px solid var(--tl-line); display: flex; flex-direction: column; gap: 4px; }
@media (min-width: 768px) { .tray-landing .tl-hero-stat { padding: 0 24px 0 0; } .tray-landing .tl-hero-stat:not(:first-child) { padding-left: 24px; } }
.tray-landing .tl-hero-stat:nth-child(2n) { border-right: 0; }
@media (min-width: 768px) { .tray-landing .tl-hero-stat:nth-child(2n) { border-right: 1px solid var(--tl-line); } .tray-landing .tl-hero-stat:last-child { border-right: 0; } }
.tray-landing .tl-hero-stat .tl-v { font-family: var(--font-instrument-serif), serif; font-size: clamp(32px, 5vw, 48px); letter-spacing: -0.025em; line-height: 1; font-weight: 400; }
.tray-landing .tl-hero-stat .tl-v .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-hero-stat .tl-l { font-family: var(--font-geist-mono), monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--tl-ink-3); font-weight: 500; }

/* Section heads */
.tray-landing .tl-section { padding: 80px 0; position: relative; }
@media (min-width: 768px) { .tray-landing .tl-section { padding: 120px 0; } }
.tray-landing .tl-section-num { font-family: var(--font-geist-mono), monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--tl-ink-3); display: flex; align-items: center; gap: 10px; margin-bottom: 18px; font-weight: 500; }
.tray-landing .tl-section-num .tl-bar { width: 24px; height: 1px; background: var(--tl-ink-4); }
.tray-landing .tl-section-num .tl-num { color: var(--tl-persimmon); font-weight: 600; }
.tray-landing .tl-section-head { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: flex-end; margin-bottom: 40px; }
@media (min-width: 900px) { .tray-landing .tl-section-head { grid-template-columns: 1.3fr 1fr; gap: 80px; margin-bottom: 56px; } }
.tray-landing .tl-section-head h2 { margin: 0; font-family: var(--font-instrument-serif), serif; font-weight: 400; font-size: clamp(40px, 7vw, 96px); letter-spacing: -0.03em; line-height: 0.94; }
.tray-landing .tl-section-head h2 .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-section-head .tl-side { color: var(--tl-ink-2); max-width: 42ch; font-size: 16px; line-height: 1.6; }

/* Portal preview cards */
.tray-landing .tl-portals { display: grid; grid-template-columns: 1fr; gap: 18px; }
@media (min-width: 720px) { .tray-landing .tl-portals { grid-template-columns: repeat(3, 1fr); } }
.tray-landing .tl-portal { background: var(--tl-bg-2); border: 1px solid var(--tl-line); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; position: relative; transition: transform .25s, border-color .2s, box-shadow .25s; }
.tray-landing .tl-portal:hover { transform: translateY(-4px); border-color: var(--tl-ink-4); box-shadow: 0 20px 50px rgba(0, 0, 0, .4); }
.tray-landing .tl-portal-head { padding: 22px 24px 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; border-bottom: 1px solid var(--tl-line); }
.tray-landing .tl-portal-head .tl-ix { font-family: var(--font-geist-mono), monospace; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--tl-ink-3); font-weight: 500; }
.tray-landing .tl-portal-head h3 { font-family: var(--font-instrument-serif), serif; font-size: 30px; letter-spacing: -0.025em; margin: 6px 0 0; font-weight: 400; line-height: 1.05; }
.tray-landing .tl-portal-head h3 .tl-it { font-style: italic; }
.tray-landing .tl-portal-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
.tray-landing .tl-portal[data-c="student"] .tl-portal-dot { background: var(--tl-student); box-shadow: 0 0 14px var(--tl-student); }
.tray-landing .tl-portal[data-c="kitchen"] .tl-portal-dot { background: var(--tl-kitchen); box-shadow: 0 0 14px var(--tl-kitchen); }
.tray-landing .tl-portal[data-c="admin"] .tl-portal-dot { background: var(--tl-admin); box-shadow: 0 0 14px var(--tl-admin); }
.tray-landing .tl-portal[data-c="student"] .tl-portal-head h3 .tl-it { color: var(--tl-student); }
.tray-landing .tl-portal[data-c="kitchen"] .tl-portal-head h3 .tl-it { color: var(--tl-kitchen); }
.tray-landing .tl-portal[data-c="admin"] .tl-portal-head h3 .tl-it { color: var(--tl-admin); }

.tray-landing .tl-portal-frame { position: relative; height: 280px; overflow: hidden; background: var(--tl-bg-3); border-bottom: 1px solid var(--tl-line); }
@media (min-width: 720px) { .tray-landing .tl-portal-frame { height: 420px; } }
.tray-landing .tl-portal-frame iframe { position: absolute; top: 0; left: 0; width: 200%; height: 200%; transform: scale(0.5); transform-origin: 0 0; border: 0; pointer-events: none; background: var(--tl-bg-3); }
.tray-landing .tl-portal-frame .tl-portal-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 60%, var(--tl-bg-2) 100%); pointer-events: none; z-index: 2; }
.tray-landing .tl-portal-frame .tl-device-tag { position: absolute; top: 14px; left: 14px; font-family: var(--font-geist-mono), monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--tl-ink-3); background: rgba(14, 10, 6, 0.7); padding: 4px 10px; border-radius: 5px; font-weight: 500; z-index: 3; backdrop-filter: blur(4px); }

.tray-landing .tl-portal-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px; }
.tray-landing .tl-portal-body p { color: var(--tl-ink-2); font-size: 14px; line-height: 1.55; margin: 0; }
.tray-landing .tl-feat-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tray-landing .tl-feat-tag { padding: 4px 9px; background: var(--tl-bg-3); border: 1px solid var(--tl-line); border-radius: 5px; font-family: var(--font-geist-mono), monospace; font-size: 10.5px; color: var(--tl-ink-2); font-weight: 500; letter-spacing: 0.04em; }
.tray-landing .tl-portal-open { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--tl-bg-3); border: 1px solid var(--tl-line); border-radius: 10px; margin-top: auto; font-size: 13px; font-weight: 500; transition: all .2s; color: var(--tl-ink); }
.tray-landing .tl-portal-open:hover { background: var(--tl-bg-4); border-color: var(--tl-ink-4); }
.tray-landing .tl-portal[data-c="student"] .tl-portal-open:hover { border-color: var(--tl-student); color: var(--tl-student); }
.tray-landing .tl-portal[data-c="kitchen"] .tl-portal-open:hover { border-color: var(--tl-kitchen); color: var(--tl-kitchen); }
.tray-landing .tl-portal[data-c="admin"] .tl-portal-open:hover { border-color: var(--tl-admin); color: var(--tl-admin); }
.tray-landing .tl-portal-open .tl-arrow { transition: transform .2s; }
.tray-landing .tl-portal-open:hover .tl-arrow { transform: translateX(4px); }

/* Sync section */
.tray-landing .tl-sync { padding: 96px 0; background: var(--tl-bg-2); border-top: 1px solid var(--tl-line); border-bottom: 1px solid var(--tl-line); position: relative; overflow: hidden; }
@media (min-width: 768px) { .tray-landing .tl-sync { padding: 140px 0; } }
.tray-landing .tl-sync-grid { display: grid; grid-template-columns: 1fr; gap: 48px; align-items: center; }
@media (min-width: 960px) { .tray-landing .tl-sync-grid { grid-template-columns: 1fr 1.4fr; gap: 64px; } }
.tray-landing .tl-sync-grid h2 { font-family: var(--font-instrument-serif), serif; font-weight: 400; font-size: clamp(40px, 7vw, 88px); line-height: 0.95; letter-spacing: -0.03em; margin: 0 0 24px; }
.tray-landing .tl-sync-grid h2 .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-sync-grid .tl-lede { font-size: 17px; line-height: 1.6; color: var(--tl-ink-2); margin: 0 0 24px; max-width: 42ch; }
.tray-landing .tl-sync-meta { display: flex; flex-direction: column; gap: 10px; font-family: var(--font-geist-mono), monospace; font-size: 12px; color: var(--tl-ink-2); font-weight: 500; }
.tray-landing .tl-sync-meta .tl-row { display: flex; align-items: center; gap: 14px; }
.tray-landing .tl-sync-meta .tl-k { color: var(--tl-persimmon); width: 70px; flex-shrink: 0; }

.tray-landing .tl-diagram { background: var(--tl-bg-3); border: 1px solid var(--tl-line); border-radius: 18px; padding: 24px; position: relative; display: flex; flex-direction: column; gap: 14px; overflow: hidden; }
@media (min-width: 768px) { .tray-landing .tl-diagram { padding: 32px; gap: 18px; } }
.tray-landing .tl-node { padding: 14px 18px; background: var(--tl-bg-2); border: 1px solid var(--tl-line); border-radius: 12px; display: flex; align-items: center; gap: 14px; position: relative; transition: transform .2s; }
.tray-landing .tl-node .tl-ic { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: var(--font-geist-mono), monospace; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.tray-landing .tl-node .tl-info { flex: 1; min-width: 0; }
.tray-landing .tl-node .tl-info .tl-n { font-size: 14px; font-weight: 600; }
.tray-landing .tl-node .tl-info .tl-d { font-family: var(--font-geist-mono), monospace; font-size: 11px; color: var(--tl-ink-3); letter-spacing: 0.04em; margin-top: 2px; }
.tray-landing .tl-node .tl-role { font-family: var(--font-geist-mono), monospace; font-size: 10.5px; letter-spacing: 0.08em; font-weight: 600; text-transform: uppercase; padding: 3px 8px; border-radius: 5px; white-space: nowrap; }
.tray-landing .tl-node[data-c="kitchen"] .tl-ic, .tray-landing .tl-node[data-c="kitchen"] .tl-role { color: var(--tl-kitchen); background: rgba(239, 87, 73, 0.16); }
.tray-landing .tl-node[data-c="student"] .tl-ic, .tray-landing .tl-node[data-c="student"] .tl-role { color: var(--tl-student); background: rgba(92, 177, 255, 0.16); }
.tray-landing .tl-node[data-c="admin"] .tl-ic, .tray-landing .tl-node[data-c="admin"] .tl-role { color: var(--tl-admin); background: rgba(205, 250, 80, 0.16); }
.tray-landing .tl-node[data-c="db"] .tl-ic, .tray-landing .tl-node[data-c="db"] .tl-role { color: var(--tl-persimmon); background: rgba(239, 106, 58, 0.16); }
.tray-landing .tl-arr { display: flex; align-items: center; justify-content: center; gap: 12px; font-family: var(--font-geist-mono), monospace; font-size: 10.5px; color: var(--tl-ink-3); letter-spacing: 0.04em; padding: 4px 0; }
.tray-landing .tl-arr .tl-line { height: 1px; background: var(--tl-line-2); flex: 1; }
.tray-landing .tl-arr .tl-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tl-persimmon); box-shadow: 0 0 10px var(--tl-persimmon); animation: tlTravel 3s infinite; }
@keyframes tlTravel { 0%, 100% { opacity: .4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }

/* Pull quote */
.tray-landing .tl-pull { padding: 96px 0; text-align: center; }
@media (min-width: 768px) { .tray-landing .tl-pull { padding: 140px 0; } }
.tray-landing .tl-pull p { font-family: var(--font-instrument-serif), serif; font-size: clamp(36px, 6vw, 84px); line-height: 1.05; letter-spacing: -0.025em; margin: 0 auto; max-width: 24ch; font-weight: 400; color: var(--tl-ink); }
.tray-landing .tl-pull p .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-pull .tl-cite { margin-top: 32px; font-family: var(--font-geist-mono), monospace; font-size: 12px; color: var(--tl-ink-3); letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; }

/* Flow */
.tray-landing .tl-flow { display: grid; grid-template-columns: 1fr; border: 1px solid var(--tl-line); border-radius: 18px; overflow: hidden; background: var(--tl-bg-2); }
@media (min-width: 720px) { .tray-landing .tl-flow { grid-template-columns: repeat(4, 1fr); } }
.tray-landing .tl-flow-step { padding: 28px 24px; border-bottom: 1px solid var(--tl-line); min-height: 220px; display: flex; flex-direction: column; gap: 12px; }
@media (min-width: 720px) { .tray-landing .tl-flow-step { padding: 32px 28px; border-bottom: 0; border-right: 1px solid var(--tl-line); min-height: 280px; gap: 14px; } .tray-landing .tl-flow-step:last-child { border-right: 0; } }
.tray-landing .tl-flow-step:last-child { border-bottom: 0; }
.tray-landing .tl-flow-step .tl-ix { font-family: var(--font-geist-mono), monospace; font-size: 11px; color: var(--tl-ink-3); letter-spacing: 0.14em; text-transform: uppercase; font-weight: 500; }
.tray-landing .tl-flow-step .tl-num { font-family: var(--font-instrument-serif), serif; font-size: 64px; letter-spacing: -0.03em; color: var(--tl-persimmon); line-height: .9; font-weight: 400; font-style: italic; margin: auto 0; }
@media (min-width: 768px) { .tray-landing .tl-flow-step .tl-num { font-size: 80px; } }
.tray-landing .tl-flow-step h3 { font-family: var(--font-instrument-serif), serif; font-size: 24px; letter-spacing: -0.02em; margin: 0; font-weight: 400; line-height: 1.1; }
@media (min-width: 768px) { .tray-landing .tl-flow-step h3 { font-size: 26px; } }
.tray-landing .tl-flow-step h3 .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-flow-step p { color: var(--tl-ink-2); font-size: 13.5px; line-height: 1.55; margin: 0; max-width: 30ch; }
.tray-landing .tl-flow-step .tl-tag { margin-top: auto; font-family: var(--font-geist-mono), monospace; font-size: 10.5px; color: var(--tl-ink-3); letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }

/* Stack */
.tray-landing .tl-stack { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 720px) { .tray-landing .tl-stack { grid-template-columns: repeat(4, 1fr); } }
.tray-landing .tl-stack-card { padding: 20px; background: var(--tl-bg-2); border: 1px solid var(--tl-line); border-radius: 12px; display: flex; flex-direction: column; gap: 8px; transition: border-color .15s, background .15s; }
.tray-landing .tl-stack-card:hover { border-color: var(--tl-line-2); background: var(--tl-bg-3); }
.tray-landing .tl-stack-card .tl-n { font-weight: 600; font-size: 14px; color: var(--tl-ink); }
.tray-landing .tl-stack-card .tl-r { font-family: var(--font-geist-mono), monospace; font-size: 11px; color: var(--tl-ink-3); letter-spacing: 0.06em; }

/* Closing */
.tray-landing .tl-closing { padding: 120px 0; text-align: center; position: relative; overflow: hidden; border-top: 1px solid var(--tl-line); }
@media (min-width: 768px) { .tray-landing .tl-closing { padding: 180px 0; } }
.tray-landing .tl-closing::before { content: ""; position: absolute; left: 50%; top: 0; width: 800px; height: 400px; background: radial-gradient(ellipse at center top, rgba(239, 106, 58, 0.16), transparent 70%); transform: translateX(-50%); }
.tray-landing .tl-closing h2 { font-family: var(--font-instrument-serif), serif; font-weight: 400; font-size: clamp(64px, 12vw, 160px); line-height: 0.92; letter-spacing: -0.04em; margin: 0 0 24px; color: var(--tl-ink); position: relative; z-index: 2; }
.tray-landing .tl-closing h2 .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-closing p { color: var(--tl-ink-2); font-size: 17px; max-width: 48ch; margin: 0 auto 36px; position: relative; z-index: 2; padding: 0 16px; }
.tray-landing .tl-closing .tl-cta-row { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; position: relative; z-index: 2; padding: 0 16px; }

/* Footer */
.tray-landing .tl-footer { padding: 56px 0 24px; border-top: 1px solid var(--tl-line); background: var(--tl-bg-2); }
@media (min-width: 768px) { .tray-landing .tl-footer { padding: 72px 0 32px; } }
.tray-landing .tl-footer-row1 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
@media (min-width: 768px) { .tray-landing .tl-footer-row1 { grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 56px; } }
.tray-landing .tl-footer h4 { font-family: var(--font-geist-mono), monospace; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--tl-ink-3); margin: 0 0 14px; font-weight: 600; }
.tray-landing .tl-footer .tl-links { display: flex; flex-direction: column; gap: 10px; font-size: 14px; color: var(--tl-ink-2); }
.tray-landing .tl-footer .tl-links a:hover { color: var(--tl-ink); }
.tray-landing .tl-footer-tag { font-size: 14px; color: var(--tl-ink-2); max-width: 32ch; line-height: 1.6; margin-top: 14px; }
.tray-landing .tl-footer-mark { font-family: var(--font-instrument-serif), serif; font-size: clamp(120px, 22vw, 240px); line-height: 0.86; letter-spacing: -0.04em; color: rgba(245, 239, 228, 0.04); text-align: center; font-weight: 400; user-select: none; margin: 32px 0 0; overflow: hidden; border-top: 1px solid var(--tl-line); padding-top: 24px; }
.tray-landing .tl-footer-mark .tl-it { font-style: italic; color: rgba(196, 168, 130, 0.14); }
.tray-landing .tl-closing::before { background: radial-gradient(ellipse at center top, rgba(196, 168, 130, 0.12), transparent 70%); }

.tray-landing .tl-line-leave { padding: 64px 0; position: relative; z-index: 2; }
.tray-landing .tl-line-leave-grid { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: start; }
@media (min-width: 900px) { .tray-landing .tl-line-leave-grid { grid-template-columns: 1.1fr 1fr; gap: 48px; } }
.tray-landing .tl-line-leave-title { font-family: var(--font-instrument-serif), serif; font-size: clamp(32px, 5vw, 48px); letter-spacing: -0.03em; margin: 0 0 12px; font-weight: 400; line-height: 1.05; }
.tray-landing .tl-line-leave-title .tl-it { font-style: italic; color: var(--tl-persimmon); }
.tray-landing .tl-line-leave-lede { color: var(--tl-ink-2); font-size: 15px; line-height: 1.55; margin: 0; max-width: 42ch; }
.tray-landing .tl-line-leave-panel { display: flex; flex-direction: column; gap: 10px; padding: 20px; border-radius: 16px; border: 1px solid var(--tl-line); background: var(--tl-bg-2); }
.tray-landing .tl-line-chip { text-align: left; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--tl-line); background: var(--tl-bg-3); font-size: 14px; font-weight: 500; transition: border-color .2s, background .2s, transform .15s; }
.tray-landing .tl-line-chip:hover { border-color: var(--tl-ink-4); }
.tray-landing .tl-line-chip.is-on { border-color: rgba(196, 168, 130, 0.55); background: rgba(196, 168, 130, 0.12); color: var(--tl-ink); }
.tray-landing .tl-line-hint { margin: 8px 2px 0; font-size: 14px; line-height: 1.5; color: var(--tl-ink-2); min-height: 3em; }
.tray-landing .tl-footer-bot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center; padding-top: 24px; font-family: var(--font-geist-mono), monospace; font-size: 11px; color: var(--tl-ink-4); letter-spacing: 0.08em; font-weight: 500; }
`;

function BrandMark() {
  return (
    <Link href="/" className="tl-brand">
      <span className="tl-brand-mark">T</span>Tray<span className="tl-brand-dot">.</span>
    </Link>
  );
}

function PortalPreview({ src, title }: { src: string; title: string }) {
  return (
    <>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
        scrolling="no"
      />
      <span className="tl-portal-overlay" />
    </>
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

function HeroWords({ text, italicFrom }: { text: string; italicFrom?: number }) {
  const words = text.split(/\s+/);
  return (
    <>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className={italicFrom !== undefined && i >= italicFrom ? "tl-word tl-it" : "tl-word"}>
          {w}{" "}
        </span>
      ))}
    </>
  );
}

export function LandingPage({ tenant }: { tenant: ResolvedTenant | null }) {
  void tenant;
  const tickerDoubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="tray-landing">
      <style dangerouslySetInnerHTML={{ __html: SCOPED_CSS }} />
      <div className="tl-grain" />
      <LandingMotion />
      <a href="#main" className="tl-skip">
        Skip to content
      </a>

      <nav className="tl-nav">
        <div className="tl-nav-inner">
          <BrandMark />
          <div className="tl-nav-links">
            <a href="#system">System</a>
            <a href="#where">Dine · Takeaway</a>
            <a href="#sync">How it syncs</a>
            <a href="#flow">How it works</a>
            <a href="#stack">Stack</a>
            <a href="/demo/index.html">Live demo</a>
          </div>
          <div className="tl-nav-cta">
            <Link href="/login" className="tl-btn tl-btn-ghost">Sign in</Link>
            <a href="/demo/index.html" className="tl-btn tl-btn-pri">Try the demo →</a>
          </div>
        </div>
      </nav>

      <main id="main">
      <section className="tl-hero tl-wrap">
        <div className="tl-hero-top">
          <div className="tl-l">
            <span>TRAY · v3.0</span>
            <span style={{ color: "var(--tl-ink-4)" }}>/</span>
            <span>CAMPUS EDITION</span>
          </div>
          <div className="tl-r">
            <span className="tl-live"><span className="tl-d" />Kitchen open</span>
          </div>
        </div>
        <h1 className="tl-h1">
          <HeroWords text="A canteen system" />
          <br />
          <HeroWords text="for the whole campus." italicFrom={2} />
        </h1>
        <div className="tl-hero-meta">
          <p className="tl-hero-lede">
            Tray replaces the printed-token queue with a phone-first ordering system.{" "}
            <span className="tl-em">Students choose dine-in or takeaway, pay on phone, then walk to handover.</span>{" "}
            The kitchen sees a live queue. Pickup is verified with a four-digit code. One system, three portals, every metric in real time.
          </p>
          <div className="tl-hero-cta">
            <div className="tl-row">
              <a href="/demo/index.html" className="tl-btn tl-btn-pri tl-btn-lg">Try the live demo →</a>
              <a href="#system" className="tl-btn tl-btn-ghost tl-btn-lg">See the system</a>
            </div>
            <div className="tl-note">DEMO IS LIVE · NO SIGN-UP · 90-SECOND TOUR</div>
          </div>
        </div>
        <div className="tl-hero-stats">
          <div className="tl-hero-stat"><div className="tl-v">12<span className="tl-it">min</span></div><div className="tl-l">Saved per lunch</div></div>
          <div className="tl-hero-stat"><div className="tl-v">3</div><div className="tl-l">Role-based portals</div></div>
          <div className="tl-hero-stat"><div className="tl-v">UPI</div><div className="tl-l">Native payments</div></div>
          <div className="tl-hero-stat"><div className="tl-v">OTP</div><div className="tl-l">Verified handover</div></div>
        </div>
      </section>

      <div className="tl-ticker" aria-hidden>
        <div className="tl-ticker-track">
          {tickerDoubled.map((item, i) => (
            <span key={`${item}-${i}`} className="tl-ticker-item">
              <em>●</em> {item}
            </span>
          ))}
        </div>
      </div>

      <section className="tl-section tl-wrap" id="system" data-reveal>
        <div className="tl-section-num"><span className="tl-bar" /><span className="tl-num">01</span> / The system</div>
        <div className="tl-section-head">
          <h2>Three portals,<br /><span className="tl-it">one source of truth.</span></h2>
          <div className="tl-side">
            Tray runs as a single application with three role-based views. The same data drives every screen.{" "}
            <strong style={{ color: "var(--tl-ink)" }}>Open any portal below</strong> — they're fully functional, no install required.
          </div>
        </div>

        <div className="tl-portals">
          <article className="tl-portal" data-c="student">
            <div className="tl-portal-head">
              <div>
                <span className="tl-portal-ix tl-ix">01 — Student</span>
                <h3>Order &<br /><span className="tl-it">collect.</span></h3>
              </div>
              <span className="tl-portal-dot" />
            </div>
            <div className="tl-portal-frame">
              <span className="tl-device-tag">💻 Laptop · sidebar cart</span>
              <PortalPreview src="/demo/student.html" title="Student app preview" />
            </div>
            <div className="tl-portal-body">
              <p>
                Dine-in or takeaway up front (QSR-style), veg lane, UPI checkout, pickup-window ETA, and OTP handover —
                full laptop layout with sidebar cart on wide screens.
              </p>
              <div className="tl-feat-tags">
                <span className="tl-feat-tag">Dine · Takeaway</span>
                <span className="tl-feat-tag">UPI · QR</span>
                <span className="tl-feat-tag">Pickup window</span>
                <span className="tl-feat-tag">Veg lane</span>
              </div>
              <a href="/demo/student.html" className="tl-portal-open">
                <span>Open the student app</span>
                <span className="tl-arrow">→</span>
              </a>
            </div>
          </article>

          <article className="tl-portal" data-c="kitchen">
            <div className="tl-portal-head">
              <div>
                <span className="tl-portal-ix tl-ix">02 — Kitchen</span>
                <h3>Prepare &<br /><span className="tl-it">hand over.</span></h3>
              </div>
              <span className="tl-portal-dot" />
            </div>
            <div className="tl-portal-frame">
              <span className="tl-device-tag">🖥 Desktop / tablet · 1440×</span>
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
              <a href="/demo/kitchen.html" className="tl-portal-open">
                <span>Open the kitchen view</span>
                <span className="tl-arrow">→</span>
              </a>
            </div>
          </article>

          <article className="tl-portal" data-c="admin">
            <div className="tl-portal-head">
              <div>
                <span className="tl-portal-ix tl-ix">03 — Admin</span>
                <h3>Run the<br /><span className="tl-it">operation.</span></h3>
              </div>
              <span className="tl-portal-dot" />
            </div>
            <div className="tl-portal-frame">
              <span className="tl-device-tag">🖥 Desktop · 1440×</span>
              <PortalPreview src="/demo/admin.html" title="Admin console preview" />
            </div>
            <div className="tl-portal-body">
              <p>Daily revenue, peak hours, top items, full order history, and menu management — in one polished web console. Every event from every portal, live.</p>
              <div className="tl-feat-tags">
                <span className="tl-feat-tag">Revenue · live</span>
                <span className="tl-feat-tag">Peak heatmap</span>
                <span className="tl-feat-tag">Audit log</span>
                <span className="tl-feat-tag">⌘K search</span>
              </div>
              <a href="/demo/admin.html" className="tl-portal-open">
                <span>Open the admin console</span>
                <span className="tl-arrow">→</span>
              </a>
            </div>
          </article>
        </div>
      </section>

      <section className="tl-sync" id="sync" data-reveal>
        <div className="tl-wrap">
          <div className="tl-section-num"><span className="tl-bar" /><span className="tl-num">02</span> / The connected canteen</div>
          <div className="tl-sync-grid">
            <div>
              <h2>Add a special.<br /><span className="tl-it">Watch it land everywhere.</span></h2>
              <p className="tl-lede">
                The kitchen adds a dish today — it appears on every student phone in under 300 ms, and an audit-log entry lands in the admin console.
                One source of truth, three windows, no refresh.
              </p>
              <div className="tl-sync-meta">
                <div className="tl-row"><span className="tl-k">CHANNEL</span><span>Postgres logical replication → Supabase Realtime</span></div>
                <div className="tl-row"><span className="tl-k">LATENCY</span><span>~240 ms p95 · 12 hops</span></div>
                <div className="tl-row"><span className="tl-k">FALLBACK</span><span>HTTP long-poll on degraded networks</span></div>
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

      <section className="tl-pull tl-wrap" data-reveal>
        <p>Lunch is thirty minutes. Students currently spend <span className="tl-it">twelve of them</span> standing in line.</p>
        <div className="tl-cite">CAMPUS CANTEEN AUDIT · 2025</div>
      </section>

      <section className="tl-section tl-wrap" id="flow" data-reveal>
        <div className="tl-section-num"><span className="tl-bar" /><span className="tl-num">03</span> / How it works</div>
        <div className="tl-section-head">
          <h2>Phone to plate,<br /><span className="tl-it">in eleven minutes.</span></h2>
          <div className="tl-side">Four touchpoints. The student walks straight to the counter. The kitchen never repeats a name. Everyone gets their hour back.</div>
        </div>
        <div className="tl-flow">
          <div className="tl-flow-step">
            <div className="tl-ix">01 — 11:42</div>
            <div className="tl-num">01</div>
            <h3>Browse the <span className="tl-it">menu.</span></h3>
            <p>Live availability, prep times, veg/non-veg filters. Add to cart with one tap.</p>
            <div className="tl-tag">→ STATUS: CART</div>
          </div>
          <div className="tl-flow-step">
            <div className="tl-ix">02 — 11:43</div>
            <div className="tl-num">02</div>
            <h3>Pay by <span className="tl-it">UPI.</span></h3>
            <p>Single-use QR with exact amount. Webhook confirms automatically.</p>
            <div className="tl-tag">→ STATUS: PAID</div>
          </div>
          <div className="tl-flow-step">
            <div className="tl-ix">03 — 11:46</div>
            <div className="tl-num">03</div>
            <h3>Track <span className="tl-it">live.</span></h3>
            <p>Queued → preparing → ready, updated by the kitchen in under 250 ms.</p>
            <div className="tl-tag">→ STATUS: PREPARING</div>
          </div>
          <div className="tl-flow-step">
            <div className="tl-ix">04 — 11:53</div>
            <div className="tl-num">04</div>
            <h3>Collect with <span className="tl-it">OTP.</span></h3>
            <p>Read the four-digit code at the counter. Staff verifies, marks complete.</p>
            <div className="tl-tag">✓ ORDER CLOSED</div>
          </div>
        </div>
      </section>

      <section className="tl-section tl-wrap" id="stack" data-reveal>
        <div className="tl-section-num"><span className="tl-bar" /><span className="tl-num">04</span> / Built with</div>
        <div className="tl-section-head">
          <h2>A boring stack,<br /><span className="tl-it">on purpose.</span></h2>
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

      <section className="tl-closing" data-reveal>
        <div className="tl-wrap">
          <div className="tl-section-num" style={{ justifyContent: "center", marginBottom: 24 }}>
            <span className="tl-bar" /><span className="tl-num">DEMO</span> / Live · clickable · no sign-up
          </div>
          <h2>Skip the<br /><span className="tl-it">line.</span></h2>
          <p>Three portals. One platform. Built for college canteens that are tired of printed tokens.</p>
          <div className="tl-cta-row">
            <a href="/demo/student.html" className="tl-btn tl-btn-pri tl-btn-lg">Open the student app →</a>
            <a href="/demo/kitchen.html" className="tl-btn tl-btn-ghost tl-btn-lg">Kitchen view</a>
            <a href="/demo/admin.html" className="tl-btn tl-btn-ghost tl-btn-lg">Admin dashboard</a>
          </div>
        </div>
      </section>
      </main>

      <footer className="tl-footer tl-wrap">
        <div className="tl-footer-row1">
          <div>
            <BrandMark />
            <p className="tl-footer-tag">A canteen ordering system for college and university campuses. Self-hostable, multi-tenant, source-available.</p>
          </div>
          <div>
            <h4>Product</h4>
            <div className="tl-links">
              <Link href="/menu">Student app</Link>
              <Link href="/kitchen">Kitchen view</Link>
              <Link href="/admin/dashboard">Admin console</Link>
              <Link href="/signup">Get started</Link>
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
        <div className="tl-footer-mark">tra<span className="tl-it">y</span></div>
        <div className="tl-footer-bot">
          <span>BUILT FOR CAMPUS CANTEENS · MADE IN INDIA</span>
          <span>v3.0 · 2026</span>
        </div>
      </footer>
    </div>
  );
}
