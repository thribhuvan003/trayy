import { getAdminClient } from "@/lib/supabase/admin";
import { updateCanteenHours, pauseCanteen, updateCanteenSettings } from "../_actions";
import type { Tenant } from "@/lib/db/types";
import { requireTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function formatPausedUntil(pausedUntil: string | null): string | null {
  if (!pausedUntil) return null;
  const until = new Date(pausedUntil);
  const now = new Date();
  const diffMs = until.getTime() - now.getTime();
  if (diffMs <= 0) return null;
  const diffMin = Math.ceil(diffMs / 60_000);
  if (diffMin >= 60) {
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${diffMin}m`;
}

export default async function SettingsPage() {
  // Production-grade tenant context — UPI VPA changes here must instantly affect the student pay QR for this canteen only.
  const { tenant } = await requireTenantContext();

  // Fetch full tenant row (resolveTenant only returns a subset)
  const admin = getAdminClient(tenant.id);
  const { data: tenantRow } = await admin
    .from("tenants")
    .select("is_open, opens_at, closes_at, paused_until, guest_orders_enabled, upi_vpa")
    .eq("id", tenant.id)
    .single<
      Pick<
        Tenant,
        "is_open" | "opens_at" | "closes_at" | "paused_until" | "guest_orders_enabled" | "upi_vpa"
      >
    >();

  const row = tenantRow ?? {
    is_open: false,
    opens_at: null,
    closes_at: null,
    paused_until: null,
    guest_orders_enabled: false,
    upi_vpa: null,
  };

  const pauseCountdown = formatPausedUntil(row.paused_until);
  const isPaused = pauseCountdown !== null;

  // ── Bound server actions (form bindings) ──────────────────────────────────

  async function handleHours(fd: FormData) {
    "use server";
    const isOpen = fd.get("is_open") === "on";
    const opensAt = (fd.get("opens_at") as string | null) || null;
    const closesAt = (fd.get("closes_at") as string | null) || null;
    await updateCanteenHours({ isOpen, opensAt, closesAt });
  }

  async function handlePause15(fd: FormData) {
    "use server";
    void fd;
    await pauseCanteen(15);
  }

  async function handlePause30(fd: FormData) {
    "use server";
    void fd;
    await pauseCanteen(30);
  }

  async function handlePause60(fd: FormData) {
    "use server";
    void fd;
    await pauseCanteen(60);
  }

  async function handleClearPause(fd: FormData) {
    "use server";
    void fd;
    await pauseCanteen(0);
  }

  async function handleSettings(fd: FormData) {
    "use server";
    const guestOrdersEnabled = fd.get("guest_orders_enabled") === "on";
    const rawVpa = (fd.get("upi_vpa") as string | null)?.trim() || null;

    // Scenario 1/2: Validate UPI VPA format before saving so money never goes
    // to an invalid address. Format: localpart@provider (e.g. name@okaxis, 9876543210@paytm)
    // Real-world format from NPCI spec: alphanumeric + dots/hyphens @ provider
    if (rawVpa) {
      const vpaRegex = /^[a-zA-Z0-9.\-_+]{2,256}@[a-zA-Z]{2,64}$/;
      if (!vpaRegex.test(rawVpa)) {
        // Server actions can't return errors to the form directly without useActionState,
        // but we guard against obviously malformed VPAs. The input has pattern validation on the client too.
        throw new Error(`Invalid UPI VPA format: "${rawVpa}". Expected format: name@bankcode (e.g. 9876543210@paytm)`);
      }
    }
    await updateCanteenSettings({ guestOrdersEnabled, upiVpa: rawVpa });
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-7">
        <h1 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-tight">
          Settings
        </h1>
        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-graphite-400 mt-0.5">
          Canteen configuration
        </div>
      </div>

      <div className="flex flex-col gap-6 max-w-xl">
        {/* ── 1. Canteen status ─────────────────────────────────────── */}
        <section className="rounded-xl border border-graphite-200/10 bg-graphite-800/40 p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-graphite-300 mb-4">
            Canteen status
          </h2>

          {/* Open/close toggle */}
          <form action={handleHours} className="mb-5">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                name="is_open"
                defaultChecked={row.is_open}
                className="h-4 w-4 rounded border-graphite-400 accent-lime bg-graphite-700 focus:ring-lime"
              />
              {/* hidden time fields preserve current values when toggling */}
              <input type="hidden" name="opens_at" value={row.opens_at ?? ""} />
              <input type="hidden" name="closes_at" value={row.closes_at ?? ""} />
              <span className="text-[13px] text-graphite-200 font-medium">
                Canteen is open
              </span>
            </label>
            <button
              type="submit"
              className="mt-3 h-8 px-4 rounded-md bg-lime text-graphite-900 text-[12px] font-semibold hover:bg-lime/90 transition-colors"
            >
              Save open/close
            </button>
          </form>

          {/* Pause orders */}
          <div className="border-t border-graphite-200/10 pt-4">
            <div className="text-[12px] text-graphite-300 font-medium mb-2">
              Pause orders
              {isPaused && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono">
                  Paused — resumes in {pauseCountdown}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={handlePause15}>
                <button
                  type="submit"
                  className="h-8 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono text-graphite-300 hover:border-amber-400 hover:text-amber-400 transition-colors"
                >
                  15 min
                </button>
              </form>
              <form action={handlePause30}>
                <button
                  type="submit"
                  className="h-8 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono text-graphite-300 hover:border-amber-400 hover:text-amber-400 transition-colors"
                >
                  30 min
                </button>
              </form>
              <form action={handlePause60}>
                <button
                  type="submit"
                  className="h-8 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono text-graphite-300 hover:border-amber-400 hover:text-amber-400 transition-colors"
                >
                  60 min
                </button>
              </form>
              {isPaused && (
                <form action={handleClearPause}>
                  <button
                    type="submit"
                    className="h-8 px-3 rounded-md border border-emerald-500/40 text-[11px] font-mono text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    Clear pause
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* ── 2. Operating hours ────────────────────────────────────── */}
        <section className="rounded-xl border border-graphite-200/10 bg-graphite-800/40 p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-graphite-300 mb-4">
            Operating hours
          </h2>
          <form action={handleHours} className="flex flex-col gap-4">
            {/* preserve is_open when changing hours */}
            <input type="hidden" name="is_open" value={row.is_open ? "on" : ""} />
            <div className="flex gap-4 flex-wrap">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-graphite-400">
                  Opens at
                </span>
                <input
                  type="time"
                  name="opens_at"
                  defaultValue={row.opens_at ?? ""}
                  className="h-9 px-3 rounded-md border border-graphite-200/15 bg-graphite-700/60 text-[13px] text-graphite-200 focus:outline-none focus:border-lime/60 transition-colors"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-graphite-400">
                  Closes at
                </span>
                <input
                  type="time"
                  name="closes_at"
                  defaultValue={row.closes_at ?? ""}
                  className="h-9 px-3 rounded-md border border-graphite-200/15 bg-graphite-700/60 text-[13px] text-graphite-200 focus:outline-none focus:border-lime/60 transition-colors"
                />
              </label>
            </div>
            <div>
              <button
                type="submit"
                className="h-8 px-4 rounded-md bg-lime text-graphite-900 text-[12px] font-semibold hover:bg-lime/90 transition-colors"
              >
                Save hours
              </button>
            </div>
          </form>
        </section>

        {/* ── 3 & 4. Guest orders + UPI VPA (single form) ───────────── */}
        <section className="rounded-xl border border-graphite-200/10 bg-graphite-800/40 p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-graphite-300 mb-4">
            Ordering settings
          </h2>
          <form action={handleSettings} className="flex flex-col gap-5">
            {/* Guest orders */}
            <div>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="guest_orders_enabled"
                  defaultChecked={row.guest_orders_enabled}
                  className="mt-0.5 h-4 w-4 rounded border-graphite-400 accent-lime bg-graphite-700 focus:ring-lime"
                />
                <div>
                  <div className="text-[13px] text-graphite-200 font-medium">
                    Allow guest orders
                  </div>
                  <div className="text-[11px] text-graphite-400 mt-0.5">
                    Allow visitors without a college email to order
                  </div>
                </div>
              </label>
            </div>

            {/* UPI ID */}
            <div className="border-t border-graphite-200/10 pt-4 flex flex-col gap-1.5">
              <label
                htmlFor="upi_vpa"
                className="text-[11px] font-mono uppercase tracking-[0.1em] text-graphite-400"
              >
                UPI ID <span className="normal-case tracking-normal font-sans text-graphite-500">(your payment address)</span>
              </label>
              <input
                id="upi_vpa"
                type="text"
                name="upi_vpa"
                defaultValue={row.upi_vpa ?? ""}
                placeholder="e.g. canteen@okaxis or 9876543210@ybl"
                pattern="^[a-zA-Z0-9.\-_+]{2,256}@[a-zA-Z]{2,64}$"
                title="Enter a valid UPI VPA: localpart@provider (e.g. 9876543210@paytm)"
                spellCheck={false}
                autoComplete="off"
                className="h-9 px-3 rounded-md border border-graphite-200/15 bg-graphite-700/60 text-[13px] text-graphite-200 placeholder:text-graphite-500 focus:outline-none focus:border-lime/60 transition-colors invalid:border-rose-500/60"
              />
              <p className="text-[11px] text-graphite-500">
                Your UPI ID (e.g. yourname@okaxis). Students pay <strong className="text-graphite-300">directly</strong> to this — money lands in your bank, not ours. Double-check it before saving. Wrong VPA = wrong bank.
              </p>
            </div>

            <div>
              <button
                type="submit"
                className="h-8 px-4 rounded-md bg-lime text-graphite-900 text-[12px] font-semibold hover:bg-lime/90 transition-colors"
              >
                Save settings
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
