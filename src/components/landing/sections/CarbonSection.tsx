import React from "react";
import { Reveal } from "@/components/landing/reveal";

const MONO = "var(--font-spline-mono), monospace";
const ROZHA = "var(--font-rozha), serif";

export function CarbonSection() {
  return (
    <Reveal id="sync" className="lp-sync">
      <div>
        <div style={{ position: "relative" }}>
          <span className="lp-section-no">04</span>
          <h2
            style={{
              margin: "0 0 20px",
              fontFamily: "var(--font-khand), sans-serif",
              fontWeight: 700,
              fontSize: "clamp(38px, 4.6vw, 58px)",
              lineHeight: 1.02,
              letterSpacing: "-0.01em",
            }}
          >
            Written once.
            <br />
            Copied everywhere.
          </h2>
        </div>
        <p style={{ margin: "0 0 24px", fontSize: 18, lineHeight: 1.65, color: "rgba(34,31,24,.72)", maxWidth: 460, textWrap: "pretty" }}>
          Mark a dish sold out in the kitchen and the student menu, the live queue and the admin&apos;s totals all move from that
          single write — like carbon paper, minus the smudge.
        </p>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, letterSpacing: ".1em", lineHeight: 2, color: "rgba(34,31,24,.55)" }}>
          SUPABASE REALTIME · POSTGRES ROW LOCKS
          <br />
          TENANT-SCOPED CHANNELS · NO REFRESH
        </p>
      </div>

      <div className="lp-carbon-stack" style={{ position: "relative", height: 340, maxWidth: 520 }}>
        <div
          style={{
            position: "absolute",
            inset: "48px -12px 0 24px",
            background: "rgba(29,63,191,.10)",
            border: "1.5px solid rgba(29,63,191,.4)",
            borderRadius: 6,
            transform: "rotate(2.4deg)",
            padding: "18px 22px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(29,63,191,.75)", textAlign: "right" }}>
            ADMIN COPY · 12:47:03
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            inset: "24px 0 24px 12px",
            background: "rgba(29,63,191,.16)",
            border: "1.5px solid rgba(29,63,191,.5)",
            borderRadius: 6,
            transform: "rotate(1deg)",
            padding: "18px 22px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(29,63,191,.85)", textAlign: "right" }}>
            STUDENT COPY · 12:47:03
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            inset: "0 12px 48px 0",
            background: "#FFFDF6",
            border: "1.5px solid rgba(34,31,24,.85)",
            borderRadius: 6,
            transform: "rotate(-.8deg)",
            boxShadow: "4px 6px 0 rgba(34,31,24,.12)",
            padding: "24px 28px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderBottom: "1.5px solid rgba(34,31,24,.85)",
              paddingBottom: 12,
            }}
          >
            <span style={{ fontFamily: ROZHA, fontSize: 21 }}>Kitchen writes</span>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".14em", color: "rgba(34,31,24,.5)" }}>ORIGINAL</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 16, fontWeight: 600 }}>
            <span>Paneer Butter Masala</span>
            <span
              style={{
                padding: "3px 12px",
                border: "2px solid #C13A2A",
                borderRadius: 5,
                color: "#C13A2A",
                fontFamily: MONO,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".12em",
                transform: "rotate(-3deg)",
                mixBlendMode: "multiply",
              }}
            >
              SOLD OUT
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "rgba(34,31,24,.65)" }}>
            One row updated in Postgres. Supabase Realtime fans it out to every subscribed screen on this campus — and only this
            campus.
          </p>
          <div style={{ marginTop: "auto", fontFamily: MONO, fontSize: 11, letterSpacing: ".1em", color: "var(--ink)" }}>
            → 2 CARBON COPIES DELIVERED, 0 MS ASKED OF ANYONE
          </div>
        </div>
      </div>
    </Reveal>
  );
}
