"use client";

import React from "react";
import Link from "next/link";
import { getCanteen, listCanteens, type Canteen, type TicketDiet } from "@/app/demo/_lib/data";
import {
  STORAGE_CANTEEN,
  fmtClock,
  getSelectedCanteenId,
  getSpecials,
  pushInbox,
  setSelectedCanteenId,
  specialsKey,
  subscribeStorage,
} from "@/app/demo/_lib/store";
import { studentFontVars } from "@/app/demo/_lib/fonts";
import "./student.css";

const MONO = "var(--font-spline-mono), monospace";
const ROZHA = "var(--font-rozha), serif";
const CAVEAT = "var(--font-caveat), cursive";

interface BoardItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  cat: string;
  diet: "veg" | "nv";
  isSpecial: boolean;
}

interface DemoOrder {
  id: string;
  num: number;
  otp: string;
  lines: { name: string; qty: number; price: number; diet: TicketDiet }[];
  total: number;
  placedAt: number;
}

function allBoardItems(c: Canteen): BoardItem[] {
  let specials = getSpecials(c.id);
  if (!specials.length && c.defaultSpecials) specials = c.defaultSpecials;
  const specialItems: BoardItem[] = specials.map((s) => ({
    id: `special-${s.id}`,
    name: s.name,
    desc: s.desc,
    price: s.price,
    cat: "all",
    diet: s.diet === "nonveg" ? "nv" : "veg",
    isSpecial: true,
  }));
  return specialItems.concat(c.menu.map((m) => ({ ...m, isSpecial: false })));
}

export function StudentDemo() {
  const [ready, setReady] = React.useState(false);
  const [canteenId, setCanteenId] = React.useState<string | null>(null);
  const [cart, setCart] = React.useState<Record<string, number>>({});
  const [activeCat, setActiveCat] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [payOpen, setPayOpen] = React.useState(false);
  const [order, setOrder] = React.useState<DemoOrder | null>(null);
  const [nowTs, setNowTs] = React.useState(() => Date.now());
  const [, forceRender] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    setCanteenId(getSelectedCanteenId());
    setReady(true);
    const unsub = subscribeStorage([STORAGE_CANTEEN, "tray_specials_"], () => {
      setCanteenId(getSelectedCanteenId());
      forceRender();
    });
    return unsub;
  }, []);

  const hasOrder = !!order;
  React.useEffect(() => {
    if (!hasOrder) return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hasOrder]);

  const c = getCanteen(canteenId);
  const all = ready ? allBoardItems(c) : [];
  const chalks = ["#E8C860", "#A8D8B0", "#9FC4E8", "#E8A0A8"];
  const tilts = ["-1deg", ".8deg", "-.6deg"];

  const q = search.trim().toLowerCase();
  const visible = all.filter((m) => {
    const catOk = activeCat === "all" || m.cat === activeCat;
    const qOk = !q || m.name.toLowerCase().includes(q) || (m.desc || "").toLowerCase().includes(q);
    return catOk && qOk;
  });

  const cartLines = Object.keys(cart)
    .map((id) => {
      const item = all.find((m) => m.id === id);
      if (!item) return null;
      return { id, name: item.name, qty: cart[id], lineTotal: cart[id] * item.price };
    })
    .filter(Boolean) as { id: string; name: string; qty: number; lineTotal: number }[];
  const cartTotal = cartLines.reduce((a, l) => a + l.lineTotal, 0);
  const cartCount = cartLines.reduce((a, l) => a + l.qty, 0);

  const inc = (id: string) => setCart((s) => ({ ...s, [id]: (s[id] || 0) + 1 }));
  const dec = (id: string) =>
    setCart((s) => {
      const next = { ...s };
      if ((next[id] || 0) <= 1) delete next[id];
      else next[id] -= 1;
      return next;
    });
  const removeLine = (id: string) =>
    setCart((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });

  const confirmPay = () => {
    const lines = Object.keys(cart)
      .map((id) => {
        const item = all.find((m) => m.id === id);
        return item
          ? { name: item.name, qty: cart[id], price: item.price, diet: (item.diet === "nv" ? "nonveg" : "veg") as TicketDiet }
          : null;
      })
      .filter(Boolean) as DemoOrder["lines"];
    if (!lines.length) return;
    const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
    const prefix = c.kitchenTickets[0] ? c.kitchenTickets[0].id.split("-")[0] : "T";
    const num = (c.counterBase || 2400) + 6 + Math.floor(Math.random() * 40);
    const newOrder: DemoOrder = {
      id: `${prefix}-${num}`,
      num,
      otp: String(1000 + Math.floor(Math.random() * 9000)),
      lines,
      total,
      placedAt: Date.now(),
    };
    pushInbox({
      id: newOrder.id,
      student: "You (demo)",
      status: "incoming",
      placedAt: newOrder.placedAt,
      total,
      otp: newOrder.otp,
      canteenId: c.id,
      items: lines.map((l) => ({ name: l.name, diet: l.diet, tgt: 6, q: l.qty })),
    });
    setOrder(newOrder);
    setPayOpen(false);
    setCart({});
  };

  // ---- tracking derived state ----
  const elapsed = order ? (nowTs - order.placedAt) / 1000 : 0;
  const stepDefs = order
    ? [
        { tag: "UPI CONFIRMED", text: `Payment settled to ${c.upi} — no wallet in between.`, at: 0 },
        { tag: "TICKET OPENED", text: "Order landed on the kitchen queue board.", at: 4 },
        { tag: "PREPARING", text: "The kitchen is on it. Prep timer running.", at: 14 },
        { tag: "READY — SHOW OTP", text: "Walk over and show your four-digit code.", at: 38 },
      ]
    : [];
  const phase = elapsed >= 38 ? 3 : elapsed >= 14 ? 2 : elapsed >= 4 ? 1 : 0;
  const statusHeadline = ["Paid. Ticket on its way…", "The kitchen has it.", "On the stove now.", "Ready — go collect it!"][phase];

  return (
    <div className={`sd ${studentFontVars}`}>
      {/* chalk dust */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background:
            "radial-gradient(ellipse 640px 300px at 18% 8%, rgba(242,238,226,.05), transparent 60%), radial-gradient(ellipse 800px 420px at 85% 90%, rgba(242,238,226,.06), transparent 60%), radial-gradient(ellipse 500px 260px at 60% 45%, rgba(242,238,226,.03), transparent 60%)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Demo strip */}
        <div
          className="sd-strip"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
            padding: "9px 28px",
            borderBottom: "1.5px dashed rgba(242,238,226,.3)",
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: ".12em",
            color: "rgba(242,238,226,.55)",
          }}
        >
          <span>LIVE DEMO · STATIC DATA · EVERYTHING STAYS IN YOUR BROWSER</span>
          <span style={{ display: "flex", gap: 24 }}>
            <Link href="/" className="sd-strip-link">← LANDING</Link>
            <Link href="/demo/kitchen" className="sd-strip-link--gold">KITCHEN →</Link>
            <Link href="/demo/admin" className="sd-strip-link--gold">ADMIN →</Link>
          </span>
        </div>

        {/* Board head */}
        <header className="sd-head">
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span style={{ fontFamily: ROZHA, fontSize: 34, lineHeight: 1, color: "#F2EEE2" }}>Tray</span>
              <span style={{ fontFamily: CAVEAT, fontSize: 24, color: "#E8C860", transform: "rotate(-2deg)", display: "inline-block" }}>
                today&apos;s board
              </span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".2em", color: "rgba(242,238,226,.5)", marginTop: 6 }}>
              STUDENT VIEW · ORDER OFF THE BOARD, SKIP THE LINE
            </div>
          </div>
          <div className="sd-tabs" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            {listCanteens().map((x, i) => {
              const active = x.id === c.id;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => {
                    setSelectedCanteenId(x.id);
                    setCanteenId(x.id);
                    setCart({});
                    setActiveCat("all");
                    setSearch("");
                    setOrder(null);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 1,
                    padding: "9px 16px 7px",
                    border: `1.5px solid ${active ? "#F2EEE2" : "rgba(242,238,226,.4)"}`,
                    borderRadius: 3,
                    background: active ? "#F2EEE2" : "transparent",
                    color: active ? "#17221C" : "rgba(242,238,226,.8)",
                    cursor: "pointer",
                    fontFamily: "var(--font-mukta), sans-serif",
                    textAlign: "left",
                    transform: `rotate(${tilts[i % tilts.length]})`,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.2, whiteSpace: "nowrap" }}>{x.name}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".12em", opacity: 0.7, whiteSpace: "nowrap" }}>
                    {x.block.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: CAVEAT, fontSize: 22, color: "#A8D8B0", lineHeight: 1 }}>{ready ? c.openLabel.toLowerCase() : ""}</div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(242,238,226,.5)", marginTop: 5 }}>
              {ready ? c.block.toUpperCase() : ""}
            </div>
          </div>
        </header>

        {/* ============ MENU BOARD ============ */}
        {!order && (
          <main className="sd-menu-grid">
            {/* chalk categories */}
            <nav style={{ padding: "30px 18px 40px 36px", display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 0 }}>
              <div style={{ fontFamily: CAVEAT, fontSize: 22, color: "#E8A0A8", marginBottom: 10, transform: "rotate(-2deg)" }}>
                on the board —
              </div>
              {c.categories.map((cat, i) => {
                const active = cat.id === activeCat;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCat(cat.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 0,
                      padding: "9px 12px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-mukta), sans-serif",
                      borderLeft: `3px solid ${active ? chalks[i % chalks.length] : "transparent"}`,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 16.5,
                        color: active ? chalks[i % chalks.length] : "rgba(242,238,226,.85)",
                        lineHeight: 1.3,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cat.label}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(242,238,226,.42)", whiteSpace: "nowrap" }}>{cat.sub}</span>
                  </button>
                );
              })}
              <div
                className="sd-tip"
                style={{
                  marginTop: 26,
                  padding: "14px 14px 16px",
                  border: "1.5px dashed rgba(232,200,96,.5)",
                  borderRadius: 4,
                  transform: "rotate(-1.2deg)",
                }}
              >
                <div style={{ fontFamily: CAVEAT, fontSize: 20, color: "#E8C860", lineHeight: 1.25 }}>
                  pay first, walk over only when it&apos;s ready!
                </div>
              </div>
            </nav>

            {/* board entries */}
            <section
              style={{
                padding: "30px 36px 70px",
                borderLeft: "1.5px dashed rgba(242,238,226,.25)",
                borderRight: "1.5px dashed rgba(242,238,226,.25)",
                minHeight: "72vh",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 20 }}>
                <h1 style={{ margin: 0, fontFamily: ROZHA, fontWeight: 400, fontSize: 40, lineHeight: 1.08, color: "#F2EEE2" }}>
                  {ready ? c.name : "Chalking the board…"}
                </h1>
                <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(242,238,226,.45)" }}>
                  {ready ? `CHALKED ${fmtClock(Date.now() - 42 * 60 * 1000).toUpperCase()}` : ""}
                </span>
              </div>
              <div
                aria-hidden
                style={{ width: 210, height: 3, background: "rgba(232,200,96,.8)", borderRadius: 2, margin: "10px 0 4px", transform: "rotate(-.6deg)" }}
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search the board…"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  margin: "16px 0 6px",
                  padding: "9px 2px",
                  border: "none",
                  borderBottom: "1.5px dashed rgba(242,238,226,.4)",
                  background: "transparent",
                  outline: "none",
                  fontFamily: CAVEAT,
                  fontSize: 21,
                  color: "#F2EEE2",
                  caretColor: "#E8C860",
                }}
              />

              {all.some((m) => m.isSpecial) && (
                <div style={{ margin: "20px 0 2px", display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontFamily: CAVEAT, fontSize: 23, color: "#E8A0A8", transform: "rotate(-1.5deg)" }}>fresh today ↓</span>
                  <span style={{ flex: 1, borderTop: "1.5px dashed rgba(232,160,168,.4)" }} />
                </div>
              )}

              {visible.map((m) => {
                const qty = cart[m.id] || 0;
                const dietColor = m.diet === "nv" ? "#E8A0A8" : "#A8D8B0";
                return (
                  <div key={m.id} className="sd-item-row">
                    <span
                      title={m.diet === "nv" ? "Non-veg" : "Veg"}
                      style={{ width: 14, height: 14, border: `1.5px solid ${dietColor}`, borderRadius: 2, display: "grid", placeItems: "center" }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dietColor }} />
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 18, color: "#F2EEE2" }}>{m.name}</span>
                        {m.isSpecial && (
                          <span style={{ fontFamily: CAVEAT, fontSize: 18, color: "#E8A0A8", transform: "rotate(-2deg)", display: "inline-block" }}>
                            chef&apos;s!
                          </span>
                        )}
                      </span>
                      <span style={{ display: "block", fontSize: 13.5, color: "rgba(242,238,226,.5)", lineHeight: 1.4 }}>{m.desc}</span>
                    </span>
                    <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 16, textAlign: "right", color: "#E8C860" }}>₹{m.price}</span>
                    <span style={{ display: "flex", justifyContent: "flex-end" }}>
                      {qty > 0 ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                            border: "1.5px solid rgba(242,238,226,.7)",
                            borderRadius: 999,
                            overflow: "hidden",
                          }}
                        >
                          <button type="button" className="sd-qty-btn" onClick={() => dec(m.id)}>−</button>
                          <span style={{ minWidth: 24, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 14, color: "#E8C860" }}>
                            {qty}
                          </span>
                          <button type="button" className="sd-qty-btn" onClick={() => inc(m.id)}>+</button>
                        </span>
                      ) : (
                        <button type="button" className="sd-add-btn" onClick={() => inc(m.id)}>
                          + add
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}

              {ready && visible.length === 0 && (
                <div style={{ padding: "54px 0", textAlign: "center", fontFamily: CAVEAT, fontSize: 26, color: "rgba(242,238,226,.45)", transform: "rotate(-1deg)" }}>
                  nothing chalked under that name…
                </div>
              )}
            </section>

            {/* slate (cart) */}
            <aside style={{ padding: "30px 32px 40px 26px", position: "sticky", top: 0 }}>
              <div
                style={{
                  background: "#10160F",
                  border: "2px solid rgba(242,238,226,.8)",
                  borderRadius: 5,
                  boxShadow: "inset 0 0 40px rgba(0,0,0,.5), 6px 7px 0 rgba(0,0,0,.35)",
                  transform: "rotate(.8deg)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "15px 20px 11px",
                    borderBottom: "1.5px dashed rgba(242,238,226,.35)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontFamily: CAVEAT, fontSize: 26, color: "#F2EEE2" }}>your slate</span>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".12em", color: "#E8C860" }}>
                    {cartCount} ITEM{cartCount === 1 ? "" : "S"}
                  </span>
                </div>
                {cartCount > 0 ? (
                  <>
                    <div style={{ padding: "12px 20px 4px", display: "flex", flexDirection: "column" }}>
                      {cartLines.map((line) => (
                        <div
                          key={line.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            gap: 12,
                            borderBottom: "1px dotted rgba(242,238,226,.25)",
                            padding: "8px 0",
                          }}
                        >
                          <span style={{ fontWeight: 500, fontSize: 15, color: "#F2EEE2", minWidth: 0 }}>
                            {line.name} × {line.qty}
                          </span>
                          <span style={{ display: "flex", alignItems: "baseline", gap: 10, flexShrink: 0 }}>
                            <span style={{ fontFamily: MONO, fontSize: 14, color: "#E8C860" }}>₹{line.lineTotal}</span>
                            <button type="button" className="sd-remove-btn" title="Wipe off" onClick={() => removeLine(line.id)}>
                              ✕
                            </button>
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "12px 20px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                        <span style={{ fontFamily: CAVEAT, fontSize: 21, color: "rgba(242,238,226,.75)" }}>total —</span>
                        <span style={{ fontFamily: ROZHA, fontSize: 27, color: "#E8C860" }}>₹{cartTotal}</span>
                      </div>
                      <div aria-hidden style={{ height: 2, background: "rgba(232,200,96,.7)", borderRadius: 2, marginBottom: 3, transform: "rotate(-.5deg)" }} />
                      <div aria-hidden style={{ height: 2, background: "rgba(232,200,96,.5)", borderRadius: 2, marginBottom: 16, transform: "rotate(.4deg)", width: "92%" }} />
                      <button type="button" className="sd-pay-btn" onClick={() => setPayOpen(true)}>
                        Pay ₹{cartTotal} by UPI →
                      </button>
                      <p
                        style={{
                          margin: "12px 0 0",
                          fontFamily: MONO,
                          fontSize: 9.5,
                          letterSpacing: ".1em",
                          lineHeight: 1.8,
                          color: "rgba(242,238,226,.4)",
                          textAlign: "center",
                        }}
                      >
                        GOES STRAIGHT TO {c.upi.toUpperCase()}
                        <br />
                        TRAY TAKES 0%
                      </p>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "40px 24px 44px", textAlign: "center" }}>
                    <div style={{ fontFamily: CAVEAT, fontSize: 24, color: "rgba(242,238,226,.55)", lineHeight: 1.35, transform: "rotate(-1.5deg)" }}>
                      slate&apos;s clean —
                      <br />
                      chalk something up!
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </main>
        )}

        {/* ============ TRACKING ============ */}
        {order && (
          <main className="sd-track-grid">
            {/* paper token pinned to the board */}
            <div style={{ position: "relative" }}>
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: -13,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 30%, #E86A5A, #B33A2C 70%)",
                  boxShadow: "0 3px 6px rgba(0,0,0,.5)",
                  zIndex: 3,
                }}
              />
              <div
                style={{
                  background: "#FBF7EA",
                  color: "#221F18",
                  borderRadius: 4,
                  transform: "rotate(-1.4deg)",
                  boxShadow: "0 18px 40px -12px rgba(0,0,0,.6)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "20px 24px 16px",
                    borderBottom: "1.5px solid rgba(34,31,24,.8)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(34,31,24,.55)", whiteSpace: "nowrap" }}>
                      {c.name.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: ROZHA, fontSize: 22, marginTop: 2 }}>Meal Token</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", color: "rgba(34,31,24,.55)", whiteSpace: "nowrap" }}>
                      TOKEN NO.
                    </div>
                    <div style={{ fontFamily: ROZHA, fontSize: 30, color: "#1D3FBF", lineHeight: 1 }}>{order.num}</div>
                  </div>
                </div>
                <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {order.lines.map((line) => (
                    <div
                      key={line.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        borderBottom: "1px dotted rgba(34,31,24,.4)",
                        paddingBottom: 8,
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 16 }}>
                        {line.name} × {line.qty}
                      </span>
                      <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 15 }}>₹{line.qty * line.price}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 11,
                        letterSpacing: ".08em",
                        color: "rgba(34,31,24,.6)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                      }}
                    >
                      UPI · {c.upi}
                    </span>
                    <span style={{ fontFamily: ROZHA, fontSize: 22, flexShrink: 0, marginLeft: 12 }}>₹{order.total}</span>
                  </div>
                </div>
                <div style={{ position: "relative", height: 0, borderTop: "2px dashed rgba(34,31,24,.5)", margin: "4px 0" }}>
                  <span aria-hidden style={{ position: "absolute", left: -10, top: -9, width: 18, height: 18, borderRadius: "50%", background: "#17221C" }} />
                  <span aria-hidden style={{ position: "absolute", right: -10, top: -9, width: 18, height: 18, borderRadius: "50%", background: "#17221C" }} />
                </div>
                <div style={{ padding: "16px 24px 20px", background: "rgba(29,63,191,.06)" }}>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(34,31,24,.55)", marginBottom: 8 }}>
                    SHOW AT COUNTER
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {order.otp.split("").map((ch, i) => (
                      <span
                        key={i}
                        style={{
                          width: 44,
                          height: 52,
                          display: "grid",
                          placeItems: "center",
                          border: "1.5px solid rgba(34,31,24,.85)",
                          borderRadius: 5,
                          background: "#FFFDF6",
                          fontFamily: MONO,
                          fontWeight: 700,
                          fontSize: 25,
                          color: "#1D3FBF",
                        }}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 92,
                  right: -20,
                  padding: "8px 18px",
                  border: "3px double #C13A2A",
                  borderRadius: 8,
                  color: "#C13A2A",
                  background: "rgba(251,247,234,.6)",
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 22,
                  letterSpacing: ".22em",
                  opacity: 0.92,
                  animation: "sdStampIn .5s cubic-bezier(.34,1.4,.64,1) .3s both",
                  zIndex: 2,
                }}
              >
                PAID
              </div>
            </div>

            {/* chalk checklist */}
            <div>
              <div style={{ fontFamily: CAVEAT, fontSize: 26, color: "#E8A0A8", transform: "rotate(-1deg)", display: "inline-block", marginBottom: 10 }}>
                order {order.id} — on the board
              </div>
              <h2 style={{ margin: "0 0 34px", fontFamily: ROZHA, fontWeight: 400, fontSize: 46, lineHeight: 1.08, color: "#F2EEE2" }}>
                {statusHeadline}
              </h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {stepDefs.map((d) => {
                  const done = elapsed >= d.at;
                  const isCurrent = done && !stepDefs.some((n) => n.at > d.at && elapsed >= n.at);
                  return (
                    <div
                      key={d.tag}
                      className="sd-srow"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "40px 150px minmax(0, 1fr) 100px",
                        gap: 16,
                        alignItems: "baseline",
                        padding: "16px 0",
                        borderBottom: "1px dotted rgba(242,238,226,.22)",
                        opacity: done ? 1 : 0.45,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: CAVEAT,
                          fontSize: 26,
                          color: done ? "#A8D8B0" : "rgba(242,238,226,.3)",
                          animation: isCurrent ? "sdDustPulse 1.6s ease infinite" : "none",
                        }}
                      >
                        {done ? "✓" : "—"}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".14em", color: done ? "#E8C860" : "rgba(242,238,226,.35)", fontWeight: 600 }}>
                        {d.tag}
                      </span>
                      <span style={{ fontSize: 16.5, fontWeight: 500, color: "rgba(242,238,226,.85)" }}>{d.text}</span>
                      <span style={{ fontFamily: MONO, fontSize: 12, color: "rgba(242,238,226,.45)", textAlign: "right" }}>
                        {done ? fmtClock(order.placedAt + d.at * 1000) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 26, alignItems: "center", marginTop: 34, flexWrap: "wrap" }}>
                <button type="button" className="sd-back-btn" onClick={() => setOrder(null)}>
                  ← Back to the board
                </button>
                <Link href="/demo/kitchen" className="sd-kitchen-link">
                  see it land in the kitchen →
                </Link>
              </div>
            </div>
          </main>
        )}

        {/* ============ UPI RECEIPT MODAL ============ */}
        {payOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(10,14,11,.6)", display: "grid", placeItems: "center" }}>
            <div
              style={{
                width: "min(400px, 92vw)",
                background: "#FBF7EA",
                color: "#221F18",
                borderRadius: 4,
                boxShadow: "0 30px 60px -12px rgba(0,0,0,.7)",
                padding: "28px 30px",
                transform: "rotate(-.6deg)",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(34,31,24,.55)", marginBottom: 6 }}>
                UPI COLLECT REQUEST · DEMO
              </div>
              <div style={{ fontFamily: ROZHA, fontSize: 26, marginBottom: 18 }}>Paying the canteen directly</div>
              <div style={{ border: "1px solid rgba(34,31,24,.3)", borderRadius: 5, background: "#F4EEDD", padding: "14px 16px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".1em", color: "rgba(34,31,24,.55)" }}>TO</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: "#1D3FBF" }}>{c.upi}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".1em", color: "rgba(34,31,24,.55)" }}>AMOUNT</span>
                  <span style={{ fontFamily: ROZHA, fontSize: 26 }}>₹{cartTotal}</span>
                </div>
              </div>
              <button type="button" className="sd-upi-confirm" onClick={confirmPay}>
                Simulate UPI success →
              </button>
              <button type="button" className="sd-upi-cancel" onClick={() => setPayOpen(false)}>
                Cancel
              </button>
              <p
                style={{
                  margin: "14px 0 0",
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: ".08em",
                  lineHeight: 1.7,
                  color: "rgba(34,31,24,.45)",
                  textAlign: "center",
                }}
              >
                IN PRODUCTION THIS IS A RAZORPAY UPI INTENT.
                <br />
                NO PLATFORM WALLET — 0% COMMISSION.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
