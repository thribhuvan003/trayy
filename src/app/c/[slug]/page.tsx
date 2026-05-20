import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveTenant } from "@/lib/tenant";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/db/types";
import { PausedCountdown } from "./paused-countdown";

export const dynamic = "force-dynamic";

type Params = { slug: string };

type TenantGateRow = {
  is_open: boolean;
  paused_until: string | null;
  opens_at: string | null;
  closes_at: string | null;
  college_slug: string | null;
};

/** Direct (uncached) fetch of gate-relevant fields from the tenants table,
 *  joining colleges so we get the college slug for the "See other canteens"
 *  link. We intentionally skip the edge-cached resolveTenant() so that
 *  open/closed state is always fresh when a student scans a QR code. */
async function fetchTenantGate(slug: string): Promise<TenantGateRow | null> {
  const client = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await client
    .from("tenants")
    .select("is_open, paused_until, opens_at, closes_at, colleges(slug)")
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  const row = data as unknown as {
    is_open: boolean;
    paused_until: string | null;
    opens_at: string | null;
    closes_at: string | null;
    colleges: { slug: string } | null;
  };
  return {
    is_open: row.is_open,
    paused_until: row.paused_until,
    opens_at: row.opens_at,
    closes_at: row.closes_at,
    college_slug: row.colleges?.slug ?? null,
  };
}

/** Format a UTC ISO timestamp as a readable local time in Asia/Kolkata. */
function formatIST(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) return { title: "Canteen not found" };
  return {
    title: `${tenant.name} — Tray`,
    description: tenant.hero_tagline ?? `Order from ${tenant.name}.`,
  };
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
.cg {
  --cg-bg:     #0a0f1e;
  --cg-bg-2:   #111827;
  --cg-line:   rgba(232,228,220,0.09);
  --cg-ink:    #e8e4dc;
  --cg-ink-2:  rgba(232,228,220,0.55);
  --cg-ink-3:  rgba(232,228,220,0.32);
  --cg-accent: #c4a882;
  --cg-green:  #6dd4a0;

  min-height: 100dvh;
  background: var(--cg-bg);
  color: var(--cg-ink);
  font-family: var(--font-geist), var(--font-inter), ui-sans-serif, system-ui;
  -webkit-font-smoothing: antialiased;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 32px 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

/* subtle radial glow behind the icon */
.cg::before {
  content: "";
  position: absolute; left: 50%; top: 30%;
  width: 600px; height: 400px; border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(196,168,130,0.08) 0%, transparent 65%);
  transform: translateX(-50%) translateY(-50%);
  pointer-events: none;
}

.cg-grain {
  position: fixed; inset: -30%; pointer-events: none; z-index: 1; opacity: .04; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.cg-inner {
  position: relative; z-index: 2;
  max-width: 420px; width: 100%;
}

.cg-icon {
  width: 72px; height: 72px; border-radius: 20px;
  background: var(--cg-bg-2);
  border: 1px solid var(--cg-line);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 36px; margin: 0 auto 28px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.cg-eyebrow {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--cg-ink-3); font-weight: 500; margin-bottom: 12px;
}

.cg-name {
  font-family: var(--font-instrument-serif), ui-serif, Georgia;
  font-size: clamp(28px, 6vw, 40px);
  font-weight: 400; line-height: 1.1; letter-spacing: -0.02em;
  color: var(--cg-ink); margin: 0 0 8px;
}

.cg-status {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 13px; letter-spacing: 0.04em;
  color: var(--cg-ink-2); margin: 0 0 24px;
}

.cg-hours {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 999px;
  background: rgba(232,228,220,0.05);
  border: 1px solid var(--cg-line);
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 12px; letter-spacing: 0.06em;
  color: var(--cg-ink-2); margin-bottom: 28px;
}

.cg-back {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--cg-ink-3); text-decoration: none;
  padding: 10px 20px; border-radius: 999px;
  border: 1px solid var(--cg-line);
  transition: color .15s, border-color .15s;
}
.cg-back:hover { color: var(--cg-ink); border-color: rgba(232,228,220,0.25); }

/* paused-specific */
.cg-paused-accent { color: var(--cg-accent); }

/* Countdown */
.cg-countdown {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: clamp(40px, 10vw, 64px); font-weight: 700; letter-spacing: -0.04em;
  color: var(--cg-accent); line-height: 1; margin: 4px 0 24px;
}
.cg-countdown-label {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--cg-ink-3); margin-bottom: 28px;
}
`;

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CanteenLandingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  // Resolve basic tenant info (edge-cached, fine for name/college).
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();

  // Fetch gate state fresh on every request — open/closed must never be stale.
  const gate = await fetchTenantGate(slug);
  if (!gate) notFound();

  const now = new Date();
  const isPaused =
    gate.is_open &&
    gate.paused_until !== null &&
    new Date(gate.paused_until) > now;

  // Happy path: canteen is open and not paused → jump to menu.
  if (gate.is_open && !isPaused) {
    redirect(`/c/${slug}/menu`);
  }

  const collegeHref = gate.college_slug
    ? `/college/${gate.college_slug}`
    : "/";

  // ── Paused state ──────────────────────────────────────────────────────────
  if (isPaused && gate.paused_until) {
    const backAt = formatIST(gate.paused_until);
    return (
      <div className="cg">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="cg-grain" aria-hidden="true" />
        <div className="cg-inner">
          <div className="cg-icon" aria-hidden="true">🍳</div>
          <div className="cg-eyebrow">{tenant.name}</div>
          <h1 className="cg-name">
            Taking a short <span className="cg-paused-accent">break.</span>
          </h1>
          <p className="cg-status">
            Back at <strong>{backAt}</strong>
          </p>
          <PausedCountdown pausedUntil={gate.paused_until} />
          <div>
            <Link href={collegeHref} className="cg-back">
              ← See other canteens
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Closed state ──────────────────────────────────────────────────────────
  const hasHours = gate.opens_at || gate.closes_at;
  return (
    <div className="cg">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cg-grain" aria-hidden="true" />
      <div className="cg-inner">
        <div className="cg-icon" aria-hidden="true">🌙</div>
        <div className="cg-eyebrow">{tenant.name}</div>
        <h1 className="cg-name">
          We&rsquo;re <span className="cg-paused-accent">closed</span> right now.
        </h1>
        <p className="cg-status">Check back during service hours.</p>

        {hasHours && (
          <div className="cg-hours" aria-label="Operating hours">
            <span>🕐</span>
            {gate.opens_at && gate.closes_at
              ? `Open ${gate.opens_at} – ${gate.closes_at}`
              : gate.opens_at
              ? `Opens at ${gate.opens_at}`
              : `Closes at ${gate.closes_at}`}
          </div>
        )}

        <div>
          <Link href={collegeHref} className="cg-back">
            ← See other canteens
          </Link>
        </div>
      </div>
    </div>
  );
}
