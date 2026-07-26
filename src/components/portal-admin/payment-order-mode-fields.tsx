"use client";

import { useState } from "react";

type PaymentMode = "direct_upi" | "razorpay";
type OrderMode = "kitchen_flow" | "token_prepaid";

export function PaymentOrderModeFields({
  initialPaymentMode,
  initialOrderMode,
  razorpayAvailable,
}: {
  initialPaymentMode: PaymentMode;
  initialOrderMode: OrderMode;
  razorpayAvailable: boolean;
}) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initialPaymentMode);
  const [orderMode, setOrderMode] = useState<OrderMode>(initialOrderMode);

  const choosePaymentMode = (next: PaymentMode) => {
    setPaymentMode(next);
    if (next === "direct_upi") setOrderMode("kitchen_flow");
  };

  return (
    <>
      <div className="border-t border-graphite-200/10 pt-4">
        <fieldset>
          <legend className="text-[11px] font-mono uppercase tracking-[0.1em] text-graphite-400 mb-3">
            Payment mode
          </legend>
          <div className="flex flex-col gap-3">
            <label
              className="flex min-h-11 items-start gap-3 cursor-pointer select-none rounded-lg border p-3 transition-colors"
              style={{
                background:
                  paymentMode === "direct_upi" ? "rgba(210,251,80,0.05)" : "transparent",
                borderColor:
                  paymentMode === "direct_upi"
                    ? "rgba(210,251,80,0.3)"
                    : "rgba(238,241,247,0.1)",
              }}
            >
              <input
                type="radio"
                name="payment_mode"
                value="direct_upi"
                checked={paymentMode === "direct_upi"}
                onChange={() => choosePaymentMode("direct_upi")}
                className="mt-0.5 accent-lime h-4 w-4 shrink-0"
              />
              <span>
                <span className="text-[13px] text-graphite-200 font-semibold flex items-center gap-2">
                  Direct UPI
                  <span className="text-[9px] font-mono bg-lime/20 text-lime px-1.5 py-0.5 rounded font-bold tracking-wide">
                    DEFAULT
                  </span>
                </span>
                <span className="block text-[11.5px] text-graphite-400 mt-1 leading-[1.6]">
                  Money lands directly in your bank. Kitchen staff verify the transfer
                  before preparing the order.
                </span>
              </span>
            </label>

            <label
              className={`flex min-h-11 items-start gap-3 select-none rounded-lg border p-3 transition-colors ${
                razorpayAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              }`}
              style={{
                background:
                  paymentMode === "razorpay" ? "rgba(210,251,80,0.05)" : "transparent",
                borderColor:
                  paymentMode === "razorpay"
                    ? "rgba(210,251,80,0.3)"
                    : "rgba(238,241,247,0.1)",
              }}
            >
              <input
                type="radio"
                name="payment_mode"
                value="razorpay"
                checked={paymentMode === "razorpay"}
                disabled={!razorpayAvailable}
                onChange={() => choosePaymentMode("razorpay")}
                className="mt-0.5 accent-lime h-4 w-4 shrink-0 disabled:opacity-40"
              />
              <span>
                <span className="text-[13px] text-graphite-200 font-semibold">
                  Razorpay Automatic
                </span>
                <span className="block text-[11.5px] text-graphite-400 mt-1 leading-[1.6]">
                  Orders reach the board only after Razorpay confirms a captured payment.
                </span>
                {!razorpayAvailable && (
                  <span className="mt-2 block rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-200">
                    Unavailable until live Razorpay keys are configured for this deployment.
                  </span>
                )}
              </span>
            </label>
          </div>
        </fieldset>
      </div>

      <div className="border-t border-graphite-200/10 pt-4">
        <fieldset>
          <legend className="text-[11px] font-mono uppercase tracking-[0.1em] text-graphite-400 mb-3">
            Order flow
          </legend>
          <div className="flex flex-col gap-3">
            <label
              className="flex min-h-11 items-start gap-3 cursor-pointer select-none rounded-lg border p-3 transition-colors"
              style={{
                background:
                  orderMode === "kitchen_flow" ? "rgba(210,251,80,0.05)" : "transparent",
                borderColor:
                  orderMode === "kitchen_flow"
                    ? "rgba(210,251,80,0.3)"
                    : "rgba(238,241,247,0.1)",
              }}
            >
              <input
                type="radio"
                name="order_mode"
                value="kitchen_flow"
                checked={orderMode === "kitchen_flow"}
                onChange={() => setOrderMode("kitchen_flow")}
                className="mt-0.5 accent-lime h-4 w-4 shrink-0"
              />
              <span>
                <span className="text-[13px] text-graphite-200 font-semibold flex items-center gap-2">
                  Kitchen board
                  <span className="text-[9px] font-mono bg-lime/20 text-lime px-1.5 py-0.5 rounded font-bold tracking-wide">
                    DEFAULT
                  </span>
                </span>
                <span className="block text-[11.5px] text-graphite-400 mt-1 leading-[1.6]">
                  Staff accept, prepare, mark ready, and verify pickup on the kitchen screen.
                </span>
              </span>
            </label>

            <label
              className={`flex min-h-11 items-start gap-3 select-none rounded-lg border p-3 transition-colors ${
                paymentMode === "razorpay"
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-60"
              }`}
              style={{
                background:
                  orderMode === "token_prepaid" ? "rgba(210,251,80,0.05)" : "transparent",
                borderColor:
                  orderMode === "token_prepaid"
                    ? "rgba(210,251,80,0.3)"
                    : "rgba(238,241,247,0.1)",
              }}
            >
              <input
                type="radio"
                name="order_mode"
                value="token_prepaid"
                checked={orderMode === "token_prepaid"}
                disabled={paymentMode !== "razorpay"}
                onChange={() => setOrderMode("token_prepaid")}
                className="mt-0.5 accent-lime h-4 w-4 shrink-0 disabled:opacity-40"
              />
              <span>
                <span className="text-[13px] text-graphite-200 font-semibold">
                  Token counter
                </span>
                <span className="block text-[11.5px] text-graphite-400 mt-1 leading-[1.6]">
                  No kitchen screen. A verified paid token appears on the customer&apos;s
                  phone for counter pickup. Requires Razorpay Automatic.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      </div>
    </>
  );
}
