"use client";

import React from "react";
import { Reveal } from "@/components/landing/reveal";

type ScreenId = "counter" | "customer" | "admin";

type Item = {
  id: string;
  name: string;
  soldOut: boolean;
};

const INITIAL: Item[] = [
  { id: "paneer", name: "Paneer Butter Masala", soldOut: false },
  { id: "dosa", name: "Masala Dosa", soldOut: false },
  { id: "thali", name: "Veg Thali", soldOut: false },
];

const SCREENS: {
  id: ScreenId;
  label: string;
  shortLabel: string;
  role: string;
  hint: string;
}[] = [
  {
    id: "counter",
    label: "Counter",
    shortLabel: "Counter",
    role: "Writes",
    hint: "Tap Sold out — this is the only place you mark stock.",
  },
  {
    id: "customer",
    label: "Customer phone",
    shortLabel: "Phone",
    role: "Reads",
    hint: "Menu board updates before the next order.",
  },
  {
    id: "admin",
    label: "Owner desk",
    shortLabel: "Owner",
    role: "Reads",
    hint: "Cash book + stock status share one source of truth.",
  },
];

export function CarbonSection() {
  const [items, setItems] = React.useState<Item[]>(INITIAL);
  const [active, setActive] = React.useState<ScreenId>("counter");
  const [pulse, setPulse] = React.useState(0);
  const [log, setLog] = React.useState<string>("Waiting for a mark…");
  const [auto, setAuto] = React.useState(true);

  const soldCount = items.filter((i) => i.soldOut).length;

  const markSold = React.useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, soldOut: !item.soldOut } : item))
    );
    setPulse((n) => n + 1);
    setActive("counter");
    setLog("1 write · fan-out to customer + admin for this stall only");
    // Brief focus tour so seniors see the multi-screen effect
    window.setTimeout(() => setActive("customer"), 380);
    window.setTimeout(() => setActive("admin"), 760);
    window.setTimeout(() => setActive("counter"), 1200);
  }, []);

  // Gentle auto-demo once so the section “moves” without user work
  React.useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(() => {
      setItems((prev) =>
        prev.map((item) => (item.id === "paneer" ? { ...item, soldOut: true } : item))
      );
      setPulse((n) => n + 1);
      setLog("1 write · Paneer sold out · three screens already know");
      setActive("customer");
      window.setTimeout(() => setActive("admin"), 500);
      window.setTimeout(() => setActive("counter"), 1000);
    }, 1600);
    return () => window.clearTimeout(t);
  }, [auto]);

  return (
    <Reveal id="sync" className="lp-band-sync">
      <div className="lp-sync">
        <div className="lp-sync-copy">
          <p className="lp-sec-kicker">04 · One write · every screen</p>
          <h2 className="lp-sec-title">
            Mark once.
            <br />
            Three screens update.
          </h2>
          <p className="lp-sec-lede">
            Tap <strong>Sold out</strong> on the counter card. Watch the same row land on the
            customer phone and owner desk — no WhatsApp, no second list, no mixing stalls.
          </p>
          <p className="lp-sync-log" key={pulse} aria-live="polite">
            {log}
          </p>
          <div className="lp-sync-meta">
            <span>
              <b>{soldCount}</b> of {items.length} sold out
            </span>
            <button
              type="button"
              className="lp-sync-reset"
              onClick={() => {
                setAuto(false);
                setItems(INITIAL.map((i) => ({ ...i })));
                setLog("Reset · try marking Paneer again");
                setActive("counter");
                setPulse((n) => n + 1);
              }}
            >
              Reset demo
            </button>
          </div>
        </div>

        <div className="lp-sync-board">
          <div className="lp-sync-tabs" role="tablist" aria-label="Screens">
            {SCREENS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active === s.id}
                className={`lp-sync-tab${active === s.id ? " is-on" : ""}`}
                onClick={() => {
                  setAuto(false);
                  setActive(s.id);
                }}
              >
                <span className="lp-sync-tab-label">
                  <span className="lp-sync-tab-label-full">{s.label}</span>
                  <span className="lp-sync-tab-label-short">{s.shortLabel}</span>
                </span>
                <span className="lp-sync-tab-role">{s.role}</span>
              </button>
            ))}
          </div>

          <div className="lp-sync-cards">
            {SCREENS.map((s) => {
              const on = active === s.id;
              const isWriter = s.id === "counter";
              return (
                <article
                  key={s.id}
                  className={`lp-sync-card lp-sync-card--${s.id}${on ? " is-active" : ""}${
                    pulse ? " is-pulse" : ""
                  }`}
                  data-pulse={pulse}
                  onClick={() => {
                    setAuto(false);
                    setActive(s.id);
                  }}
                  role="tabpanel"
                >
                  <header className="lp-sync-card-head">
                    <div>
                      <span className="lp-sync-card-title">{s.label}</span>
                      <span className="lp-sync-card-sub">{s.hint}</span>
                    </div>
                    <span className={`lp-sync-pill${isWriter ? " is-write" : " is-read"}`}>
                      {isWriter ? "WRITE" : "READ"}
                    </span>
                  </header>

                  <ul className="lp-sync-list">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className={`lp-sync-row${item.soldOut ? " is-sold" : ""}`}
                      >
                        <span className="lp-sync-item">{item.name}</span>
                        {isWriter ? (
                          <button
                            type="button"
                            className={`lp-sync-toggle${item.soldOut ? " is-on" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAuto(false);
                              markSold(item.id);
                            }}
                          >
                            {item.soldOut ? "Sold out · undo" : "Mark sold out"}
                          </button>
                        ) : (
                          <span className={`lp-sync-status${item.soldOut ? " is-on" : ""}`}>
                            {item.soldOut ? "Sold out" : "Available"}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>

                  {s.id === "admin" && (
                    <p className="lp-sync-admin-note">
                      Same stall channel · never the cart next door
                    </p>
                  )}
                  {s.id === "customer" && (
                    <p className="lp-sync-admin-note">
                      Board updates live · no refresh hunt
                    </p>
                  )}
                  {s.id === "counter" && (
                    <p className="lp-sync-admin-note">
                      You write here once · others only read
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
