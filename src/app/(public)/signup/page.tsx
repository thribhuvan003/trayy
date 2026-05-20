import Link from "next/link";
import { SignupForm } from "@/components/portal-student/signup-form";
import { headers } from "next/headers";
import { resolveTenant } from "@/lib/tenant";

export const metadata = { title: "Create account — Tray" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const h = await headers();
  const tenant = await resolveTenant(h.get("x-tenant-slug") ?? "aditya");
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
            Start eating
            <br />
            <span className="italic text-ocean-500">in eleven minutes.</span>
          </h1>
          <p className="text-[14px] text-[color:var(--color-ink)]/65 mt-3">
            Use your <b>{tenant?.college_name ?? "campus"}</b> email
            {tenant?.allowed_domain ? ` (@${tenant.allowed_domain})` : ""}.
          </p>
          <div className="mt-7">
            <SignupForm next={sp.next ?? "/"} tenantSlug={tenant?.slug ?? "aditya"} allowedDomain={tenant?.allowed_domain ?? null} />
          </div>
          <p className="mt-8 text-[12.5px] text-[color:var(--color-ink)]/55">
            Already have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent(sp.next ?? "/")}`} className="text-ocean-500 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
