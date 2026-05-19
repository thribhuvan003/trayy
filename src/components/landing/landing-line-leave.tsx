"use client";

import { useState } from "react";

const OPTIONS = [
  {
    id: "class",
    label: "Between classes",
    hint: "Order now, pick up on the way to the next lecture.",
  },
  {
    id: "queue",
    label: "Stuck in line",
    hint: "Skip the crowd — pay on your phone, walk to the handover window.",
  },
  {
    id: "counter",
    label: "At the counter",
    hint: "Show your OTP when staff calls your order.",
  },
] as const;

export function LandingLineLeave() {
  const [active, setActive] = useState<(typeof OPTIONS)[number]["id"]>("queue");

  const copy = OPTIONS.find((o) => o.id === active) ?? OPTIONS[1];

  return (
    <section className="tl-line-leave tl-wrap" id="where" data-reveal>
      <div className="tl-section-num">
        <span className="tl-bar" />
        <span className="tl-num">02b</span> / Where are you right now?
      </div>
      <div className="tl-line-leave-grid">
        <div>
          <h2 className="tl-line-leave-title">
            Dine in or takeaway —<br />
            <span className="tl-it">before you order.</span>
          </h2>
          <p className="tl-line-leave-lede">
            Like a QSR handoff screen: choose how you eat, get an honest ETA, then pay. Tray adapts copy and pickup
            for counter vs table.
          </p>
        </div>
        <div className="tl-line-leave-panel" role="group" aria-label="Campus moment">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`tl-line-chip${active === opt.id ? " is-on" : ""}`}
              aria-pressed={active === opt.id}
              onClick={() => setActive(opt.id)}
            >
              {opt.label}
            </button>
          ))}
          <p className="tl-line-hint" aria-live="polite">
            {copy.hint}
          </p>
        </div>
      </div>
    </section>
  );
}
