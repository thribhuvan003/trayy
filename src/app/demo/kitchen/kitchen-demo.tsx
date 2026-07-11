"use client";

import React from "react";
import Link from "next/link";
import { getCanteen, listCanteens, type Canteen, type TicketDiet, type TicketStatus } from "@/app/demo/_lib/data";
import {
  INBOX_KEY,
  STORAGE_CANTEEN,
  getSelectedCanteenId,
  getSpecials,
  readInbox,
  setSelectedCanteenId,
  setSpecials,
  subscribeStorage,
  updateInboxStatus,
} from "@/app/demo/_lib/store";
import { kitchenFontVars } from "@/app/demo/_lib/fonts";
import "./kitchen.css";

const MONO = "var(--font-plex-mono), monospace";
const BSC = "var(--font-barlow-sc), sans-serif";

interface QueueTicket {
  id: string;
  items: { name: string; diet: TicketDiet; tgt: number; q: number }[];
  total: number;
  otp: string;
  status: TicketStatus;
  placedAt: number;
  target: number;
  student: string;
  fromInbox: boolean;
}

function fmtElapsed(sec: number) {
  sec = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

function fmtClockSec(ts: number) {
  const d = new Date(ts);
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")} ${ampm}`;
}

function buildTickets(c: Canteen, overrides: Record<string, TicketStatus>): QueueTicket[] {
  const nowTs = Date.now();
  const base: QueueTicket[] = c.kitchenTickets.map((t) => ({
    id: t.id,
    items: t.items.map((it) => ({ name: it.name, diet: it.diet || "veg", tgt: it.tgt || 6, q: it.q || 1 })),
    total: t.total,
    otp: t.otp,
    status: t.status,
    placedAt: nowTs - (t.elapsedSec || 90) * 1000,
    target: t.items.reduce((a, it) => Math.max(a, it.tgt || 6), 0) * 60,
    student: t.student,
    fromInbox: false,
  }));
  const inbox: QueueTicket[] = readInbox()
    .filter((x) => x && x.canteenId === c.id)
    .map((x) => ({
      id: x.id,
      items: (x.items || []).map((it) => ({ name: it.name, diet: it.diet || "veg", tgt: it.tgt || 6, q: it.q || 1 })),
      total: x.total || 0,
      otp: x.otp || "0000",
      status: x.status || "incoming",
      placedAt: x.placedAt || nowTs,
      target: (x.items || []).reduce((a, it) => Math.max(a, it.tgt || 6), 6) * 60,
      student: x.student || "Customer",
      fromInbox: true,
    }));
  const seen: Record<string, boolean> = {};
  return inbox
    .concat(base)
    .filter((t) => {
      if (seen[t.id]) return false;
      seen[t.id] = true;
      return true;
    })
    .map((t) => ({ ...t, status: overrides[t.id] || t.status }));
}

function DietSquare({ diet }: { diet: TicketDiet }) {
  const color = diet === "nonveg" ? "#C13A2A" : "#2E7D52";
  return (
    <span
      style={{ width: 12, height: 12, border: `1.5px solid ${color}`, borderRadius: 2, display: "grid", placeItems: "center", flexShrink: 0 }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
    </span>
  );
}

function TicketItems({ t }: { t: QueueTicket }) {
  return (
    <>
      {t.items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15.5, fontWeight: 600 }}>
          <DietSquare diet={it.diet} />
          <span style={{ minWidth: 0 }}>{it.name}</span>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 13, fontWeight: 600, color: "rgba(35,32,26,.6)", whiteSpace: "nowrap" }}>
            × {it.q}
          </span>
        </div>
      ))}
    </>
  );
}

function LaneHead({
  dot,
  label,
  count,
  color,
  border,
}: {
  dot?: string;
  label: string;
  count: number;
  color?: string;
  border?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: `2px solid ${border || "rgba(237,234,224,.25)"}`,
      }}
    >
      {dot && <span style={{ width: 9, height: 9, borderRadius: "50%", background: dot }} />}
      <span style={{ fontFamily: BSC, fontWeight: 800, fontSize: 17, letterSpacing: ".06em", color: color || "#EDEAE0" }}>{label}</span>
      <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 13, fontWeight: 600, color: color || "rgba(237,234,224,.6)" }}>{count}</span>
    </div>
  );
}

export function KitchenDemo() {
  const [ready, setReady] = React.useState(false);
  const [canteenId, setCanteenId] = React.useState<string | null>(null);
  const [overrides, setOverrides] = React.useState<Record<string, TicketStatus>>({});
  const [otpEntries, setOtpEntries] = React.useState<Record<string, string>>({});
  const [otpErrors, setOtpErrors] = React.useState<Record<string, boolean>>({});
  const [specialOpen, setSpecialOpen] = React.useState(false);
  const [spName, setSpName] = React.useState("");
  const [spDesc, setSpDesc] = React.useState("");
  const [spPrice, setSpPrice] = React.useState("120");
  const [spPrep, setSpPrep] = React.useState("6");
  const [spDiet, setSpDiet] = React.useState<TicketDiet>("veg");
  const [pushedToast, setPushedToast] = React.useState(false);
  const [nowTs, setNowTs] = React.useState(() => Date.now());
  const toastT = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRender] = React.useReducer((x: number) => x + 1, 0);

  React.useEffect(() => {
    const id = getSelectedCanteenId();
    const c = getCanteen(id);
    setCanteenId(id);
    setSpName(c.spDefaults.name);
    setSpDesc(c.spDefaults.desc);
    setSpPrice(String(c.spDefaults.price));
    setSpPrep(String(c.spDefaults.prep));
    setSpDiet(c.spDefaults.diet);
    setReady(true);
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    const unsub = subscribeStorage([INBOX_KEY, STORAGE_CANTEEN], () => {
      setCanteenId(getSelectedCanteenId());
      forceRender();
    });
    return () => {
      clearInterval(t);
      unsub();
      if (toastT.current) clearTimeout(toastT.current);
    };
  }, []);

  const c = getCanteen(canteenId);
  const tickets = ready ? buildTickets(c, overrides) : [];

  const setStatus = (t: QueueTicket, next: TicketStatus) => {
    setOverrides((s) => ({ ...s, [t.id]: next }));
    if (t.fromInbox) updateInboxStatus(t.id, next);
  };

  const byOldest = (a: QueueTicket, b: QueueTicket) => a.placedAt - b.placedAt;
  const incoming = tickets.filter((t) => t.status === "incoming").sort(byOldest);
  const preparing = tickets.filter((t) => t.status === "preparing").sort(byOldest);
  const readyLane = tickets.filter((t) => t.status === "ready").sort(byOldest);
  const collected = tickets
    .filter((t) => t.status === "collected")
    .sort((a, b) => b.placedAt - a.placedAt)
    .slice(0, 7);

  const isLate = (t: QueueTicket) => (nowTs - t.placedAt) / 1000 > t.target;
  const lateCount = incoming.concat(preparing).filter(isLate).length;

  const pushSpecialNow = () => {
    const name = spName.trim();
    if (!name) return;
    const existing = getSpecials(c.id);
    setSpecials(
      c.id,
      existing.concat([
        {
          id: `k-${Date.now()}`,
          name,
          desc: spDesc.trim() || "Kitchen special",
          price: Math.max(5, parseInt(spPrice, 10) || 120),
          prep: Math.max(1, parseInt(spPrep, 10) || 6),
          diet: spDiet === "nonveg" ? "nonveg" : "veg",
          icon: name.charAt(0).toUpperCase(),
          addedAt: Date.now(),
        },
      ])
    );
    setSpecialOpen(false);
    setPushedToast(true);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setPushedToast(false), 3200);
  };

  const spDietColor = spDiet === "nonveg" ? "#C13A2A" : "#2E7D52";
  const labelStyle: React.CSSProperties = { fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", color: "rgba(35,32,26,.55)" };
  const inputStyle: React.CSSProperties = {
    padding: "9px 12px",
    border: "1.5px solid rgba(35,32,26,.4)",
    borderRadius: 4,
    background: "#FFFDF4",
    outline: "none",
    fontSize: 15.5,
    fontWeight: 600,
    color: "#23201A",
  };

  return (
    <div className={`kd ${kitchenFontVars}`}>
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Demo strip */}
        <div
          className="kd-strip"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 20,
            padding: "8px 28px",
            borderBottom: "1px solid rgba(237,234,224,.1)",
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: ".1em",
            color: "rgba(237,234,224,.42)",
          }}
        >
          <span>LIVE DEMO · ORDERS PLACED IN THE CUSTOMER DEMO LAND HERE</span>
          <span style={{ display: "flex", gap: 24 }}>
            <Link href="/" className="kd-strip-link">← LANDING</Link>
            <Link href="/demo/student" className="kd-strip-link--green">CUSTOMER →</Link>
            <Link href="/demo/admin" className="kd-strip-link--green">ADMIN →</Link>
          </span>
        </div>

        {/* Header */}
        <header
          className="kd-head"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 28,
            padding: "18px 32px 16px",
            borderBottom: "1px solid rgba(237,234,224,.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <span style={{ fontFamily: BSC, fontWeight: 800, fontSize: 27, letterSpacing: ".02em", lineHeight: 1 }}>
              TRAY <span style={{ color: "#7FB79A" }}>KITCHEN</span>
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", color: "rgba(237,234,224,.45)", whiteSpace: "nowrap" }}>
              {ready ? c.kitchenTag.toUpperCase() : "LOADING…"}
            </span>
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
                    setOverrides({});
                    setOtpEntries({});
                    setOtpErrors({});
                  }}
                  style={{
                    padding: "8px 16px",
                    border: `1px solid ${active ? "#EDEAE0" : "rgba(237,234,224,.3)"}`,
                    borderRadius: 4,
                    background: active ? "#EDEAE0" : "transparent",
                    color: active ? "#15181B" : "rgba(237,234,224,.75)",
                    cursor: "pointer",
                    fontFamily: BSC,
                    fontSize: 14.5,
                    letterSpacing: ".03em",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {x.name}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <button type="button" className="kd-special-btn" onClick={() => setSpecialOpen(true)}>
              + Today&apos;s special
            </button>
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: "rgba(237,234,224,.75)", whiteSpace: "nowrap" }}>
              {ready ? fmtClockSec(nowTs) : ""}
            </span>
          </div>
        </header>

        {/* Service strip */}
        <div className="kd-service-strip">
          {[
            { n: incoming.length + preparing.length, label: "IN QUEUE", color: "#EDEAE0", pad: "14px 28px 14px 0" },
            { n: readyLane.length, label: "READY TO HAND OVER", color: "#7FB79A", pad: "14px 28px" },
            { n: lateCount, label: "PAST TARGET", color: lateCount > 0 ? "#D96A5A" : "rgba(237,234,224,.6)", pad: "14px 28px" },
          ].map((s) => (
            <div
              key={s.label}
              style={{ display: "flex", alignItems: "baseline", gap: 10, padding: s.pad, borderRight: "1px solid rgba(237,234,224,.12)" }}
            >
              <span style={{ fontFamily: BSC, fontWeight: 800, fontSize: 26, color: s.color }}>{s.n}</span>
              <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", color: "rgba(237,234,224,.5)" }}>{s.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, letterSpacing: ".12em", color: "rgba(237,234,224,.4)", whiteSpace: "nowrap" }}>
            EVERY TICKET IS PRE-PAID · OTP CONFIRMS THE HANDOVER
          </div>
        </div>

        {/* Lanes */}
        <main className="kd-lanes">
          {/* NEW ORDERS */}
          <section>
            <LaneHead dot="#C9C4B4" label="NEW ORDERS" count={incoming.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {incoming.map((t) => {
                const late = isLate(t);
                return (
                  <article
                    key={t.id}
                    style={{ background: "#F8F4E8", color: "#23201A", borderRadius: 5, boxShadow: "0 8px 20px -8px rgba(0,0,0,.7)", animation: "kdTicketIn .35s ease both" }}
                  >
                    <div
                      style={{
                        padding: "13px 16px 10px",
                        borderBottom: "1.5px dashed rgba(35,32,26,.3)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontFamily: BSC, fontWeight: 800, fontSize: 21, letterSpacing: ".02em" }}>{t.id}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(35,32,26,.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.student}
                      </span>
                    </div>
                    <div style={{ padding: "10px 16px 6px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <TicketItems t={t} />
                    </div>
                    <div style={{ padding: "6px 16px 13px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: late ? "#C13A2A" : "rgba(35,32,26,.65)", whiteSpace: "nowrap" }}>
                        {fmtElapsed((nowTs - t.placedAt) / 1000)} <span style={{ color: "rgba(35,32,26,.4)", fontWeight: 400 }}>waiting</span>
                      </span>
                      <button type="button" className="kd-start-btn" onClick={() => setStatus(t, "preparing")}>
                        Start prep
                      </button>
                    </div>
                  </article>
                );
              })}
              {ready && incoming.length === 0 && (
                <div
                  style={{
                    border: "1.5px dashed rgba(237,234,224,.2)",
                    borderRadius: 5,
                    padding: "26px 18px",
                    textAlign: "center",
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: ".12em",
                    color: "rgba(237,234,224,.38)",
                    lineHeight: 1.9,
                  }}
                >
                  NO NEW ORDERS
                  <br />
                  <Link href="/demo/student" style={{ color: "#7FB79A", textDecoration: "none" }}>
                    PLACE ONE IN THE CUSTOMER DEMO →
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* PREPARING */}
          <section>
            <LaneHead dot="#5B8DD9" label="PREPARING" count={preparing.length} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {preparing.map((t) => {
                const elapsedSec = (nowTs - t.placedAt) / 1000;
                const late = elapsedSec > t.target;
                return (
                  <article key={t.id} style={{ background: "#F8F4E8", color: "#23201A", borderRadius: 5, boxShadow: "0 8px 20px -8px rgba(0,0,0,.7)" }}>
                    <div
                      style={{
                        padding: "13px 16px 10px",
                        borderBottom: "1.5px dashed rgba(35,32,26,.3)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontFamily: BSC, fontWeight: 800, fontSize: 21, letterSpacing: ".02em" }}>{t.id}</span>
                      <span
                        style={{
                          fontFamily: MONO,
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: ".12em",
                          color: "#2C50B0",
                          border: "1.5px solid #2C50B0",
                          borderRadius: 3,
                          padding: "2px 8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ON THE STOVE
                      </span>
                    </div>
                    <div style={{ padding: "10px 16px 6px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <TicketItems t={t} />
                    </div>
                    <div style={{ margin: "6px 16px 8px", height: 5, borderRadius: 3, background: "rgba(35,32,26,.12)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, (elapsedSec / t.target) * 100).toFixed(1)}%`,
                          background: late ? "#C13A2A" : "#2E7D52",
                          borderRadius: 3,
                          transition: "width 1s linear",
                        }}
                      />
                    </div>
                    <div style={{ padding: "0 16px 13px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: late ? "#C13A2A" : "rgba(35,32,26,.65)", whiteSpace: "nowrap" }}>
                        {fmtElapsed(elapsedSec)} <span style={{ color: "rgba(35,32,26,.4)", fontWeight: 400 }}>/ target {fmtElapsed(t.target)}</span>
                      </span>
                      <button type="button" className="kd-green-btn" style={{ padding: "8px 18px", fontSize: 14 }} onClick={() => setStatus(t, "ready")}>
                        Mark ready
                      </button>
                    </div>
                  </article>
                );
              })}
              {ready && preparing.length === 0 && (
                <div
                  style={{
                    border: "1.5px dashed rgba(237,234,224,.2)",
                    borderRadius: 5,
                    padding: "26px 18px",
                    textAlign: "center",
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: ".12em",
                    color: "rgba(237,234,224,.38)",
                  }}
                >
                  NOTHING ON THE STOVE
                </div>
              )}
            </div>
          </section>

          {/* READY */}
          <section>
            <LaneHead dot="#37B072" label="READY — VERIFY OTP" count={readyLane.length} color="#7FB79A" border="#2E7D52" />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {readyLane.map((t) => {
                const entry = otpEntries[t.id] || "";
                const err = !!otpErrors[t.id];
                return (
                  <article
                    key={t.id}
                    style={{ background: "#F8F4E8", color: "#23201A", borderRadius: 5, borderLeft: "5px solid #2E7D52", animation: "kdReadyPulse 2.2s ease infinite" }}
                  >
                    <div
                      style={{
                        padding: "13px 16px 10px",
                        borderBottom: "1.5px dashed rgba(35,32,26,.3)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontFamily: BSC, fontWeight: 800, fontSize: 21, letterSpacing: ".02em" }}>{t.id}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(35,32,26,.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.student}
                      </span>
                    </div>
                    <div style={{ padding: "10px 16px 4px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <TicketItems t={t} />
                    </div>
                    <div style={{ padding: "8px 16px 14px" }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", color: "rgba(35,32,26,.55)", marginBottom: 7, whiteSpace: "nowrap" }}>
                        CUSTOMER&apos;S CODE <span style={{ color: "rgba(35,32,26,.35)" }}>· DEMO HINT {t.otp}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                        <input
                          value={entry}
                          onChange={(e) => {
                            const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                            setOtpEntries((s) => ({ ...s, [t.id]: v }));
                            setOtpErrors((s) => ({ ...s, [t.id]: false }));
                          }}
                          maxLength={4}
                          inputMode="numeric"
                          placeholder="0000"
                          style={{
                            width: 86,
                            padding: "8px 6px",
                            border: `1.5px solid ${err ? "#C13A2A" : "rgba(35,32,26,.45)"}`,
                            borderRadius: 4,
                            background: "#FFFDF4",
                            outline: "none",
                            fontFamily: MONO,
                            fontWeight: 700,
                            fontSize: 18,
                            letterSpacing: ".3em",
                            textAlign: "center",
                            color: "#23201A",
                            boxSizing: "border-box",
                          }}
                        />
                        <button
                          type="button"
                          className="kd-green-btn"
                          style={{ flex: 1, padding: "8px 0", fontSize: 14.5 }}
                          onClick={() => {
                            if ((otpEntries[t.id] || "") === t.otp) {
                              setStatus(t, "collected");
                              setOtpErrors((s) => ({ ...s, [t.id]: false }));
                            } else {
                              setOtpErrors((s) => ({ ...s, [t.id]: true }));
                            }
                          }}
                        >
                          Hand over ✓
                        </button>
                      </div>
                      {err && (
                        <div style={{ marginTop: 7, fontFamily: MONO, fontSize: 10.5, letterSpacing: ".08em", color: "#C13A2A" }}>
                          CODE DOESN&apos;T MATCH — ASK THE CUSTOMER AGAIN
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
              {ready && readyLane.length === 0 && (
                <div
                  style={{
                    border: "1.5px dashed rgba(237,234,224,.2)",
                    borderRadius: 5,
                    padding: "26px 18px",
                    textAlign: "center",
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: ".12em",
                    color: "rgba(237,234,224,.38)",
                  }}
                >
                  NOTHING WAITING FOR PICKUP
                </div>
              )}
            </div>
          </section>

          {/* HANDED OVER */}
          <section>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: "2px solid rgba(237,234,224,.16)",
              }}
            >
              <span style={{ fontFamily: BSC, fontWeight: 800, fontSize: 17, letterSpacing: ".06em", color: "rgba(237,234,224,.55)" }}>HANDED OVER</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 13, fontWeight: 600, color: "rgba(237,234,224,.45)" }}>{collected.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {collected.map((t) => (
                <div
                  key={t.id}
                  style={{
                    background: "rgba(237,234,224,.06)",
                    border: "1px solid rgba(237,234,224,.12)",
                    borderRadius: 4,
                    padding: "10px 13px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontFamily: BSC, fontWeight: 700, fontSize: 15.5 }}>{t.id}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "#7FB79A", whiteSpace: "nowrap" }}>₹{t.total}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: "rgba(237,234,224,.5)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.student}
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".08em", color: "rgba(237,234,224,.35)", whiteSpace: "nowrap" }}>OTP OK</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", lineHeight: 1.9, color: "rgba(237,234,224,.32)" }}>
              EVERY HANDOVER IS LOGGED WITH ITS OTP.
              <br />
              TOTALS UPDATE IN{" "}
              <Link href="/demo/admin" style={{ color: "#7FB79A", textDecoration: "none" }}>
                ADMIN →
              </Link>
            </div>
          </section>
        </main>

        {/* ============ TODAY'S SPECIAL MODAL ============ */}
        {specialOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(8,10,12,.7)", display: "grid", placeItems: "center" }}>
            <div
              style={{
                width: "min(430px, 92vw)",
                background: "#F8F4E8",
                color: "#23201A",
                borderRadius: 6,
                boxShadow: "0 30px 60px -12px rgba(0,0,0,.8)",
                padding: "26px 28px",
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".14em", color: "rgba(35,32,26,.5)", marginBottom: 4 }}>
                ONE WRITE → EVERY CUSTOMER SCREEN
              </div>
              <div style={{ fontFamily: BSC, fontWeight: 800, fontSize: 25, marginBottom: 4 }}>Push today&apos;s special</div>
              <p style={{ margin: "0 0 20px", fontSize: 14.5, lineHeight: 1.5, color: "rgba(35,32,26,.65)" }}>
                It appears on the customer menu instantly. Open the customer demo in another tab and watch it land.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 13, marginBottom: 20 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={labelStyle}>DISH NAME</span>
                  <input value={spName} onChange={(e) => setSpName(e.target.value)} style={inputStyle} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={labelStyle}>ONE-LINE DESCRIPTION</span>
                  <input value={spDesc} onChange={(e) => setSpDesc(e.target.value)} style={{ ...inputStyle, fontSize: 15, fontWeight: 400 }} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={labelStyle}>PRICE ₹</span>
                    <input
                      value={spPrice}
                      onChange={(e) => setSpPrice(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      style={{ ...inputStyle, fontFamily: MONO }}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={labelStyle}>PREP MIN</span>
                    <input
                      value={spPrep}
                      onChange={(e) => setSpPrep(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      style={{ ...inputStyle, fontFamily: MONO }}
                    />
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={labelStyle}>DIET</span>
                    <button
                      type="button"
                      onClick={() => setSpDiet((d) => (d === "nonveg" ? "veg" : "nonveg"))}
                      style={{
                        padding: "9px 8px",
                        border: `1.5px solid ${spDietColor}`,
                        borderRadius: 4,
                        background: "none",
                        color: spDietColor,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        fontFamily: "var(--font-barlow), sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {spDiet === "nonveg" ? "NON-VEG" : "VEG"}
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" className="kd-green-btn" style={{ width: "100%", padding: "12px 0", fontSize: 16 }} onClick={pushSpecialNow}>
                Put it on the board →
              </button>
              <button type="button" className="kd-cancel-btn" onClick={() => setSpecialOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* pushed toast */}
        {pushedToast && (
          <div
            style={{
              position: "fixed",
              bottom: 26,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 60,
              background: "#2E7D52",
              color: "#F8F4E8",
              borderRadius: 5,
              padding: "12px 22px",
              fontWeight: 700,
              fontSize: 15,
              boxShadow: "0 12px 30px -6px rgba(0,0,0,.7)",
              fontFamily: "var(--font-barlow), sans-serif",
            }}
          >
            On the board — live on every customer screen ✓
          </div>
        )}
      </div>
    </div>
  );
}
