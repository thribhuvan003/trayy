import React from "react";
import Link from "next/link";
import type { ResolvedTenant } from "@/lib/tenant";
import { landingFontVars } from "@/components/landing/fonts";
import { CouponsSection } from "@/components/landing/sections/CouponsSection";
import { WalkthroughSection } from "@/components/landing/sections/WalkthroughSection";
import { LedgerSection } from "@/components/landing/sections/LedgerSection";
import { CarbonSection } from "@/components/landing/sections/CarbonSection";
import { BackPageSection } from "@/components/landing/sections/BackPageSection";
import { QuoteSection } from "@/components/landing/sections/QuoteSection";
import "./ledger.css";

const MONO = "var(--font-spline-mono), monospace";
const ROZHA = "var(--font-rozha), serif";

function Masthead() {
  return (
    <header className="lp-masthead">
      <div className="lp-masthead-inner">
        <a href="#top" style={{ display: "flex", alignItems: "baseline", gap: 14, textDecoration: "none", color: "#221F18" }}>
          <span style={{ fontFamily: ROZHA, fontSize: 34, lineHeight: 1 }}>Tray</span>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".18em", color: "rgba(34,31,24,.55)" }}>
            CAMPUS FOOD REGISTER
          </span>
        </a>
        <nav className="lp-nav" aria-label="Main navigation">
          <a href="#demos" className="lp-nav-link">DEMOS</a>
          <a href="#ledger" className="lp-nav-link">HOW IT RUNS</a>
          <a href="#sync" className="lp-nav-link">REALTIME</a>
          <a href="#trust" className="lp-nav-link">UNDER THE HOOD</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".12em", color: "rgba(34,31,24,.5)" }}>REG. NO. TRY/2026</span>
          <Link href="/login" className="lp-signin">
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

function MealToken({ college }: { college: string }) {
  const digitBox: React.CSSProperties = {
    width: 36,
    height: 42,
    display: "grid",
    placeItems: "center",
    border: "1.5px solid rgba(34,31,24,.85)",
    borderRadius: 5,
    background: "#FFFDF6",
    fontFamily: MONO,
    fontWeight: 700,
    fontSize: 20,
    color: "var(--ink)",
  };
  return (
    <div
      className="lp-hero-token"
      style={{ position: "relative", justifySelf: "end", width: 372, animation: "lpRise .8s cubic-bezier(.22,1,.36,1) .15s both" }}
    >
      <div
        style={{
          background: "#FFFDF6",
          border: "1.5px solid rgba(34,31,24,.85)",
          borderRadius: 6,
          transform: "rotate(1.6deg)",
          boxShadow: "3px 5px 0 rgba(34,31,24,.16), 0 24px 40px -20px rgba(34,31,24,.25)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1.5px solid rgba(34,31,24,.85)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(34,31,24,.55)" }}>{college}</div>
            <div style={{ fontFamily: ROZHA, fontSize: 22, marginTop: 2 }}>Meal Token</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", color: "rgba(34,31,24,.55)" }}>TOKEN NO.</div>
            <div style={{ fontFamily: ROZHA, fontSize: 30, color: "var(--ink)", lineHeight: 1 }}>217</div>
          </div>
        </div>
        <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["Chicken Biryani × 1", "₹140"],
            ["Filter Coffee × 2", "₹50"],
          ].map(([item, price]) => (
            <div
              key={item}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                borderBottom: "1px dotted rgba(34,31,24,.4)",
                paddingBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 16 }}>{item}</span>
              <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 15 }}>{price}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: ".14em", color: "rgba(34,31,24,.6)" }}>
              UPI · aditya-canteen@upi
            </span>
            <span style={{ fontFamily: ROZHA, fontSize: 22 }}>₹190</span>
          </div>
        </div>
        {/* perforation */}
        <div style={{ position: "relative", height: 0, borderTop: "2px dashed rgba(34,31,24,.5)", margin: "4px 0" }}>
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: -10,
              top: -9,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#F7F1E3",
              border: "1.5px solid rgba(34,31,24,.4)",
            }}
          />
          <span
            aria-hidden
            style={{
              position: "absolute",
              right: -10,
              top: -9,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#F7F1E3",
              border: "1.5px solid rgba(34,31,24,.4)",
            }}
          />
        </div>
        <div
          style={{
            padding: "16px 24px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(29,63,191,.05)",
          }}
        >
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(34,31,24,.55)", marginBottom: 6 }}>
              SHOW AT COUNTER
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              {["4", "8", "2", "1"].map((d, i) => (
                <span key={i} style={digitBox}>
                  {d}
                </span>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", color: "rgba(34,31,24,.45)", textAlign: "right", lineHeight: 1.7 }}>
            KITCHEN COPY
            <br />
            12:47 PM
          </div>
        </div>
      </div>
      {/* PAID stamp */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 96,
          right: -26,
          padding: "8px 18px",
          border: "3px double #C13A2A",
          borderRadius: 8,
          color: "#C13A2A",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: ".22em",
          mixBlendMode: "multiply",
          opacity: 0.88,
          animation: "lpStampIn .5s cubic-bezier(.34,1.4,.64,1) .4s both",
        }}
      >
        PAID
      </div>
    </div>
  );
}

function Hero({ college }: { college: string }) {
  return (
    <section id="top" className="lp-hero">
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            fontFamily: MONO,
            fontSize: 12.5,
            letterSpacing: ".16em",
            color: "var(--ink)",
            marginBottom: 30,
            flexWrap: "wrap",
            animation: "lpRise .6s cubic-bezier(.22,1,.36,1) both",
          }}
        >
          <span style={{ fontWeight: 600 }}>ENTRY 00</span>
          <span style={{ color: "rgba(34,31,24,.45)" }}>————</span>
          <span style={{ color: "rgba(34,31,24,.6)" }}>ONE CAMPUS · EVERY COUNTER · LIVE</span>
        </div>
        <h1 className="lp-h1" style={{ animation: "lpRise .7s cubic-bezier(.22,1,.36,1) .08s both" }}>
          Campus food,
          <br />
          without{" "}
          <span style={{ position: "relative", whiteSpace: "nowrap" }}>
            the queue
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: "-2%",
                right: "-2%",
                top: "54%",
                height: 4,
                background: "#C13A2A",
                transform: "rotate(-1.2deg)",
                borderRadius: 2,
                opacity: 0.85,
              }}
            />
          </span>
          .
        </h1>
        <p
          style={{
            margin: "0 0 40px",
            fontSize: 20,
            lineHeight: 1.6,
            color: "rgba(34,31,24,.75)",
            maxWidth: 520,
            textWrap: "pretty",
            animation: "lpRise .7s cubic-bezier(.22,1,.36,1) .16s both",
          }}
        >
          Students order ahead from any canteen on campus and collect with a four-digit code. Kitchens run one live queue instead
          of a shouting crowd. The canteen keeps every rupee — Tray takes no commission.
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 44,
            flexWrap: "wrap",
            animation: "lpRise .7s cubic-bezier(.22,1,.36,1) .24s both",
          }}
        >
          <Link href="/demo/student" className="lp-cta">
            Open the live demo <span style={{ fontFamily: MONO }}>→</span>
          </Link>
          <a href="#trust" className="lp-underline-link">
            I run a canteen
          </a>
        </div>
        <div
          style={{
            display: "flex",
            gap: 40,
            borderTop: "1.5px solid rgba(34,31,24,.8)",
            paddingTop: 18,
            maxWidth: 560,
            flexWrap: "wrap",
            animation: "lpRise .7s cubic-bezier(.22,1,.36,1) .32s both",
          }}
        >
          {[
            ["0%", "ORDER COMMISSION"],
            ["UPI", "DIRECT TO CANTEEN VPA"],
            ["4-digit", "OTP AT HANDOVER"],
          ].map(([stat, label]) => (
            <div key={label}>
              <div style={{ fontFamily: ROZHA, fontSize: 30, color: "var(--ink)", lineHeight: 1.1 }}>{stat}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".12em", color: "rgba(34,31,24,.55)", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <MealToken college={college} />
    </section>
  );
}

function RegisterLine() {
  return (
    <div className="lp-register-line">
      <span>
        12:47:03 — T-2425 <span style={{ color: "var(--ink)" }}>PAID ₹210</span>
      </span>
      <span>12:47:09 — KITCHEN TICKET OPENED</span>
      <span>
        12:51:44 — T-2425 <span style={{ color: "var(--ink)" }}>READY</span>
      </span>
      <span>12:52:30 — OTP 4821 VERIFIED</span>
      <span>
        12:52:31 — <span style={{ color: "#C13A2A" }}>HANDED OVER</span>
      </span>
      <span>12:52:40 — ADMIN TOTALS UPDATED</span>
    </div>
  );
}

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-grid">
        <div>
          <div style={{ fontFamily: ROZHA, fontSize: 30, marginBottom: 10 }}>Tray</div>
          <p style={{ margin: "0 0 18px", fontSize: 15, lineHeight: 1.6, color: "rgba(34,31,24,.65)", maxWidth: 300 }}>
            Campus food operations for colleges that want faster handoff, cleaner billing and fewer counter bottlenecks.
          </p>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".12em", color: "rgba(34,31,24,.45)" }}>
            MADE FOR INDIA&apos;S COLLEGE CAMPUSES
          </div>
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: "#C13A2A", marginBottom: 14 }}>PRODUCT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 15.5, fontWeight: 500, alignItems: "flex-start" }}>
            <Link href="/demo/student" className="lp-footer-link">Student view</Link>
            <Link href="/demo/kitchen" className="lp-footer-link">Kitchen view</Link>
            <Link href="/demo/admin" className="lp-footer-link">Admin view</Link>
            <Link href="/get-started" className="lp-footer-link">Get started</Link>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: "#C13A2A", marginBottom: 14 }}>RESOURCES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 15.5, fontWeight: 500, alignItems: "flex-start" }}>
            <a href="https://github.com/thribhuvan003/trayy/blob/main/README.md" target="_blank" rel="noreferrer" className="lp-footer-link">
              README
            </a>
            <a href="https://github.com/thribhuvan003/trayy/tree/main/docs/adr" target="_blank" rel="noreferrer" className="lp-footer-link">
              Architecture
            </a>
            <a href="https://github.com/thribhuvan003/trayy/blob/main/SECURITY.md" target="_blank" rel="noreferrer" className="lp-footer-link">
              Security
            </a>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".16em", color: "#C13A2A", marginBottom: 14 }}>CONTACT</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 15.5, fontWeight: 500, alignItems: "flex-start" }}>
            <a href="https://github.com/thribhuvan003" target="_blank" rel="noreferrer" className="lp-footer-link">
              github.com/thribhuvan003
            </a>
          </div>
          <div
            style={{
              marginTop: 22,
              display: "inline-block",
              padding: "6px 14px",
              border: "2.5px double #C13A2A",
              borderRadius: 6,
              color: "#C13A2A",
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: ".18em",
              transform: "rotate(-3deg)",
              mixBlendMode: "multiply",
            }}
          >
            REGISTER CLOSED · 2:30 PM
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage({ tenant }: { tenant: ResolvedTenant | null }) {
  const college = tenant?.college_name?.toUpperCase() ?? "ADITYA ENG. COLLEGE";

  return (
    <div className={`lp ${landingFontVars}`}>
      {/* Ledger ruling underlay */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 35px, rgba(29,63,191,.075) 35px, rgba(29,63,191,.075) 36px)",
        }}
      />
      {/* Red margin line */}
      <div aria-hidden className="lp-margin-line" />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Masthead />
        <main id="main">
          <Hero college={college} />
          <RegisterLine />
          <CouponsSection />
          <WalkthroughSection />
          <LedgerSection />
          <CarbonSection />
          <BackPageSection />
          <QuoteSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}
