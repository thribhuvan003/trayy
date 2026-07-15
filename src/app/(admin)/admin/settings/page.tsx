import { getAdminClient } from "@/lib/supabase/admin";
import { updateCanteenHours, pauseCanteen, updateCanteenSettings } from "../_actions";
import type { Tenant } from "@/lib/db/types";
import { requireTenantContext } from "@/lib/tenant";
import { UpiVpaField } from "@/components/portal-admin/upi-vpa-field";

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
    .select("is_open, opens_at, closes_at, paused_until, guest_orders_enabled, upi_vpa, payment_mode, admin_phone, order_mode")
    .eq("id", tenant.id)
    .single<
      Pick<Tenant, "is_open" | "opens_at" | "closes_at" | "paused_until" | "guest_orders_enabled" | "upi_vpa"> & { payment_mode?: string; admin_phone?: string | null; order_mode?: string }
    >();

  const row = tenantRow ?? {
    is_open: false,
    opens_at: null,
    closes_at: null,
    paused_until: null,
    guest_orders_enabled: false,
    upi_vpa: null,
    payment_mode: "direct_upi" as string,
    admin_phone: null,
    order_mode: "kitchen_flow" as string,
  };
  const currentPaymentMode = (row as any).payment_mode === "razorpay" ? "razorpay" : "direct_upi";
  const currentOrderMode = (row as any).order_mode === "token_prepaid" ? "token_prepaid" : "kitchen_flow";

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
    const rawVpa = (fd.get("upi_vpa") as string | null)?.trim().toLowerCase() || null;
    const vpaVerified = fd.get("upi_vpa_verified") === "1";
    const adminPhone = (fd.get("admin_phone") as string | null)?.trim() || null;

    // Only format-check the VPA — no Razorpay API call required.
    // The Verify button in the UI is a convenience check, not a hard gate.
    if (rawVpa) {
      const vpaRegex = /^[a-zA-Z0-9.\-_+]{2,256}@[a-zA-Z]{2,64}$/;
      if (!vpaRegex.test(rawVpa)) {
        throw new Error(`"${rawVpa}" doesn't look like a UPI ID. Use format: 9876543210@ybl or canteen@okaxis`);
      }
    }
    void vpaVerified; // no longer a hard gate
    const paymentMode = (fd.get("payment_mode") as string | null) === "razorpay" ? "razorpay" : "direct_upi";
    const orderMode = (fd.get("order_mode") as string | null) === "token_prepaid" ? "token_prepaid" : "kitchen_flow";
    await updateCanteenSettings({ guestOrdersEnabled, upiVpa: rawVpa, paymentMode, adminPhone, orderMode });
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-7">
        <h1 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-tight">
          Settings
        </h1>
        <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-graphite-400 mt-0.5">
          Pay · service · modes
        </div>
      </div>

      <div className="flex flex-col gap-6 max-w-xl">
        {/* ═══ SERVICE (open / pause / hours) — also on Today home ═══ */}
        <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-lime/80 px-0.5">
          Service · open & hours
        </div>
        <section className="rounded-xl border border-graphite-200/10 bg-graphite-800/40 p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-graphite-300 mb-4">
            Open / close
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

        {/* ═══ PAY — UPI & payment mode ═══ */}
        <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-lime/80 px-0.5 mt-2">
          Pay · students pay you (zero cut on direct UPI)
        </div>
        <section className="rounded-xl border border-graphite-200/10 bg-graphite-800/40 p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-graphite-300 mb-4">
            Money in
          </h2>
          <form action={handleSettings} className="flex flex-col gap-5">
            {/* key= forces remount when upi_vpa changes after save */}
            <UpiVpaField key={row.upi_vpa ?? "__no_upi__"} currentVpa={row.upi_vpa} />

            {/* Guest orders — keep in same form */}
            <div className="border-t border-graphite-200/10 pt-4">
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
                    Visitors without a college email can order
                  </div>
                </div>
              </label>
            </div>

            {/* Admin SMS notifications */}
            <div className="border-t border-graphite-200/10 pt-4">
              <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-graphite-400 mb-1">
                Admin phone (SMS alerts)
              </p>
              <p className="text-[11px] text-graphite-500 mb-3">
                Enter your mobile number to receive an SMS when a new order arrives.
                Requires Twilio — leave blank to disable.
              </p>
              <input
                type="tel"
                name="admin_phone"
                defaultValue={(row as any).admin_phone ?? ""}
                placeholder="9876543210"
                autoComplete="tel"
                className="h-9 px-3 rounded-md border border-graphite-200/15 bg-graphite-700/60 text-[13px] text-graphite-200 placeholder-graphite-500 focus:outline-none focus:border-lime/60 transition-colors w-full max-w-xs"
              />
            </div>

            {/* Payment Mode selector */}
            <div className="border-t border-graphite-200/10 pt-4">
              <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-graphite-400 mb-3">
                Payment Mode
              </p>
              <div className="flex flex-col gap-3">

                {/* Direct UPI */}
                <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg border border-graphite-200/10 p-3 hover:border-graphite-200/25 transition-colors"
                  style={{ background: currentPaymentMode === "direct_upi" ? "rgba(210,251,80,0.05)" : "transparent", borderColor: currentPaymentMode === "direct_upi" ? "rgba(210,251,80,0.3)" : undefined }}>
                  <input type="radio" name="payment_mode" value="direct_upi"
                    defaultChecked={currentPaymentMode === "direct_upi"}
                    className="mt-0.5 accent-lime h-4 w-4 shrink-0" />
                  <div>
                    <div className="text-[13px] text-graphite-200 font-semibold flex items-center gap-2">
                      Direct UPI
                      <span className="text-[9px] font-mono bg-lime/20 text-lime px-1.5 py-0.5 rounded font-bold tracking-wide">DEFAULT</span>
                    </div>
                    <div className="text-[11.5px] text-graphite-400 mt-1 leading-[1.6]">
                      Money lands in your bank <strong className="text-graphite-300">the moment</strong> a student pays — instant, directly to your UPI. Kitchen staff must check their PhonePe soundbox before cooking each order.
                    </div>
                  </div>
                </label>

                {/* Razorpay Automatic */}
                <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg border border-graphite-200/10 p-3 hover:border-graphite-200/25 transition-colors"
                  style={{ background: currentPaymentMode === "razorpay" ? "rgba(210,251,80,0.05)" : "transparent", borderColor: currentPaymentMode === "razorpay" ? "rgba(210,251,80,0.3)" : undefined }}>
                  <input type="radio" name="payment_mode" value="razorpay"
                    defaultChecked={currentPaymentMode === "razorpay"}
                    className="mt-0.5 accent-lime h-4 w-4 shrink-0" />
                  <div>
                    <div className="text-[13px] text-graphite-200 font-semibold">
                      Razorpay Automatic
                    </div>
                    <div className="text-[11.5px] text-graphite-400 mt-1 leading-[1.6]">
                      System verifies payment automatically via Razorpay. No &quot;I&apos;ve paid&quot; button, no kitchen manual check needed — orders reach the board <strong className="text-graphite-300">only when money is genuinely captured</strong>. Requires live Razorpay keys in Vercel.
                    </div>
                    <div className="mt-2 rounded-md px-3 py-2 text-[11px] leading-snug" style={{ background: "rgba(255,174,41,0.1)", border: "1px solid rgba(255,174,41,0.25)", color: "#ffae29" }}>
                      ⏱ <strong>Important:</strong> Money settles to your bank in <strong>1–2 business days</strong> (T+1/T+2) via Razorpay — not instantly. Students see &ldquo;Order confirmed&rdquo; right away, but the bank transfer to you takes 1–2 days. This is how Swiggy, Zomato, and all Razorpay merchants work in India.
                    </div>
                  </div>
                </label>

              </div>
            </div>

            {/* Order Flow selector */}
            <div className="border-t border-graphite-200/10 pt-4">
              <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-graphite-400 mb-3">
                Order Flow
              </p>
              <div className="flex flex-col gap-3">

                {/* Kitchen board */}
                <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg border border-graphite-200/10 p-3 hover:border-graphite-200/25 transition-colors"
                  style={{ background: currentOrderMode === "kitchen_flow" ? "rgba(210,251,80,0.05)" : "transparent", borderColor: currentOrderMode === "kitchen_flow" ? "rgba(210,251,80,0.3)" : undefined }}>
                  <input type="radio" name="order_mode" value="kitchen_flow"
                    defaultChecked={currentOrderMode === "kitchen_flow"}
                    className="mt-0.5 accent-lime h-4 w-4 shrink-0" />
                  <div>
                    <div className="text-[13px] text-graphite-200 font-semibold flex items-center gap-2">
                      Kitchen board
                      <span className="text-[9px] font-mono bg-lime/20 text-lime px-1.5 py-0.5 rounded font-bold tracking-wide">DEFAULT</span>
                    </div>
                    <div className="text-[11.5px] text-graphite-400 mt-1 leading-[1.6]">
                      Staff work each order on the kitchen screen: accept, prepare, mark ready, verify the pickup code at handover. Right for canteens and messes with kitchen staff.
                    </div>
                  </div>
                </label>

                {/* Token counter */}
                <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg border border-graphite-200/10 p-3 hover:border-graphite-200/25 transition-colors"
                  style={{ background: currentOrderMode === "token_prepaid" ? "rgba(210,251,80,0.05)" : "transparent", borderColor: currentOrderMode === "token_prepaid" ? "rgba(210,251,80,0.3)" : undefined }}>
                  <input type="radio" name="order_mode" value="token_prepaid"
                    defaultChecked={currentOrderMode === "token_prepaid"}
                    className="mt-0.5 accent-lime h-4 w-4 shrink-0" />
                  <div>
                    <div className="text-[13px] text-graphite-200 font-semibold">
                      Token counter
                    </div>
                    <div className="text-[11.5px] text-graphite-400 mt-1 leading-[1.6]">
                      No screens while you cook. Paid orders are confirmed automatically; the customer&apos;s phone shows a token number (like T-2431) and a PAID stamp — they show it at the counter, you hand over the food. Built for stalls and tiffin counters run by one or two people.
                    </div>
                  </div>
                </label>

              </div>
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
