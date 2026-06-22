"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { CheckCircle2, Loader2, ArrowLeft, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatRupees, cn } from "@/lib/utils";
import { upiQrPayload } from "@/lib/payments/upi";
import { verifyPaymentNow } from "@/app/(student)/_actions";
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
      }, 2000);
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
            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-500/20">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="font-display text-6xl italic mb-4 tracking-tight">Order <span>Placed!</span></h2>
            <p className="text-dust text-lg mb-8 font-medium">Your order #{order.short_code} is now in the kitchen.</p>
            <div className="flex items-center justify-center gap-3 text-sm text-dust font-bold uppercase tracking-widest">
              <Loader2 className="animate-spin" size={16} />
              Tracking your feast...
            </div>
          </motion.div>
        ) : (
          <motion.div key="pay" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-12">
              <button onClick={() => router.back()} className="flex items-center gap-2 text-dust hover:text-ink transition-colors mb-8 font-bold text-[10px] uppercase tracking-widest">
                <ArrowLeft size={14} /> Back to Menu
              </button>
              <h1 className="font-display text-6xl md:text-7xl mb-4 tracking-tighter italic leading-none">Final <span>Step</span></h1>
              <p className="text-dust text-lg font-medium">Complete the transaction to confirm your tray.</p>
            </div>

            <div className="bg-white rounded-[40px] p-10 border border-ink/5 shadow-premium mb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-ocean/5 rounded-bl-full -mr-16 -mt-16" />
              
              <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
                <div className="p-4 bg-white border border-ink/5 rounded-[24px] shadow-sm">
                  <QRCode value={upiUri} size={180} />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-dust mb-2">Total Amount Due</div>
                  <div className="font-display text-6xl mb-6 tracking-tight italic">{formatRupees(order.total_paise)}</div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-dust">
                      <ShieldCheck size={14} className="text-ocean" />
                      Pay to: <span className="text-ink">{tenantName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-dust">
                      <Clock size={14} className="text-dust" />
                      Expires in 15 mins
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-8">
              <PaymentSlider 
                onConfirm={onConfirmPayment} 
                isLoading={verifying || phase === "confirming"}
              />
              <p className="text-[10px] text-dust font-bold uppercase tracking-[0.2em] opacity-60">
                Slide to authorize payment via UPI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
