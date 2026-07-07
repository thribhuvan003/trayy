"use client";

import React from "react";
import Link from "next/link";
import { getCanteen, listCanteens, type TicketStatus } from "@/app/demo/_lib/data";
import {
  INBOX_KEY,
  STORAGE_CANTEEN,
  fmtClock,
  getSelectedCanteenId,
  getSpecials,
  readInbox,
  setSelectedCanteenId,
  setSpecials,
  subscribeStorage,
} from "@/app/demo/_lib/store";
import { adminFontVars } from "@/app/demo/_lib/fonts";
import "./admin.css";

const MONO = "var(--font-courier), monospace";
const SERIF = "var(--font-alegreya), serif";

type ViewId = "overview" | "menu" | "people" | "audit";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "menu", label: "MENU & PRICING" },
  { id: "people", label: "PEOPLE" },
  { id: "audit", label: "AUDIT LOG" },
];

const STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  incoming: { label: "NEW", color: "#232019" },
  preparing: { label: "PREPARING", color: "#2C50B0" },
  ready: { label: "READY", color: "#1E5A3C" },
  collected: { label: "COLLECTED", color: "rgba(35,32,25,.45)" },
};

const TYPE_COLORS: Record<string, string> = {
  ORDER: "#232019",
  MENU: "#1E5A3C",
  PRICE: "#1E5A3C",
  PAY: "#2C50B0",
  PREP: "#B03A2A",
};

const STAFF = [
  { name: "Canteen owner", role: "Owner login · menus, prices, staff, payouts", scope: "THIS CANTEEN", scopeColor: "#1E5A3C" },
  { name: "Kitchen counter 1", role: "Queue board · tickets and OTP handover only", scope: "QUEUE ONLY", scopeColor: "#2C50B0" },
  { name: "Kitchen counter 2", role: "Queue board · tickets and OTP handover only", scope: "QUEUE ONLY", scopeColor: "#2C50B0" },
  { name: "Campus office", role: "Read-only · cross-canteen revenue and audit", scope: "WHOLE CAMPUS", scopeColor: "#B03A2A" },
];

function fmtMoney(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function DietSquare({ color }: { color: string }) {
  return (
    <span style={{ width: 11, height: 11, border: `1.5px solid ${color}`, borderRadius: 2, display: "grid", placeItems: "center", flexShrink: 0 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
    </span>
  );
}

function SectionHead({ title, note }: { title: string; note: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 700, fontSize: 22 }}>{title}</h2>
      <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".12em", color: "rgba(35,32,25,.5)" }}>{note}</span>
    </div>
  );
}

interface AuditEntry {
  t: string;
  type: string;
  who: string;
  msg: string;
}

export function AdminDemo() {
  const [ready, setReady] = React.useState(false);
  const [canteenId, setCanteenId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<ViewId>("overview");
  const [menuState, setMenuState] = React.useState<Record<string, boolean>>({});
  const [priceDrafts, setPriceDrafts] = React.useState<Record<string, string>>({});
  const [savedPrices, setSavedPrices] = React.useState<Record<string, number>>({});
  const [editing, setEditing] = React.useState<Record<string, boolean>>({});
  const [localAudit, setLocalAudit] = React.useState<AuditEntry[]>([]);
  const [nowTs, setNowTs] = React.useState(() => Date.now());
  const [, forceRender] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    setCanteenId(getSelectedCanteenId());
    setReady(true);
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    const unsub = subscribeStorage([INBOX_KEY, STORAGE_CANTEEN, "tray_specials_"], () => {
      setCanteenId(getSelectedCanteenId());
      forceRender();
    });
    return () => {
      clearInterval(t);
      unsub();
    };
  }, []);

  const c = getCanteen(canteenId);
  const k = c.kpis;

  const logAction = (type: string, msg: string) => {
    setLocalAudit((s) => [{ t: fmtClock(Date.now()), type, who: "admin (you)", msg }, ...s].slice(0, 12));
  };

  // ---- orders (static + live inbox) ----
  const inbox = ready
    ? readInbox()
        .filter((x) => x && x.canteenId === c.id)
        .map((x) => ({
          id: x.id,
          student: `${x.student || "Student"} · live from student demo`,
          items: (x.items || []).map((it) => `${it.name} × ${it.q || 1}`).join(", "),
          total: x.total || 0,
          status: (x.status || "incoming") as TicketStatus,
          time: fmtClock(x.placedAt || Date.now()),
        }))
    : [];
  const allOrders = [...inbox.slice().reverse(), ...c.orders.map((o) => ({ ...o, student: o.student }))];
  const collectedTotal = allOrders.filter((o) => o.status === "collected").reduce((a, o) => a + (o.total || 0), 0);

  // ---- specials ----
  const storedSpecials = ready ? getSpecials(c.id) : [];
  const specials = storedSpecials.length ? storedSpecials : c.defaultSpecials;

  // ---- audit ----
  const auditRows: AuditEntry[] = [
    ...localAudit,
    ...c.audit.map((a) => ({ t: a.t, type: a.type.toUpperCase(), who: a.who, msg: a.msg })),
  ];

  // ---- campus rollup ----
  const campus = listCanteens().reduce(
    (a, x) => {
      const kk = getCanteen(x.id).kpis;
      a.rev += kk.revenue;
      a.ord += kk.orders;
      a.n += 1;
      return a;
    },
    { rev: 0, ord: 0, n: 0 }
  );

  const today = new Date(nowTs).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  const thStyle: React.CSSProperties = { fontFamily: MONO, fontSize: 10, letterSpacing: ".14em", color: "rgba(35,32,25,.55)" };

  return (
    <div className={`ad ${adminFontVars}`}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* ruled lines */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, rgba(30,90,60,.08) 31px, rgba(30,90,60,.08) 32px)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Demo strip */}
          <div
            className="ad-strip"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              padding: "9px 56px",
              borderBottom: "1px solid rgba(35,32,25,.3)",
              fontFamily: MONO,
              fontSize: 10.5,
              letterSpacing: ".1em",
              color: "rgba(35,32,25,.5)",
            }}
          >
            <span style={{ whiteSpace: "nowrap" }}>LIVE DEMO · STUDENT ORDERS POST INTO THIS BOOK</span>
            <span style={{ display: "flex", gap: 24 }}>
              <Link href="/" className="ad-strip-link">← LANDING</Link>
              <Link href="/demo/student" className="ad-strip-link--green">STUDENT →</Link>
              <Link href="/demo/kitchen" className="ad-strip-link--green">KITCHEN →</Link>
            </span>
          </div>

          {/* Book header */}
          <header className="ad-head">
            <div>
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 30, lineHeight: 1, color: "#1E5A3C" }}>Tray — Daily Cash Book</div>
              <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".16em", color: "rgba(35,32,25,.5)", marginTop: 8 }}>
                CANTEEN ACCOUNTS · SETTLED DIRECT TO MERCHANT VPA · COMMISSION NIL
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {listCanteens().map((x) => {
                const active = x.id === c.id;
                return (
                  <button
                    key={x.id}
                    type="button"
                    onClick={() => {
                      setSelectedCanteenId(x.id);
                      setCanteenId(x.id);
                      setMenuState({});
                      setPriceDrafts({});
                      setSavedPrices({});
                      setEditing({});
                      setLocalAudit([]);
                    }}
                    style={{
                      padding: "8px 15px",
                      border: `1.5px solid ${active ? "#1E5A3C" : "rgba(35,32,25,.4)"}`,
                      borderRadius: 3,
                      background: active ? "#1E5A3C" : "transparent",
                      color: active ? "#F5F1E4" : "rgba(35,32,25,.75)",
                      cursor: "pointer",
                      fontSize: 13.5,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      fontFamily: "var(--font-familjen), sans-serif",
                    }}
                  >
                    {x.name}
                  </button>
                );
              })}
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".1em", color: "rgba(35,32,25,.55)", whiteSpace: "nowrap" }}>
                FOLIO NO. {ready ? c.counterBase : ""}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, marginTop: 4, whiteSpace: "nowrap" }}>
                {ready ? `${today} · ${fmtClock(nowTs)}` : ""}
              </div>
            </div>
          </header>

          {/* Book tabs */}
          <nav className="ad-tabsbar">
            {VIEWS.map((v) => {
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  style={{
                    padding: "12px 20px 10px",
                    border: "none",
                    borderBottom: `3px solid ${active ? "#1E5A3C" : "transparent"}`,
                    background: "none",
                    color: active ? "#1E5A3C" : "rgba(35,32,25,.55)",
                    cursor: "pointer",
                    fontFamily: MONO,
                    fontSize: 11.5,
                    fontWeight: 600,
                    letterSpacing: ".12em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {v.label}
                </button>
              );
            })}
            <span
              style={{
                marginLeft: "auto",
                alignSelf: "center",
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: ".12em",
                color: "rgba(35,32,25,.4)",
                whiteSpace: "nowrap",
              }}
            >
              SCOPE: {ready ? `${c.name.toUpperCase()} ONLY` : "LOADING"}
            </span>
          </nav>

          {/* ============ OVERVIEW ============ */}
          {view === "overview" && (
            <div style={{ animation: "adRowIn .3s ease both" }}>
              {/* Campus rollup */}
              <div className="ad-rollup">
                <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: ".14em", color: "#1E5A3C", whiteSpace: "nowrap" }}>
                  WHOLE CAMPUS · {campus.n} CANTEENS · ONE SIGN-IN
                </span>
                <span style={{ flex: 1, borderTop: "1px dotted rgba(30,90,60,.45)" }} />
                <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>
                  ₹{fmtMoney(campus.rev)}{" "}
                  <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".1em", color: "rgba(35,32,25,.55)" }}>TODAY</span>
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {campus.ord} <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".1em", color: "rgba(35,32,25,.55)" }}>ORDERS</span>
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#B03A2A", whiteSpace: "nowrap" }}>
                  0% <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".1em", color: "rgba(35,32,25,.55)" }}>COMMISSION</span>
                </span>
              </div>

              {/* KPI cells */}
              <div className="ad-kpis">
                {[
                  { label: "RECEIPTS TODAY", value: `₹${fmtMoney(k.revenue)}`, delta: k.revenueDelta, valueColor: "#1E5A3C", deltaColor: "#1E5A3C", pad: "18px 24px 16px 56px" },
                  { label: "ORDERS ENTERED", value: String(k.orders), delta: k.ordersDelta, deltaColor: "#1E5A3C", pad: "18px 24px 16px" },
                  { label: "AVERAGE TICKET", value: `₹${k.avgTicket}`, delta: k.avgTicketDelta, deltaColor: "#1E5A3C", pad: "18px 24px 16px" },
                  {
                    label: "AVG PAY → PICKUP",
                    value: `${k.avgPickupMin}:${String(k.avgPickupSec).padStart(2, "0")}`,
                    delta: k.avgPickupDelta,
                    deltaColor: "rgba(35,32,25,.55)",
                    pad: "18px 56px 16px 24px",
                    last: true,
                  },
                ].map((cell) => (
                  <div key={cell.label} style={{ padding: cell.pad, borderRight: cell.last ? undefined : "1px solid rgba(35,32,25,.22)" }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".16em", color: "rgba(35,32,25,.5)", marginBottom: 6 }}>{cell.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 38, color: cell.valueColor }}>{cell.value}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: cell.deltaColor, whiteSpace: "nowrap" }}>{cell.delta}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ad-overview-grid">
                {/* Ledger table */}
                <section style={{ padding: "24px 34px 46px 56px", borderRight: "1px solid rgba(35,32,25,.22)" }}>
                  <SectionHead title="Order entries — live" note="NEWEST FIRST" />
                  <div
                    className="ad-ledger-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "84px minmax(0, 1fr) 100px 100px 60px",
                      gap: 12,
                      padding: "8px 0",
                      borderTop: "2px solid #1E5A3C",
                      borderBottom: "1.5px solid rgba(35,32,25,.5)",
                      ...thStyle,
                    }}
                  >
                    <span>NO.</span>
                    <span>PARTICULARS</span>
                    <span>STATUS</span>
                    <span style={{ textAlign: "right" }}>CREDIT ₹</span>
                    <span style={{ textAlign: "right" }}>TIME</span>
                  </div>
                  {allOrders.map((o, i) => {
                    const m = STATUS_META[o.status] || STATUS_META.incoming;
                    return (
                      <div
                        key={`${o.id}-${i}`}
                        className="ad-ledger-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "84px minmax(0, 1fr) 100px 100px 60px",
                          gap: 12,
                          alignItems: "baseline",
                          padding: "9px 0",
                          borderBottom: "1px solid rgba(35,32,25,.18)",
                        }}
                      >
                        <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 600 }}>{o.id}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {o.items}
                          </span>
                          <span style={{ display: "block", fontSize: 12, color: "rgba(35,32,25,.5)", whiteSpace: "nowrap" }}>{o.student}</span>
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: ".06em", color: m.color, whiteSpace: "nowrap" }}>
                          {m.label}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 13.5, fontWeight: 600, textAlign: "right" }}>{fmtMoney(o.total)}</span>
                        <span style={{ fontFamily: MONO, fontSize: 11.5, color: "rgba(35,32,25,.5)", textAlign: "right" }}>{o.time}</span>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "12px 0 0", borderTop: "2px solid #1E5A3C" }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".14em", color: "rgba(35,32,25,.6)", fontWeight: 600 }}>
                      CARRIED FORWARD — COLLECTED ONLY
                    </span>
                    <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 20, color: "#1E5A3C" }}>₹{fmtMoney(collectedTotal)}</span>
                  </div>
                </section>

                {/* Most ordered */}
                <section style={{ padding: "24px 56px 40px 34px" }}>
                  <h2 style={{ margin: "0 0 14px", fontFamily: SERIF, fontWeight: 700, fontSize: 22 }}>Most ordered today</h2>
                  {c.topItems.map((t) => {
                    const dietColor = t.diet === "nv" ? "#B03A2A" : "#1E5A3C";
                    return (
                      <div key={t.name} style={{ padding: "8px 0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 5 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14, minWidth: 0 }}>
                            <DietSquare color={dietColor} />
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "rgba(35,32,25,.6)", whiteSpace: "nowrap" }}>
                            {t.orders} plates
                          </span>
                        </div>
                        <div style={{ height: 7, border: "1px solid rgba(30,90,60,.5)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${t.pct}%`, background: "repeating-linear-gradient(-45deg, #1E5A3C 0 4px, #2C7A52 4px 8px)" }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 22, border: "1.5px dashed rgba(30,90,60,.45)", borderRadius: 4, padding: "14px 16px" }}>
                    <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".14em", color: "#1E5A3C", marginBottom: 6 }}>SETTLEMENT NOTE</div>
                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "rgba(35,32,25,.7)" }}>
                      Every rupee above settled straight to <b style={{ fontFamily: MONO, fontWeight: 600 }}>{c.upi}</b>. Tray holds no float and
                      takes no cut.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* ============ MENU & PRICING ============ */}
          {view === "menu" && (
            <div className="ad-menu-grid">
              <section style={{ padding: "24px 34px 46px 56px", borderRight: "1px solid rgba(35,32,25,.22)" }}>
                <SectionHead title="Menu register" note="ONE TOGGLE → EVERY SCREEN" />
                <div
                  className="ad-menu-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 130px 120px 90px",
                    gap: 12,
                    padding: "8px 0",
                    borderTop: "2px solid #1E5A3C",
                    borderBottom: "1.5px solid rgba(35,32,25,.5)",
                    ...thStyle,
                  }}
                >
                  <span>ITEM</span>
                  <span style={{ textAlign: "right" }}>PRICE ₹</span>
                  <span style={{ textAlign: "center" }}>ON MENU</span>
                  <span style={{ textAlign: "right" }}>EDIT</span>
                </div>
                {c.menuModal.map((m, i) => {
                  const key = `${c.id}-${i}`;
                  const live = menuState[key] != null ? menuState[key] : m.live;
                  const price = savedPrices[key] != null ? savedPrices[key] : m.price;
                  const isEditing = !!editing[key];
                  return (
                    <div
                      key={key}
                      className="ad-menu-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) 130px 120px 90px",
                        gap: 12,
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid rgba(35,32,25,.18)",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 14.5,
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: live ? "#232019" : "rgba(35,32,25,.45)",
                          textDecoration: live ? "none" : "line-through",
                        }}
                      >
                        {m.name}
                      </span>
                      {isEditing ? (
                        <input
                          value={priceDrafts[key] != null ? priceDrafts[key] : String(price)}
                          onChange={(e) => setPriceDrafts((s) => ({ ...s, [key]: e.target.value.replace(/[^0-9]/g, "") }))}
                          inputMode="numeric"
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: "5px 8px",
                            border: "1.5px solid #1E5A3C",
                            borderRadius: 3,
                            background: "#FFFDF2",
                            outline: "none",
                            fontFamily: MONO,
                            fontSize: 13.5,
                            fontWeight: 600,
                            textAlign: "right",
                            color: "#232019",
                          }}
                        />
                      ) : (
                        <span style={{ fontFamily: MONO, fontSize: 13.5, fontWeight: 600, textAlign: "right" }}>{fmtMoney(price)}</span>
                      )}
                      <span style={{ display: "flex", justifyContent: "center" }}>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !live;
                            setMenuState((s) => ({ ...s, [key]: next }));
                            logAction("MENU", `${next ? "put " : "marked "}${m.name}${next ? " back on the menu" : " sold out"}`);
                          }}
                          style={{
                            width: 86,
                            padding: "4px 0",
                            border: `1.5px solid ${live ? "#1E5A3C" : "#B03A2A"}`,
                            borderRadius: 999,
                            background: live ? "rgba(30,90,60,.1)" : "rgba(176,58,42,.08)",
                            color: live ? "#1E5A3C" : "#B03A2A",
                            fontFamily: MONO,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: ".06em",
                            cursor: "pointer",
                          }}
                        >
                          {live ? "ON MENU" : "SOLD OUT"}
                        </button>
                      </span>
                      <span style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="ad-edit-btn"
                          onClick={() => {
                            if (isEditing) {
                              const v = parseInt(priceDrafts[key] || "", 10);
                              if (v > 0) {
                                setSavedPrices((s) => ({ ...s, [key]: v }));
                                logAction("PRICE", `changed ${m.name} to ₹${v}`);
                              }
                              setEditing((s) => ({ ...s, [key]: false }));
                            } else {
                              setEditing((s) => ({ ...s, [key]: true }));
                              setPriceDrafts((s) => ({ ...s, [key]: String(price) }));
                            }
                          }}
                        >
                          {isEditing ? "Save" : "Edit ₹"}
                        </button>
                      </span>
                    </div>
                  );
                })}
                <p style={{ margin: "14px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", lineHeight: 1.8, color: "rgba(35,32,25,.45)" }}>
                  SOLD-OUT ITEMS DISAPPEAR FROM THE STUDENT MENU INSTANTLY. PRICE EDITS POST TO THE AUDIT LOG.
                </p>
              </section>

              <section style={{ padding: "24px 56px 40px 34px" }}>
                <SectionHead title="Today's specials" note="PUSHED BY THE KITCHEN" />
                {specials.map((s) => {
                  const dietColor = s.diet === "nonveg" ? "#B03A2A" : "#1E5A3C";
                  return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid rgba(35,32,25,.18)" }}>
                      <DietSquare color={dietColor} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 600, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.name}
                        </span>
                        <span style={{ display: "block", fontSize: 12, color: "rgba(35,32,25,.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {s.desc}
                        </span>
                      </span>
                      <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>₹{s.price}</span>
                      <button
                        type="button"
                        className="ad-takeoff-btn"
                        title="Take off the board"
                        onClick={() => {
                          const base = storedSpecials.length ? storedSpecials : specials;
                          setSpecials(c.id, base.filter((x) => x.id !== s.id));
                          logAction("MENU", `took ${s.name} off the specials board`);
                          forceRender();
                        }}
                      >
                        Take off
                      </button>
                    </div>
                  );
                })}
                {specials.length === 0 && (
                  <div
                    style={{
                      border: "1.5px dashed rgba(35,32,25,.3)",
                      borderRadius: 4,
                      padding: "20px 16px",
                      textAlign: "center",
                      fontFamily: MONO,
                      fontSize: 10.5,
                      letterSpacing: ".12em",
                      color: "rgba(35,32,25,.45)",
                      lineHeight: 1.9,
                    }}
                  >
                    NO SPECIALS ON THE BOARD
                    <br />
                    <Link href="/demo/kitchen" style={{ color: "#1E5A3C", textDecoration: "none" }}>
                      PUSH ONE FROM THE KITCHEN →
                    </Link>
                  </div>
                )}
                <div style={{ marginTop: 22, border: "1.5px dashed rgba(30,90,60,.45)", borderRadius: 4, padding: "14px 16px" }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".14em", color: "#1E5A3C", marginBottom: 6 }}>HOW THIS SYNCS</div>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "rgba(35,32,25,.7)" }}>
                    Menu edits are one Postgres write. Supabase Realtime fans the change out to the student menu, the kitchen queue and this
                    book — no refresh anywhere.
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* ============ PEOPLE ============ */}
          {view === "people" && (
            <div className="ad-people-grid">
              <section style={{ padding: "24px 34px 46px 56px", borderRight: "1px solid rgba(35,32,25,.22)" }}>
                <SectionHead title="Staff access" note="SCOPE-SAFE ROLES" />
                {STAFF.map((st) => (
                  <div key={st.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid rgba(35,32,25,.18)" }}>
                    <span
                      style={{
                        width: 34,
                        height: 34,
                        border: "1.5px solid #1E5A3C",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: SERIF,
                        fontWeight: 700,
                        fontSize: 15,
                        color: "#1E5A3C",
                        flexShrink: 0,
                      }}
                    >
                      {st.name.charAt(0).toUpperCase()}
                    </span>
                    <span style={{ minWidth: 0, overflow: "hidden" }}>
                      <span style={{ display: "block", fontWeight: 600, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.name}</span>
                      <span style={{ display: "block", fontSize: 12, color: "rgba(35,32,25,.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.role}</span>
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: MONO,
                        fontSize: 9.5,
                        fontWeight: 600,
                        letterSpacing: ".08em",
                        color: st.scopeColor,
                        border: `1.5px solid ${st.scopeColor}`,
                        borderRadius: 999,
                        padding: "3px 10px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {st.scope}
                    </span>
                  </div>
                ))}
                <p style={{ margin: "14px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", lineHeight: 1.8, color: "rgba(35,32,25,.45)" }}>
                  KITCHEN LOGINS SEE ONLY THEIR OWN QUEUE. ROW-LEVEL SECURITY ENFORCES THE SCOPE ON EVERY QUERY.
                </p>
              </section>
              <section style={{ padding: "24px 56px 40px 34px" }}>
                <SectionHead title="Regulars this month" note="BY SPEND" />
                <div
                  className="ad-people-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 90px 80px 110px 70px",
                    gap: 12,
                    padding: "8px 0",
                    borderTop: "2px solid #1E5A3C",
                    borderBottom: "1.5px solid rgba(35,32,25,.5)",
                    ...thStyle,
                    letterSpacing: ".12em",
                  }}
                >
                  <span>NAME</span>
                  <span>ROLL</span>
                  <span style={{ textAlign: "right" }}>ORDERS</span>
                  <span style={{ textAlign: "right" }}>SPEND ₹</span>
                  <span style={{ textAlign: "right" }}>LAST</span>
                </div>
                {c.studentRows.map((sr) => (
                  <div
                    key={sr.roll}
                    className="ad-people-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) 90px 80px 110px 70px",
                      gap: 12,
                      alignItems: "baseline",
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(35,32,25,.18)",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sr.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: "rgba(35,32,25,.55)", whiteSpace: "nowrap" }}>{sr.roll}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12.5, textAlign: "right" }}>{sr.orders}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 600, textAlign: "right" }}>{fmtMoney(sr.spend)}</span>
                    <span style={{ fontFamily: MONO, fontSize: 11.5, color: "rgba(35,32,25,.5)", textAlign: "right" }}>{sr.last}</span>
                  </div>
                ))}
              </section>
            </div>
          )}

          {/* ============ AUDIT LOG ============ */}
          {view === "audit" && (
            <div className="ad-audit" style={{ padding: "24px 56px 46px", animation: "adRowIn .3s ease both" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 12, maxWidth: 860 }}>
                <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 700, fontSize: 22 }}>Audit log</h2>
                <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".12em", color: "rgba(35,32,25,.5)" }}>EVERY WRITE, SIGNED & TIMED</span>
              </div>
              <div style={{ maxWidth: 860, borderTop: "2px solid #1E5A3C" }}>
                {auditRows.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "90px 90px minmax(0, 1fr)",
                      gap: 16,
                      alignItems: "baseline",
                      padding: "12px 0",
                      borderBottom: "1px solid rgba(35,32,25,.18)",
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 12, color: "rgba(35,32,25,.55)" }}>{a.t}</span>
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 9.5,
                        fontWeight: 600,
                        letterSpacing: ".1em",
                        color: TYPE_COLORS[a.type] || "#232019",
                        border: `1.5px solid ${TYPE_COLORS[a.type] || "#232019"}`,
                        borderRadius: 999,
                        padding: "3px 0",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.type}
                    </span>
                    <span style={{ fontSize: 14.5, color: "rgba(35,32,25,.85)" }}>
                      <b>{a.who}</b> {a.msg}
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ margin: "14px 0 0", fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", lineHeight: 1.8, color: "rgba(35,32,25,.45)", maxWidth: 860 }}>
                ACTIONS YOU TAKE IN THIS DEMO — PRICE EDITS, SOLD-OUT TOGGLES — ARE APPENDED TO THIS LOG LIVE.
              </p>
            </div>
          )}

          <footer
            className="ad-footer"
            style={{ borderTop: "2px solid #1E5A3C", padding: "14px 56px 18px", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}
          >
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".14em", color: "rgba(35,32,25,.45)" }}>
              BOOK BALANCED · ROW-LEVEL SECURITY KEEPS THIS CAMPUS&apos;S PAGES SEALED FROM EVERY OTHER CAMPUS
            </span>
            <span style={{ fontFamily: SERIF, fontSize: 15, color: "rgba(35,32,25,.6)", fontStyle: "italic" }}>— entered by Tray, {ready ? today : ""}</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
