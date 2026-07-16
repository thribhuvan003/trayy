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

type ViewId = "today" | "menu" | "staff" | "settings";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "menu", label: "Menu" },
  { id: "staff", label: "Staff" },
  { id: "settings", label: "Settings" },
];

const STATUS_META: Record<TicketStatus, { label: string; color: string }> = {
  incoming: { label: "New", color: "#232019" },
  preparing: { label: "Cooking", color: "#2C50B0" },
  ready: { label: "Serve", color: "#1E5A3C" },
  collected: { label: "Done", color: "rgba(35,32,25,.45)" },
};

const TYPE_COLORS: Record<string, string> = {
  ORDER: "#232019",
  MENU: "#1E5A3C",
  PRICE: "#1E5A3C",
  PAY: "#2C50B0",
  PREP: "#B03A2A",
};

const STAFF = [
  { name: "Stall owner", role: "Menus, prices, staff, payouts", scope: "This stall", scopeColor: "#1E5A3C" },
  { name: "Counter hand 1", role: "Queue board · tickets & OTP only", scope: "Queue only", scopeColor: "#2C50B0" },
  { name: "Counter hand 2", role: "Queue board · tickets & OTP only", scope: "Queue only", scopeColor: "#2C50B0" },
  { name: "Partner (family)", role: "Read-only · today's hisaab", scope: "Money view", scopeColor: "#B03A2A" },
];

function fmtMoney(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function DietSquare({ color }: { color: string }) {
  return (
    <span className="ad-diet" style={{ borderColor: color }}>
      <span style={{ background: color }} />
    </span>
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
  const [view, setView] = React.useState<ViewId>("today");
  const [menuState, setMenuState] = React.useState<Record<string, boolean>>({});
  const [priceDrafts, setPriceDrafts] = React.useState<Record<string, string>>({});
  const [savedPrices, setSavedPrices] = React.useState<Record<string, number>>({});
  const [editing, setEditing] = React.useState<Record<string, boolean>>({});
  const [localAudit, setLocalAudit] = React.useState<AuditEntry[]>([]);
  const [nowTs, setNowTs] = React.useState(() => Date.now());
  const [stallOpen, setStallOpen] = React.useState(true);
  const [paused, setPaused] = React.useState(false);
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
          student: `${x.student || "Customer"} · live`,
          items: (x.items || []).map((it) => `${it.name} × ${it.q || 1}`).join(", "),
          total: x.total || 0,
          status: (x.status || "incoming") as TicketStatus,
          time: fmtClock(x.placedAt || Date.now()),
        }))
    : [];
  // Static seed orders get times relative to now, so the book never looks stale.
  const allOrders = [
    ...inbox.slice().reverse(),
    ...c.orders.map((o, i) => ({ ...o, student: o.student, time: fmtClock(nowTs - (i + 2) * 150000) })),
  ];
  const collectedTotal = allOrders.filter((o) => o.status === "collected").reduce((a, o) => a + (o.total || 0), 0);
  const inKitchenTotal = allOrders.filter((o) => o.status !== "collected").reduce((a, o) => a + (o.total || 0), 0);

  // Live ₹ today = KPI base + inbox totals for this stall (demo still “feels” live)
  const liveInboxRev = inbox.reduce((a, o) => a + (o.total || 0), 0);
  const todayRupees = k.revenue + liveInboxRev;
  const todayOrders = k.orders + inbox.length;

  const pipeline = {
    new: allOrders.filter((o) => o.status === "incoming").length,
    cooking: allOrders.filter((o) => o.status === "preparing").length,
    serve: allOrders.filter((o) => o.status === "ready").length,
  };

  // ---- specials ----
  const storedSpecials = ready ? getSpecials(c.id) : [];
  const specials = storedSpecials.length ? storedSpecials : c.defaultSpecials;

  // ---- audit (seed rows shown relative to now) ----
  const auditRows: AuditEntry[] = [
    ...localAudit,
    ...c.audit.map((a, i) => ({
      t: fmtClock(nowTs - (i + 1) * 11 * 60000),
      type: a.type.toUpperCase(),
      who: a.who,
      msg: a.msg,
    })),
  ];

  const today = new Date(nowTs).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const stallStatusLabel = !stallOpen ? "Closed" : paused ? "Paused" : "Open";
  const stallStatusColor = !stallOpen ? "#B03A2A" : paused ? "#9A6B00" : "#1E5A3C";

  const switchStall = (id: string) => {
    setSelectedCanteenId(id);
    setCanteenId(id);
    setMenuState({});
    setPriceDrafts({});
    setSavedPrices({});
    setEditing({});
    setLocalAudit([]);
  };

  return (
    <div className={`ad ${adminFontVars}`}>
      {/* Demo strip */}
      <div className="ad-strip">
        <span className="ad-strip-label">Sample stall · no real money</span>
        <span className="ad-strip-links">
          <Link href="/" className="ad-strip-link">
            ← Home
          </Link>
          <Link href="/demo/student" className="ad-strip-link--green">
            Customer →
          </Link>
          <Link href="/demo/kitchen" className="ad-strip-link--green">
            Kitchen →
          </Link>
        </span>
      </div>

      {/* Sticky phone header — aaj ka hisaab */}
      <header className="ad-head">
        <div className="ad-head-main">
          <div className="ad-brand">
            Tray <span>· aaj ka hisaab</span>
          </div>
          <div className="ad-head-sub">
            {ready ? c.name : "…"} · {today} · {fmtClock(nowTs)}
          </div>
        </div>
        <div className="ad-head-status" style={{ color: stallStatusColor, borderColor: stallStatusColor }}>
          {stallStatusLabel}
        </div>
      </header>

      {/* Stall picker — horizontal chips */}
      <div className="ad-stalls" role="tablist" aria-label="Stall">
        {listCanteens().map((x) => {
          const active = x.id === c.id;
          return (
            <button
              key={x.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`ad-stall-chip${active ? " is-active" : ""}`}
              onClick={() => switchStall(x.id)}
            >
              {x.name}
            </button>
          );
        })}
        <span className="ad-stalls-note">3 sample stalls — each sealed &amp; separate</span>
      </div>

      {/* Bottom-ish segment tabs (also sticky under header) */}
      <nav className="ad-tabs" role="tablist" aria-label="Views">
        {VIEWS.map((v) => {
          const active = view === v.id;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`ad-tab${active ? " is-active" : ""}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          );
        })}
      </nav>

      <main className="ad-main">
        {/* ============ TODAY ============ */}
        {view === "today" && (
          <div className="ad-panel" style={{ animation: "adRowIn .28s ease both" }}>
            <div className="ad-col ad-col--a">
            {/* Huge Today ₹ */}
            <section className="ad-today-hero">
              <div className="ad-today-label">Today ₹</div>
              <div className="ad-today-rupees">₹{fmtMoney(todayRupees)}</div>
              <div className="ad-today-meta">
                <span>
                  <b>{todayOrders}</b> orders
                </span>
                <span className="ad-dot" />
                <span>
                  avg <b>₹{k.avgTicket}</b>
                </span>
                <span className="ad-dot" />
                <span className="ad-delta">{k.revenueDelta}</span>
              </div>
            </section>

            {/* Open / Pause mock toggles */}
            <section className="ad-toggles" aria-label="Stall controls">
              <button
                type="button"
                className={`ad-toggle${stallOpen ? " is-on" : ""}`}
                onClick={() => {
                  const next = !stallOpen;
                  setStallOpen(next);
                  if (next) setPaused(false);
                  logAction("MENU", next ? "opened the stall for orders" : "closed the stall");
                }}
              >
                <span className="ad-toggle-title">{stallOpen ? "Open" : "Closed"}</span>
                <span className="ad-toggle-hint">{stallOpen ? "Taking orders" : "Not taking orders"}</span>
              </button>
              <button
                type="button"
                className={`ad-toggle ad-toggle--pause${paused && stallOpen ? " is-paused" : ""}`}
                disabled={!stallOpen}
                onClick={() => {
                  if (!stallOpen) return;
                  const next = !paused;
                  setPaused(next);
                  logAction("MENU", next ? "paused new orders (kitchen catching up)" : "resumed new orders");
                }}
              >
                <span className="ad-toggle-title">{paused && stallOpen ? "Paused" : "Pause"}</span>
                <span className="ad-toggle-hint">{paused && stallOpen ? "Kitchen catching up" : "Stop new orders"}</span>
              </button>
            </section>

            {/* Pipeline — same mental model as kitchen New | Cooking | Serve */}
            <section className="ad-pipe" aria-label="Kitchen pipeline">
              <div className="ad-pipe-head">
                <span>In the kitchen</span>
                <Link href="/demo/kitchen" className="ad-pipe-link">
                  Open kitchen →
                </Link>
              </div>
              <div className="ad-pipe-grid">
                <div className="ad-pipe-cell">
                  <span className="ad-pipe-n">{pipeline.new}</span>
                  <span className="ad-pipe-l">New</span>
                </div>
                <div className="ad-pipe-cell">
                  <span className="ad-pipe-n" style={{ color: "#2C50B0" }}>
                    {pipeline.cooking}
                  </span>
                  <span className="ad-pipe-l">Cooking</span>
                </div>
                <div className="ad-pipe-cell">
                  <span className="ad-pipe-n" style={{ color: "#1E5A3C" }}>
                    {pipeline.serve}
                  </span>
                  <span className="ad-pipe-l">Serve</span>
                </div>
              </div>
            </section>
            </div>

            <div className="ad-col ad-col--b">
            {/* Live order list */}
            <section className="ad-section">
              <div className="ad-section-head">
                <h2>Orders</h2>
                <span>Last {allOrders.length} · newest first</span>
              </div>
              <ul className="ad-order-list">
                {allOrders.map((o, i) => {
                  const m = STATUS_META[o.status] || STATUS_META.incoming;
                  return (
                    <li key={`${o.id}-${i}`} className="ad-order">
                      <div className="ad-order-top">
                        <span className="ad-order-id">{o.id}</span>
                        <span className="ad-order-status" style={{ color: m.color }}>
                          {m.label}
                        </span>
                        <span className="ad-order-amt">₹{fmtMoney(o.total)}</span>
                      </div>
                      <div className="ad-order-items">{o.items}</div>
                      <div className="ad-order-foot">
                        <span>{o.student}</span>
                        <span>{o.time}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="ad-recon">
                <div className="ad-recon-row">
                  <span>Collected (these {allOrders.length})</span>
                  <b>₹{fmtMoney(collectedTotal)}</b>
                </div>
                <div className="ad-recon-row">
                  <span>Still in kitchen</span>
                  <b>₹{fmtMoney(inKitchenTotal)}</b>
                </div>
                <div className="ad-recon-match">Every order matched to {c.upi} ✓</div>
              </div>
            </section>

            {/* Top sellers compact */}
            <section className="ad-section">
              <div className="ad-section-head">
                <h2>Selling today</h2>
                <span>Top plates</span>
              </div>
              <div className="ad-tops">
                {c.topItems.slice(0, 5).map((t) => {
                  const dietColor = t.diet === "nv" ? "#B03A2A" : "#1E5A3C";
                  return (
                    <div key={t.name} className="ad-top-row">
                      <DietSquare color={dietColor} />
                      <span className="ad-top-name">{t.name}</span>
                      <span className="ad-top-n">{t.orders}</span>
                    </div>
                  );
                })}
              </div>
              <div className="ad-note">
                <div className="ad-note-label">Settlement</div>
                <p>
                  Every rupee settles to <b>{c.upi}</b>. Tray holds no float and takes no cut.
                </p>
              </div>
            </section>
            </div>
          </div>
        )}

        {/* ============ MENU ============ */}
        {view === "menu" && (
          <div className="ad-panel" style={{ animation: "adRowIn .28s ease both" }}>
            <div className="ad-col ad-col--a">
            <section className="ad-section">
              <div className="ad-section-head">
                <h2>Menu</h2>
                <span>Sold out hits every screen</span>
              </div>
              <ul className="ad-menu-list">
                {c.menuModal.map((m, i) => {
                  const key = `${c.id}-${i}`;
                  const live = menuState[key] != null ? menuState[key] : m.live;
                  const price = savedPrices[key] != null ? savedPrices[key] : m.price;
                  const isEditing = !!editing[key];
                  return (
                    <li key={key} className={`ad-menu-item${live ? "" : " is-soldout"}`}>
                      <div className="ad-menu-item-main">
                        <span className="ad-menu-name">{m.name}</span>
                        {isEditing ? (
                          <input
                            className="ad-price-input"
                            value={priceDrafts[key] != null ? priceDrafts[key] : String(price)}
                            onChange={(e) => setPriceDrafts((s) => ({ ...s, [key]: e.target.value.replace(/[^0-9]/g, "") }))}
                            inputMode="numeric"
                            aria-label={`Price for ${m.name}`}
                          />
                        ) : (
                          <span className="ad-menu-price">₹{fmtMoney(price)}</span>
                        )}
                      </div>
                      <div className="ad-menu-actions">
                        <button
                          type="button"
                          className={`ad-stock-btn${live ? " is-live" : " is-out"}`}
                          onClick={() => {
                            const next = !live;
                            setMenuState((s) => ({ ...s, [key]: next }));
                            logAction("MENU", `${next ? "put " : "marked "}${m.name}${next ? " back on the menu" : " sold out"}`);
                          }}
                        >
                          {live ? "On menu" : "Sold out"}
                        </button>
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
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="ad-hint">Sold-out items disappear from the customer menu instantly.</p>
            </section>
            </div>

            <div className="ad-col ad-col--b">
            <section className="ad-section">
              <div className="ad-section-head">
                <h2>Today&apos;s specials</h2>
                <span>From kitchen</span>
              </div>
              {specials.map((s) => {
                const dietColor = s.diet === "nonveg" ? "#B03A2A" : "#1E5A3C";
                return (
                  <div key={s.id} className="ad-special">
                    <DietSquare color={dietColor} />
                    <span className="ad-special-body">
                      <span className="ad-special-name">{s.name}</span>
                      <span className="ad-special-desc">{s.desc}</span>
                    </span>
                    <span className="ad-menu-price">₹{s.price}</span>
                    <button
                      type="button"
                      className="ad-takeoff-btn"
                      title="Take off the board"
                      onClick={() => {
                        const base = storedSpecials.length ? storedSpecials : specials;
                        setSpecials(
                          c.id,
                          base.filter((x) => x.id !== s.id)
                        );
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
                <div className="ad-empty">
                  No specials on the board
                  <br />
                  <Link href="/demo/kitchen">Push one from kitchen →</Link>
                </div>
              )}
            </section>
            </div>
          </div>
        )}

        {/* ============ STAFF ============ */}
        {view === "staff" && (
          <div className="ad-panel" style={{ animation: "adRowIn .28s ease both" }}>
            <div className="ad-col ad-col--a">
            <section className="ad-section">
              <div className="ad-section-head">
                <h2>Staff</h2>
                <span>Who can open what</span>
              </div>
              <ul className="ad-staff-list">
                {STAFF.map((st) => (
                  <li key={st.name} className="ad-staff">
                    <span className="ad-staff-avatar">{st.name.charAt(0).toUpperCase()}</span>
                    <span className="ad-staff-body">
                      <span className="ad-staff-name">{st.name}</span>
                      <span className="ad-staff-role">{st.role}</span>
                    </span>
                    <span className="ad-staff-scope" style={{ color: st.scopeColor, borderColor: st.scopeColor }}>
                      {st.scope}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="ad-hint">Counter logins see the queue, never the money. Only the owner sees the hisaab.</p>
            </section>
            </div>

            <div className="ad-col ad-col--b">
            <section className="ad-section">
              <div className="ad-section-head">
                <h2>Regulars</h2>
                <span>This month</span>
              </div>
              <ul className="ad-reg-list">
                {c.studentRows.map((sr, i) => (
                  <li key={sr.roll} className="ad-reg">
                    <span className="ad-reg-name">{sr.name}</span>
                    <span className="ad-reg-meta">
                      {sr.orders} orders · ₹{fmtMoney(sr.spend)}
                    </span>
                    <span className="ad-reg-last">{fmtClock(nowTs - (i + 2) * 9 * 60000)}</span>
                  </li>
                ))}
              </ul>
            </section>
            </div>
          </div>
        )}

        {/* ============ SETTINGS ============ */}
        {view === "settings" && (
          <div className="ad-panel" style={{ animation: "adRowIn .28s ease both" }}>
            <div className="ad-col ad-col--a">
            <section className="ad-section">
              <div className="ad-section-head">
                <h2>Settlement</h2>
                <span>Direct to you</span>
              </div>
              <div className="ad-note">
                <div className="ad-note-label">Merchant VPA</div>
                <p className="ad-vpa">{c.upi}</p>
                <p style={{ marginTop: 8 }}>Commission 0%. Tray never holds the money.</p>
              </div>
            </section>
            </div>

            <div className="ad-col ad-col--b">
            <section className="ad-section">
              <div className="ad-section-head">
                <h2>Activity log</h2>
                <span>What changed</span>
              </div>
              <ul className="ad-audit-list">
                {auditRows.map((a, i) => (
                  <li key={i} className="ad-audit">
                    <span className="ad-audit-t">{a.t}</span>
                    <span
                      className="ad-audit-type"
                      style={{
                        color: TYPE_COLORS[a.type] || "#232019",
                        borderColor: TYPE_COLORS[a.type] || "#232019",
                      }}
                    >
                      {a.type}
                    </span>
                    <span className="ad-audit-msg">
                      <b>{a.who}</b> {a.msg}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="ad-hint">Price edits and sold-out toggles append here live.</p>
            </section>
            </div>
          </div>
        )}
      </main>

      <footer className="ad-footer">
        <span>This stall only · sealed from the rest of the street</span>
        <span className="ad-footer-mark">— Tray · {ready ? today : ""}</span>
      </footer>
    </div>
  );
}
