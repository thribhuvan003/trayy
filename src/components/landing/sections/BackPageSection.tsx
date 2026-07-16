"use client";

import React from "react";
import { Reveal } from "@/components/landing/reveal";

/**
 * Interactive owner promises — click selects; detail adds a real objection answer,
 * not a paraphrase of the card body.
 */
const PROMISES = [
  {
    n: "01",
    title: "Paisa goes to you",
    copy: "Customer pays your UPI. Tray never holds the money — not for a second.",
    detail:
      "Unlike delivery apps, there is no Tray wallet in the middle. Settlement is their phone → your VPA.",
    proof: "Direct UPI",
  },
  {
    n: "02",
    title: "Zero cut on the plate",
    copy: "No commission per order. What they pay is what you keep.",
    detail:
      "No 20–30% marketplace cut. Optional tools later — never a silent fee on every dosa.",
    proof: "₹0 cut",
  },
  {
    n: "03",
    title: "Only your stall",
    copy: "Orders and menu stay locked to this outlet. Never mixed with the cart next door.",
    detail:
      "Each stall is its own tenant. Neighbour’s sold-out paneer cannot wipe your board.",
    proof: "Isolated",
  },
  {
    n: "04",
    title: "Token at the glass",
    copy: "They show the phone. You hand over the food. Kitchen board only if you want it.",
    detail:
      "Street default is counter token after pay. Kitchen OTP is opt-in for bigger counters.",
    proof: "Token first",
  },
] as const;

export function BackPageSection() {
  const [active, setActive] = React.useState<string>("01");

  const activePromise = PROMISES.find((p) => p.n === active) ?? PROMISES[0];

  return (
    <Reveal id="trust" className="lp-band-trust" from="up">
      <div className="lp-trust-inner">
        <header className="lp-trust-head">
          <p className="lp-trust-kicker">05 · For the owner</p>
          <h2 className="lp-trust-title">
            Their money hits
            <br />
            <em>your</em> UPI.
          </h2>
          <p className="lp-trust-lede">
            Four promises, each with the straight answer underneath.
          </p>
        </header>

        <div className="lp-trust-promises lp-stagger" role="list">
          {PROMISES.map((p, i) => {
            const on = active === p.n;
            return (
              <button
                key={p.n}
                type="button"
                role="listitem"
                aria-pressed={on}
                className={`lp-trust-card${on ? " is-active" : ""}`}
                style={{ ["--i" as string]: i }}
                onClick={() => setActive(p.n)}
              >
                <span className="lp-trust-n">{p.n}</span>
                <h3 className="lp-trust-card-title">{p.title}</h3>
                <p className="lp-trust-card-copy">{p.copy}</p>
                <span className="lp-trust-card-hint" aria-hidden>
                  {on ? "Open ↓" : "Open"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="lp-trust-detail" key={active} aria-live="polite">
          <div className="lp-trust-detail-top">
            <span className="lp-trust-detail-n">{activePromise.n}</span>
            <span className="lp-trust-detail-proof">{activePromise.proof}</span>
          </div>
          <p className="lp-trust-detail-title">{activePromise.title}</p>
          <p className="lp-trust-detail-body">{activePromise.detail}</p>
        </div>

      </div>
    </Reveal>
  );
}
