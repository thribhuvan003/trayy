"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChefHat, BellRing, HandPlatter, XCircle, AlertTriangle } from "lucide-react";
import { formatRupees, formatTimeIST, cn } from "@/lib/utils";
import { getBrowserClient } from "@/lib/supabase/browser";
import { getMyOrderOtp, cancelOrderByStudent } from "@/app/(student)/_actions";

// BUG 4 FIX: Wraps getMyOrderOtp with a 10-second timeout so the student
// is never stuck staring at an infinite spinner if the server action hangs.
async function getMyOrderOtpWithTimeout(orderId: string): Promise<{ otp: string | null; timedOut?: boolean }> {
  try {
    const result = await Promise.race([
      getMyOrderOtp(orderId),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10_000)
      ),
    ]);
    return result;
  } catch (err) {
    if (err instanceof Error && err.message === "timeout") {
      return { otp: null, timedOut: true };
    }
    return { otp: null };
  }
}

type Status =
  | "pending_payment"
  | "placed"
  | "preparing"
  | "ready"
  | "collected"
  | "rejected"
  | "expired"
  | "cancelled_by_kitchen"
  | "partially_ready"
  | "payment_failed"
  | "refunded";
type Order = {
  id: string;
  short_code: string;
  status: Status;
  total_paise: number;
  placed_at: string;
  ready_at: string | null;
  collected_at: string | null;
  customer_name: string | null;
};
type Line = {
  id: string;
  name_snapshot: string;
  qty: number;
  diet_snapshot: "veg" | "nonveg" | "egg";
  price_paise_snapshot: number;
};

const STEPS: { v: Status; label: string; icon: typeof Check; copy: string }[] = [
  { v: "placed", label: "Placed", icon: Check, copy: "We've got your order!" },
  { v: "preparing", label: "Preparing", icon: ChefHat, copy: "The kitchen is on it." },
  { v: "ready", label: "Ready", icon: BellRing, copy: "Your order is ready!" },
  { v: "collected", label: "Collected", icon: HandPlatter, copy: "Enjoy. ☕" },
];

const FIVE_MIN_MS = 5 * 60 * 1000;

export function TrackPanel({ tenantSlug, tenantName, order: initial, lines }: { tenantSlug: string; tenantName: string; order: Order; lines: Line[] }) {
  const [order, setOrder] = useState(initial);
  const [otp, setOtp] = useState<string | null>(null);
  const [cancelPending, startCancel] = useTransition();
  const [cancelError, setCancelError] = useState<string | null>(null);
  const router = useRouter();

  // Keep local state in sync if the server-fetched order changes
  // (router.refresh() will re-run the page and pass a fresh `initial`).
  useEffect(() => {
    setOrder(initial);
  }, [initial]);

  useEffect(() => {
    const sb = getBrowserClient();
    const ch = sb
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_events", filter: `order_id=eq.${order.id}` },
        () => {
          // order_events is the source of truth signal; refetch the order
          // server-side via the existing page loader.
          router.refresh();
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [order.id, router]);

  // Poll fallback: if Realtime drops (campus WiFi, tab backgrounded), the 10s
  // poll ensures the student always sees the correct status without a manual reload.
  useEffect(() => {
    const terminal = ["collected", "rejected", "expired", "cancelled_by_kitchen", "refunded", "payment_failed"];
    if (terminal.includes(order.status)) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 10_000);
    return () => clearInterval(id);
  }, [order.status, router]);

  const [otpTimedOut, setOtpTimedOut] = useState(false);
  useEffect(() => {
    if (order.status === "ready") {
      setOtpTimedOut(false);
      getMyOrderOtpWithTimeout(order.id).then((r) => {
        setOtp(r.otp);
        if (r.timedOut) setOtpTimedOut(true);
      });
    } else {
      setOtp(null);
      setOtpTimedOut(false);
    }
  }, [order.status, order.id]);

  // Student-initiated cancel: only available while still `placed` and within
  // the 5-minute grace window (server re-checks this; UI is best-effort).
  const placedAtMs = useMemo(() => new Date(order.placed_at).getTime(), [order.placed_at]);
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (order.status !== "placed") return;
    const t = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(t);
  }, [order.status]);
  const cancelWindowOpen = order.status === "placed" && now - placedAtMs < FIVE_MIN_MS;

  if (order.status === "payment_failed") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-12 pb-20 text-center">
        <XCircle size={56} className="mx-auto text-rose-500 mb-4" />
        <h1 className="font-display text-[36px] font-medium tracking-tight">Payment failed.</h1>
        <p className="text-[14px] text-[color:var(--color-ink)]/65 mt-2">
          Your UPI payment was declined. No money was charged. Please try placing the order again.
        </p>
        <Link
          href={`/c/${tenantSlug}/menu`}
          className="mt-6 inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-ocean-500 text-white text-[13px] font-medium hover:bg-ocean-600 transition-colors"
        >
          Try again
        </Link>
      </div>
    );
  }

  if (order.status === "rejected" || order.status === "expired") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-12 pb-20 text-center">
        <XCircle size={56} className="mx-auto text-rose-500 mb-4" />
        <h1 className="font-display text-[36px] font-medium tracking-tight">
          {order.status === "expired" ? "Payment expired." : "Order rejected."}
        </h1>
        <p className="text-[14px] text-[color:var(--color-ink)]/65 mt-2">
          {order.status === "expired"
            ? "We didn't see the UPI payment in time. No money was charged."
            : "The canteen couldn't accept this order. If you paid, a refund is on its way."}
        </p>
        <Link
          href={`/c/${tenantSlug}/menu`}
          className="mt-6 inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-ocean-500 text-white text-[13px] font-medium hover:bg-ocean-600 transition-colors"
        >
          Try another order
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === "cancelled_by_kitchen" || order.status === "refunded";
  const isPartiallyReady = order.status === "partially_ready";
  // Map partially_ready onto the "preparing" step so the progress stepper
  // renders correctly; it will also show a dedicated banner below.
  const effectiveStatus: Status = isPartiallyReady ? "preparing" : order.status;
  const currentIdx = Math.max(0, STEPS.findIndex((s) => s.v === effectiveStatus));
  const isReady = order.status === "ready";
  const isCollected = order.status === "collected";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-12">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href={`/c/${tenantSlug}/menu`}
          className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--color-ink)]/60 hover:text-ocean-500"
        >
          <ArrowLeft size={14} /> Menu
        </Link>
        <span className="text-[color:var(--color-line-strong)]">·</span>
        <Link
          href={`/c/${tenantSlug}/orders`}
          className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--color-ink)]/60 hover:text-ocean-500"
        >
          All orders
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55">
            {tenantName} · {order.short_code}
          </div>
          <h1 className="font-display text-[clamp(28px,5vw,40px)] font-medium tracking-tight leading-tight">
            {isCancelled ? (
              <>
                Cancelled.{" "}
                <span className="italic text-rose-500">Refund on its way.</span>
              </>
            ) : (
              <>
                {STEPS[currentIdx]?.label}.{" "}
                <span className="italic text-ocean-500">{STEPS[currentIdx]?.copy}</span>
              </>
            )}
          </h1>
        </div>
        <div className="text-[12px] font-mono tabular text-[color:var(--color-ink)]/55">
          Placed {formatTimeIST(order.placed_at)}
        </div>
      </div>

      {isCancelled && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-display text-[18px] font-medium tracking-tight text-[color:var(--color-ink)]">
              Your order was cancelled.
            </div>
            <p className="text-[13.5px] text-[color:var(--color-ink)]/70 mt-1">
              {order.status === "refunded"
                ? "Refund has been completed. It should reflect in your UPI app within 3–5 business days."
                : "Refund has been initiated. It should reflect in your UPI app within 3–5 business days."}
            </p>
          </div>
        </div>
      )}

      {!isCancelled && isReady && otp && (
        <div className="mb-6 rounded-2xl bg-ocean-500 text-white p-6 sm:p-8 relative overflow-hidden" style={{ border: "var(--ns-border)", boxShadow: "var(--ns-shadow-lg)" }}>
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]"
          />
          <div className="relative">
            <div className="text-[11px] font-mono uppercase tracking-wider text-white/75 mb-2">
              Your pickup code · show at counter
            </div>
            {/* Each digit in its own equal-width box so they're perfectly evenly spaced
                regardless of the digit's natural width in the display font. */}
            <div
              className="flex gap-2 sm:gap-3 cursor-pointer select-none"
              title="Tap to copy"
              onClick={() => navigator.clipboard.writeText(otp).catch(() => null)}
            >
              {otp.split("").map((digit, i) => (
                <div
                  key={i}
                  className="flex-1 flex items-center justify-center rounded-xl bg-white/15"
                  style={{
                    fontFamily: "var(--font-num-ns)",
                    fontWeight: 700,
                    fontSize: "clamp(44px, 12vw, 80px)",
                    lineHeight: 1,
                    paddingTop: 10,
                    paddingBottom: 10,
                    border: "2px solid rgba(0,0,0,0.85)",
                  }}
                >
                  {digit}
                </div>
              ))}
            </div>
            <p className="text-[13px] text-white/80 mt-3">
              Show this code at the counter. You have 3 tries — if it doesn&rsquo;t work, show your order number #{order.short_code} to the staff.
            </p>
          </div>
        </div>
      )}
      {!isCancelled && isReady && !otp && (
        <div className="mb-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 text-[13px] text-[color:var(--color-ink)]/70 flex items-center gap-3">
          {otpTimedOut ? (
            <>
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>Couldn&rsquo;t load your pickup code — show order <span className="font-medium">#{order.short_code}</span> to staff at the counter.</span>
            </>
          ) : (
            <>
              <span className="animate-spin inline-block h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full shrink-0" />
              <span>Your order is ready — fetching your pickup code…</span>
            </>
          )}
        </div>
      )}

      {isPartiallyReady && (
        <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-[13.5px] font-medium text-[color:var(--color-ink)]">Some items still preparing</div>
            <p className="text-[12px] text-[color:var(--color-ink)]/65 mt-0.5">
              Part of your order is almost ready — the kitchen will call you when everything&rsquo;s done.
            </p>
          </div>
        </div>
      )}

      {!isCancelled && (
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {STEPS.map((s, i) => {
            const done = i < currentIdx || isCollected;
            const active = i === currentIdx && !isCollected;
            const Icon = s.icon;
            return (
              <li
                key={s.v}
                className={cn(
                  "rounded-xl p-4 flex flex-col gap-1",
                  done ? "bg-mint/20" : active ? "bg-ocean-50 dark:bg-ocean-500/10" : "bg-[color:var(--color-paper-dim)]"
                )}
                style={{ border: "var(--ns-border)", boxShadow: active ? "var(--ns-shadow-sm)" : "none" }}
              >
                <div
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-lg",
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                      ? "bg-ocean-500 text-white animate-pulse"
                      : "bg-[color:var(--color-paper-dim)] text-[color:var(--color-ink)]/35"
                  )}
                  style={{ border: "2px solid #000" }}
                >
                  <Icon size={13} />
                </div>
                <div className="text-[13.5px] font-bold" style={{ fontFamily: "var(--font-title-ns)" }}>{s.label}</div>
              </li>
            );
          })}
        </ol>
      )}

      {cancelWindowOpen && (
        <div className="mb-6 rounded-2xl border border-[color:var(--color-line)] p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-[13.5px] font-medium">Changed your mind?</div>
            <p className="text-[12px] text-[color:var(--color-ink)]/55">
              You can cancel for a full refund within 5 minutes of placing.
            </p>
            {cancelError && (
              <p className="text-[12px] text-rose-500 mt-1">{cancelError}</p>
            )}
          </div>
          <button
            type="button"
            disabled={cancelPending}
            onClick={() => {
              setCancelError(null);
              startCancel(async () => {
                const res = await cancelOrderByStudent(order.id);
                if (!res.ok) {
                  setCancelError(res.error ?? "Could not cancel");
                  return;
                }
                router.refresh();
              });
            }}
            className={cn(
              "inline-flex items-center gap-1.5 h-10 px-4 rounded-full border border-rose-500/40 text-rose-600 text-[13px] font-medium hover:bg-rose-500/10 transition-colors",
              cancelPending && "opacity-60 cursor-not-allowed"
            )}
          >
            {cancelPending ? "Cancelling…" : "Cancel order"}
          </button>
        </div>
      )}

      <div className="ns-card p-5">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55 mb-3">
          You ordered
        </div>
        <ul className="flex flex-col gap-2">
          {lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 text-[14px]">
              <span
                className={cn(
                  "h-3.5 w-3.5 inline-flex items-center justify-center border-2 rounded-sm",
                  l.diet_snapshot === "veg"
                    ? "border-emerald-500"
                    : l.diet_snapshot === "egg"
                    ? "border-amber-500"
                    : "border-rose-500"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    l.diet_snapshot === "veg"
                      ? "bg-emerald-500"
                      : l.diet_snapshot === "egg"
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  )}
                />
              </span>
              <span className="flex-1 min-w-0 truncate">
                {l.qty} × {l.name_snapshot}
              </span>
              <span className="tabular text-[color:var(--color-ink)]/70">
                {formatRupees(l.qty * l.price_paise_snapshot)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-[color:var(--color-line)] flex justify-between items-baseline">
          <span className="text-[12px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55">
            {isCancelled ? "Refund amount" : "Total paid"}
          </span>
          <span className="text-[20px] font-bold tabular" style={{ fontFamily: "var(--font-num-ns)" }}>{formatRupees(order.total_paise)}</span>
        </div>

        {/* UPI history hint — student can verify this in their PhonePe / GPay */}
        {!isCancelled && !["payment_failed", "expired", "pending_payment"].includes(order.status) && (
          <div
            className="mt-3 rounded-xl px-3 py-2.5 flex items-start gap-2"
            style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.15)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" style={{ color: "#16a34a" }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
            </svg>
            <div>
              <p className="text-[11.5px] font-semibold" style={{ color: "#15803d" }}>Find this payment in your UPI app</p>
              <p className="text-[11px] mt-0.5" style={{ color: "#166534", opacity: 0.75 }}>
                Open PhonePe / GPay → Transaction History → look for{" "}
                <span className="font-semibold">₹{(order.total_paise / 100).toFixed(0)}</span> to{" "}
                <span className="font-semibold">{tenantName}</span>.
                Reference note: <span className="font-mono font-semibold">{order.short_code}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
