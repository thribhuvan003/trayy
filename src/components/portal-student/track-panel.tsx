"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChefHat, BellRing, HandPlatter, XCircle, AlertTriangle } from "lucide-react";
import { formatRupees, formatTimeIST, cn } from "@/lib/utils";
import { getBrowserClient } from "@/lib/supabase/browser";
import { getMyOrderOtp, cancelOrderByStudent } from "@/app/(student)/_actions";

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
  { v: "placed", label: "Placed", icon: Check, copy: "We've got it." },
  { v: "preparing", label: "Preparing", icon: ChefHat, copy: "The kitchen is on it." },
  { v: "ready", label: "Ready", icon: BellRing, copy: "Walk over — your code's below." },
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

  useEffect(() => {
    if (order.status === "ready") {
      getMyOrderOtp(order.id).then((r) => setOtp(r.otp));
    } else {
      setOtp(null);
    }
  }, [order.status, order.id]);

  // Student-initiated cancel: only available while still `placed` and within
  // the 5-minute grace window (server re-checks this; UI is best-effort).
  const placedAtMs = useMemo(() => new Date(order.placed_at).getTime(), [order.placed_at]);
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (order.status !== "placed") return;
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, [order.status]);
  const cancelWindowOpen = order.status === "placed" && now - placedAtMs < FIVE_MIN_MS;

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
  const currentIdx = Math.max(0, STEPS.findIndex((s) => s.v === order.status));
  const isReady = order.status === "ready";
  const isCollected = order.status === "collected";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-12">
      <Link
        href={`/c/${tenantSlug}/orders`}
        className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--color-ink)]/60 hover:text-ocean-500 mb-4"
      >
        <ArrowLeft size={14} /> Orders
      </Link>

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
        <div className="mb-6 rounded-3xl bg-ocean-500 text-white p-6 sm:p-8 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.18),transparent_60%)]"
          />
          <div className="relative">
            <div className="text-[11px] font-mono uppercase tracking-wider text-white/75 mb-2">
              Your pickup code · show at counter
            </div>
            <div className="font-display tabular font-medium leading-none text-[clamp(72px,14vw,128px)] tracking-[-0.045em]">
              {otp.split("").join(" ")}
            </div>
            <p className="text-[13px] text-white/80 mt-3">
              Valid for the next 15 minutes. Three attempts at the counter, then the order locks for staff review.
            </p>
          </div>
        </div>
      )}
      {!isCancelled && isReady && !otp && (
        <div className="mb-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 text-[13px] text-[color:var(--color-ink)]/70">
          Your order is ready. Reload to fetch the pickup code.
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
                  "rounded-2xl border p-4 flex flex-col gap-1",
                  done
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : active
                    ? "border-ocean-500 bg-ocean-50 dark:bg-ocean-500/10"
                    : "border-[color:var(--color-line)]"
                )}
              >
                <div
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full",
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                      ? "bg-ocean-500 text-white animate-pulse"
                      : "bg-[color:var(--color-paper-dim)] text-[color:var(--color-ink)]/35"
                  )}
                >
                  <Icon size={13} />
                </div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55">
                  Step {i + 1}
                </div>
                <div className="text-[13.5px] font-medium">{s.label}</div>
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

      <div className="rounded-2xl border border-[color:var(--color-line)] p-5">
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
          <span className="font-display text-[20px] font-medium tabular">{formatRupees(order.total_paise)}</span>
        </div>
      </div>
    </div>
  );
}
