"use client";

/**
 * SmartLoginForm — clean, role-free sign-in used by all portals.
 *
 * Design principle (Vercel / Linear / Notion pattern):
 *   - User signs in once
 *   - System detects their role and routes them to the right portal
 *   - No "are you a Student / Kitchen / Admin?" tab dance
 *   - Google OAuth as the hero method (one tap on mobile)
 *   - Email + password as fallback
 *
 * Routing after sign-in (privilege-ordered, matches auth/callback):
 *   canteen_admin / super_admin → /c/slug/admin/dashboard
 *   kitchen_staff             → /c/slug/kitchen/staff-select
 *   student                   → /c/slug/menu
 *   no membership             → /get-started (owner) or helpful message
 */

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type Props = {
  next: string;
  slug?: string;
  /** hint from the URL (?role=owner|kitchen) — used to save a cookie for
   *  the auth callback but NOT shown to the user as a required choice */
  hintRole?: string;
};

export function SmartLoginForm({ next, slug = "", hintRole }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();

  // ── Smart redirect: same privilege-order as auth/callback/route.ts ──────
  const smartRedirect = async () => {
    const sb = getBrowserClient();
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.user) { window.location.href = next; return; }

    const { data: membershipsRaw } = await sb
      .from("tenant_memberships")
      .select("tenant_id, role")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const memberships = (membershipsRaw ?? []) as { tenant_id: string; role: string }[];

    if (!memberships.length) {
      // Any hint toward owner/admin, or no hint at all (plain login) — send to get-started
      // rather than showing "No account found" which causes a redirect loop for admins
      // who signed up but whose membership wasn't cached yet.
      if (hintRole === "kitchen") {
        window.location.href = `/login?error=${encodeURIComponent("No kitchen staff account found. Ask your canteen admin to add you.")}`;
      } else {
        // Default for owners, admins, students with no membership, or unknown role
        window.location.href = "/get-started?new=1";
      }
      return;
    }

    // Privilege order: admin > kitchen > student
    const adminMem = memberships.find(m =>
      m.role === "canteen_admin" || m.role === "super_admin"
    );
    const kitchenMem = memberships.find(m =>
      m.role === "kitchen_staff" || m.role === "kitchen"
    );
    const activeMem = adminMem ?? kitchenMem ?? memberships[0];

    // Resolve slug for this membership.
    // Always look up the slug from the selected membership's tenant_id so we
    // route to the correct canteen even when the URL slug and the membership
    // tenant differ (e.g. admin has memberships in multiple canteens).
    let resolvedSlug = slug;
    let resolvedCollegeSlug: string | null = null;
    const { data: tenantRow } = (await sb
      .from("tenants")
      .select("slug, colleges(slug)")
      .eq("id", activeMem.tenant_id)
      .maybeSingle()) as unknown as { data: { slug: string; colleges: { slug: string } | null } | null };
    if (tenantRow?.slug) resolvedSlug = tenantRow.slug;
    resolvedCollegeSlug = (tenantRow?.colleges as { slug: string } | null)?.slug ?? null;

    if (!resolvedSlug) { window.location.href = "/get-started?new=1"; return; }

    const role = activeMem.role;
    if (role === "canteen_admin" || role === "super_admin") {
      window.location.href = `/c/${resolvedSlug}/admin/dashboard`;
    } else if (role === "kitchen_staff" || role === "kitchen") {
      window.location.href = `/c/${resolvedSlug}/kitchen/staff-select`;
    } else {
      // Students → college portal (all canteens at their institution) if it exists
      if (resolvedCollegeSlug) {
        window.location.href = `/college/${resolvedCollegeSlug}`;
      } else {
        window.location.href = next.startsWith("/c/") ? next : `/c/${resolvedSlug}/menu`;
      }
    }
  };

  const onGoogleSignIn = () => {
    start(async () => {
      try {
        const ctx = JSON.stringify({ role: hintRole ?? "owner", tenant: slug, next });
        document.cookie = `_tray_auth_ctx=${encodeURIComponent(ctx)}; path=/; max-age=300; SameSite=Lax`;
      } catch { /* non-fatal */ }

      const sb = getBrowserClient();
      const redirectTo = new URL(
        `/auth/callback?next=${encodeURIComponent(next)}&tenant=${encodeURIComponent(slug)}&role=${encodeURIComponent(hintRole ?? "")}`,
        window.location.origin
      ).toString();

      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) toast.error("Google sign-in failed. Try email below.");
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const sb = getBrowserClient();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message.toLowerCase().includes("invalid")
          ? "Wrong email or password."
          : error.message.toLowerCase().includes("not confirmed")
          ? "Check your inbox — you need to confirm your email first."
          : error.message;
        toast.error(msg);
        return;
      }
      if (data.user) await smartRedirect();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3.5">
      {/* Google — hero CTA */}
      <button
        type="button"
        onClick={onGoogleSignIn}
        disabled={pending}
        className={cn(
          "w-full h-[52px] rounded-xl border-2 border-[color:var(--color-ink)] bg-white text-[color:var(--color-ink)] text-[15px] font-semibold inline-flex items-center justify-center gap-2.5 transition-all select-none shadow-[0_3px_0_var(--color-ink)]",
          pending
            ? "cursor-wait opacity-60"
            : "cursor-pointer active:translate-y-[2px] active:shadow-none hover:bg-[color:var(--color-ocean-50)]"
        )}
      >
        {pending ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2"/>
              <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Redirecting…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[color:var(--color-line)]" />
        <span className="text-[12px] text-[color:var(--color-ink)]/40 font-mono">or</span>
        <div className="flex-1 h-px bg-[color:var(--color-line)]" />
      </div>

      {/* Email */}
      <label>
        <span className="sr-only">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full h-[52px] px-4 rounded-xl border-2 border-[color:var(--color-line)] bg-white text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink)]/40 text-[15px] focus:outline-none focus:border-[color:var(--color-ocean-500)] transition-colors"
        />
      </label>

      {/* Password */}
      <label>
        <span className="sr-only">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Password"
          className="w-full h-[52px] px-4 rounded-xl border-2 border-[color:var(--color-line)] bg-white text-[color:var(--color-ink)] placeholder:text-[color:var(--color-ink)]/40 text-[15px] focus:outline-none focus:border-[color:var(--color-ocean-500)] transition-colors"
        />
      </label>

      {/* Submit — tomato signal CTA */}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "h-[52px] rounded-xl bg-[color:var(--color-ocean-500)] text-white text-[15px] font-bold inline-flex items-center justify-center gap-2 shadow-[0_3px_0_#1a1410] active:translate-y-[2px] active:shadow-none transition-all",
          pending && "opacity-60 cursor-not-allowed"
        )}
      >
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight size={16} />}
      </button>
    </form>
  );
}
