"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import Link from "next/link";
import { ArrowLeft, Loader2, Smartphone, Sparkles } from "lucide-react";
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
  const [pending, start] = useTransition();
  const [verifying, startVerify] = useTransition();
  const [stillWaiting, setStillWaiting] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!order.payment_expires_at) return;
    const expiry = new Date(order.payment_expires_at).getTime();
    const tick = () => setRemaining(Math.max(0, Math.floor((expiry - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [order.payment_expires_at]);

  useEffect(() => {
    const sb = getBrowserClient();
    const channel = sb
      .channel(`order:${order.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        (payload) => {
          const next = (payload.new as { status: string }).status;
          if (next === "placed" || next === "preparing" || next === "ready") {
            router.push(`/track/${order.id}`);
          }
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [order.id, router]);

  useEffect(() => {
    const id = setInterval(async () => {
      const sb = getBrowserClient();
      const { data } = await sb
        .from("orders")
        .select("status")
        .eq("id", order.id)
        .maybeSingle<{ status: string }>();
      if (data && data.status !== "pending_payment") {
        router.push(`/track/${order.id}`);
      }
    }, 4000);
    return () => clearInterval(id);
  }, [order.id, router]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const expired = remaining === 0 && order.payment_expires_at;

  const upiUri = upiQrPayload({
    vpa: tenantUpi,
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
        router.push(`/track/${order.id}`);
      }
    });

  const onIvePaid = () =>
    startVerify(async () => {
      setStillWaiting(false);
      const r = await verifyPaymentNow(order.id);
      if (r.status === "paid") {
        toast.success("Payment confirmed");
        router.push(`/track/${order.id}`);
      } else if (r.status === "failed") {
        toast.error("Payment failed — try the QR again");
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
          <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55 mb-3">
            Scan with any UPI app
          </div>
          <div className="p-4 bg-white rounded-2xl shadow-[inset_0_0_0_1px_rgba(10,22,40,0.06)]">
            <QRCode value={upiUri} size={208} bgColor="#ffffff" fgColor="#0a1628" />
          </div>
          <a
            href={upiUri}
            className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-ocean-500 text-white text-[13px] font-medium hover:bg-ocean-600 transition-colors"
          >
            <Smartphone size={14} /> Open UPI app
          </a>
          <div className="mt-4 text-[12px] text-[color:var(--color-ink)]/55">
            Paying <span className="font-semibold text-[color:var(--color-ink)]">{tenantName}</span> · {tenantUpi}
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
                We&rsquo;ll auto-cancel after the timer hits zero.
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
              <span className="text-[12px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55">Total</span>
              <span className="font-display text-[22px] font-medium tabular">
                {formatRupees(order.total_paise)}
              </span>
            </div>
          </div>

          <button
            onClick={onIvePaid}
            disabled={verifying || Boolean(expired)}
            className="inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-[color:var(--color-ink)] text-[color:var(--color-paper)] text-[14px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {verifying ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Checking with Razorpay…
              </>
            ) : (
              <>I&rsquo;ve paid · verify now</>
            )}
          </button>
          {stillWaiting && !verifying && (
            <p className="text-[12.5px] text-amber-600 text-center -mt-2">
              Still waiting on Razorpay. UPI confirmation can lag 30–60 seconds — leave this page open and we&rsquo;ll flip it the moment it lands.
            </p>
          )}

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
                Razorpay test-mode hasn&rsquo;t been wired yet — this stand-in flips the order to <b>placed</b>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
