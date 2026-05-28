"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ResolvedTenant } from "@/lib/tenant";
import { TrayHero }             from "@/components/landing/sections/TrayHero";
import { CampusTicker }         from "@/components/landing/sections/MetricsAndTicker";
import { TrustSection }          from "@/components/landing/sections/TrustSection";
import { PiranhaPortalsSection } from "@/components/landing/sections/PiranhaPortalsSection";
import { CampusModelSection }    from "@/components/landing/sections/CampusModelSection";
import { LandingIntro }          from "@/components/landing/LandingIntro";
import { LandingMotion }         from "@/components/landing/landing-motion";
import { LandingLineLeave }      from "@/components/landing/landing-line-leave";
import {
  AnimatedNav,
  SectionReveal,
  RevealItem,
  HoverCard,
  SyncPipelineVisual,
  MotionCTA,
  CountUp,
  ScrollProgress,
} from "@/lib/motion/tray-framer";

// ── Brand wordmark ────────────────────────────────────────────────────────────
function BrandMark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group" aria-label="Tray home">
      <span className="flex h-10 w-10 items-center justify-center rounded-[0.65rem] bg-[var(--tray-ink)] font-editorial text-[17px] font-black text-[var(--tray-cream)] transition group-hover:scale-105">
        T
      </span>
      <span className="font-editorial text-[1.65rem] font-black tracking-[-0.05em] leading-[1.1] py-1 pr-1.5 pl-0.5">
        Tray
      </span>
    </Link>
  );
}

// ── Landing page ─────────────────────────────────────────────────────────────
export function LandingPage({ tenant }: { tenant: ResolvedTenant | null }) {
  const campusName = tenant?.college_name ?? null;
  const [hoveredStep, setHoveredStep] = React.useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="tray-landing tray-page min-h-svh overflow-x-hidden tray-landing-wrapper" style={{ fontFamily: "var(--font-ui)" }}>
      <ScrollProgress />
      <LandingIntro />
      <LandingMotion />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <AnimatedNav
        className="sticky top-0 z-50 backdrop-blur-xl px-5 sm:px-8 lg:px-10"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" } as React.CSSProperties}
      >
        <header>
          <div className="tl-nav-inner mx-auto flex max-w-7xl items-center justify-between gap-4 py-3.5">
            <BrandMark />

            {/* Desktop nav links */}
            <nav
              className="hidden items-center gap-2 lg:flex relative px-2.5 py-1 rounded-full border border-[var(--tray-border)] bg-[var(--tray-surface)]/25 backdrop-blur-md"
              aria-label="Main navigation"
            >
              <div
                className="tl-nav-pill absolute rounded-full bg-[var(--tray-surface)]/60 pointer-events-none z-0 opacity-0"
                style={{ height: "calc(100% - 8px)", top: "4px" }}
              />
              {[
                ["Product",  "#portals"],
                ["Campus",   "#campus"],
                ["Stack",    "#stack"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="font-code text-xs uppercase tracking-[0.2em] text-[var(--tray-muted)] transition-colors duration-200 hover:text-[var(--tray-ink)] relative z-10 px-4.5 py-2.5 rounded-full"
                >
                  {label}
                </a>
              ))}
            </nav>

            {/* Right: sign in + demo CTA */}
            <div className="hidden items-center gap-3 lg:flex">
              <Link
                href="/login"
                className="font-code text-xs uppercase tracking-[0.2em] text-[var(--tray-muted)] transition hover:text-[var(--tray-ink)]"
              >
                Sign in
              </Link>
              <a
                href="#portals"
                className="rounded-full bg-[var(--tray-ink)] px-5 py-2.5 text-sm font-semibold text-[var(--tray-cream)] transition hover:opacity-85"
              >
                Demo →
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-[5px] lg:hidden rounded-lg transition hover:bg-[var(--tray-surface)]"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <span
                className="h-0.5 w-5 rounded-full bg-[var(--tray-ink)] transition-transform duration-300"
                style={{ transform: mobileMenuOpen ? "translateY(6.5px) rotate(45deg)" : "none" }}
              />
              <span
                className="h-0.5 w-5 rounded-full bg-[var(--tray-ink)] transition-opacity duration-300"
                style={{ opacity: mobileMenuOpen ? 0 : 1 }}
              />
              <span
                className="h-0.5 w-5 rounded-full bg-[var(--tray-ink)] transition-transform duration-300"
                style={{ transform: mobileMenuOpen ? "translateY(-6.5px) rotate(-45deg)" : "none" }}
              />
            </button>
          </div>

          {/* Mobile sheet */}
          {mobileMenuOpen && (
            <div className="border-t border-[var(--tray-border)] bg-[var(--tray-bg)] lg:hidden">
              <nav className="flex flex-col gap-1 px-5 py-4" aria-label="Mobile navigation">
                {[
                  ["Product",  "#portals"],
                  ["Campus",   "#campus"],
                  ["Stack",    "#stack"],
                ].map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl px-3 py-3 font-code text-xs uppercase tracking-[0.2em] text-[var(--tray-muted)] transition hover:bg-[var(--tray-surface)] hover:text-[var(--tray-ink)]"
                  >
                    {label}
                  </a>
                ))}
                <div className="mt-3 flex flex-col gap-2 border-t border-[var(--tray-border)] pt-4">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-[var(--tray-surface)]"
                  >
                    Sign in
                  </Link>
                  <a
                    href="#portals"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-xl bg-[var(--tray-ink)] px-3 py-3 text-center text-sm font-semibold text-[var(--tray-cream)]"
                  >
                    Demo →
                  </a>
                </div>
              </nav>
            </div>
          )}
        </header>
      </AnimatedNav>

      {/* ── PAGE SECTIONS ────────────────────────────────────────────── */}
      <main id="main">
        {/* Problem statement strip */}
        <div
          className="border-b border-[var(--tray-border)] px-5 py-3 sm:px-8 sm:py-3.5 lg:px-10"
          style={{ background: "var(--tray-ink)", color: "var(--tray-cream, #EDE5D2)" }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 overflow-hidden">
            <p
              className="text-[0.75rem] uppercase tracking-[0.22em] opacity-55 hidden sm:block shrink-0"
              style={{ fontFamily: "var(--font-dm-mono)" }}
            >
              Campus Edition
            </p>
            <p
              className="text-[0.75rem] uppercase tracking-[0.22em] opacity-55 min-w-0"
              style={{ fontFamily: "var(--font-dm-mono)" }}
            >
              12 min saved per lunch · UPI native · OTP verified · live queue
            </p>
            <span
              className="hidden items-center gap-1.5 text-[0.75rem] uppercase tracking-[0.22em] lg:flex shrink-0"
              style={{ fontFamily: "var(--font-dm-mono)", color: "var(--tray-clay, #B8531A)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              Kitchen open
            </span>
          </div>
        </div>

        <TrayHero />
        <CampusTicker />
        <PiranhaPortalsSection />
        <TrustSection />
        <CampusModelSection campusName={campusName} />
        <LandingLineLeave />

        {/* ── REALTIME SYNC ─────────────────────────────────────────── */}
        <SectionReveal id="sync" className="px-5 py-24 sm:px-8 lg:px-10 lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-24">
          <motion.div className="mx-auto max-w-7xl">
            <RevealItem>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <p className="flex items-center gap-[0.55em]" style={{ fontFamily: "var(--font-dm-mono)" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.82rem", letterSpacing: 0, color: "var(--tray-ink)", opacity: 0.55 }}>03</span>
                  <span style={{ fontSize: "0.72rem", opacity: 0.3, color: "var(--tray-muted)" }}>/</span>
                  <span className="uppercase tracking-[0.25em]" style={{ fontSize: "0.68rem", color: "var(--tray-muted)" }}>Realtime</span>
                </p>
              </div>
            </RevealItem>
            <RevealItem>
              <h2 className="max-w-5xl">
                <span
                  className="block"
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontStyle: "italic",
                    fontSize: "clamp(3.8rem, 10vw, 9.5rem)",
                    color: "var(--tray-ink)",
                    lineHeight: 0.9,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Add a special.
                </span>
                <span
                  className="block mt-4 sm:mt-5"
                  style={{
                    fontFamily: "var(--font-barlow)",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    fontSize: "clamp(2.6rem, 7.5vw, 7rem)",
                    color: "var(--tray-clay)",
                    letterSpacing: "-0.04em",
                    lineHeight: 0.88,
                  }}
                >
                  Watch it land everywhere.
                </span>
              </h2>
            </RevealItem>
            <RevealItem>
              <p className="mt-6 max-w-lg text-[1.05rem] leading-[1.75] opacity-65"
                style={{ fontFamily: "var(--font-geist)" }}>
                The kitchen adds a dish — it appears on every student phone in under 300 ms.
                One source of truth, three portals, no refresh.
              </p>
            </RevealItem>
            <RevealItem variant="card">
              <SyncPipelineVisual className="mt-12" />
            </RevealItem>
          </motion.div>
        </SectionReveal>

        {/* ── KITCHEN QUOTE ─────────────────────────────────────────── */}
        <section
          className="px-5 py-24 sm:px-8 lg:px-10 lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-24"
          style={{ background: "var(--tray-ink)", color: "var(--tray-cream, #EDE5D2)" }}
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 flex flex-wrap items-center gap-3">
              <p className="text-[0.72rem] uppercase tracking-[0.3em] opacity-40" style={{ fontFamily: "var(--font-dm-mono)" }}>
                From the kitchen
              </p>
            </div>
            <blockquote
              className="leading-[1.08] tracking-[-0.03em]"
              style={{
                fontFamily: "var(--font-dm-serif)",
                fontWeight: 600,
                fontStyle: "italic",
                fontSize: "clamp(2.8rem, 7vw, 6.5rem)",
              }}
            >
              &ldquo;We stopped shouting over the crowd.
              The board calls the order;
              they show a code.{" "}
              <span style={{ color: "var(--tray-clay)" }}>Lunch</span>
              {" "}ends on time.&rdquo;
            </blockquote>
            <footer className="mt-8 text-[0.72rem] uppercase tracking-[0.26em] opacity-40" style={{ fontFamily: "var(--font-manrope)" }}>
              — Kitchen supervisor · Campus canteen
            </footer>
          </div>
        </section>

        {/* ── PHONE TO PLATE (5 steps) ──────────────────────────────── */}
        <SectionReveal id="flow" as="div" className="px-5 py-24 sm:px-8 lg:px-10 lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-24">
          <motion.div className="mx-auto max-w-7xl">
            <RevealItem variant="soft">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <p className="flex items-center gap-[0.55em]" style={{ fontFamily: "var(--font-dm-mono)" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.82rem", letterSpacing: 0, color: "var(--tray-ink)", opacity: 0.55 }}>04</span>
                  <span style={{ fontSize: "0.72rem", opacity: 0.3, color: "var(--tray-muted)" }}>/</span>
                  <span className="uppercase tracking-[0.25em]" style={{ fontSize: "0.68rem", color: "var(--tray-muted)" }}>How it works</span>
                </p>
              </div>
            </RevealItem>
            <RevealItem variant="fade">
              <h2 className="tracking-[-0.04em]">
                <span
                  className="block"
                  style={{
                    fontFamily: "var(--font-newsreader)",
                    fontWeight: 600,
                    fontSize: "clamp(3rem,7vw,7rem)",
                    lineHeight: 0.9,
                    color: "var(--tray-ink)",
                  }}
                >
                  Phone to plate,
                </span>
                <span
                  className="block mt-3"
                  style={{
                    fontFamily: "var(--font-newsreader)",
                    fontWeight: 400,
                    fontStyle: "italic",
                    fontSize: "clamp(2.4rem,5.5vw,5.5rem)",
                    lineHeight: 0.92,
                    color: "var(--tray-clay)",
                  }}
                >
                  in eleven minutes.
                </span>
              </h2>
            </RevealItem>
            <div className="mt-10 sm:mt-14 overflow-hidden w-full relative py-2">
              <div className="grid gap-6 sm:grid-cols-2 lg:flex lg:flex-row tl-flow-track-horizontal py-4">
                {(
                  [
                    ["01", "Choose canteen",  "Browse active canteens on your campus.",            "SELECTING"],
                    ["02", "Browse menu",     "Live availability, prep times, veg/non-veg.",       "CART"],
                    ["03", "Pay by UPI",      "Single-use QR. Webhook confirms in seconds.",       "PAID"],
                    ["04", "Track live",      "Queued → preparing → ready in ~250 ms.",            "PREPARING"],
                    ["05", "Collect w/ OTP",  "Four-digit code at counter. Staff marks complete.", "READY"],
                  ] as const
                ).concat([
                  ["01", "Choose canteen",  "Browse active canteens on your campus.",            "SELECTING"],
                  ["02", "Browse menu",     "Live availability, prep times, veg/non-veg.",       "CART"],
                  ["03", "Pay by UPI",      "Single-use QR. Webhook confirms in seconds.",       "PAID"],
                  ["04", "Track live",      "Queued → preparing → ready in ~250 ms.",            "PREPARING"],
                  ["05", "Collect w/ OTP",  "Four-digit code at counter. Staff marks complete.", "READY"],
                ]).map(([num, title, desc, tag], idx) => {
                  const originalIdx = idx % 5;
                  const isHovered = hoveredStep === originalIdx;
                  const baseIdx = originalIdx;

                  let cardBg = "rgba(255,255,255,0.65)";
                  let cardText = "var(--tray-ink, #1A1619)";
                  let numColor = "var(--tray-clay, #E60000)";
                  let tagBg = "rgba(26,22,25,0.05)";
                  let tagBorder = "var(--tray-border)";
                  let tagColor = "var(--tray-muted)";
                  let borderStyle = "1px solid var(--tray-border)";
                  let descOpacity = "0.6";

                  const showRedTheme = (
                    ((baseIdx === 0 || baseIdx === 4 || baseIdx === 2) && isHovered) ||
                    ((baseIdx === 1 || baseIdx === 3) && !isHovered)
                  );

                  if (showRedTheme) {
                    cardBg = "var(--tray-clay, #E60000)";
                    cardText = "#FAF8F5";
                    numColor = "rgba(250,248,245,0.3)";
                    tagBg = "rgba(250,248,245,0.15)";
                    tagBorder = "rgba(250,248,245,0.2)";
                    tagColor = "rgba(250,248,245,0.7)";
                    borderStyle = "1px solid transparent";
                    descOpacity = "0.8";
                  } else if (baseIdx === 2 && !isHovered) {
                    cardBg = "rgba(255,255,255,0.65)";
                    cardText = "var(--tray-clay, #E60000)";
                    numColor = "var(--tray-ink, #1A1A19)";
                    tagBg = "rgba(230,0,0,0.05)";
                    tagBorder = "rgba(230,0,0,0.2)";
                    tagColor = "var(--tray-clay, #E60000)";
                    borderStyle = "1px solid var(--tray-border)";
                    descOpacity = "0.7";
                  }

                  return (
                    <div
                      key={`${num}-${idx}`}
                      onMouseEnter={() => setHoveredStep(originalIdx)}
                      onMouseLeave={() => setHoveredStep(null)}
                      className={`flex flex-col gap-3 sm:gap-4 rounded-[1.5rem] sm:rounded-[1.75rem] p-6 sm:p-8 lg:p-9 transition-all duration-300 ease-out hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl select-none cursor-pointer h-full tl-flow-card-horizontal ${
                        idx >= 5 ? "hidden lg:flex" : "flex"
                      }`}
                      style={{ background: cardBg, color: cardText, border: borderStyle, minHeight: "340px" }}
                    >
                      <span
                        className="leading-none tracking-[-0.02em] block mb-4"
                        style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(3.8rem, 6vw, 4.8rem)", color: numColor }}
                      >{num}</span>
                      <h3
                        className="text-[1.15rem] sm:text-[1.25rem] tracking-tight leading-[1.2]"
                        style={{ fontFamily: "var(--font-fraunces)", fontStyle: "italic", fontWeight: 500 }}
                      >{title}</h3>
                      <p
                        className="flex-1 text-[0.88rem] leading-[1.65]"
                        style={{ fontFamily: "var(--font-jakarta)", opacity: descOpacity }}
                      >{desc}</p>
                      <span
                        className="mt-auto self-start rounded-full px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em]"
                        style={{ fontFamily: "var(--font-dm-mono)", color: tagColor, background: tagBg, border: `1px solid ${tagBorder}` }}
                      >{tag}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </SectionReveal>

        {/* ── STACK ─────────────────────────────────────────────────── */}
        <SectionReveal id="stack" as="div" className="px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-24">
          <div className="mx-auto max-w-7xl">
            <p className="mb-6 text-[0.72rem] font-bold uppercase tracking-[0.28em]" style={{ fontFamily: "var(--font-dm-mono)", color: "var(--tray-muted)" }}>
              05 / Built with
            </p>
            <h2
              className="leading-[0.88] tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 700, fontSize: "clamp(2.8rem,6.5vw,6.5rem)" }}
            >
              A boring stack,<br />
              <span style={{ color: "var(--tray-clay)" }}>on purpose.</span>
            </h2>
            <p
              className="mt-6 max-w-xl text-[1.05rem] leading-8 opacity-70"
              style={{ fontFamily: "var(--font-jetbrains)" }}
            >
              Everything runs on a free tier until you have real users. No exotic infra. No lock-in surprises.
            </p>
            {/* Cards — data-stack-card lets GSAP trigger each one individually on scroll */}
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {([
                ["Next.js 15",        "Framework · App Router"],
                ["TypeScript",        "Language · strict mode"],
                ["Tailwind v4",       "Styling · design tokens"],
                ["Supabase",          "DB · Auth · Realtime"],
                ["Postgres + RLS",    "Data · multi-tenant"],
                ["Razorpay",          "Payments · UPI"],
                ["Vercel Edge",       "Hosting · CDN"],
                ["Supabase Realtime", "Live · WebSocket"],
              ] as const).map(([name, role]) => (
                <div
                  key={name}
                  data-stack-card=""
                  className="group rounded-[1.5rem] border p-5 sm:p-6 flex flex-col gap-2 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_12px_36px_rgba(26,26,25,0.08)] hover:-translate-y-1 cursor-default"
                  style={{ border: "1px solid var(--tray-border)", background: "rgba(255,255,255,0.62)", minHeight: "104px" }}
                >
                  <p
                    className="leading-tight tracking-tight"
                    style={{ fontFamily: "var(--font-space-grotesk)", fontWeight: 700, fontSize: "clamp(0.88rem,1.4vw,1rem)", color: "var(--tray-ink)" }}
                  >
                    {name}
                  </p>
                  <p
                    className="uppercase leading-tight"
                    style={{ fontFamily: "var(--font-jetbrains)", fontSize: "0.62rem", letterSpacing: "0.14em", color: "var(--tray-muted)" }}
                  >
                    {role}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>

        {/* ── MASTER CONTROL CENTRE COMING SOON ─────────────────────── */}
        <div className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8 lg:px-10">
          <div
            className="flex flex-col items-center justify-center gap-6 rounded-[2rem] border px-6 py-16 sm:px-12 sm:py-20 lg:py-24"
            style={{ border: "1px solid var(--tray-border)", background: "var(--tray-ink)", color: "var(--tray-cream)" }}
          >
            <span
              className="rounded-full border px-4 py-1 text-[0.72rem] uppercase tracking-[0.24em] font-bold"
              style={{ borderColor: "var(--tray-clay)", color: "var(--tray-clay)", fontFamily: "var(--font-dm-mono)" }}
            >
              Coming Soon
            </span>
            <h3
              className="max-w-4xl leading-[1.0] tracking-[-0.04em] uppercase"
              style={{ fontFamily: "var(--font-barlow)", fontWeight: 900, fontSize: "clamp(2rem, 5vw, 4.5rem)" }}
            >
              Master Control Centre <br />
              <span className="opacity-50" style={{ fontFamily: "var(--font-fraunces)", fontStyle: "italic", fontWeight: 400, textTransform: "none" }}>
                Multi-Canteen Director Console
              </span>
            </h3>
          </div>
        </div>

        {/* ── CLOSING CTA ───────────────────────────────────────────── */}
        <SectionReveal as="div" id="closing" className="relative overflow-hidden px-5 py-32 text-center sm:px-8 lg:px-10 tl-closing lg:min-h-screen lg:flex lg:flex-col lg:justify-center lg:py-24">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--tray-clay)]/15 blur-3xl" />
          </div>
          <RevealItem>
            <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
              <p className="text-xs uppercase tracking-[0.3em]" style={{ fontFamily: "var(--font-dm-mono)", color: "var(--tray-muted)" }}>Ship it</p>
            </div>
          </RevealItem>
          <RevealItem>
            <h2
              className="mx-auto max-w-5xl leading-[0.82] tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-barlow)", fontWeight: 900, fontSize: "clamp(3.5rem, 9.5vw, 10.5rem)", textTransform: "uppercase" }}
            >
              Run lunch{" "}
              <em className="not-italic" style={{ fontFamily: "var(--font-fraunces)", fontStyle: "italic", textTransform: "none", color: "var(--tray-clay)" }}>
                without the rush.
              </em>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mx-auto mt-7 max-w-2xl text-[1.05rem] leading-8 opacity-70" style={{ fontFamily: "var(--font-geist)" }}>
              Three screens. Zero printed tokens. Every order tracked, every payment confirmed,
              every handover verified. Deploy on a free tier and go live today.
            </p>
          </RevealItem>
          <RevealItem>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <MotionCTA
                href="#portals"
                variant="primary"
                className="rounded-full bg-[var(--tray-ink)] px-8 py-4 text-sm font-semibold text-[var(--tray-cream)]"
                style={{ fontFamily: "var(--font-geist)" } as React.CSSProperties}
              >
                Try full demo
              </MotionCTA>
              <MotionCTA
                href="/get-started"
                variant="secondary"
                className="rounded-full border border-[var(--tray-border)] px-8 py-4 text-sm font-semibold"
                style={{ fontFamily: "var(--font-geist)" } as React.CSSProperties}
              >
                I have a canteen
              </MotionCTA>
            </div>
          </RevealItem>
        </SectionReveal>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="relative overflow-hidden px-4 pb-8 pt-10 sm:px-8 sm:pt-12 lg:px-10">
        <div
          className="pointer-events-none absolute bottom-8 right-0 select-none tl-footer-mark"
          style={{ overflow: "hidden" }}
        >
          <span
            style={{
              fontFamily: "var(--font-barlow)",
              fontWeight: 900,
              fontSize: "clamp(9rem, 13vw, 13rem)",
              lineHeight: 0.8,
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
              color: "var(--tray-ink)",
              opacity: 0.038,
              display: "block",
              paddingRight: "clamp(1.5rem, 4vw, 4rem)",
            }}
          >
            TRAY
          </span>
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="relative z-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            {/* Brand */}
            <div>
              <BrandMark />
              <p
                className="mt-5 max-w-sm uppercase"
                style={{
                  fontFamily: "var(--font-krona-one), sans-serif",
                  fontSize: "clamp(1.1rem, 2.5vw, 1.55rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.3,
                  color: "var(--tray-ink)",
                }}
              >
                Multi-tenant canteen management{" "}
                <span style={{ fontFamily: "var(--font-newsreader), serif", fontStyle: "italic", textTransform: "none", color: "var(--tray-clay)", fontWeight: "normal" }}>
                  for colleges.
                </span>
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="font-code mb-5 text-[0.85rem] font-bold uppercase tracking-[0.22em] text-[var(--tray-muted)]">Product</p>
              <ul className="flex flex-col gap-3 text-[1.05rem]">
                {[
                  ["Student view",  "/login?role=student"],
                  ["Kitchen view",  "/login?role=kitchen"],
                  ["Admin view",    "/login?role=owner"],
                  ["Get started",   "/get-started"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="tl-footer-link-item opacity-75 font-semibold">
                      <span className="tl-footer-link-circ" />
                      <span className="tl-footer-link-text">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <p className="font-code mb-5 text-[0.85rem] font-bold uppercase tracking-[0.22em] text-[var(--tray-muted)]">Resources</p>
              <ul className="flex flex-col gap-3 text-[1.05rem]">
                {[
                  ["README",       "https://github.com/thribhuvan003/Tray/blob/main/README.md"],
                  ["Architecture", "https://github.com/thribhuvan003/Tray/tree/main/docs/adr"],
                  ["Security",     "https://github.com/thribhuvan003/Tray/blob/main/SECURITY.md"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noreferrer" className="tl-footer-link-item opacity-75 font-semibold">
                      <span className="tl-footer-link-circ" />
                      <span className="tl-footer-link-text">{label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="font-code mb-5 text-[0.85rem] font-bold uppercase tracking-[0.22em] text-[var(--tray-muted)]">Contact</p>
              <a
                href="https://github.com/thribhuvan003"
                target="_blank"
                rel="noreferrer"
                className="tl-footer-link-item text-[1.12rem] sm:text-[1.25rem] opacity-75 font-semibold block"
              >
                <span className="tl-footer-link-circ" />
                <span className="tl-footer-link-text">github.com/thribhuvan003</span>
              </a>
            </div>
          </div>

          <div className="relative z-10 mt-10 sm:mt-16 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[0.72rem] uppercase tracking-[0.2em] opacity-45" style={{ fontFamily: "var(--font-dm-mono)" }}>
              Made for India&apos;s college campuses
            </p>
          </div>
        </div>
      </footer>

      {/* Global SVG Gooey Filter for Liquid UI elements */}
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ display: "none" }}>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
