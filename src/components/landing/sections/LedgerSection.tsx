import React from "react";
import { Reveal } from "@/components/landing/reveal";

const MONO = "var(--font-spline-mono), monospace";
const ROZHA = "var(--font-rozha), serif";

const ROWS = [
  {
    n: "№ 1",
    title: "Customer pays first",
    copy: "A tray is built on the phone and paid by UPI before anyone stands anywhere. The money lands in the stall's own account, not a platform wallet.",
    stamp: ["UPI CONFIRMED", "12:47:03"],
    red: false,
  },
  {
    n: "№ 2",
    title: "Ticket hits the kitchen",
    copy: "The queue board updates the same second. Every ticket carries items, prep targets and the customer's name — no paper slips, no counter shouting.",
    stamp: ["TICKET T-2425", "12:47:09"],
    red: false,
  },
  {
    n: "№ 3",
    title: "Customer tracks prep live",
    copy: "Queued, preparing, ready — the order moves on the customer's screen as the kitchen works. They walk over only when it's actually ready.",
    stamp: ["STATUS READY", "12:51:44"],
    red: false,
  },
  {
    n: "№ 4",
    title: "OTP closes the loop",
    copy: "A four-digit code ties the payment to the handover. The kitchen keys it in, the order clears, and the admin's totals move — all from one write.",
    stamp: ["HANDED OVER", "12:52:31"],
    red: true,
  },
];

export function LedgerSection() {
  return (
    <Reveal id="ledger" className="lp-pad" style={{ padding: "24px 72px 100px 128px", maxWidth: 1440, boxSizing: "border-box", margin: "0 auto" }}>
      <div style={{ position: "relative", marginBottom: 48 }}>
        <span className="lp-section-no">03</span>
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-yatra), system-ui",
            fontWeight: 400,
            fontSize: "clamp(34px, 4vw, 50px)",
            lineHeight: 1.12,
            maxWidth: 720,
          }}
        >
          The lunch rush, entered properly.
        </h2>
      </div>

      <div style={{ borderTop: "2.5px solid #221F18" }}>
        {ROWS.map((row, i) => (
          <div key={row.n} className={`lp-ledger-row${i === ROWS.length - 1 ? " lp-ledger-row--last" : ""}`}>
            <span style={{ fontFamily: ROZHA, fontSize: 26, color: "var(--ink)" }}>{row.n}</span>
            <h3 style={{ margin: 0, fontFamily: ROZHA, fontWeight: 400, fontSize: 25 }}>{row.title}</h3>
            <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.6, color: "rgba(34,31,24,.72)" }}>{row.copy}</p>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11.5,
                letterSpacing: ".1em",
                color: row.red ? "#C13A2A" : "rgba(34,31,24,.5)",
                fontWeight: row.red ? 600 : undefined,
                textAlign: "right",
              }}
            >
              {row.stamp[0]}
              <br />
              {row.stamp[1]}
            </span>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
