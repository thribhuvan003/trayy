import Link from "next/link";
import { headers } from "next/headers";
import { LoginForm } from "@/components/portal-student/login-form";
import { LoginRoleTabs } from "@/components/portal-student/login-role-tabs";
import { safeNext } from "@/lib/auth/safe-redirect";

export const metadata = { title: "Sign in — Tray" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; tenant?: string; error?: string; role?: string; msg?: string }>;
}) {
  const sp = await searchParams;
  const h = await headers();
  const slug = sp.tenant ?? h.get("x-tenant-slug") ?? "";
  const next = safeNext(sp.next, slug ? `/c/${slug}/menu` : "/");
  const initialRole = (sp.role === "kitchen" || sp.role === "owner") ? sp.role : "student";

  // Pass through contextual messages (e.g. "select-canteen" after new signup)
  const infoMsg = sp.msg === "select-canteen"
    ? "Signed in! Share your canteen URL with students so they can start ordering."
    : undefined;

  return (
    <div
      data-portal="student"
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-paper, #F4EFE6)" }}
    >
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">

          {/* Brand */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-10"
            aria-label="Tray home"
          >
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-white text-[13px]"
              style={{
                background: "var(--color-ink, #1A1A19)",
                fontFamily: "var(--font-bricolage)",
                fontWeight: 900,
              }}
            >
              T
            </span>
            <span
              style={{
                fontFamily: "var(--font-bricolage)",
                fontWeight: 800,
                fontSize: "1.3rem",
                letterSpacing: "-0.03em",
                color: "var(--color-ink, #1A1A19)",
              }}
            >
              Tray
            </span>
          </Link>

          {/* Info banner */}
          {infoMsg && (
            <div
              className="mb-6 rounded-2xl border px-4 py-3 text-[13px] leading-[1.55]"
              style={{
                borderColor: "rgba(22,163,74,0.25)",
                background: "rgba(22,163,74,0.06)",
                color: "#15803d",
              }}
            >
              {infoMsg}
            </div>
          )}

          {/* Role tabs + form */}
          <LoginRoleTabs
            initialRole={initialRole as "student" | "kitchen" | "owner"}
            next={next}
            slug={slug}
            error={sp.error}
          />
        </div>
      </div>
    </div>
  );
}
