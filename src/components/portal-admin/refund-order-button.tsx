"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { refundOrderAsAdmin } from "@/app/(admin)/admin/_actions";

export function RefundOrderButton({ orderId, shortCode }: { orderId: string; shortCode: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const reason =
            (e.currentTarget.elements.namedItem("reason") as HTMLInputElement)?.value?.trim() ||
            "Admin refund";
          start(async () => {
            const r = await refundOrderAsAdmin(orderId, reason);
            if (r.ok) toast.success(`#${shortCode} refund initiated — arrives in 3–5 business days`);
            else toast.error(r.error ?? "Refund failed");
            setConfirming(false);
          });
        }}
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          name="reason"
          defaultValue="Wrong item delivered"
          autoFocus
          className="h-7 w-36 rounded border border-graphite-200/20 bg-graphite-600 px-2 text-[11px] text-graphite-200 outline-none focus:border-amber-500/50"
          maxLength={80}
        />
        <button
          type="submit"
          disabled={pending}
          className="h-7 px-2 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
        >
          {pending ? "…" : "Refund"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="h-7 px-2 rounded text-[10px] font-mono uppercase tracking-wider text-graphite-400 border border-graphite-200/10 hover:text-graphite-200 transition-colors"
        >
          No
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="h-6 px-2 rounded text-[10px] font-mono uppercase tracking-wider text-amber-400 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors"
    >
      Refund
    </button>
  );
}
