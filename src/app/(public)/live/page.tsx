import Link from "next/link";
import { getAdminClient } from "@/lib/supabase/admin";

// Public proof-of-usage page. Platform-aggregate metrics only — never any single
// outlet's revenue or financials. Cached for 60s so we don't hammer the DB.
export const revalidate = 60;

export const metadata = {
  title: "Live Ledger — Tray",
  description:
    "Real usage, in the open. Platform-wide counts of outlets, orders, and menu items on Tray — aggregate only, no single-outlet financials.",
  alternates: { canonical: "/live" },
};

// Orders that never actually happened for a customer: unpaid, expired, or refused.
// Excluded from the "orders processed" count and the activity ticker.
const NON_ORDER_STATUSES = "(pending_payment,expired,rejected)";

type Entry = { name: string; at: string };
type Stats = {
  outletsLive: number;
  ordersProcessed: number;
  menuItems: number;
  recent: Entry[];
};

async function loadStats(): Promise<Stats> {
  // Service-role client: the anon/server client is RLS-scoped to one tenant via
  // the x-tenant-id header, so it cannot see cross-tenant platform totals. These
  // are harmless aggregate counts, so bypassing RLS here is appropriate.
  try {
    const db = getAdminClient();

    const [outlets, orders, items, recent] = await Promise.all([
      db.from("tenants").select("id", { count: "exact", head: true }).eq("is_active", true),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .not("status", "in", NON_ORDER_STATUSES),
      db.from("menu_items").select("id", { count: "exact", head: true }).eq("status", "live"),
      db
        .from("orders")
        .select("placed_at, tenants!inner(name)")
        .not("status", "in", NON_ORDER_STATUSES)
        .order("placed_at", { ascending: false })
        .limit(8),
    ]);

    return {
      outletsLive: outlets.count ?? 0,
      ordersProcessed: orders.count ?? 0,
      menuItems: items.count ?? 0,
      recent: (recent.data ?? []).map((r) => ({
        name: r.tenants?.name ?? "An outlet",
        at: r.placed_at,
      })),
    };
  } catch {
    // Honesty guard: on any failure, render real zeros rather than fabricated data.
    return { outletsLive: 0, ordersProcessed: 0, menuItems: 0, recent: [] };
  }
}

function ago(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const BG = "#f7f1e3";
const PAPER = "#fffdf6";
const INK = "#221f18";
const BLUE = "#1d3fbf";
const RED = "#c13a2a";
const LINE = "rgba(34,31,24,0.85)";
const MUTED = "rgba(34,31,24,0.62)";
const MONO = "var(--font-space-mono), ui-monospace, Menlo, monospace";
const SERIF = "var(--font-fraunces), Georgia, serif";

function StatTile({
  index,
  label,
  value,
  note,
}: {
  index: string;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div
      className="live-tile"
      style={{
        background: PAPER,
        border: `1.5px solid ${LINE}`,
        borderRadius: 5,
        boxShadow: "3px 4px 0 rgba(34,31,24,0.14)",
        padding: "22px 22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.14em",
          color: RED,
          textTransform: "uppercase",
        }}
      >
        {index} · {label}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: "clamp(40px, 9vw, 58px)",
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: INK,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value.toLocaleString("en-IN")}
      </span>
      <span style={{ fontFamily: SERIF, fontSize: 14.5, color: MUTED, lineHeight: 1.35 }}>
        {value === 0 ? "grows as the pilot runs" : note}
      </span>
    </div>
  );
}

export default async function LivePage() {
  const { outletsLive, ordersProcessed, menuItems, recent } = await loadStats();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: BG,
        color: INK,
        colorScheme: "light",
        fontFamily: SERIF,
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @keyframes liveBlink { 0%,100%{opacity:1} 50%{opacity:.3} }
        .live-dot { animation: liveBlink 1.4s ease-in-out infinite; }
        .live-margin { position:absolute; top:0; bottom:0; left:38px; width:1.5px;
          background: rgba(193,58,42,0.5); pointer-events:none; }
        @media (prefers-reduced-motion: reduce){ .live-dot{ animation:none } }
        @media (max-width: 720px){ .live-margin{ display:none } }
        .live-link { border-bottom:1.5px solid ${BLUE}; color:${BLUE}; text-decoration:none; padding-bottom:1px; }
        .live-link:hover { color:${INK}; border-bottom-color:${INK}; }
      `}</style>

      <span className="live-margin" aria-hidden />

      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "clamp(28px, 6vw, 64px) clamp(20px, 6vw, 56px) 72px",
          position: "relative",
        }}
      >
        {/* ── Masthead ─────────────────────────────────────────── */}
        <header
          style={{
            borderBottom: `2.5px solid ${INK}`,
            boxShadow: `0 4px 0 -2.5px ${INK}`,
            paddingBottom: 18,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: 19,
                letterSpacing: "0.02em",
              }}
            >
              TRAY
            </span>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.12em", color: MUTED }}>
              FOLIO · REAL-TIME · REFRESH 60s
            </span>
          </div>

          <h1
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: "clamp(46px, 12vw, 92px)",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              margin: "14px 0 12px",
            }}
          >
            Live Ledger
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: "0.1em",
              color: INK,
            }}
          >
            <span
              className="live-dot"
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: RED,
                display: "inline-block",
                flexShrink: 0,
              }}
              aria-hidden
            />
            PROOF OF USE — NOT A PITCH
          </div>
        </header>

        {/* ── Register / disclosure line ───────────────────────── */}
        <div
          style={{
            borderTop: `1.5px solid ${LINE}`,
            borderBottom: `1.5px solid ${LINE}`,
            padding: "11px 2px",
            marginBottom: 34,
            fontFamily: MONO,
            fontSize: 11.5,
            letterSpacing: "0.08em",
            color: MUTED,
            display: "flex",
            gap: 22,
            flexWrap: "wrap",
          }}
        >
          <span>PLATFORM AGGREGATE</span>
          <span>·</span>
          <span>NO SINGLE-OUTLET FINANCIALS</span>
          <span>·</span>
          <span>READ-ONLY</span>
        </div>

        {/* ── Stat tiles ───────────────────────────────────────── */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            marginBottom: 52,
          }}
        >
          <StatTile
            index="01"
            label="Outlets live"
            value={outletsLive}
            note="stalls & canteens taking live orders"
          />
          <StatTile
            index="02"
            label="Orders processed"
            value={ordersProcessed}
            note="all-time, excludes unpaid & expired"
          />
          <StatTile
            index="03"
            label="Items on menus"
            value={menuItems}
            note="live dishes across every outlet"
          />
        </section>

        {/* ── Recent activity ticker ───────────────────────────── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              borderBottom: `2.5px solid ${INK}`,
              paddingBottom: 8,
              marginBottom: 4,
            }}
          >
            <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 22, letterSpacing: "-0.01em" }}>
              Recent entries
            </h2>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: RED }}>
              § TICKER
            </span>
          </div>

          {recent.length === 0 ? (
            <p
              style={{
                fontFamily: MONO,
                fontSize: 13,
                color: MUTED,
                padding: "22px 2px",
              }}
            >
              No orders logged yet — the ledger fills as stalls go live.
            </p>
          ) : (
            <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {recent.map((e, i) => (
                <li
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "34px 1fr auto",
                    gap: 14,
                    alignItems: "baseline",
                    padding: "15px 2px",
                    borderBottom:
                      i === recent.length - 1
                        ? `2.5px solid ${INK}`
                        : "1px solid rgba(34,31,24,0.28)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 11,
                      color: MUTED,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: "2px 8px", alignItems: "baseline" }}>
                    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 16 }}>{e.name}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED, letterSpacing: "0.04em" }}>
                      order placed
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 12,
                      color: INK,
                      whiteSpace: "nowrap",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {ago(e.at)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer
          style={{
            marginTop: 56,
            paddingTop: 22,
            borderTop: `2.5px solid ${INK}`,
            boxShadow: `0 -4px 0 -2.5px ${INK}`,
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.06em", color: MUTED, maxWidth: 460, lineHeight: 1.5 }}>
            Aggregate platform metrics only. No individual outlet&rsquo;s revenue is shown.
          </p>
          <div style={{ display: "flex", gap: 22, fontFamily: MONO, fontSize: 12.5 }}>
            <Link href="/" className="live-link">
              ← Tray
            </Link>
            <Link href="/login" className="live-link">
              Owner sign in →
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
