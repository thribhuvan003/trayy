"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import Link from "next/link";
import { ArrowLeft, Loader2, Smartphone, Sparkles, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { formatRupees, cn } from "@/lib/utils";
import { upiQrPayload } from "@/lib/payments/upi";
import { simulatePaymentCapture, verifyPaymentNow } from "@/app/(student)/_actions";
import { getBrowserClient } from "@/lib/supabase/browser";

type Order = {
  id: string;
  short_code: string;
  total_paise: number;
  status: string;
  payment_expires_at: string | null;
  customer_name: string | null;
};
type Line = {
  id: string;
  name_snapshot: string;
  qty: number;
  price_paise_snapshot: number;
  diet_snapshot: "veg" | "nonveg" | "egg";
};

export function PayPanel({
  tenantSlug,
  tenantName,
  tenantUpi,
  order,
  lines,
}: {
  tenantSlug: string;
  tenantName: string;
  tenantUpi: string;
  order: Order;
  lines: Line[];
}) {
  const router = useRouter();
  const redirectedRef = useRef(false);
  const [pending, start] = useTransition();
  const [verifying, startVerify] = useTransition();
  const [stillWaiting, setStillWaiting] = useState(false);
  const [remaining, setRemaining] = useState(() => {
    if (!order.payment_expires_at) return 900;
    return Math.max(0, Math.floor((new Date(order.payment_expires_at).getTime() - Date.now()) / 1000));
  });

  // Live UPI VPA for real-time QR update when the canteen owner changes their UPI ID.
  // Reuses the exact browser Supabase client + postgres_changes pattern from the admin activity feed and kitchen board.
  const [liveTenantUpi, setLiveTenantUpi] = useState(tenantUpi);
  const [demoDismissed, setDemoDismissed] = useState(false);
  const isSimMode = !process.env.NEXT_PUBLIC_RAZORPAY_LIVE;

  useEffect(() => {
    if (!order.payment_expires_at) return;
    const expiry = new Date(order.payment_expires_at).getTime();
    const tick = () => {
      const secs = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setRemaining(secs);
      // BUG 1 FIX: redirect to track page when the payment window expires so
      // the student isn't stuck on a dead pay screen.
      if (secs === 0) {
        if (!redirectedRef.current) {
          redirectedRef.current = true;
          router.push(`/c/${tenantSlug}/track/${order.id}`);
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [order.payment_expires_at, order.id, router, tenantSlug]);

  // Live UPI VPA subscription — when the canteen owner changes their UPI ID in settings,
  // the QR on this student's pay panel updates in real time without a full reload.
  // Use a ref for liveTenantUpi so the channel is subscribed once and never torn down
  // on VPA changes — avoids a brief subscription gap each time the UPI updates.
  const liveTenantUpiRef = useRef(liveTenantUpi);
  liveTenantUpiRef.current = liveTenantUpi;
  useEffect(() => {
    const sb = getBrowserClient();
    const ch = sb
      .channel(`tenant-upi-${tenantSlug}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tenants", filter: `slug=eq.${tenantSlug}` },
        (payload) => {
          const nextUpi = (payload.new as { upi_vpa: string | null }).upi_vpa;
          if (nextUpi && nextUpi !== liveTenantUpiRef.current) {
            setLiveTenantUpi(nextUpi);
          }
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  useEffect(() => {
    const sb = getBrowserClient();
    const channel = sb
      .channel(`order:${order.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        (payload) => {
          const next = (payload.new as { status: string }).status;
          // Redirect to track page for ANY terminal/advanced status — this covers
          // payment_failed, expired, rejected, placed, preparing, ready, collected, etc.
          // The track page already has dedicated UI for every status including payment_failed.
          if (next !== "pending_payment") {
            if (redirectedRef.current) return;
            redirectedRef.current = true;
            router.push(`/c/${tenantSlug}/track/${order.id}`);
          }
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [order.id, router, tenantSlug]);

  useEffect(() => {
    const id = setInterval(async () => {
      const sb = getBrowserClient();
      const { data } = await sb
        .from("orders")
        .select("status")
        .eq("id", order.id)
        .maybeSingle<{ status: string }>();
      if (data && data.status !== "pending_payment") {
        // BUG 2 FIX: guard against double-redirect when Realtime already fired.
        if (redirectedRef.current) return;
        redirectedRef.current = true;
        router.push(`/c/${tenantSlug}/track/${order.id}`);
      }
    }, 4000);
    return () => clearInterval(id);
  }, [order.id, router, tenantSlug]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const expired = remaining === 0 && order.payment_expires_at;

  // Use the live UPI VPA (updated in real time via the postgres_changes subscription above).
  const upiUri = upiQrPayload({
    vpa: liveTenantUpi,
    name: tenantName,
    amountPaise: order.total_paise,
    note: order.short_code,
  });

  const onSimulate = () =>
    start(async () => {
      const r = await simulatePaymentCapture(order.id);
      if (!r.ok) toast.error(r.error ?? "Could not simulate payment");
      else {
        toast.success("Payment captured");
        if (redirectedRef.current) return;
        redirectedRef.current = true;
        router.push(`/c/${tenantSlug}/track/${order.id}`);
      }
    });

  const onIvePaid = () =>
    startVerify(async () => {
      setStillWaiting(false);
      // Show a brief "Confirming…" state before the server round-trip resolves
      await new Promise((r) => setTimeout(r, 700));
      const r = await verifyPaymentNow(order.id);
      if (r.status === "paid") {
        toast.success("Order placed — kitchen has it!");
        if (redirectedRef.current) return;
        redirectedRef.current = true;
        router.push(`/c/${tenantSlug}/track/${order.id}`);
      } else if (r.status === "failed") {
        // Payment was declined or expired — redirect to track which shows the
        // correct payment_failed/expired UI with a "Try again" link back to menu.
        if (redirectedRef.current) return;
        redirectedRef.current = true;
        router.push(`/c/${tenantSlug}/track/${order.id}`);
      } else {
        setStillWaiting(true);
      }
    });

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-12">
      <Link
        href={`/c/${tenantSlug}/menu`}
        className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--color-ink)]/60 hover:text-ocean-500 mb-4"
      >
        <ArrowLeft size={14} /> Back to menu
      </Link>

      {isSimMode && !demoDismissed && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-2.5">
          <p className="text-[12.5px] text-amber-800 dark:text-amber-300 leading-snug">
            <span className="font-semibold">Demo mode</span> — scan the QR with any UPI app, then tap &ldquo;I&rsquo;ve paid&rdquo; to send your order to the kitchen.
          </p>
          <button
            aria-label="Dismiss demo banner"
            onClick={() => setDemoDismissed(true)}
            className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 transition-colors"
          >
            <XIcon size={14} />
          </button>
        </div>
      )}

      <div className="mb-6">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55">
          Order {order.short_code}
        </div>
        <h1 className="font-display text-[clamp(28px,5vw,42px)] font-medium tracking-tight leading-tight">
          Pay <span className="italic text-ocean-500">{formatRupees(order.total_paise)}</span> by UPI
        </h1>
      </div>

      <div className="grid md:grid-cols-[1.1fr_1fr] gap-5">
        <div className="rounded-2xl bg-[color:var(--color-paper)] border border-[color:var(--color-line)] p-6 flex flex-col items-center text-center">
          {/* Mobile: "Open UPI app" is the hero CTA */}
          <a
            href={upiUri}
            className="md:hidden w-full h-14 text-[15px] inline-flex items-center justify-center gap-2 rounded-full border-2 border-ocean-500 text-ocean-500 bg-transparent font-medium hover:bg-ocean-50 dark:hover:bg-ocean-500/10 transition-colors mb-1"
          >
            <Smartphone size={16} /> Open UPI app
          </a>
          <p className="md:hidden text-[11px] text-center opacity-60 mt-1 mb-4">Opens GPay, PhonePe, or any UPI app</p>

          {/* Desktop: QR is prominent */}
          <div className="hidden md:block text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55 mb-3">
            Scan with any UPI app
          </div>
          <div className="hidden md:block p-4 bg-white rounded-2xl shadow-[inset_0_0_0_1px_rgba(10,22,40,0.06)]">
            <QRCode value={upiUri} size={208} bgColor="#ffffff" fgColor="#0a1628" />
          </div>
          <a
            href={upiUri}
            className="hidden md:inline-flex mt-5 items-center gap-2 h-11 px-5 rounded-full bg-ocean-500 text-white text-[13px] font-medium hover:bg-ocean-600 transition-colors"
          >
            <Smartphone size={14} /> Open UPI app
          </a>

          {/* Mobile: QR in a collapsed details section */}
          <details className="md:hidden w-full text-left mt-2">
            <summary className="text-[12px] font-mono text-center cursor-pointer text-[color:var(--color-ink)]/55 hover:text-[color:var(--color-ink)] transition-colors">
              On desktop? Scan this QR
            </summary>
            <div className="mt-3 flex flex-col items-center gap-2">
              <div className="p-4 bg-white rounded-2xl shadow-[inset_0_0_0_1px_rgba(10,22,40,0.06)]">
                <QRCode value={upiUri} size={180} bgColor="#ffffff" fgColor="#0a1628" />
              </div>
            </div>
          </details>

          <div className="mt-4 text-[12px] text-[color:var(--color-ink)]/55">
            Paying <span className="font-semibold text-[color:var(--color-ink)]">{tenantName}</span> · {liveTenantUpi}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-[color:var(--color-paper-dim)] border border-[color:var(--color-line)] p-5">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55">
                Time to pay
              </div>
              <div
                className={cn(
                  "font-mono text-[20px] font-semibold tabular",
                  expired ? "text-rose-500" : remaining < 60 ? "text-amber-600" : "text-[color:var(--color-ink)]"
                )}
              >
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </div>
            </div>
            {expired ? (
              <p className="mt-2 text-[12.5px] text-rose-500">
                Payment window closed. <Link href={`/c/${tenantSlug}/menu`} className="underline">Start a new order</Link>.
              </p>
            ) : (
              <p className="mt-2 text-[12.5px] text-[color:var(--color-ink)]/55">
                You have 15 min to pay — after that, we&rsquo;ll cancel and refund automatically.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-[color:var(--color-line)] p-5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55 mb-3">
              Order summary
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
              <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-ink)]/50" style={{ fontFamily: "var(--font-barlow, var(--font-manrope))" }}>Total</span>
              <span className="text-[32px] leading-none tabular text-ocean-600 dark:text-ocean-400" style={{ fontFamily: "var(--font-bebas, Impact, sans-serif)" }}>
                {formatRupees(order.total_paise)}
              </span>
            </div>
          </div>

          <button
            onClick={onIvePaid}
            disabled={verifying || Boolean(expired)}
            className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-ocean-500 text-white text-[14px] font-medium hover:bg-ocean-600 disabled:opacity-50 transition-colors"
          >
            {verifying ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Confirming…
              </>
            ) : (
              <>I&rsquo;ve paid &mdash; confirm my order</>
            )}
          </button>
          {stillWaiting && !verifying && (
            <p className="text-[12.5px] text-amber-600 text-center -mt-2">
              Still confirming your payment — UPI can take 30–60 seconds. Keep this page open.
            </p>
          )}

          {/* Razorpay trust signal — required for live and student confidence */}
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-[color:var(--color-ink)]/40">
              <path d="M12 2L4 5v6c0 5.25 3.5 10.15 8 11.35C16.5 21.15 20 16.25 20 11V5l-8-3z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[11px] text-[color:var(--color-ink)]/40">
              Payments secured by <span className="font-semibold">Razorpay</span> · No card details stored
            </p>
          </div>

          {!process.env.NEXT_PUBLIC_RAZORPAY_LIVE && (
            <>
              <button
                onClick={onSimulate}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-ocean-500/40 text-ocean-500 text-[13px] font-medium hover:bg-ocean-50 dark:hover:bg-ocean-500/10 transition-colors"
              >
                <Sparkles size={14} /> DEV · simulate paid
              </button>
              <p className="text-[11px] text-[color:var(--color-ink)]/45 text-center -mt-2">
                Dev-only shortcut — flips the order to <b>placed</b> without a real payment.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
