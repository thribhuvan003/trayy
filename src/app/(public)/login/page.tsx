import Link from "next/link";
import { headers } from "next/headers";
import { safeNext } from "@/lib/auth/safe-redirect";
import { SmartLoginForm } from "@/components/portal-student/smart-login-form";

export const metadata = { title: "Sign in — Tray" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    tenant?: string;
    error?: string;
    role?: string;
    msg?: string;
  }>;
}) {
  const sp = await searchParams;
  const h = await headers();
  const slug = sp.tenant ?? h.get("x-tenant-slug") ?? "";
  const next = safeNext(sp.next, slug ? `/c/${slug}/menu` : "/");

  const infoMsg =
    sp.msg === "select-canteen"
      ? "Signed in! Share your canteen URL with students so they can start ordering."
      : sp.msg === "already-has-canteen"
        ? "Your canteen is already set up. Sign in below to reach your dashboard."
        : undefined;

  const roleHint =
    sp.role === "owner"
      ? "Owner · aaj ka hisaab"
      : sp.role === "kitchen"
        ? "Kitchen · phone + speaker"
        : "One login · right portal";

  return (
    <div
      data-portal="student"
      className="min-h-screen flex items-center justify-center px-5 py-12"
      style={{
        background: "var(--tray-paper, #fdf8f0)",
        color: "var(--tray-ink, #1a1410)",
      }}
    >
      <div className="w-full max-w-[400px]">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-10" aria-label="Tray home">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] text-white text-[15px] font-black shrink-0"
            style={{
              background: "var(--tray-signal, #d52821)",
              fontFamily: "var(--font-newsreader), Georgia, serif",
              fontStyle: "italic",
              boxShadow: "0 3px 0 #1a1410",
            }}
          >
            T
          </span>
          <span
            style={{
              fontFamily: "var(--font-newsreader), Georgia, serif",
              fontWeight: 600,
              fontSize: "1.55rem",
              letterSpacing: "-0.03em",
              color: "var(--tray-ink, #1a1410)",
            }}
          >
            Tray
            <span style={{ color: "var(--tray-signal, #d52821)", fontStyle: "italic" }}>.</span>
          </span>
        </Link>

        <p
          className="font-mono uppercase mb-2"
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--tray-ink-3, #6b5f54)",
            fontFamily: "var(--font-jetbrains), monospace",
          }}
        >
          {roleHint}
        </p>

        <h1
          className="text-[1.75rem] font-semibold tracking-tight mb-1.5 leading-tight"
          style={{
            color: "var(--tray-ink, #1a1410)",
            fontFamily: "var(--font-newsreader), Georgia, serif",
          }}
        >
          Welcome back
        </h1>
        <p
          className="text-[14.5px] mb-8 leading-relaxed"
          style={{ color: "var(--tray-ink-2, #3d342c)", opacity: 0.85 }}
        >
          Sign in once. We send you to kitchen, admin, or menu — no tab dance.
        </p>

        {(infoMsg || sp.error) && (
          <div
            className="mb-6 rounded-xl border px-4 py-3.5 text-[13px] leading-[1.55]"
            style={
              sp.error
                ? {
                    borderColor: "rgba(213,40,33,0.25)",
                    background: "rgba(213,40,33,0.06)",
                    color: "#a31810",
                  }
                : {
                    borderColor: "rgba(27,107,58,0.25)",
                    background: "rgba(27,107,58,0.06)",
                    color: "#145230",
                  }
            }
          >
            {sp.error ?? infoMsg}
          </div>
        )}

        <SmartLoginForm next={next} slug={slug} hintRole={sp.role} />

        <p
          className="mt-8 text-center text-[12px] leading-relaxed"
          style={{ color: "var(--tray-ink-3, #6b5f54)" }}
        >
          No account?{" "}
          <Link
            href={slug ? `/signup?tenant=${slug}` : "/get-started"}
            className="font-semibold underline underline-offset-2"
            style={{ color: "var(--tray-signal, #d52821)" }}
          >
            Set up or join a stall
          </Link>
        </p>
      </div>
    </div>
  );
}
