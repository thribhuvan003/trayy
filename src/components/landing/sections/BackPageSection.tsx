import React from "react";
import Link from "next/link";
import { Reveal } from "@/components/landing/reveal";

const MONO = "var(--font-spline-mono), monospace";
const ROZHA = "var(--font-rozha), serif";

const ROWS = [
  {
    tag: "UPI",
    title: "Direct settlement",
    copy: "Payments hit the canteen's merchant VPA. No platform wallet, no float sitting with Tray.",
  },
  {
    tag: "RLS",
    title: "Tenant isolation",
    copy: "Menus, orders and profiles are scoped per campus with row-level security on every Postgres query.",
  },
  {
    tag: "REV",
    title: "Zero commission",
    copy: "No per-order platform fee. The canteen keeps exactly what the student pays.",
  },
  {
    tag: "OTP",
    title: "Verifiable pickup",
    copy: "The four-digit code ties payment to handover and settles wrong-order disputes before they start.",
  },
];

const TECH = ["NEXT.JS 15", "TYPESCRIPT", "TAILWIND 4", "SUPABASE", "POSTGRES + RLS", "RAZORPAY", "VERCEL EDGE"];

export function BackPageSection() {
  return (
    <section id="trust" style={{ background: "#1B2447", color: "#F7F1E3", borderTop: "2.5px solid #221F18" }}>
      <Reveal
        as="div"
        className="lp-pad"
        style={{ maxWidth: 1440, margin: "0 auto", padding: "96px 72px 88px 128px", boxSizing: "border-box" }}
      >
        <div className="lp-trust-grid">
          <div>
            <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, letterSpacing: ".16em", color: "#E8B84B", marginBottom: 18 }}>
              05 · THE BACK PAGE
            </div>
            <h2
              style={{
                margin: "0 0 22px",
                fontFamily: "var(--font-young-serif), serif",
                fontWeight: 400,
                fontSize: "clamp(34px, 4vw, 50px)",
                lineHeight: 1.08,
              }}
            >
              Serious under the hood.
            </h2>
            <p style={{ margin: "0 0 34px", fontSize: 18, lineHeight: 1.65, color: "rgba(247,241,227,.72)", maxWidth: 420, textWrap: "pretty" }}>
              Tray is campus infrastructure, not a delivery aggregator. It never holds student money, never mixes one college&apos;s
              data with another&apos;s, and never takes a cut of the counter.
            </p>
            <Link href="/get-started" className="lp-cta-gold">
              I run a canteen — get started →
            </Link>
          </div>
          <div style={{ borderTop: "2px solid rgba(247,241,227,.9)" }}>
            {ROWS.map((row, i) => (
              <div
                key={row.tag}
                className="lp-trust-row"
                style={i === ROWS.length - 1 ? { borderBottom: "2px solid rgba(247,241,227,.9)" } : undefined}
              >
                <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#E8B84B" }}>{row.tag}</span>
                <span style={{ fontFamily: ROZHA, fontSize: 21 }}>{row.title}</span>
                <span style={{ fontSize: 15.5, lineHeight: 1.6, color: "rgba(247,241,227,.68)" }}>{row.copy}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px 26px",
                paddingTop: 22,
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: ".1em",
                color: "rgba(247,241,227,.55)",
              }}
            >
              {TECH.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
