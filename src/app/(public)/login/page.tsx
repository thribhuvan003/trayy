import Link from "next/link";
import { LoginForm } from "@/components/portal-student/login-form";

export const metadata = { title: "Sign in — Tray" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/";
  return (
    <div
      data-portal="student"
      className="min-h-screen bg-[color:var(--color-paper)] text-[color:var(--color-ink)] flex flex-col"
    >
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-2.5 font-display text-[19px] tracking-tight mb-10">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ocean-500 text-white font-mono text-[12px] font-bold">T</span>
            <span className="font-medium">Tray<span className="italic text-ocean-500">.</span></span>
          </Link>
          <h1 className="font-display text-[40px] leading-[1.05] tracking-tight font-medium">
            Sign in.<br />
            <span className="italic text-ocean-500">Eat sooner.</span>
          </h1>
          <p className="text-[14px] text-[color:var(--color-ink)]/65 mt-3">
            Use your campus email — we&rsquo;ll send a magic link, no password required.
          </p>
          {sp.error && (
            <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-[13px] text-rose-600">
              {sp.error}
            </div>
          )}
          <div className="mt-7">
            <LoginForm next={next} />
          </div>
          <p className="mt-8 text-[12.5px] text-[color:var(--color-ink)]/55">
            New to Tray?{" "}
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-ocean-500 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
