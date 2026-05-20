import Link from "next/link";
import { notFound } from "next/navigation";
import { collegeCanteens, type CollegeCanteen } from "@/lib/tenant";
import { LiveTimestamp } from "./live-timestamp";

export const revalidate = 30;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  return {
    title: `${slug.toUpperCase()} canteens — Tray`,
    description: `Order from any canteen at ${slug.toUpperCase()}.`,
  };
}

// ─── CSS ────────────────────────────────────────────────────────────────────

const CSS = `
.tcp {
  --tl-bg:      #0d1220;
  --tl-bg-2:    #141d38;
  --tl-bg-3:    #1a2548;
  --tl-line:    rgba(232,228,220,0.10);
  --tl-line-2:  rgba(232,228,220,0.18);
  --tl-ink:     #e8e4dc;
  --tl-ink-2:   rgba(232,228,220,0.62);
  --tl-ink-3:   rgba(232,228,220,0.38);
  --tl-ink-4:   rgba(232,228,220,0.18);
  --tl-accent:  #c4a882;

  font-family: var(--font-geist), var(--font-inter), ui-sans-serif, system-ui;
  font-size: 15px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  color: var(--tl-ink);
}

/* ── Noise grain overlay ── */
.tcp-grain {
  position: fixed; inset: -30%; pointer-events: none; z-index: 1; opacity: .045; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* ── Nav ── */
.tcp-nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(20px) saturate(1.4);
  background: rgba(13,18,32,0.80);
  border-bottom: 1px solid var(--tl-line);
}
.tcp-nav-inner {
  max-width: 1280px; margin: 0 auto;
  padding: 13px 24px;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
@media (min-width: 768px) { .tcp-nav-inner { padding: 13px 56px; } }
.tcp-brand {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-instrument-serif), ui-serif, Georgia;
  font-size: 24px; letter-spacing: -0.02em; font-weight: 400; color: var(--tl-ink);
  text-decoration: none;
}
.tcp-brand-mark {
  width: 30px; height: 30px; border-radius: 7px;
  background: linear-gradient(135deg, var(--tl-accent), #8a7358);
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-instrument-serif), serif; font-size: 17px; color: var(--tl-bg);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.12);
}
.tcp-brand-dot { font-style: italic; color: var(--tl-accent); }
.tcp-nav-back {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--tl-ink-3); text-decoration: none;
  transition: color .15s;
}
.tcp-nav-back:hover { color: var(--tl-ink); }

/* ── Wrap ── */
.tcp-wrap {
  max-width: 1280px; margin: 0 auto;
  padding: 0 24px; position: relative; z-index: 2;
}
@media (min-width: 768px) { .tcp-wrap { padding: 0 56px; } }

/* ── Hero ── */
.tcp-hero {
  padding: 64px 0 48px;
  position: relative;
}
.tcp-hero::before {
  content: "";
  position: absolute; left: 50%; top: -120px;
  width: 900px; height: 600px; border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(196,168,130,0.10) 0%, rgba(126,184,255,0.05) 40%, transparent 68%);
  transform: translateX(-50%); pointer-events: none; z-index: 0;
}
@media (min-width: 768px) { .tcp-hero { padding: 80px 0 64px; } }

.tcp-eyebrow {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--tl-ink-3); font-weight: 500;
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 20px;
}
.tcp-eyebrow-bar { width: 24px; height: 1px; background: var(--tl-accent); opacity: .6; }

.tcp-h1 {
  font-family: var(--font-instrument-serif), ui-serif, Georgia;
  font-weight: 400; font-size: clamp(52px, 9vw, 120px);
  line-height: 0.93; letter-spacing: -0.03em;
  margin: 0 0 28px;
}
.tcp-h1-college {
  font-style: italic;
  color: var(--tl-accent);
  display: block;
}

.tcp-hero-sub {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 12px; letter-spacing: 0.1em;
  color: var(--tl-ink-3); font-weight: 500;
  display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
}
.tcp-hero-sub-sep { width: 1px; height: 14px; background: var(--tl-line-2); }
.tcp-hero-count { color: var(--tl-accent); }

/* ── Cards grid ── */
.tcp-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 48px 0 80px;
}
@media (min-width: 640px)  { .tcp-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .tcp-grid { grid-template-columns: repeat(3, 1fr); } }

/* ── Card ── */
.tcp-card {
  display: block; text-decoration: none;
  background: var(--tl-bg-2);
  border: 1px solid var(--tl-line);
  border-radius: 18px;
  padding: 22px 22px 20px;
  position: relative; overflow: hidden;
  transition: transform .28s cubic-bezier(0.16,1,0.3,1),
              border-color .2s,
              box-shadow .28s cubic-bezier(0.16,1,0.3,1);
  /* entrance animation applied via inline style */
  opacity: 0;
  transform: translateY(20px);
  animation: tcpCardIn .5s cubic-bezier(0.16,1,0.3,1) forwards;
  will-change: transform, opacity;
  color: var(--tl-ink);
}
.tcp-card::before {
  content: "";
  position: absolute; inset: 0; border-radius: 18px;
  background: radial-gradient(ellipse at 30% 0%, rgba(196,168,130,0.07), transparent 65%);
  opacity: 0; transition: opacity .3s;
  pointer-events: none;
}
.tcp-card:hover {
  transform: translateY(-5px);
  border-color: rgba(196,168,130,0.45);
  box-shadow: 0 0 0 1px rgba(196,168,130,0.18),
              0 16px 48px rgba(0,0,0,0.45),
              0 4px 16px rgba(196,168,130,0.10);
}
.tcp-card:hover::before { opacity: 1; }
.tcp-card:focus-visible {
  outline: 2px solid var(--tl-accent); outline-offset: 3px;
}

/* Disabled (CLOSED) */
.tcp-card[aria-disabled="true"] {
  opacity: 0.45;
  pointer-events: none;
  filter: saturate(0.4);
}

/* ── Status pill ── */
.tcp-status {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 4px 10px; border-radius: 999px;
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em;
  margin-bottom: 14px;
}
.tcp-status--open {
  background: rgba(109,212,160,0.14);
  color: #6dd4a0;
  border: 1px solid rgba(109,212,160,0.28);
}
.tcp-status--paused {
  background: rgba(196,168,130,0.14);
  color: var(--tl-accent);
  border: 1px solid rgba(196,168,130,0.28);
}
.tcp-status--closed {
  background: rgba(232,228,220,0.07);
  color: var(--tl-ink-3);
  border: 1px solid rgba(232,228,220,0.12);
}
.tcp-status-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.tcp-status--open   .tcp-status-dot { background: #6dd4a0; box-shadow: 0 0 8px #6dd4a0; animation: tcpPulse 2s infinite; }
.tcp-status--paused .tcp-status-dot { background: var(--tl-accent); }
.tcp-status--closed .tcp-status-dot { background: var(--tl-ink-3); }

/* ── Card body ── */
.tcp-card-name {
  font-family: var(--font-inter), var(--font-geist), ui-sans-serif;
  font-size: 18px; font-weight: 600;
  letter-spacing: -0.018em; line-height: 1.2;
  color: var(--tl-ink); margin: 0 0 6px;
}
.tcp-card-location {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--tl-ink-3); font-weight: 500;
  margin-bottom: 12px;
}
.tcp-card-tagline {
  font-family: var(--font-instrument-serif), ui-serif, Georgia;
  font-style: italic;
  font-size: 14.5px; line-height: 1.5;
  color: var(--tl-ink-2);
  margin-bottom: 16px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

/* ── Card footer ── */
.tcp-card-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 14px;
  border-top: 1px solid var(--tl-line);
  margin-top: auto;
}
.tcp-mess-badge {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 5px;
  background: var(--tl-bg-3); border: 1px solid var(--tl-line-2);
  color: var(--tl-ink-3);
}
.tcp-card-arrow {
  font-size: 14px; color: var(--tl-ink-4);
  transition: transform .2s, color .2s;
}
.tcp-card:hover .tcp-card-arrow {
  transform: translateX(4px);
  color: var(--tl-accent);
}

/* ── Footer ── */
.tcp-footer {
  border-top: 1px solid var(--tl-line);
  padding: 28px 0 40px;
}
.tcp-footer-inner {
  display: flex; flex-wrap: wrap; align-items: center;
  justify-content: space-between; gap: 12px;
}
.tcp-footer-brand {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 11px; color: var(--tl-ink-4); letter-spacing: 0.1em; font-weight: 500;
}
.tcp-footer-updated {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 11px; color: var(--tl-ink-4); letter-spacing: 0.06em;
}

/* ── Animations ── */
@keyframes tcpCardIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes tcpPulse {
  0%   { box-shadow: 0 0 0 0 rgba(109,212,160,0.5); }
  70%  { box-shadow: 0 0 0 7px rgba(109,212,160,0); }
  100% { box-shadow: 0 0 0 0 rgba(109,212,160,0); }
}
@media (prefers-reduced-motion: reduce) {
  .tcp-card { animation: none; opacity: 1; transform: none; }
  .tcp-status-dot { animation: none; }
}
`;

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusPill({ canteen }: { canteen: CollegeCanteen }) {
  if (!canteen.is_open) {
    return (
      <span className="tcp-status tcp-status--closed">
        <span className="tcp-status-dot" />
        CLOSED
      </span>
    );
  }
  if (canteen.paused_until) {
    return (
      <span className="tcp-status tcp-status--paused">
        <span className="tcp-status-dot" />
        PAUSED
      </span>
    );
  }
  const wait = Math.min(20, Math.max(3, 3 + canteen.pending_orders_count));
  return (
    <span className="tcp-status tcp-status--open">
      <span className="tcp-status-dot" />
      OPEN&nbsp;·&nbsp;~{wait}&nbsp;min
    </span>
  );
}

function MessTypeBadge({ type }: { type: string | null }) {
  const label =
    type === "mess"
      ? "MESS"
      : type === "food_court"
      ? "FOOD COURT"
      : "CANTEEN";
  return <span className="tcp-mess-badge">{label}</span>;
}

function CanteenCard({
  canteen,
  index,
}: {
  canteen: CollegeCanteen;
  index: number;
}) {
  const disabled = !canteen.is_open;
  const location = [canteen.building, canteen.zone].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/c/${canteen.slug}/menu`}
      className="tcp-card"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <StatusPill canteen={canteen} />

      <h2 className="tcp-card-name">{canteen.name}</h2>

      {location && (
        <p className="tcp-card-location">{location}</p>
      )}

      {canteen.hero_tagline && (
        <p className="tcp-card-tagline">{canteen.hero_tagline}</p>
      )}

      <div className="tcp-card-footer">
        <MessTypeBadge type={canteen.mess_type} />
        <span className="tcp-card-arrow" aria-hidden="true">→</span>
      </div>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

/** Sort: OPEN first, then PAUSED, then CLOSED. Within each group preserve RPC order. */
function sortCanteens(canteens: CollegeCanteen[]): CollegeCanteen[] {
  const rank = (c: CollegeCanteen): number => {
    if (!c.is_open) return 2;
    if (c.paused_until) return 1;
    return 0;
  };
  return [...canteens].sort((a, b) => rank(a) - rank(b));
}

export default async function CollegePortalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const rawCanteens = await collegeCanteens(slug);
  if (!rawCanteens || rawCanteens.length === 0) notFound();

  const canteens = sortCanteens(rawCanteens);
  const openCount = canteens.filter((c) => c.is_open && !c.paused_until).length;
  const allClosed = openCount === 0;
  const collegeName = slug.toUpperCase();

  return (
    <div className="tcp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="tcp-grain" aria-hidden="true" />

      {/* Nav */}
      <nav className="tcp-nav" aria-label="Site navigation">
        <div className="tcp-nav-inner">
          <Link href="/" className="tcp-brand" aria-label="Tray home">
            <span className="tcp-brand-mark" aria-hidden="true">T</span>
            Tray<span className="tcp-brand-dot">.</span>
          </Link>
          <Link href="/" className="tcp-nav-back" aria-label="Back to home">
            ← home
          </Link>
        </div>
      </nav>

      <main id="main">
        {/* Hero */}
        <section className="tcp-hero tcp-wrap" aria-labelledby="portal-heading">
          <div className="tcp-eyebrow" aria-hidden="true">
            <span className="tcp-eyebrow-bar" aria-hidden="true" />
            <span>Campus canteens</span>
            <span className="tcp-eyebrow-bar" aria-hidden="true" />
          </div>

          <h1 className="tcp-h1" id="portal-heading">
            Pick a canteen.
            <span className="tcp-h1-college">{collegeName}</span>
          </h1>

          <div className="tcp-hero-sub" aria-label="Live canteen stats">
            <span>
              <span
                className="tcp-hero-count"
                style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
              >
                {canteens.length}
              </span>
              &nbsp;canteen{canteens.length === 1 ? "" : "s"}
            </span>
            <span className="tcp-hero-sub-sep" aria-hidden="true" />
            <span>
              <span
                className="tcp-hero-count"
                style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
              >
                {openCount}
              </span>
              &nbsp;open
            </span>
            <span className="tcp-hero-sub-sep" aria-hidden="true" />
            <span>live status · 30 s refresh</span>
          </div>
        </section>

        {/* All-closed banner */}
        {allClosed && (
          <section className="tcp-wrap" aria-live="polite">
            <div
              style={{
                background: "rgba(232,228,220,0.04)",
                border: "1px solid rgba(232,228,220,0.10)",
                borderRadius: "14px",
                padding: "28px 32px",
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🌙</div>
              <p
                style={{
                  fontFamily: "var(--font-instrument-serif), ui-serif, Georgia",
                  fontSize: "22px",
                  fontStyle: "italic",
                  color: "var(--tl-ink-2)",
                  margin: "0 0 6px",
                }}
              >
                All canteens are closed right now.
              </p>
              <p
                style={{
                  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--tl-ink-3)",
                  margin: 0,
                }}
              >
                Check back during service hours — this page refreshes every 30 s.
              </p>
            </div>
          </section>
        )}

        {/* Cards */}
        <section className="tcp-wrap" aria-label="Canteen list">
          <ul
            className="tcp-grid"
            role="list"
            aria-label={`${canteens.length} canteens at ${collegeName}`}
          >
            {canteens.map((canteen, i) => (
              <li key={canteen.slug}>
                <CanteenCard canteen={canteen} index={i} />
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="tcp-footer tcp-wrap">
        <div className="tcp-footer-inner">
          <span className="tcp-footer-brand">
            TRAY · ONE PLATFORM, EVERY CANTEEN
          </span>
          <span className="tcp-footer-updated">
            <LiveTimestamp />
          </span>
        </div>
      </footer>
    </div>
  );
}
