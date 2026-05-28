import Link from "next/link";
import { SignupForm } from "@/components/portal-student/signup-form";
import { headers } from "next/headers";

export const metadata = { title: "Create account — Tray" };

const ROLE_COPY = {
  student: {
    headline: "Start ordering.",
    italic: "No more queues.",
    sub: "Any email works — personal, college, or work.",
  },
  kitchen: {
    headline: "Join the",
    italic: "kitchen crew.",
    sub: "Your admin should invite you directly. If you don't have an invite, ask them.",
  },
  owner: {
    headline: "Launch your",
    italic: "canteen system.",
    sub: "Any email works. You'll set up your canteen in the next step.",
  },
} as const;

type RoleKey = keyof typeof ROLE_COPY;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "";
  const role: RoleKey = sp.role === "owner" || sp.role === "kitchen" ? sp.role : "student";
  const copy = ROLE_COPY[role];

  return (
    <div
      data-portal="student"
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-paper, #F4EFE6)" }}
    >
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">

          {/* Brand */}
          <Link href="/" className="inline-flex items-center gap-2 mb-10" aria-label="Tray home">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-white text-[13px]"
              style={{ background: "var(--color-ink, #1A1A19)", fontFamily: "var(--font-bricolage)", fontWeight: 900 }}
            >
              T
            </span>
            <span
              style={{ fontFamily: "var(--font-bricolage)", fontWeight: 800, fontSize: "1.3rem", letterSpacing: "-0.03em", color: "var(--color-ink, #1A1A19)" }}
            >
              Tray
            </span>
          </Link>

          {/* Headline */}
          <h1
            className="leading-[0.88] tracking-[-0.04em] uppercase mb-3"
            style={{
              fontFamily: "var(--font-barlow, 'Barlow Condensed', sans-serif)",
              fontWeight: 900,
              fontSize: "clamp(2.6rem, 7vw, 4rem)",
              color: "var(--color-ink, #1A1A19)",
            }}
          >
            {copy.headline}{" "}
            <span
              style={{
                fontFamily: "var(--font-fraunces, serif)",
                fontStyle: "italic",
                textTransform: "none",
                fontWeight: 400,
                color: "var(--color-ocean-500, #e60000)",
              }}
            >
              {copy.italic}
            </span>
          </h1>
          <p className="text-[14px] leading-[1.6] mb-7" style={{ color: "var(--color-ink, #1A1A19)", opacity: 0.52 }}>
            {copy.sub}
          </p>

          {/* Sign-up form */}
          <SignupForm
            next={sp.next ?? "/"}
            tenantSlug={slug}
            allowedDomain={null}
          />

          {/* Footer */}
          <div className="mt-7 pt-5 border-t border-[color:var(--color-line)]">
            <p className="text-[13px]" style={{ color: "var(--color-ink, #1A1A19)", opacity: 0.5 }}>
              Already have an account?{" "}
              <Link
                href={`/login?next=${encodeURIComponent(sp.next ?? "/")}&role=${role}`}
                className="font-semibold hover:underline underline-offset-2"
                style={{ color: "var(--color-ocean-500, #e60000)", opacity: 1 }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
