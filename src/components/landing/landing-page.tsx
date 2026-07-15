import React from "react";
import Link from "next/link";
import type { ResolvedTenant } from "@/lib/tenant";
import { landingFontVars } from "@/components/landing/fonts";
import { LandingIntro } from "@/components/landing/intro";
import { CouponsSection } from "@/components/landing/sections/CouponsSection";
import { WalkthroughSection } from "@/components/landing/sections/WalkthroughSection";
import { LedgerSection } from "@/components/landing/sections/LedgerSection";
import { CarbonSection } from "@/components/landing/sections/CarbonSection";
import { BackPageSection } from "@/components/landing/sections/BackPageSection";
import { QuoteSection } from "@/components/landing/sections/QuoteSection";
import "./ledger.css";

function Masthead() {
  return (
    <header className="lp-masthead">
      <div className="lp-masthead-inner">
        <a href="#top" className="lp-brand">
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
            Set up stall
          </Link>
        </nav>
        <div className="lp-masthead-actions">
          <Link href="/login" className="lp-signin">
            Sign in
          </Link>
          <Link href="/get-started" className="lp-masthead-cta">
            Set up stall
          </Link>
        </div>
      </div>
    </header>
  );
}

function MealToken({ label }: { label: string }) {
  return (
    <aside className="lp-hero-token" aria-label="Sample counter token">
      <div className="lp-receipt">
        <div className="lp-receipt-head">
          <span className="lp-receipt-brand">TRAY</span>
          <span className="lp-receipt-loc">{label}</span>
        </div>
        <div className="lp-receipt-rule" aria-hidden />
        <div className="lp-receipt-row">
          <span>Masala Dosa ×1</span>
          <span>₹70.00</span>
        </div>
        <div className="lp-receipt-row">
          <span>Filter Coffee ×2</span>
          <span>₹50.00</span>
        </div>
        <div className="lp-receipt-rule" aria-hidden />
        <div className="lp-receipt-row lp-receipt-row--total">
          <span>TOTAL</span>
          <span>₹120.00</span>
        </div>
        <div className="lp-receipt-pay">
          <span>Paid to</span>
          <strong>stall-07@upi</strong>
        </div>
        <div className="lp-receipt-token">
          <span className="lp-receipt-token-label">Show this at the glass</span>
          <span className="lp-receipt-token-num">217</span>
        </div>
        <p className="lp-receipt-foot">thermal sample · not live money</p>
      </div>
    </aside>
  );
}

function Hero({ label, menuHref }: { label: string; menuHref: string }) {
  return (
    <section id="top" className="lp-hero">
      <div className="lp-hero-copy">
        <div className="lp-hero-plate">
          <span className="lp-hero-plate-l">Street stalls · tiffin · carts</span>
          <span className="lp-hero-plate-r">India</span>
        </div>

        <h1 className="lp-h1">
          <span className="lp-h1-line">Order on the phone.</span>
          <span className="lp-h1-line">Pay the stall&apos;s UPI.</span>
          <span className="lp-h1-line lp-h1-line--accent">Pick up with a token.</span>
        </h1>

        <p className="lp-hero-lede">
          Built for the crush outside a dosa cart — not for delivery apps. Zero commission. Money
          never sits with Tray. Kitchen screen only if you need staff.
        </p>

        <ol className="lp-hero-steps" aria-label="How it works">
          <li>
            <b>1</b>
            <span>Scan the stall QR</span>
          </li>
          <li>
            <b>2</b>
            <span>Pay their UPI</span>
          </li>
          <li>
            <b>3</b>
            <span>Show token at counter</span>
          </li>
        </ol>

        <div className="lp-hero-actions">
          <Link href="/get-started" className="lp-cta">
            Set up my stall
          </Link>
          <Link href="/demo/student" className="lp-underline-link">
            Try customer demo
          </Link>
        </div>
        <p className="lp-hero-note">
          Demos use sample data.{" "}
          <Link href={menuHref}>Open a sample menu</Link>
          .
        </p>
      </div>
      <MealToken label={label} />
    </section>
  );
}

function RegisterLine() {
  const items = [
    { id: "order", node: <>12:47 — T-2425 <b>ORDER ₹120</b></> },
    { id: "upi", node: <>UPI OPEN</> },
    { id: "paid", node: <>PAID · STALL VPA</> },
    { id: "token", node: <><b>TOKEN DIKHAO</b></> },
    {
      id: "collected",
      node: <span className="lp-register-accent">COLLECTED</span>,
    },
    { id: "hisaab", node: <>HISAAB UPDATE</> },
  ];
  const track = [...items, ...items];
  return (
    <div className="lp-register" id="how" aria-label="Example order timeline">
      <div className="lp-register-track">
        {track.map((item, i) => (
          <span key={`${item.id}-${i}`} className="lp-register-item">
            {item.node}
          </span>
        ))}
      </div>
    </div>
  );
}

function Footer({ menuHref }: { menuHref: string }) {
  return (
    <footer className="lp-footer">
      <div className="lp-foot">
        <div className="lp-foot-row">
          <div className="lp-foot-lead">
            <p className="lp-foot-eyebrow">Street edition · India</p>
            <p className="lp-foot-line-copy">
              Direct UPI. Phone token. Zero cut.
              <br />
              Built for the counter.
            </p>
          </div>

          <nav className="lp-foot-chips" aria-label="Footer links">
            <Link href="/get-started" className="lp-foot-chip lp-foot-chip--hot">
              Set up stall
            </Link>
            <Link href="/demo/student" className="lp-foot-chip">
              Try demos
            </Link>
            <Link href={menuHref} className="lp-foot-chip lp-foot-chip--ghost">
              Sample menu
            </Link>
            <Link href="/legal/terms" className="lp-foot-chip lp-foot-chip--ghost">
              Terms
            </Link>
            <Link href="/legal/privacy" className="lp-foot-chip lp-foot-chip--ghost">
              Privacy
            </Link>
            <a
              href="https://github.com/thribhuvan003/trayy"
              target="_blank"
              rel="noreferrer"
              className="lp-foot-chip lp-foot-chip--ghost"
            >
              GitHub
            </a>
            <Link href="/login" className="lp-foot-chip lp-foot-chip--ghost">
              Sign in
            </Link>
          </nav>
        </div>

        <div className="lp-foot-end">
          <p className="lp-foot-meta">© Tray · Street edition</p>

          <div className="lp-foot-stamp" aria-label="Tray brand stamp">
            <span className="lp-foot-stamp-word">TRAY</span>
            <span className="lp-foot-stamp-sub">STREET · INDIA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage({ tenant }: { tenant: ResolvedTenant | null }) {
  const label = tenant?.college_name?.toUpperCase() ?? "MG ROAD · STALL 7";
  const menuHref = tenant ? `/c/${tenant.slug}/menu` : "/demo/student";

  return (
    <div className={`lp ${landingFontVars}`}>
      <LandingIntro />
      <div className="lp-shell">
        <Masthead />
        <main id="main">
          <Hero label={label} menuHref={menuHref} />
          <RegisterLine />
          <CouponsSection />
          <WalkthroughSection />
          <LedgerSection />
          <CarbonSection />
          <BackPageSection />
          <QuoteSection />
        </main>
        <Footer menuHref={menuHref} />
      </div>
    </div>
  );
}
