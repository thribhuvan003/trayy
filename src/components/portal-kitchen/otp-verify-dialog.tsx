"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { verifyAndCollect } from "@/app/(kitchen)/_actions";

type Order = { id: string; short_code: string; customer_name: string | null };

export function OtpVerifyDialog({
  open,
  order,
  onClose,
  onResult,
}: {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onResult: (ok: boolean) => void;
}) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (open) {
      setDigits(["", "", "", ""]);
      setAttemptsLeft(null);
      setTimeout(() => inputs.current[0]?.focus(), 30);
    }
  }, [open]);

  const change = (i: number, v: string) => {
    const cleaned = v.replace(/\D/g, "").slice(0, 1);
    setDigits((d) => {
      const next = [...d];
      next[i] = cleaned;
      return next;
    });
    if (cleaned && i < 3) inputs.current[i + 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const v = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (v.length === 0) return;
    e.preventDefault();
    const next = ["", "", "", ""];
    for (let i = 0; i < v.length; i++) next[i] = v[i] ?? "";
    setDigits(next);
    inputs.current[Math.min(v.length, 3)]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "Enter") submit();
  };

  const submit = () => {
    if (!order) return;
    const otp = digits.join("");
    if (otp.length !== 4) {
      toast.error("Enter all 4 digits");
      return;
    }
    start(async () => {
      const r = await verifyAndCollect(order.id, otp);
      if (r.ok) {
        toast.success("Served — no shout needed");
        onResult(true);
        return;
      }
      toast.error(r.error ?? "Wrong code");
      if (r.locked) {
        // Order is locked — close dialog so staff can't keep retrying
        onResult(false);
        onClose();
        return;
      }
      if (typeof r.attemptsLeft === "number") setAttemptsLeft(r.attemptsLeft);
      setDigits(["", "", "", ""]);
      inputs.current[0]?.focus();
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,420px)] bg-cream-50 border-2 border-tomato-900 shadow-[10px_10px_0_0_var(--color-tomato-900)] focus:outline-none">
          <div className="flex items-center justify-between p-4 border-b-2 border-tomato-900">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-tomato-500 text-white">
                <KeyRound size={15} />
              </div>
              <div>
                <Dialog.Title className="font-display text-[18px] font-medium leading-tight">
                  Verify pickup
                </Dialog.Title>
                {order && (
                  <div className="text-[11px] font-mono uppercase tracking-wider text-tomato-900/55">
                    {order.short_code} · {order.customer_name ?? "customer"}
                  </div>
                )}
              </div>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-tomato-900/30"
            >
              <X size={14} />
            </Dialog.Close>
          </div>
          <div className="p-5">
            <p className="text-[12.5px] text-tomato-900/65 mb-4">
              Ask the customer for their 4-digit code. Three attempts.
            </p>
            <div className="flex justify-between gap-2" onPaste={onPaste}>
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digits[i]}
                  onChange={(e) => change(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  className="h-16 w-full text-center font-mono tabular text-[32px] font-medium text-tomato-900 border-2 border-tomato-900 bg-cream-50 focus:outline-none focus:border-tomato-500 focus:bg-white"
                />
              ))}
            </div>
            {attemptsLeft !== null && (
              <div
                className={cn(
                  "mt-3 text-[12px] font-mono uppercase tracking-wider text-center",
                  attemptsLeft === 0 ? "text-tomato-500" : "text-amber-600"
                )}
              >
                {attemptsLeft === 0 ? "Locked — ask admin" : `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`}
              </div>
            )}
            <button
              onClick={submit}
              disabled={pending}
              className={cn(
                "mt-5 w-full h-12 rounded-md bg-tomato-500 text-white text-[14px] font-semibold hover:bg-tomato-600 transition-colors",
                pending && "opacity-70 cursor-not-allowed"
              )}
            >
              {pending ? "Serving…" : "SERVE"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
