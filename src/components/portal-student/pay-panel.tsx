"use client";

import { useEffect, useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Smartphone, Sparkles, XCircle, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { formatRupees, cn } from "@/lib/utils";
import { upiQrPayload } from "@/lib/payments/upi";
import { simulatePaymentCapture, verifyPaymentNow } from "@/app/(student)/_actions";
import { getBrowserClient } from "@/lib/supabase/browser";

type Phase = "idle" | "monitoring" | "confirming" | "success" | "failed";

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
  isSimMode,
  paymentMode = "direct_upi",
}: {
  tenantSlug: string;
  tenantName: string;
  tenantUpi: string;
  order: Order;
  lines: Line[];
  isSimMode?: boolean;
  paymentMode?: "direct_upi" | "razorpay";
}) {
  const router = useRouter();
  const redirectedRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [monitoringMsg, setMonitoringMsg] = useState("Waiting for your payment…");
  const [demoDismissed, setDemoDismissed] = useState(false);
  // showFallback: show the "I paid" button only after 20s — enough time to complete UPI.
  // This is the anti-fraud gate: students who open the UPI app and close without paying
  // can't see the confirmation button until 20 seconds have elapsed.
  const [showFallback, setShowFallback] = useState(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [verifying, startVerify] = useTransition();
  const [pending, start] = useTransition();

  const [remaining, setRemaining] = useState(() => {
    if (!order.payment_expires_at) return 900;
    return Math.max(0, Math.floor((new Date(order.payment_expires_at).getTime() - Date.now()) / 1000));
  });
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const expired = remaining === 0 && !!order.payment_expires_at;

  // Live UPI VPA — updates QR if canteen changes their UPI ID while student is on this page
  const [liveTenantUpi, setLiveTenantUpi] = useState(tenantUpi);
  const liveTenantUpiRef = useRef(liveTenantUpi);
  liveTenantUpiRef.current = liveTenantUpi;

  // ── Auto-detect success and navigate ──────────────────────────────────────
  const handleDetected = useCallback((status: string) => {
    if (redirectedRef.current) return;
    if (status === "placed" || status === "preparing" || status === "ready" || status === "collected") {
      redirectedRef.current = true;
      setPhase("success");
      // Brief success flash (1.2s) before redirect — gives the student visual confirmation
      setTimeout(() => {
        router.push(`/c/${tenantSlug}/track/${order.id}`);
      }, 1200);
    } else if (status === "payment_failed") {
      redirectedRef.current = true;
      setPhase("failed");
      setTimeout(() => {
        router.push(`/c/${tenantSlug}/track/${order.id}`);
      }, 2500);
    } else if (status !== "pending_payment") {
      // Any other terminal status (expired, rejected, etc.)
      redirectedRef.current = true;
      router.push(`/c/${tenantSlug}/track/${order.id}`);
    }
  }, [router, tenantSlug, order.id]);

  // ── Countdown + expiry redirect ───────────────────────────────────────────
  useEffect(() => {
    if (!order.payment_expires_at) return;
    const expiry = new Date(order.payment_expires_at).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setRemaining(s);
      if (s === 0 && !redirectedRef.current) {
        redirectedRef.current = true;
        router.push(`/c/${tenantSlug}/track/${order.id}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [order.payment_expires_at, order.id, router, tenantSlug]);

  // ── Live UPI VPA subscription ─────────────────────────────────────────────
  useEffect(() => {
    const sb = getBrowserClient();
    const ch = sb
      .channel(`tenant-upi-${tenantSlug}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tenants", filter: `slug=eq.${tenantSlug}` }, (payload) => {
        const next = (payload.new as { upi_vpa: string | null }).upi_vpa;
        if (next && next !== liveTenantUpiRef.current) setLiveTenantUpi(next);
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  // ── Primary: Realtime subscription on orders table ───────────────────────
  // This fires within ~1s of the webhook capturing the payment.
  useEffect(() => {
    const sb = getBrowserClient();
    const ch = sb
      .channel(`order:${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` }, (payload) => {
        handleDetected((payload.new as { status: string }).status);
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [order.id, handleDetected]);

  // ── Secondary: Smart polling — 4s intervals ───────────────────────────────
  // Catches cases where Realtime WebSocket is disconnected (flaky campus WiFi).
  useEffect(() => {
    const id = setInterval(async () => {
      const sb = getBrowserClient();
      const { data } = await sb
        .from("orders")
        .select("status")
        .eq("id", order.id)
        .maybeSingle<{ status: string }>();
      if (data) handleDetected(data.status);
    }, 4000);
    return () => clearInterval(id);
  }, [order.id, handleDetected]);

  // ── Progressive monitoring messages ──────────────────────────────────────
  // Cycle through reassuring messages while the system watches for payment.
  useEffect(() => {
    if (phase !== "monitoring") return;
    const messages = [
      "Waiting for your payment…",
      "Almost there — UPI can take a few seconds…",
      "Checking with your bank…",
      "Still watching for your payment…",
      "This usually takes under 30 seconds…",
    ];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % messages.length;
      setMonitoringMsg(messages[i]);
    }, 5000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Show "I paid" button after 20s — anti-fraud gate ─────────────────────
  // Runs in BOTH idle (desktop QR scan) and monitoring (mobile UPI app) phases.
  // 20 seconds is enough time to complete a real UPI PIN entry.
  // Previously only ran in monitoring phase — the idle phase had an IMMEDIATE
  // button which was the fraud loophole: students clicked it without paying.
  useEffect(() => {
    const isPayingPhase = phase === "idle" || phase === "monitoring";
    if (isPayingPhase && !showFallback) {
      fallbackTimerRef.current = setTimeout(() => setShowFallback(true), 20_000);
    }
    if (!isPayingPhase) setShowFallback(false);
    return () => { if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current); };
  }, [phase, showFallback]);

  // ── Auto-verify every 15s during monitoring ────────────────────────────────
  // Fallback for when the Razorpay webhook fails or is delayed: polls
  // Razorpay's API server-side and calls safe_capture_payment if paid.
  // Without this, a failed webhook leaves the student stranded indefinitely.
  useEffect(() => {
    if (phase !== "monitoring") return;
    const id = setInterval(() => {
      if (redirectedRef.current) return;
      startVerify(async () => {
        const r = await verifyPaymentNow(order.id);
        if (r.status === "paid") handleDetected("placed");
        else if (r.status === "failed") handleDetected("payment_failed");
      });
    }, 15_000);
    return () => clearInterval(id);
  }, [phase, order.id, handleDetected]);

  // ── Transition to monitoring when student opens UPI app ───────────────────
  // FRAUD FIX: Do NOT call verifyPaymentNow here. Previously this fired
  // immediately when the student tapped "Open UPI App" — before they had even
  // completed the payment. Students were opening the UPI app, closing it without
  // paying, then seeing their order in the kitchen queue (marked unverified).
  // Now: just switch to monitoring phase. The student must explicitly tap
  // "I paid — Place my order" AFTER completing the transaction.
  const onOpenUpi = () => {
    setPhase("monitoring");
    // No auto-verify here. The student must confirm payment themselves.
  };

  // ── Manual fallback: server-side verification ─────────────────────────────
  // Still goes through verifyPaymentNow which calls safe_capture_payment — never blind trust.
  const onIvePaid = () => {
    setPhase("confirming");
    startVerify(async () => {
      const r = await verifyPaymentNow(order.id);
      if (r.status === "paid") {
        handleDetected("placed");
      } else if (r.status === "failed") {
        handleDetected("payment_failed");
      } else {
        // Still pending — go back to monitoring
        setPhase("monitoring");
        toast.info("Payment not confirmed yet — make sure you completed the transaction.");
      }
    });
  };

  const upiUri = upiQrPayload({ vpa: liveTenantUpi, name: tenantName, amountPaise: order.total_paise, note: order.short_code });

  // ── Success phase ──────────────────────────────────────────────────────────
  if (phase === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "rgba(22,163,74,0.1)" }}
          >
            <CheckCircle2 size={40} strokeWidth={1.5} style={{ color: "#16a34a" }} />
          </div>
          <h2
            className="leading-tight tracking-[-0.03em] mb-2"
            style={{ fontFamily: "var(--font-bricolage)", fontWeight: 700, fontSize: "clamp(1.6rem, 5vw, 2.2rem)" }}
          >
            Order placed!
          </h2>
          <p className="text-[14px] opacity-65 mb-1">
            Your order <span className="font-semibold">{order.short_code}</span> is in the kitchen.
          </p>

          {/* UPI history hint — helps students verify the payment in their UPI app */}
          <div
            className="mt-4 mb-4 rounded-xl px-4 py-3 text-left"
            style={{ background: "rgba(22,163,74,0.07)", border: "1px solid rgba(22,163,74,0.18)" }}
          >
            <p className="text-[12px] font-semibold" style={{ color: "#15803d" }}>
              Check your UPI app
            </p>
            <p className="text-[11.5px] mt-0.5" style={{ color: "#166534", opacity: 0.8 }}>
              Open PhonePe, GPay, or Paytm → History. You'll see a{" "}
              <span className="font-semibold">₹{(order.total_paise / 100).toFixed(0)} payment</span> to{" "}
              <span className="font-semibold">{tenantName}</span> with note{" "}
              <span className="font-mono font-semibold">{order.short_code}</span>.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-[12px] opacity-40">
            <Loader2 size={12} className="animate-spin" />
            Taking you to your order…
          </div>
        </div>
      </div>
    );
  }

  // ── Failed phase ───────────────────────────────────────────────────────────
  if (phase === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center max-w-sm">
          <div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "rgba(220,38,38,0.08)" }}
          >
            <XCircle size={40} strokeWidth={1.5} style={{ color: "var(--color-ocean-500, #e60000)" }} />
          </div>
          <h2
            className="leading-tight tracking-[-0.03em] mb-2"
            style={{ fontFamily: "var(--font-bricolage)", fontWeight: 700, fontSize: "clamp(1.6rem, 5vw, 2.2rem)" }}
          >
            Payment failed.
          </h2>
          <p className="text-[14px] opacity-55 mb-1">No money was charged.</p>
          <p className="text-[12px] opacity-40 mb-1">Redirecting to your order…</p>
        </div>
      </div>
    );
  }

  // ── Main screen ────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-12">
      <Link
        href={`/c/${tenantSlug}/menu`}
        className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--color-ink)]/55 hover:text-ocean-500 mb-5 transition-colors"
      >
        <ArrowLeft size={14} /> Back to menu
      </Link>

      {/* Demo mode banner */}
      {isSimMode && !demoDismissed && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3">
          <p className="text-[12.5px] text-amber-800 dark:text-amber-300 leading-snug">
            <span className="font-semibold">Demo mode</span> — scan the QR, then tap <em>Open UPI App</em>. The order auto-confirms.
          </p>
          <button aria-label="Dismiss" onClick={() => setDemoDismissed(true)} className="shrink-0 text-amber-600 hover:text-amber-800 transition-colors">
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Page heading */}
      <div className="mb-6">
        <div className="text-[11px] font-mono uppercase tracking-wider opacity-50 mb-1">
          Order {order.short_code}
        </div>
        <h1
          className="leading-tight tracking-[-0.03em]"
          style={{ fontFamily: "var(--font-bricolage)", fontWeight: 700, fontSize: "clamp(1.75rem, 5vw, 2.5rem)" }}
        >
          Pay{" "}
          <span style={{ color: "var(--color-ocean-500, #e60000)" }}>
            {formatRupees(order.total_paise)}
          </span>{" "}
          to {tenantName}
        </h1>
      </div>

      <div className="grid md:grid-cols-[1.15fr_0.85fr] gap-5 items-start">

        {/* ── Left: QR + UPI CTA ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] p-6 flex flex-col items-center text-center">

          {/* Phase: monitoring — show animated detection state */}
          {(phase === "monitoring" || phase === "confirming") ? (
            <div className="w-full py-6 flex flex-col items-center gap-4">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ background: "var(--color-ocean-500, #e60000)" }}
                />
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(230,0,0,0.1)" }}
                >
                  <Loader2 size={20} className="animate-spin" style={{ color: "var(--color-ocean-500, #e60000)" }} />
                </div>
              </div>
              <div>
                <p
                  className="font-semibold text-[15px] tracking-tight mb-1"
                  style={{ fontFamily: "var(--font-bricolage)" }}
                >
                  {phase === "confirming" ? "Placing order in queue…" : monitoringMsg}
                </p>
                <p className="text-[12px] opacity-50">
                  {phase === "confirming"
                    ? "Updating kitchen & admin dashboard..."
                    : "Once your UPI transfer is complete, we'll verify it automatically."}
                </p>
              </div>

              {/* "I've paid" button — shown only after 20s so students have time
                  to actually complete the UPI transaction before confirming */}
              {showFallback && (
                <div className="mt-4 border-t border-[color:var(--color-line)] pt-5 w-full flex flex-col items-center gap-3">
                  <p className="text-[12px] opacity-70 font-sans text-center leading-snug">
                    Completed payment in your UPI app?<br />
                    <span className="text-[11px] opacity-60">Only confirm after seeing "Transaction Successful" in your UPI app.</span>
                  </p>
                  <button
                    onClick={onIvePaid}
                    disabled={verifying}
                    className="w-full h-12 text-[14px] font-bold rounded-xl text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md hover:opacity-90 disabled:opacity-60"
                    style={{ background: "var(--color-ocean-500, #e60000)" }}
                  >
                    {verifying ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Placing order…
                      </>
                    ) : (
                      `I paid ₹${(order.total_paise / 100).toFixed(0)} — Place my order`
                    )}
                  </button>
                  <p className="text-[11px] opacity-40 text-center">
                    Your order enters the kitchen unverified. Staff will confirm payment before preparing.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Phase: idle — QR + Open UPI App as hero */}

              {/* Mobile: Open UPI App is the primary CTA */}
              <a
                href={upiUri}
                onClick={onOpenUpi}
                className="md:hidden w-full h-14 text-[15px] inline-flex items-center justify-center gap-2.5 rounded-2xl text-white font-semibold transition-all active:scale-[0.98] mb-3"
                style={{ background: "var(--color-ocean-500, #e60000)" }}
              >
                <Smartphone size={18} /> Open UPI App to Pay
              </a>
              <p className="md:hidden text-[11.5px] opacity-50 mb-5">Opens GPay · PhonePe · Paytm · any UPI app</p>

              {/* Desktop: QR is prominent */}
              <p className="hidden md:block text-[11px] font-mono uppercase tracking-wider opacity-50 mb-3">
                Scan with any UPI app
              </p>
              <div className="hidden md:block p-4 bg-white rounded-2xl shadow-[inset_0_0_0_1px_rgba(10,22,40,0.06)] mb-4">
                <QRCode value={upiUri} size={192} bgColor="#ffffff" fgColor="#0a1628" />
              </div>
              <a
                href={upiUri}
                onClick={onOpenUpi}
                className="hidden md:inline-flex items-center gap-2 h-11 px-6 rounded-full text-white text-[13.5px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "var(--color-ocean-500, #e60000)" }}
              >
                <Smartphone size={15} /> Open UPI App
              </a>

              {/* Mobile: QR in collapsed details */}
              <details className="md:hidden w-full text-left mt-1">
                <summary className="text-[12px] font-mono text-center cursor-pointer opacity-50 hover:opacity-80 transition-opacity">
                  On desktop? Scan this QR
                </summary>
                <div className="mt-3 flex flex-col items-center">
                  <div className="p-4 bg-white rounded-2xl shadow-[inset_0_0_0_1px_rgba(10,22,40,0.06)]">
                    <QRCode value={upiUri} size={168} bgColor="#ffffff" fgColor="#0a1628" />
                  </div>
                </div>
              </details>

              <div className="mt-4 text-[11.5px] opacity-50 text-center">
                Paying directly to <span className="font-semibold opacity-85">{liveTenantUpi}</span>
              </div>

              {/* After scanning QR on desktop: button only appears after 20s
                  (same gate as the mobile monitoring path — prevents instant fraud) */}
              {showFallback && (
                <div className="mt-5 border-t border-[color:var(--color-line)] pt-5 w-full flex flex-col gap-2">
                  <p className="text-[11.5px] text-center opacity-60">
                    Paid via UPI? Confirm below so we can send your order to the kitchen.
                  </p>
                  <button
                    onClick={onIvePaid}
                    disabled={verifying}
                    className="w-full h-12 text-[14px] font-bold rounded-xl text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md hover:opacity-90 disabled:opacity-60"
                    style={{ background: "var(--color-ocean-500, #e60000)" }}
                  >
                    {verifying ? (
                      <><Loader2 size={16} className="animate-spin" /> Placing order…</>
                    ) : (
                      `I paid ₹${(order.total_paise / 100).toFixed(0)} — Place my order`
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Right: Order summary + timer ──────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Payment timer — less scary, more subtle */}
          {!expired && (
            <div
              className="rounded-2xl border px-5 py-4 flex items-center justify-between"
              style={{
                border: remaining < 60 ? "1px solid rgba(245,158,11,0.4)" : "1px solid var(--color-line)",
                background: remaining < 60 ? "rgba(245,158,11,0.05)" : "var(--color-paper-dim)",
              }}
            >
              <p className="text-[12px] opacity-55">Payment window</p>
              <div
                className={cn(
                  "font-mono text-[18px] font-semibold tabular",
                  remaining < 60 ? "text-amber-600" : "opacity-65"
                )}
              >
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </div>
            </div>
          )}
          {expired && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 px-5 py-4 text-[13px] text-rose-600">
              Payment window closed.{" "}
              <Link href={`/c/${tenantSlug}/menu`} className="underline font-medium">
                Start a new order
              </Link>
            </div>
          )}

          {/* Order summary */}
          <div className="rounded-2xl border border-[color:var(--color-line)] p-5">
            <div className="text-[10.5px] font-mono uppercase tracking-wider opacity-50 mb-3">
              Your order
            </div>
            <ul className="flex flex-col gap-2.5">
              {lines.map((l) => (
                <li key={l.id} className="flex items-center gap-3 text-[13.5px]">
                  <span
                    className={cn(
                      "shrink-0 h-3.5 w-3.5 inline-flex items-center justify-center border-2 rounded-sm",
                      l.diet_snapshot === "veg" ? "border-emerald-500" : l.diet_snapshot === "egg" ? "border-amber-500" : "border-rose-500"
                    )}
                  >
                    <span className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      l.diet_snapshot === "veg" ? "bg-emerald-500" : l.diet_snapshot === "egg" ? "bg-amber-500" : "bg-rose-500"
                    )} />
                  </span>
                  <span className="flex-1 min-w-0 truncate opacity-80">
                    {l.qty > 1 && <span className="font-semibold">{l.qty}× </span>}
                    {l.name_snapshot}
                  </span>
                  <span className="tabular opacity-65 text-[13px]">
                    {formatRupees(l.qty * l.price_paise_snapshot)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-[color:var(--color-line)] flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] opacity-45">Total</span>
              <span
                className="text-[28px] leading-none tabular"
                style={{ fontFamily: "var(--font-bebas, Impact, sans-serif)", color: "var(--color-ocean-500, #e60000)" }}
              >
                {formatRupees(order.total_paise)}
              </span>
            </div>
          </div>

          {/* Trust signal */}
          <div className="flex items-center justify-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="opacity-35">
              <path d="M12 2L4 5v6c0 5.25 3.5 10.15 8 11.35C16.5 21.15 20 16.25 20 11V5l-8-3z" fill="currentColor" opacity=".3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[11px] opacity-40">
              {paymentMode === "razorpay" ? (
                <>Secured by <span className="font-semibold">Razorpay</span> · No card data stored</>
              ) : (
                <>Paying directly to <span className="font-semibold">{tenantName}</span> · Collect with your OTP at the counter</>
              )}
            </p>
          </div>

          {/* Dev-only simulate button */}
          {isSimMode && (
            <>
              <button
                onClick={() => start(async () => {
                  const r = await simulatePaymentCapture(order.id);
                  if (!r.ok) toast.error(r.error ?? "Could not simulate payment");
                  else {
                    setPhase("success");
                    setTimeout(() => {
                      if (!redirectedRef.current) {
                        redirectedRef.current = true;
                        router.push(`/c/${tenantSlug}/track/${order.id}`);
                      }
                    }, 1200);
                  }
                })}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed text-[13px] font-medium hover:opacity-80 transition-opacity"
                style={{ borderColor: "var(--color-ocean-500, #e60000)", color: "var(--color-ocean-500, #e60000)" }}
              >
                <Sparkles size={13} /> DEV · Simulate payment capture
              </button>
              <p className="text-[10.5px] opacity-40 text-center -mt-2">
                Dev-only — skips real UPI, flips order to placed
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
