"use client";

import React from "react";
import Link from "next/link";
import type { ResolvedTenant } from "@/lib/tenant";
import { LandingIntro } from "@/components/landing/LandingIntro";
import { LandingMotion } from "@/components/landing/landing-motion";
import { CampusModelSection } from "@/components/landing/sections/CampusModelSection";
import { ClosingSection } from "@/components/landing/sections/ClosingSection";
import { CampusTicker } from "@/components/landing/sections/MetricsAndTicker";
import { PiranhaPortalsSection } from "@/components/landing/sections/PiranhaPortalsSection";
import { SyncSection } from "@/components/landing/sections/SyncSection";
import { TrayHero } from "@/components/landing/sections/TrayHero";
import { TrustSection } from "@/components/landing/sections/TrustSection";
import { motion } from "framer-motion";
import {
  AnimatedNav,
  MotionCTA,
  RevealItem,
  ScrollProgress,
  SectionFx,
  SectionReveal,
} from "@/lib/motion/tray-framer";

function BrandMark() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Tray home">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-[var(--tray-radius-sm)] border-2 border-[var(--tray-ink)] bg-[var(--tray-cream)] text-[0.65rem] font-bold text-[var(--tray-ink)]"
        style={{ fontFamily: "var(--font-hero-punch)" }}
      >
        T
      </span>
      <span className="font-bricolage text-[1.125rem] font-semibold tracking-[-0.04em] text-[var(--tray-ink)]">
        Tray
      </span>
    </Link>
  );
}

const NAV_ITEMS = [
  ["Product", "#portals"],
  ["Campus", "#campus"],
  ["Trust", "#trust"],
  ["Sync", "#sync"],
] as const;

export function LandingPage({ tenant }: { tenant: ResolvedTenant | null }) {
  const campusName = tenant?.college_name ?? null;
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="tray-landing tray-page min-h-svh overflow-x-hidden tray-landing-wrapper" style={{ fontFamily: "var(--font-ui)" }}>
      <ScrollProgress />
      <LandingIntro />
      <LandingMotion />

      <AnimatedNav
        className="tl-nav sticky top-0 z-50 border-b border-transparent px-5 sm:px-8 lg:px-10"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" } as React.CSSProperties}
      >
        <header>
          <div className="tl-nav-inner mx-auto flex h-[var(--tray-nav-h)] max-w-7xl items-center justify-between gap-6">
            <BrandMark />

            <nav className="hidden items-center gap-10 lg:flex" aria-label="Main navigation">
              {NAV_ITEMS.map(([label, href], i) => (
                <a key={label} href={href} className="tl-nav-link">
                  <span className="mr-1.5 opacity-45">{String(i + 1).padStart(2, "0")}·</span>
                  {label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-5 lg:flex">
              <Link
                href="/login"
                className="font-bricolage text-sm font-medium text-[var(--tray-muted)] transition-colors duration-200 hover:text-[var(--tray-ink)]"
              >
                Sign in
              </Link>
              <MotionCTA
                href="#portals"
                variant="primary"
                className="tl-cta-primary rounded-[var(--tray-radius-md)] bg-[var(--tray-ink)] px-5 py-2.5 font-bricolage text-sm font-semibold text-[var(--tray-cream)]"
              >
                Open live demos
              </MotionCTA>
            </div>

            <button
              className="flex h-10 w-10 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-[var(--tray-radius-sm)] border-2 border-[var(--tray-ink)] bg-[var(--tray-cream)] lg:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <span
                className="h-0.5 w-4 rounded-full bg-[var(--tray-ink)] transition-transform duration-200"
                style={{ transform: mobileMenuOpen ? "translateY(5.5px) rotate(45deg)" : "none" }}
              />
              <span
                className="h-0.5 w-4 rounded-full bg-[var(--tray-ink)] transition-opacity duration-200"
                style={{ opacity: mobileMenuOpen ? 0 : 1 }}
              />
              <span
                className="h-0.5 w-4 rounded-full bg-[var(--tray-ink)] transition-transform duration-200"
                style={{ transform: mobileMenuOpen ? "translateY(-5.5px) rotate(-45deg)" : "none" }}
              />
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="border-t-2 border-[var(--tray-ink)] bg-[var(--tray-cream)] lg:hidden">
              <nav className="flex flex-col" aria-label="Mobile navigation">
                {NAV_ITEMS.map(([label, href], i) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="border-b border-[var(--tray-border)] px-5 py-4 font-code text-[0.72rem] uppercase tracking-[0.18em] text-[var(--tray-muted)] hover:text-[var(--tray-ink)]"
                  >
                    {String(i + 1).padStart(2, "0")} · {label}
                  </a>
                ))}
                <div className="flex flex-col gap-2 px-5 py-4">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 font-bricolage text-sm font-medium text-[var(--tray-ink)]"
                  >
                    Sign in
                  </Link>
                  <a
                    href="#portals"
                    onClick={() => setMobileMenuOpen(false)}
                    className="tl-cta-primary rounded-[var(--tray-radius-md)] bg-[var(--tray-ink)] px-4 py-3 text-center font-bricolage text-sm font-semibold text-[var(--tray-cream)]"
                  >
                    Open live demos
                  </a>
                </div>
              </nav>
            </div>
          )}

          <div className="tl-nav-strip hidden border-t border-[var(--tray-border)] lg:block">
            <p className="mx-auto max-w-7xl py-2 font-code text-[0.625rem] uppercase tracking-[0.14em] text-[var(--tray-muted)]">
              Campus canteen · UPI · OTP pickup · multi-counter
            </p>
          </div>
        </header>
      </AnimatedNav>

      <main id="main">
        <TrayHero />
        <SectionFx variant="rise">
          <CampusTicker />
        </SectionFx>
        <SectionFx variant="blur-rise">
          <PiranhaPortalsSection />
        </SectionFx>
        <CampusModelSection campusName={campusName} />
        <SectionFx variant="slide-left">
          <TrustSection />
        </SectionFx>
        <SectionFx variant="slide-right">
          <SyncSection />
        </SectionFx>
        <SectionFx variant="blur-rise">
          <ClosingSection />
        </SectionFx>
      </main>

      <footer className="relative overflow-hidden px-4 pb-8 pt-10 sm:px-8 sm:pt-12 lg:px-10">
        <motion.div
          className="pointer-events-none absolute bottom-8 right-0 select-none tl-footer-mark"
          style={{ overflow: "hidden" }}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            style={{
              fontFamily: "var(--font-hero-display)",
              fontWeight: 700,
              fontSize: "clamp(8rem, 12vw, 12rem)",
              lineHeight: 0.8,
              letterSpacing: "-0.06em",
              color: "var(--tray-ink)",
              opacity: 0.04,
              display: "block",
              paddingRight: "clamp(1.5rem, 4vw, 4rem)",
            }}
          >
            TRAY
          </span>
        </motion.div>

        <div className="mx-auto max-w-7xl">
          <SectionReveal as="div" className="relative z-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <RevealItem>
              <BrandMark />
              <p
                className="mt-5 max-w-sm text-[1.08rem] leading-7 text-[var(--tray-muted)]"
                style={{ fontFamily: "var(--font-hero-ui)" }}
              >
                Campus food operations for colleges that want faster handoff, cleaner billing, and fewer counter bottlenecks.
              </p>
            </RevealItem>

            <RevealItem>
              <p className="font-code mb-5 text-[0.85rem] font-bold uppercase tracking-[0.22em] text-[var(--tray-muted)]">Product</p>
              <ul className="flex flex-col gap-3 text-[1.05rem]">
                {[
                  ["Student view", "/login?role=student"],
                  ["Kitchen view", "/login?role=kitchen"],
                  ["Admin view", "/login?role=owner"],
                  ["Get started", "/get-started"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="tl-footer-link-item opacity-75 font-semibold">
                      <span className="tl-footer-link-circ" />
                      <span className="tl-footer-link-text">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </RevealItem>

            <RevealItem>
              <p className="font-code mb-5 text-[0.85rem] font-bold uppercase tracking-[0.22em] text-[var(--tray-muted)]">Resources</p>
              <ul className="flex flex-col gap-3 text-[1.05rem]">
                {[
                  ["README", "https://github.com/thribhuvan003/Tray/blob/main/README.md"],
                  ["Architecture", "https://github.com/thribhuvan003/Tray/tree/main/docs/adr"],
                  ["Security", "https://github.com/thribhuvan003/Tray/blob/main/SECURITY.md"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <a href={href} target="_blank" rel="noreferrer" className="tl-footer-link-item opacity-75 font-semibold">
                      <span className="tl-footer-link-circ" />
                      <span className="tl-footer-link-text">{label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </RevealItem>

            <RevealItem>
              <p className="font-code mb-5 text-[0.85rem] font-bold uppercase tracking-[0.22em] text-[var(--tray-muted)]">Contact</p>
              <a
                href="https://github.com/thribhuvan003"
                target="_blank"
                rel="noreferrer"
                className="tl-footer-link-item block text-[1.12rem] font-semibold opacity-75 sm:text-[1.25rem]"
              >
                <span className="tl-footer-link-circ" />
                <span className="tl-footer-link-text">github.com/thribhuvan003</span>
              </a>
            </RevealItem>
          </SectionReveal>

          <div className="relative z-10 mt-10 flex flex-wrap items-center justify-between gap-4 sm:mt-16">
            <p className="text-[0.72rem] uppercase tracking-[0.2em] opacity-45" style={{ fontFamily: "var(--font-dm-mono)" }}>
              Made for India&apos;s college campuses
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
