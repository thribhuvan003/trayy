import React from "react";
import { Reveal } from "@/components/landing/reveal";

const MONO = "var(--font-spline-mono), monospace";
const ROZHA = "var(--font-rozha), serif";

export function QuoteSection() {
  return (
    <Reveal className="lp-quote">
      <blockquote style={{ margin: 0, position: "relative" }}>
        <span className="lp-section-no">06</span>
        {/* Swap for a real, named stall-owner quote once the first pilot is live —
            never an invented one. Until then this is honestly what it is: the pitch. */}
        <p style={{ margin: "0 0 26px", fontFamily: ROZHA, fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.22, maxWidth: 760, textWrap: "balance" }}>
          “No shouting over the crowd. The phone calls the order, the customer shows a token, and the rush settles itself.”
        </p>
        <footer style={{ fontFamily: MONO, fontSize: 12, letterSpacing: ".14em", color: "rgba(34,31,24,.55)" }}>
          THE PITCH WE MAKE TO EVERY STALL OWNER
        </footer>
      </blockquote>
      <div
        style={{
          border: "1.5px solid rgba(34,31,24,.85)",
          borderRadius: 6,
          background: "#FFFDF6",
          padding: "18px 20px",
          transform: "rotate(1.2deg)",
          boxShadow: "3px 4px 0 rgba(34,31,24,.12)",
          maxWidth: 300,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(34,31,24,.5)", marginBottom: 12 }}>
          HANDOVER BOARD · SPECIMEN
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9, fontFamily: MONO, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>A-217 Masala dosa</span>
            <span style={{ fontWeight: 700, color: "var(--ink)" }}>4821</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>B-044 Veg thali</span>
            <span style={{ color: "rgba(34,31,24,.55)" }}>04m</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>C-103 Filter coffee</span>
            <span style={{ color: "#C13A2A", fontWeight: 700 }}>CALLED</span>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
