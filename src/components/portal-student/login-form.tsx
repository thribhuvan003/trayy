"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail, KeyRound, ArrowRight } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [otpVisible, setOtpVisible] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Countdown after the magic-link email is sent. When it reaches zero, the
  // OTP fallback input fades in so the user can type the 6-digit code from
  // the same email instead of clicking the link.
  useEffect(() => {
    if (!sent || otpVisible) return;
    if (otpCountdown <= 0) {
      setOtpVisible(true);
      return;
    }
    const t = setTimeout(() => setOtpCountdown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sent, otpVisible, otpCountdown]);

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || verifying) return;
    setVerifying(true);
    const sb = getBrowserClient();
    const { error } = await sb.auth.verifyOtp({ email, token: otp, type: "email" });
    if (error) {
      toast.error(error.message);
      setVerifying(false);
      return;
    }
    window.location.href = next;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const sb = getBrowserClient();
      const redirectTo = new URL(`/auth/callback?next=${encodeURIComponent(next)}`, window.location.origin).toString();
      if (mode === "magic") {
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
        });
        if (error) toast.error(error.message);
        else {
          setSent(true);
          toast.success("Magic link sent — check your inbox.");
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) toast.error(error.message);
        else window.location.href = next;
      }
    });
  };

  if (sent) {
    return (
      <div className="rounded-2xl bg-ocean-500/8 border border-ocean-500/30 p-6 text-center">
        <Mail size={32} strokeWidth={1.6} className="mx-auto text-ocean-500 mb-3" />
        <div className="font-medium">Check your inbox</div>
        <p className="text-[13px] text-[color:var(--color-ink)]/65 mt-1">
          We just sent a link to <b className="text-[color:var(--color-ink)]">{email}</b>. It expires in 15 minutes.
        </p>
        <div
          className={cn(
            "mt-5 transition-opacity duration-700 ease-out",
            otpVisible ? "opacity-100" : "opacity-0 pointer-events-none h-0 overflow-hidden"
          )}
          aria-hidden={!otpVisible}
        >
          <div className="border-t border-ocean-500/20 pt-4 text-left">
            <label className="block text-[12.5px] font-medium text-[color:var(--color-ink)]/75 mb-2">
              Or enter the 6-digit code from the same email
            </label>
            <form onSubmit={onVerifyOtp} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="flex-1 h-12 px-4 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[15px] tracking-[0.4em] text-center focus:outline-none focus:border-ocean-500"
              />
              <button
                type="submit"
                disabled={otp.length !== 6 || verifying}
                className={cn(
                  "h-12 px-4 rounded-xl bg-ocean-500 text-white text-[13.5px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-ocean-600 transition-colors",
                  (otp.length !== 6 || verifying) && "opacity-60 cursor-not-allowed"
                )}
              >
                {verifying ? "Verifying…" : "Verify"} <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
        {!otpVisible && (
          <p className="text-[11.5px] text-[color:var(--color-ink)]/45 mt-4">
            Prefer a code? It will appear in {otpCountdown}s.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-paper-dim)] text-[12.5px] font-medium">
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={cn(
            "h-9 rounded-full inline-flex items-center justify-center gap-1.5 transition-colors",
            mode === "magic" ? "bg-ocean-500 text-white" : "text-[color:var(--color-ink)]/65"
          )}
        >
          <Mail size={13} /> Magic link
        </button>
        <button
          type="button"
          onClick={() => setMode("password")}
          className={cn(
            "h-9 rounded-full inline-flex items-center justify-center gap-1.5 transition-colors",
            mode === "password" ? "bg-ocean-500 text-white" : "text-[color:var(--color-ink)]/65"
          )}
        >
          <KeyRound size={13} /> Password
        </button>
      </div>
      <label>
        <span className="sr-only">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@yourcollege.edu"
          className="w-full h-12 px-4 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[14px] focus:outline-none focus:border-ocean-500"
        />
      </label>
      {mode === "password" && (
        <label>
          <span className="sr-only">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="Password"
            className="w-full h-12 px-4 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[14px] focus:outline-none focus:border-ocean-500"
          />
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "h-12 rounded-xl bg-ocean-500 text-white text-[14px] font-medium inline-flex items-center justify-center gap-2 hover:bg-ocean-600 transition-colors",
          pending && "opacity-70 cursor-not-allowed"
        )}
      >
        {pending ? "Sending…" : mode === "magic" ? "Send magic link" : "Sign in"} <ArrowRight size={15} />
      </button>
    </form>
  );
}
