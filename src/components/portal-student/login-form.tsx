"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail, KeyRound, ArrowRight } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

// NOTE: Google OAuth requires "Google" provider enabled in Supabase Dashboard →
// Authentication → Providers → Google, with a valid Client ID and Secret.

export function LoginForm({ next, slug = "" }: { next: string; slug?: string }) {
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();

  const onGoogleSignIn = () => {
    start(async () => {
      const sb = getBrowserClient();
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: new URL(
            `/auth/callback?next=${encodeURIComponent(next)}&tenant=${encodeURIComponent(slug)}`,
            window.location.origin
          ).toString(),
        },
      });
      if (error) {
        const msg =
          error.message.toLowerCase().includes("provider") ||
          error.message.toLowerCase().includes("not enabled")
            ? "Google sign-in isn't enabled for this canteen. Use your email instead."
            : "Google sign-in failed. Try again or use email.";
        toast.error(msg);
      }
    });
  };
  const [sent, setSent] = useState(false);
  const [otpVisible, setOtpVisible] = useState(true);
  const [otpCountdown, setOtpCountdown] = useState(0);
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
      const msg = error.message.toLowerCase().includes("expired")
        ? "Code expired — request a new magic link."
        : error.message.toLowerCase().includes("invalid")
        ? "Wrong code. Check your email and try again."
        : error.message;
      toast.error(msg);
      setVerifying(false);
      return;
    }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
      toast.error("Sign-in failed. Please try again.");
      setVerifying(false);
      return;
    }
    window.location.href = next;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const sb = getBrowserClient();
      const redirectTo = new URL(
          `/auth/callback?next=${encodeURIComponent(next)}&tenant=${encodeURIComponent(slug)}`,
          window.location.origin
        ).toString();
      if (mode === "magic") {
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
        });
        if (error) {
          const msg =
            error.message.toLowerCase().includes("signup") ||
            error.message.toLowerCase().includes("not allowed")
              ? "No account found with that email. Sign up first or use Google."
              : error.message;
          toast.error(msg);
        } else {
          setSent(true);
          toast.success("Magic link sent — check your inbox.");
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = error.message.toLowerCase().includes("invalid")
            ? "Wrong email or password. Try again."
            : error.message;
          toast.error(msg);
        } else window.location.href = next;
      }
    });
  };

  if (sent) {
    return (
      <div className="rounded-2xl bg-[color:var(--color-ocean-500)]/8 border border-[color:var(--color-ocean-500)]/30 p-6 text-center">
        <Mail size={32} strokeWidth={1.6} className="mx-auto text-[color:var(--color-ocean-500)] mb-3" />
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
          <div className="border-t border-[color:var(--color-ocean-500)]/20 pt-4 text-left">
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
                className="flex-1 h-12 px-4 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[15px] tracking-[0.4em] text-center focus:outline-none focus:border-[color:var(--color-ocean-500)]"
              />
              <button
                type="submit"
                disabled={otp.length !== 6 || verifying}
                className={cn(
                  "h-12 px-4 rounded-xl bg-[color:var(--color-ocean-500)] text-white text-[13.5px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-[color:var(--color-ocean-500)]/85 transition-colors",
                  (otp.length !== 6 || verifying) && "opacity-60 cursor-not-allowed"
                )}
              >
                {verifying ? "Verifying…" : "Verify"} <ArrowRight size={14} />
              </button>
            </form>
          </div>
        </div>
        <p className="text-[12px] text-amber-600 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 mt-3">
          If the email doesn&apos;t arrive in 60s, type the 6-digit code from the email above — or use Google sign-in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {/* Google OAuth — primary sign-in option */}
      <div className="flex flex-col gap-3 mb-4">
        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={pending}
          className="w-full h-12 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[14px] font-medium inline-flex items-center justify-center gap-2.5 hover:border-[color:var(--color-ocean-500)]/50 hover:bg-[color:var(--color-ocean-500)]/5 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[color:var(--color-line)]" />
          <span className="text-[12px] text-[color:var(--color-ink)]/45 font-mono">or</span>
          <div className="flex-1 h-px bg-[color:var(--color-line)]" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-paper-dim)] text-[12.5px] font-medium">
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={cn(
            "h-9 rounded-full inline-flex items-center justify-center gap-1.5 transition-colors",
            mode === "magic" ? "bg-[color:var(--color-ocean-500)] text-white" : "text-[color:var(--color-ink)]/65"
          )}
        >
          <Mail size={13} /> Magic link
        </button>
        <button
          type="button"
          onClick={() => setMode("password")}
          className={cn(
            "h-9 rounded-full inline-flex items-center justify-center gap-1.5 transition-colors",
            mode === "password" ? "bg-[color:var(--color-ocean-500)] text-white" : "text-[color:var(--color-ink)]/65"
          )}
        >
          <KeyRound size={13} /> Use password
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
          className="w-full h-12 px-4 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[14px] focus:outline-none focus:border-[color:var(--color-ocean-500)]"
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
            className="w-full h-12 px-4 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[14px] focus:outline-none focus:border-[color:var(--color-ocean-500)]"
          />
        </label>
      )}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "h-12 rounded-xl bg-[color:var(--color-ocean-500)] text-white text-[14px] font-medium inline-flex items-center justify-center gap-2 hover:bg-[color:var(--color-ocean-500)]/85 transition-colors",
          pending && "opacity-70 cursor-not-allowed"
        )}
      >
        {pending ? "Sending…" : mode === "magic" ? "Send magic link" : "Sign in"} <ArrowRight size={15} />
      </button>
    </form>
  );
}
