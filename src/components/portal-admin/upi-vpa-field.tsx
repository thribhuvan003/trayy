"use client";

import { useState, useTransition } from "react";
import { validateUpiVpa } from "@/app/(admin)/admin/_actions";

type Status = "idle" | "checking" | "valid" | "invalid";

export function UpiVpaField({ currentVpa }: { currentVpa: string | null }) {
  const [vpa, setVpa] = useState(currentVpa ?? "");
  const [status, setStatus] = useState<Status>(currentVpa ? "valid" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const handleChange = (val: string) => {
    setVpa(val);
    setStatus("idle");
    setErrorMsg(undefined);
  };

  const handleVerify = () => {
    if (!vpa.trim()) return;
    setStatus("checking");
    setErrorMsg(undefined);
    startTransition(async () => {
      const result = await validateUpiVpa(vpa.trim());
      setStatus(result.valid ? "valid" : "invalid");
      if (!result.valid) setErrorMsg(result.error);
    });
  };

  const isValid = status === "valid";

  return (
    <div className="border-t border-graphite-200/10 pt-4 flex flex-col gap-2">
      <label htmlFor="upi_vpa" className="text-[11px] font-mono uppercase tracking-[0.1em] text-graphite-400">
        UPI ID{" "}
        <span className="normal-case tracking-normal font-sans text-graphite-500">
          (students pay directly to this — money goes straight to your bank)
        </span>
      </label>

      <div className="flex gap-2">
        <input
          id="upi_vpa"
          name="upi_vpa"
          type="text"
          value={vpa}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="e.g. 9876543210@ybl or canteen@okaxis"
          spellCheck={false}
          autoComplete="off"
          className={`flex-1 h-9 px-3 rounded-md border bg-graphite-700/60 text-[13px] text-graphite-200 placeholder:text-graphite-500 focus:outline-none transition-colors ${
            status === "valid"
              ? "border-emerald-500/60"
              : status === "invalid"
              ? "border-rose-500/60"
              : "border-graphite-200/15 focus:border-lime/60"
          }`}
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={!vpa.trim() || isPending}
          className="h-9 px-3 rounded-md border border-graphite-200/15 text-[11px] font-mono text-graphite-300 hover:border-lime/60 hover:text-lime transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isPending ? "Checking…" : "Check"}
        </button>
      </div>

      {status === "valid" && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] text-emerald-400">✓ Format looks correct</p>
          <p className="text-[11px] text-amber-400">
            ⚠ Format check only — we cannot verify the account exists at the bank. <strong>Send ₹1 to this UPI from a different phone</strong> to confirm it receives money before going live.
          </p>
        </div>
      )}
      {status === "invalid" && (
        <p className="text-[11px] text-rose-400">✗ {errorMsg}</p>
      )}
      {status === "idle" && (
        <p className="text-[11px] text-graphite-500">
          Students pay <strong className="text-graphite-300">directly</strong> to this UPI — money goes instantly to your bank. Always test with ₹1 first before going live.
        </p>
      )}

      {/* Always pass the current VPA value — verification is optional */}
      <input type="hidden" name="upi_vpa_verified" value="1" />
    </div>
  );
}
