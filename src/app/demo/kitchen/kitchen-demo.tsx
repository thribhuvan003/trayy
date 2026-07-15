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

type Segment = "new" | "cooking" | "serve";

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

/** Short kitchen chime via Web Audio — no asset files. */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const tones = [880, 1174.7];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02 + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28 + i * 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + 0.35 + i * 0.14);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    /* ignore — autoplay / unsupported */
  }
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
    <div className="kd-ticket-items">
      {t.items.map((it, i) => (
        <div key={i} className="kd-item">
          <DietSquare diet={it.diet} />
          <span style={{ minWidth: 0 }}>{it.name}</span>
          <span className="kd-item-q">× {it.q}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyLane({ children }: { children: React.ReactNode }) {
  return <div className="kd-empty">{children}</div>;
}

export function KitchenDemo() {
  const [ready, setReady] = React.useState(false);
  const [canteenId, setCanteenId] = React.useState<string | null>(null);
  const [overrides, setOverrides] = React.useState<Record<string, TicketStatus>>({});
  const [otpEntries, setOtpEntries] = React.useState<Record<string, string>>({});
  const [otpErrors, setOtpErrors] = React.useState<Record<string, boolean>>({});
  const [specialOpen, setSpecialOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [segment, setSegment] = React.useState<Segment>("new");
  const [soundOn, setSoundOn] = React.useState(true);
  const [chimeFlash, setChimeFlash] = React.useState(false);
  const [spName, setSpName] = React.useState("");
  const [spDesc, setSpDesc] = React.useState("");
  const [spPrice, setSpPrice] = React.useState("120");
  const [spPrep, setSpPrep] = React.useState("6");
  const [spDiet, setSpDiet] = React.useState<TicketDiet>("veg");
  const [pushedToast, setPushedToast] = React.useState(false);
  const [nowTs, setNowTs] = React.useState(() => Date.now());
  const toastT = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const chimeT = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIncoming = React.useRef<Set<string>>(new Set());
  const bootstrapped = React.useRef(false);
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
      if (chimeT.current) clearTimeout(chimeT.current);
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
    .slice(0, 8);

  const isLate = (t: QueueTicket) => (nowTs - t.placedAt) / 1000 > t.target;

  // New-order chime: after first paint, any new incoming id rings once.
  const incomingKey = incoming.map((t) => t.id).join("|");
  React.useEffect(() => {
    if (!ready) return;
    const ids = incomingKey ? incomingKey.split("|") : [];
    if (!bootstrapped.current) {
      ids.forEach((id) => seenIncoming.current.add(id));
      bootstrapped.current = true;
      return;
    }
    const fresh = ids.filter((id) => !seenIncoming.current.has(id));
    ids.forEach((id) => seenIncoming.current.add(id));
    if (fresh.length === 0) return;
    if (soundOn) playChime();
    setChimeFlash(true);
    if (chimeT.current) clearTimeout(chimeT.current);
    chimeT.current = setTimeout(() => setChimeFlash(false), 2400);
    setSegment("new");
  }, [ready, incomingKey, soundOn]);

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
    setSheetOpen(false);
    setPushedToast(true);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setPushedToast(false), 3200);
  };

  const switchCanteen = (id: string) => {
    setSelectedCanteenId(id);
    setCanteenId(id);
    setOverrides({});
    setOtpEntries({});
    setOtpErrors({});
    seenIncoming.current = new Set();
    bootstrapped.current = false;
    const next = getCanteen(id);
    setSpName(next.spDefaults.name);
    setSpDesc(next.spDefaults.desc);
    setSpPrice(String(next.spDefaults.price));
    setSpPrep(String(next.spDefaults.prep));
    setSpDiet(next.spDefaults.diet);
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

  const tabs: { id: Segment; label: string; count: number; alert?: boolean }[] = [
    { id: "new", label: "New", count: incoming.length, alert: incoming.some(isLate) },
    { id: "cooking", label: "Cooking", count: preparing.length, alert: preparing.some(isLate) },
    { id: "serve", label: "Serve", count: readyLane.length },
  ];

  return (
    <div className={`kd ${kitchenFontVars}`}>
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Thin demo strip */}
        <div className="kd-strip">
          <span className="kd-strip-label">DEMO · CUSTOMER ORDERS LAND HERE</span>
          <span className="kd-strip-links">
            <Link href="/" className="kd-strip-link">
              ← LANDING
            </Link>
            <Link href="/demo/student" className="kd-strip-link--green">
              CUSTOMER →
            </Link>
            <Link href="/demo/admin" className="kd-strip-link--green">
              ADMIN →
            </Link>
          </span>
        </div>

        {/* Compact sticky header */}
        <header className="kd-head">
          <div className="kd-brand">
            TRAY <span>KITCHEN</span>
          </div>
          <div className="kd-head-meta">
            <span className="kd-clock">{ready ? fmtClockSec(nowTs) : ""}</span>
            <button
              type="button"
              className="kd-sound-btn"
              data-on={soundOn ? "true" : "false"}
              aria-pressed={soundOn}
              aria-label={soundOn ? "Sound on" : "Sound off"}
              onClick={() => {
                setSoundOn((v) => {
                  if (!v) playChime();
                  return !v;
                });
              }}
            >
              {soundOn ? "🔔" : "🔇"}
            </button>
            <button type="button" className="kd-more-btn" aria-label="More options" onClick={() => setSheetOpen(true)}>
              ···
            </button>
          </div>
        </header>

        <div className="kd-chime-banner" data-show={chimeFlash ? "true" : "false"}>
          NEW ORDER — CHECK NEW
        </div>

        {/* Segment tabs (phone) */}
        <nav className="kd-tabs" aria-label="Queue segments">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="kd-tab"
              data-seg={tab.id}
              data-active={segment === tab.id ? "true" : "false"}
              data-alert={tab.alert ? "true" : "false"}
              onClick={() => setSegment(tab.id)}
            >
              <span>{tab.label}</span>
              <span className="kd-tab-count">{tab.count}</span>
            </button>
          ))}
        </nav>

        <main className="kd-main">
          {/* NEW */}
          <section className="kd-lane" data-active={segment === "new" ? "true" : "false"} aria-label="New orders">
            <div className="kd-lane-head" data-seg="new">
              <span className="kd-lane-dot" style={{ background: "#C9C4B4" }} />
              <span className="kd-lane-label">NEW</span>
              <span className="kd-lane-count">{incoming.length}</span>
            </div>
            {incoming.map((t) => {
              const late = isLate(t);
              return (
                <article key={t.id} className="kd-ticket">
                  <div className="kd-ticket-top">
                    <span className="kd-ticket-id">{t.id}</span>
                    <span className="kd-ticket-meta">{t.student}</span>
                  </div>
                  <TicketItems t={t} />
                  <div className="kd-ticket-foot">
                    <div className="kd-timer" data-late={late ? "true" : "false"}>
                      {fmtElapsed((nowTs - t.placedAt) / 1000)} <span>waiting</span>
                    </div>
                    <button type="button" className="kd-cta kd-cta--start" onClick={() => setStatus(t, "preparing")}>
                      START
                    </button>
                  </div>
                </article>
              );
            })}
            {ready && incoming.length === 0 && (
              <EmptyLane>
                NO NEW ORDERS
                <br />
                <Link href="/demo/student">PLACE ONE IN THE CUSTOMER DEMO →</Link>
              </EmptyLane>
            )}
          </section>

          {/* COOKING */}
          <section className="kd-lane" data-active={segment === "cooking" ? "true" : "false"} aria-label="Cooking">
            <div className="kd-lane-head" data-seg="cooking">
              <span className="kd-lane-dot" style={{ background: "#5B8DD9" }} />
              <span className="kd-lane-label">COOKING</span>
              <span className="kd-lane-count">{preparing.length}</span>
            </div>
            {preparing.map((t) => {
              const elapsedSec = (nowTs - t.placedAt) / 1000;
              const late = elapsedSec > t.target;
              return (
                <article key={t.id} className="kd-ticket">
                  <div className="kd-ticket-top">
                    <span className="kd-ticket-id">{t.id}</span>
                    <span className="kd-badge">ON STOVE</span>
                  </div>
                  <TicketItems t={t} />
                  <div className="kd-progress">
                    <i
                      style={{
                        width: `${Math.min(100, (elapsedSec / t.target) * 100).toFixed(1)}%`,
                        background: late ? "#C13A2A" : "#2E7D52",
                      }}
                    />
                  </div>
                  <div className="kd-ticket-foot">
                    <div className="kd-timer" data-late={late ? "true" : "false"}>
                      {fmtElapsed(elapsedSec)} <span>/ target {fmtElapsed(t.target)}</span>
                    </div>
                    <button type="button" className="kd-cta kd-cta--ready" onClick={() => setStatus(t, "ready")}>
                      READY
                    </button>
                  </div>
                </article>
              );
            })}
            {ready && preparing.length === 0 && <EmptyLane>NOTHING ON THE STOVE</EmptyLane>}
          </section>

          {/* SERVE */}
          <section className="kd-lane" data-active={segment === "serve" ? "true" : "false"} aria-label="Serve">
            <div className="kd-lane-head" data-seg="serve">
              <span className="kd-lane-dot" style={{ background: "#37B072" }} />
              <span className="kd-lane-label">SERVE</span>
              <span className="kd-lane-count">{readyLane.length}</span>
            </div>
            {readyLane.map((t) => {
              const entry = otpEntries[t.id] || "";
              const err = !!otpErrors[t.id];
              return (
                <article key={t.id} className="kd-ticket kd-ticket--ready">
                  <div className="kd-ticket-top">
                    <span className="kd-ticket-id">{t.id}</span>
                    <span className="kd-ticket-meta">{t.student}</span>
                  </div>
                  <TicketItems t={t} />
                  <div className="kd-ticket-foot">
                    <div className="kd-otp-label">
                      CUSTOMER CODE <em>· DEMO HINT {t.otp}</em>
                    </div>
                    <div className="kd-otp-row">
                      <input
                        className="kd-otp-input"
                        data-err={err ? "true" : "false"}
                        value={entry}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
                          setOtpEntries((s) => ({ ...s, [t.id]: v }));
                          setOtpErrors((s) => ({ ...s, [t.id]: false }));
                        }}
                        maxLength={4}
                        inputMode="numeric"
                        placeholder="0000"
                        aria-label={`OTP for ${t.id}`}
                      />
                      <button
                        type="button"
                        className="kd-cta kd-cta--serve"
                        onClick={() => {
                          if ((otpEntries[t.id] || "") === t.otp) {
                            setStatus(t, "collected");
                            setOtpErrors((s) => ({ ...s, [t.id]: false }));
                          } else {
                            setOtpErrors((s) => ({ ...s, [t.id]: true }));
                          }
                        }}
                      >
                        SERVE
                      </button>
                    </div>
                    {err && <div className="kd-otp-err">CODE DOESN&apos;T MATCH — ASK AGAIN</div>}
                  </div>
                </article>
              );
            })}
            {ready && readyLane.length === 0 && <EmptyLane>NOTHING WAITING FOR PICKUP</EmptyLane>}
          </section>

          {/* Collected — history strip only */}
          {ready && collected.length > 0 && (
            <div className="kd-history">
              <div className="kd-history-head">
                SERVED
                <span>{collected.length}</span>
              </div>
              <div className="kd-history-row">
                {collected.map((t) => (
                  <div key={t.id} className="kd-history-chip">
                    {t.id}
                    <em>₹{t.total}</em>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Overflow: canteen switcher + special */}
        {sheetOpen && (
          <div className="kd-sheet-bg" role="dialog" aria-modal="true" aria-label="Kitchen options" onClick={() => setSheetOpen(false)}>
            <div className="kd-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="kd-sheet-handle" />
              <p className="kd-sheet-sub">{ready ? c.kitchenTag.toUpperCase() : "LOADING…"}</p>
              <h2 className="kd-sheet-title" style={{ fontFamily: BSC }}>
                Options
              </h2>
              <p className="kd-sheet-sub" style={{ marginTop: -8 }}>
                CANTEEN · SPECIALS
              </p>
              <div className="kd-canteen-row">
                {listCanteens().map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className="kd-canteen-btn"
                    data-active={x.id === c.id ? "true" : "false"}
                    onClick={() => switchCanteen(x.id)}
                  >
                    {x.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="kd-special-open"
                onClick={() => {
                  setSheetOpen(false);
                  setSpecialOpen(true);
                }}
              >
                + TODAY&apos;S SPECIAL
              </button>
              <button type="button" className="kd-sheet-close" onClick={() => setSheetOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Today's special modal */}
        {specialOpen && (
          <div className="kd-modal-bg">
            <div className="kd-modal">
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

        {pushedToast && <div className="kd-toast">On the board — live on every customer screen ✓</div>}
      </div>
    </div>
  );
}
