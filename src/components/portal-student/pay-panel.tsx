"use client";

import { useEffect, useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatRupees, cn } from "@/lib/utils";
import { upiQrPayload } from "@/lib/payments/upi";
import { verifyPaymentNow } from "@/app/(student)/_actions";
import { getBrowserClient } from "@/lib/supabase/browser";
import { PaymentSlider } from "./payment-slider";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "idle" | "monitoring" | "confirming" | "success" | "failed";

type Order = {
  id: string;
  short_code: string;
  total_paise: number;
  status: string;
  payment_expires_at: string | null;
  customer_name: string | null;
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
  lines: any[];
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [verifying, startVerify] = useTransition();

  const handleDetected = useCallback((status: string) => {
    if (status === "placed" || status === "preparing" || status === "ready" || status === "collected") {
      setPhase("success");
      setTimeout(() => {
        router.push(`/c/${tenantSlug}/track/${order.id}`);
      }, 1500);
    }
  }, [router, tenantSlug, order.id]);

  const onConfirmPayment = () => {
    setPhase("confirming");
    startVerify(async () => {
      const r = await verifyPaymentNow(order.id);
      if (r.status === "paid") {
        handleDetected("placed");
      } else {
        setPhase("idle");
        toast.error("Payment not confirmed yet. Please try again.");
      }
    });
  };

  const upiUri = upiQrPayload({ vpa: tenantUpi, name: tenantName, amountPaise: order.total_paise, note: order.short_code });

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <AnimatePresence mode="wait">
        {phase === "success" ? (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 className="text-emerald-500" size={48} strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-5xl mb-4 tracking-tight">Payment Received</h2>
            <p className="text-dust text-lg mb-8 font-medium">Your order #{order.short_code} is now in the kitchen.</p>
            <div className="flex items-center justify-center gap-3 text-sm text-dust font-medium">
              <Loader2 className="animate-spin" size={16} />
              Redirecting to tracking...
            </div>
          </motion.div>
        ) : (
          <motion.div key="pay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-12">
              <button onClick={() => router.back()} className="flex items-center gap-2 text-dust hover:text-ink transition-colors mb-8 font-medium text-sm">
                <ArrowLeft size={16} /> Back to Menu
              </button>
              <h1 className="font-display text-6xl mb-4 tracking-tighter italic">Finalize <span>Payment</span></h1>
              <p className="text-dust text-lg font-medium">Complete the UPI transaction to send your order to the kitchen.</p>
            </div>

            <div className="bg-white rounded-[32px] p-8 border border-ink/5 shadow-premium mb-8">
              <div className="flex flex-col md:flex-row gap-12 items-center">
                <div className="p-4 bg-white border border-ink/5 rounded-2xl shadow-sm">
                  <QRCode value={upiUri} size={200} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="text-sm font-bold uppercase tracking-widest text-dust mb-2">Amount Due</div>
                  <div className="font-display text-5xl mb-6 tracking-tight">{formatRupees(order.total_paise)}</div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-dust">Pay to: <span className="text-ink">{tenantName}</span></p>
                    <p className="text-sm font-medium text-dust">VPA: <span className="text-ink">{tenantUpi}</span></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <PaymentSlider 
                onConfirm={onConfirmPayment} 
                isLoading={verifying}
                label="Slide to confirm payment"
              />
              <p className="text-[12px] text-dust font-medium uppercase tracking-widest">
                Secure transaction via Razorpay
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
