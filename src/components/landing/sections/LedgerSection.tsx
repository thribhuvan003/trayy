import React from "react";
import { Reveal } from "@/components/landing/reveal";

const ROWS = [
  {
    n: "01",
    title: "Customer pays first",
    copy: "Order on the phone. Pay the stall’s UPI. Cash never sits in a Tray wallet.",
    stamp: "UPI confirmed",
    accent: false,
  },
  {
    n: "02",
    title: "Token on the phone",
    copy: "Paid → token. Walk up, show the screen. No shouting over the tawa.",
    stamp: "Token ready",
    accent: false,
  },
  {
    n: "03",
    title: "Kitchen only if needed",
    copy: "Live board for bigger counters. Solo cart? Skip it — hand over with the token.",
    stamp: "Skip if solo",
    accent: false,
  },
  {
    n: "04",
    title: "Totals keep moving",
    copy: "Orders and totals update as money lands. Export CSV when you close.",
    stamp: "● Live",
    accent: true,
  },
];

export function LedgerSection() {
  return (
    <Reveal id="ledger" className="lp-band-ledger">
      <div>
        <div className="lp-sec-head">
          <p className="lp-sec-kicker">03 · How a rush actually runs</p>
          <h2 className="lp-sec-title">Four lines. Whole day.</h2>
          <p className="lp-sec-lede">
            Pay, token, optional kitchen, totals. Most stalls strike kitchen out entirely.
          </p>
        </div>

        <ol className="lp-ledger lp-stagger">
          {ROWS.map((row) => (
            <li
              key={row.n}
              className={`lp-ledger-row${row.accent ? " is-accent" : ""}${row.n === "03" ? " is-skip" : ""}`}
            >
              <span className="lp-ledger-n">{row.n}</span>
              <div className="lp-ledger-main">
                <h3>{row.title}</h3>
                <p>{row.copy}</p>
              </div>
              <span className="lp-ledger-stamp">{row.stamp}</span>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}
