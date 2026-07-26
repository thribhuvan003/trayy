import { getAdminClient } from "@/lib/supabase/admin";
import { updateCanteenHours, pauseCanteen, updateCanteenSettings } from "../_actions";
import type { Tenant } from "@/lib/db/types";
import { requireTenantContext } from "@/lib/tenant";
import { UpiVpaField } from "@/components/portal-admin/upi-vpa-field";
import { AdminSubmitButton } from "@/components/portal-admin/admin-submit-button";
import { PaymentOrderModeFields } from "@/components/portal-admin/payment-order-mode-fields";
import { featureFlags } from "@/lib/env";
import { redirect } from "next/navigation";

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

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const settingsParams = await searchParams;
  const settingsError =
    typeof settingsParams.error === "string" ? settingsParams.error : null;
  const settingsSaved = typeof settingsParams.saved === "string";
  // Production-grade tenant context — UPI VPA changes here must instantly affect the student pay QR for this canteen only.
  const { tenant } = await requireTenantContext();

  // Fetch full tenant row (resolveTenant only returns a subset)
  const admin = getAdminClient(tenant.id);
  const { data: tenantRow, error: tenantError } = await admin
    .from("tenants")
    .select("is_open, opens_at, closes_at, paused_until, guest_orders_enabled, upi_vpa, payment_mode, admin_phone, order_mode")
    .eq("id", tenant.id)
    .single<
      Pick<Tenant, "is_open" | "opens_at" | "closes_at" | "paused_until" | "guest_orders_enabled" | "upi_vpa"> & { payment_mode?: string; admin_phone?: string | null; order_mode?: string }
    >();

  if (tenantError || !tenantRow) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-tight">
          Settings
        </h1>
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-4 text-[13px] leading-relaxed text-red-200"
        >
          Settings could not be loaded. No changes were made. Reload this page and try
          again.
        </div>
      </div>
    );
  }

  const row = tenantRow;
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
    const result = await updateCanteenHours({ isOpen, opensAt, closesAt });
    if (!result.ok) {
      redirect(
        `/c/${tenant.slug}/admin/settings?error=${encodeURIComponent(
          result.error ?? "Hours could not be saved"
        )}`
      );
    }
    redirect(`/c/${tenant.slug}/admin/settings?saved=hours`);
  }

  async function handlePause15(fd: FormData) {
    "use server";
    void fd;
    const result = await pauseCanteen(15);
    if (!result.ok) {
      redirect(
        `/c/${tenant.slug}/admin/settings?error=${encodeURIComponent(
          result.error ?? "Orders could not be paused"
        )}`
      );
    }
    redirect(`/c/${tenant.slug}/admin/settings?saved=pause`);
  }

  async function handlePause30(fd: FormData) {
    "use server";
    void fd;
    const result = await pauseCanteen(30);
    if (!result.ok) {
      redirect(
        `/c/${tenant.slug}/admin/settings?error=${encodeURIComponent(
          result.error ?? "Orders could not be paused"
        )}`
      );
    }
    redirect(`/c/${tenant.slug}/admin/settings?saved=pause`);
  }

  async function handlePause60(fd: FormData) {
    "use server";
    void fd;
    const result = await pauseCanteen(60);
    if (!result.ok) {
      redirect(
        `/c/${tenant.slug}/admin/settings?error=${encodeURIComponent(
          result.error ?? "Orders could not be paused"
        )}`
      );
    }
    redirect(`/c/${tenant.slug}/admin/settings?saved=pause`);
  }

  async function handleClearPause(fd: FormData) {
    "use server";
    void fd;
    const result = await pauseCanteen(0);
    if (!result.ok) {
      redirect(
        `/c/${tenant.slug}/admin/settings?error=${encodeURIComponent(
          result.error ?? "Pause could not be cleared"
        )}`
      );
    }
    redirect(`/c/${tenant.slug}/admin/settings?saved=pause`);
  }

  async function handleSettings(fd: FormData) {
    "use server";
    const guestOrdersEnabled = fd.get("guest_orders_enabled") === "on";
    const rawVpa = (fd.get("upi_vpa") as string | null)?.trim().toLowerCase() || null;
    const adminPhone = (fd.get("admin_phone") as string | null)?.trim() || null;
    const paymentMode = (fd.get("payment_mode") as string | null) === "razorpay" ? "razorpay" : "direct_upi";
    const orderMode = (fd.get("order_mode") as string | null) === "token_prepaid" ? "token_prepaid" : "kitchen_flow";
    const result = await updateCanteenSettings({
      guestOrdersEnabled,
      upiVpa: rawVpa,
      paymentMode,
      adminPhone,
      orderMode,
    });
    if (!result.ok) {
      redirect(
        `/c/${tenant.slug}/admin/settings?error=${encodeURIComponent(
          result.error ?? "Settings could not be saved"
        )}`
      );
    }
    redirect(`/c/${tenant.slug}/admin/settings?saved=1`);
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
        {settingsError && (
          <div
            role="alert"
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-200"
          >
            {settingsError}
          </div>
        )}
        {settingsSaved && (
          <div
            role="status"
            className="rounded-xl border border-lime/30 bg-lime/10 px-4 py-3 text-[13px] text-lime"
          >
            Settings saved.
          </div>
        )}
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
            <AdminSubmitButton
              pendingLabel="Saving…"
              className="mt-3 h-8 px-4 rounded-md bg-[#1b6b3a] text-white text-[12px] font-semibold hover:bg-[#155b31] transition-colors"
            >
              Save open/close
            </AdminSubmitButton>
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
                <AdminSubmitButton
                  pendingLabel="Pausing…"
                  className="h-8 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono text-graphite-300 hover:border-amber-400 hover:text-amber-400 transition-colors"
                >
                  15 min
                </AdminSubmitButton>
              </form>
              <form action={handlePause30}>
                <AdminSubmitButton
                  pendingLabel="Pausing…"
                  className="h-8 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono text-graphite-300 hover:border-amber-400 hover:text-amber-400 transition-colors"
                >
                  30 min
                </AdminSubmitButton>
              </form>
              <form action={handlePause60}>
                <AdminSubmitButton
                  pendingLabel="Pausing…"
                  className="h-8 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono text-graphite-300 hover:border-amber-400 hover:text-amber-400 transition-colors"
                >
                  60 min
                </AdminSubmitButton>
              </form>
              {isPaused && (
                <form action={handleClearPause}>
                  <AdminSubmitButton
                    pendingLabel="Clearing…"
                    className="h-8 px-3 rounded-md border border-emerald-500/40 text-[11px] font-mono text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    Clear pause
                  </AdminSubmitButton>
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
              <AdminSubmitButton
                pendingLabel="Saving…"
                className="h-8 px-4 rounded-md bg-[#1b6b3a] text-white text-[12px] font-semibold hover:bg-[#155b31] transition-colors"
              >
                Save hours
              </AdminSubmitButton>
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
              <p className="text-[11px] text-[#5f574e] dark:text-graphite-400 mb-3">
                Enter your mobile number to receive an SMS when a new order arrives.
                Requires Twilio — leave blank to disable.
              </p>
              <input
                type="tel"
                name="admin_phone"
                defaultValue={(row as any).admin_phone ?? ""}
                placeholder="+919876543210"
                autoComplete="tel"
                inputMode="tel"
                maxLength={16}
                className="h-9 px-3 rounded-md border border-graphite-200/15 bg-graphite-700/60 text-[13px] text-graphite-200 placeholder-graphite-500 focus:outline-none focus:border-lime/60 transition-colors w-full max-w-xs"
              />
            </div>

            <PaymentOrderModeFields
              initialPaymentMode={currentPaymentMode}
              initialOrderMode={currentOrderMode}
              razorpayAvailable={featureFlags.razorpayLive}
            />

            <div>
              <AdminSubmitButton
                pendingLabel="Saving…"
                className="h-8 px-4 rounded-md bg-[#1b6b3a] text-white text-[12px] font-semibold hover:bg-[#155b31] transition-colors"
              >
                Save settings
              </AdminSubmitButton>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
