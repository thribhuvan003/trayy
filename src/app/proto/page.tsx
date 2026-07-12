"use client";

// THROWAWAY PROTOTYPE — /proto — cohesive customer-menu redesign for approval.
// Warm cream register (bahi-khata) identity, sunlight-legible, mobile-first.
// Mock data + local cart only. Nothing here is wired to the real app yet.

import { useState } from "react";

const SERIF = "var(--font-rozha), 'Rozha One', Georgia, serif";
const MONO = "var(--font-spline-mono), 'Spline Sans Mono', ui-monospace, monospace";
const BODY = "var(--font-mukta), system-ui, sans-serif";

const PAPER = "#f7f1e3";
const CARD = "#fffdf6";
const INK = "#221f18";
const RED = "#c13a2a";
const BLUE = "#1d3fbf";
const GREEN = "#0c7a3f";

type Item = { id: string; name: string; desc: string; price: number; diet: "veg" | "egg" | "nonveg"; special?: boolean };
type Cat = { name: string; items: Item[] };

const MENU: Cat[] = [
  {
    name: "Today's Special",
    items: [
      { id: "s1", name: "Masala Dosa", desc: "Crisp rice crepe, potato masala, sambar, chutney", price: 70, diet: "veg", special: true },
      { id: "s2", name: "Pani Puri", desc: "Six crisp puris, spiced potato, tangy pudina water", price: 30, diet: "veg", special: true },
    ],
  },
  {
    name: "Mains",
    items: [
      { id: "m1", name: "Veg Fried Rice", desc: "Wok-tossed rice, seasonal veg, house sauce", price: 80, diet: "veg" },
      { id: "m2", name: "Egg Bhurji Pav", desc: "Spiced scrambled egg, buttered pav", price: 60, diet: "egg" },
      { id: "m3", name: "Chicken Roll", desc: "Kathi roll, spiced chicken, onions, mint", price: 90, diet: "nonveg" },
    ],
  },
  {
    name: "Chaat & Snacks",
    items: [
      { id: "c1", name: "Samosa (2 pc)", desc: "Flaky pastry, spiced potato-pea filling, chutney", price: 25, diet: "veg" },
      { id: "c2", name: "Aloo Tikki Chaat", desc: "Griddled potato patty, yoghurt, chutneys, sev", price: 40, diet: "veg" },
    ],
  },
  {
    name: "Drinks",
    items: [
      { id: "d1", name: "Masala Chai", desc: "Cutting chai, ginger-cardamom", price: 15, diet: "veg" },
      { id: "d2", name: "Cold Coffee", desc: "Blended, thick, lightly sweet", price: 50, diet: "veg" },
    ],
  },
];

function DietDot({ diet }: { diet: Item["diet"] }) {
  const c = diet === "veg" ? GREEN : diet === "egg" ? "#d98a00" : RED;
  return (
    <span style={{ width: 16, height: 16, border: `2px solid ${c}`, borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {diet === "nonveg" ? (
        <span style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: `7px solid ${c}` }} />
      ) : (
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />
      )}
    </span>
  );
}

export default function ProtoMenu() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeCat, setActiveCat] = useState("All");
  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) => setCart((c) => { const n = (c[id] ?? 0) - 1; const cp = { ...c }; if (n <= 0) delete cp[id]; else cp[id] = n; return cp; });

  const allItems = MENU.flatMap((c) => c.items);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = Object.entries(cart).reduce((a, [id, q]) => a + (allItems.find((i) => i.id === id)?.price ?? 0) * q, 0);

  const cats = ["All", ...MENU.map((c) => c.name)];
  const shownCats = activeCat === "All" ? MENU : MENU.filter((c) => c.name === activeCat);

  return (
    <div style={{ minHeight: "100dvh", background: PAPER, color: INK, fontFamily: BODY, paddingBottom: count > 0 ? 96 : 24 }}>
      {/* red register margin rule */}
      <div style={{ position: "fixed", top: 0, bottom: 0, left: 26, width: 1.5, background: "rgba(193,58,42,0.5)", pointerEvents: "none", zIndex: 1 }} />

      {/* Masthead */}
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: PAPER, borderBottom: `2px solid ${INK}`, padding: "16px 18px 12px 44px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 27, lineHeight: 1 }}>Guru Meals</div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(34,31,24,0.55)", marginTop: 4 }}>
              MG Road · near PG gate 3
            </div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.08em", color: GREEN, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", paddingTop: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: GREEN }} /> OPEN · ~3 MIN
          </div>
        </div>
        {/* search */}
        <div style={{ marginTop: 12, position: "relative" }}>
          <input
            placeholder="Search the menu…"
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 8, border: `1.5px solid rgba(34,31,24,0.25)`, background: CARD, fontFamily: BODY, fontSize: 15, color: INK, outline: "none" }}
          />
        </div>
        {/* category chips */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 12, paddingBottom: 2, scrollbarWidth: "none" }}>
          {cats.map((c) => {
            const on = activeCat === c;
            return (
              <button key={c} onClick={() => setActiveCat(c)}
                style={{ flexShrink: 0, padding: "7px 15px", borderRadius: 999, fontFamily: BODY, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                  border: on ? `1.5px solid ${INK}` : `1px solid rgba(34,31,24,0.25)`,
                  background: on ? INK : "transparent", color: on ? PAPER : "rgba(34,31,24,0.75)" }}>
                {c}
              </button>
            );
          })}
        </div>
      </header>

      {/* Menu body */}
      <main style={{ padding: "8px 18px 0 44px", position: "relative", zIndex: 2 }}>
        {shownCats.map((cat) => (
          <section key={cat.name} style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontFamily: SERIF, fontSize: 21, fontWeight: 400 }}>{cat.name}</h2>
              {cat.name === "Today's Special" && (
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: RED, border: `1.5px solid ${RED}`, borderRadius: 4, padding: "2px 6px", transform: "rotate(-3deg)" }}>FRESH</span>
              )}
            </div>
            <div>
              {cat.items.map((it, idx) => {
                const q = cart[it.id] ?? 0;
                return (
                  <div key={it.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderTop: idx === 0 ? "none" : "1px dotted rgba(34,31,24,0.28)" }}>
                    <div style={{ paddingTop: 2 }}><DietDot diet={it.diet} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.25 }}>{it.name}</div>
                      <div style={{ fontSize: 12.5, color: "rgba(34,31,24,0.58)", lineHeight: 1.4, marginTop: 2 }}>{it.desc}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      <div style={{ fontFamily: MONO, fontSize: 15.5, fontWeight: 700, color: INK }}>₹{it.price}</div>
                      {q > 0 ? (
                        <div style={{ display: "inline-flex", alignItems: "center", border: `1.5px solid ${INK}`, borderRadius: 999, overflow: "hidden", background: INK, color: PAPER }}>
                          <button onClick={() => dec(it.id)} style={{ width: 34, height: 32, border: "none", background: "transparent", color: PAPER, fontSize: 18, cursor: "pointer" }}>−</button>
                          <span style={{ minWidth: 20, textAlign: "center", fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>{q}</span>
                          <button onClick={() => add(it.id)} style={{ width: 34, height: 32, border: "none", background: "transparent", color: PAPER, fontSize: 18, cursor: "pointer" }}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => add(it.id)}
                          style={{ padding: "7px 18px", borderRadius: 999, border: `1.5px solid ${INK}`, background: "transparent", color: INK, fontFamily: BODY, fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* Sticky pay bar */}
      {count > 0 && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 20, padding: "10px 14px calc(10px + env(safe-area-inset-bottom))", background: "transparent" }}>
          <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 20px", borderRadius: 12, border: `1.5px solid ${INK}`, background: RED, color: "#fff", cursor: "pointer", boxShadow: "0 6px 18px rgba(34,31,24,0.28)" }}>
            <span style={{ fontFamily: BODY, fontWeight: 700, fontSize: 15 }}>{count} item{count > 1 ? "s" : ""} · <span style={{ fontFamily: MONO }}>₹{total}</span></span>
            <span style={{ fontFamily: BODY, fontWeight: 800, fontSize: 15.5 }}>Pay by UPI →</span>
          </button>
        </div>
      )}
    </div>
  );
}
