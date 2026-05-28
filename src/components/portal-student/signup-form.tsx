"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowRight, Mail } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

// NOTE: Google OAuth requires "Google" provider enabled in Supabase Dashboard →
// Authentication → Providers → Google, with a valid Client ID and Secret.

export function SignupForm({
  next,
  tenantSlug,
  allowedDomain,
}: {
  next: string;
  tenantSlug: string;
  allowedDomain: string | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  const onGoogleSignIn = () => {
    start(async () => {
      const sb = getBrowserClient();
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: new URL(
            `/auth/callback?next=${encodeURIComponent(next)}&tenant=${encodeURIComponent(tenantSlug)}&signup=1`,
            window.location.origin
          ).toString(),
        },
      });
      if (error) toast.error(error.message);
    });
  };

  const validate = () => {
    if (!allowedDomain) return null;
    const dom = email.split("@")[1]?.toLowerCase();
    if (!dom) return "Enter a valid email";
    if (dom !== allowedDomain.toLowerCase()) {
      return `Use your @${allowedDomain} email`;
    }
    return null;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);
    start(async () => {
      const sb = getBrowserClient();
      const redirectTo = new URL(
        `/auth/callback?next=${encodeURIComponent(next)}&tenant=${encodeURIComponent(tenantSlug)}&signup=1`,
        window.location.origin
      ).toString();
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo, data: { display_name: name, tenant_slug: tenantSlug } },
      });
      if (error) toast.error(error.message);
      else {
        setSent(true);
        toast.success("Check your inbox to confirm your email.");
      }
    });
  };

  if (sent) {
    return (
      <div className="rounded-2xl bg-[color:var(--color-ocean-500)]/8 border border-[color:var(--color-ocean-500)]/30 p-6 text-center">
        <Mail size={32} strokeWidth={1.6} className="mx-auto text-[color:var(--color-ocean-500)] mb-3" />
        <div className="font-medium">Confirm your email</div>
        <p className="text-[13px] text-[color:var(--color-ink)]/65 mt-1">
          We sent a link to <b className="text-[color:var(--color-ink)]">{email}</b>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {/* Google OAuth — primary sign-up option */}
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

      <input
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        placeholder="Your name"
        className="w-full h-12 px-4 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[14px] focus:outline-none focus:border-[color:var(--color-ocean-500)]"
      />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        placeholder={allowedDomain ? `you@${allowedDomain}` : "you@example.com"}
        className="w-full h-12 px-4 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[14px] focus:outline-none focus:border-[color:var(--color-ocean-500)]"
      />
      <input
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        placeholder="Password (8+ characters)"
        className="w-full h-12 px-4 rounded-xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] text-[14px] focus:outline-none focus:border-[color:var(--color-ocean-500)]"
      />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "h-12 rounded-xl bg-[color:var(--color-ocean-500)] text-white text-[14px] font-medium inline-flex items-center justify-center gap-2 hover:bg-[color:var(--color-ocean-500)]/85 transition-colors",
          pending && "opacity-70 cursor-not-allowed"
        )}
      >
        {pending ? "Creating…" : "Create account"} <ArrowRight size={15} />
      </button>
    </form>
  );
}
