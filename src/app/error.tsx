"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server logs this with the same digest, so support can correlate.
    console.error("[tray:error]", error.digest, error.message);
  }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[color:var(--color-paper)] text-[color:var(--color-ink)]">
      <div className="max-w-md text-center">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55 mb-3">
          Error · {error.digest ?? "—"}
        </div>
        <h1 className="font-display text-[40px] leading-[1.05] tracking-tight font-medium">
          Something <span className="italic text-ocean-500">tripped.</span>
        </h1>
        <p className="mt-3 text-[14px] text-[color:var(--color-ink)]/65">
          The page didn't load. We logged what happened — try again, or head back to the menu.
        </p>
        <div className="mt-6 flex gap-2 justify-center">
          <button
            onClick={reset}
            className="h-11 px-5 rounded-full bg-ocean-500 text-white text-[13px] font-medium hover:bg-ocean-600 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="h-11 px-5 inline-flex items-center rounded-full border border-[color:var(--color-ink)]/15 text-[13px] font-medium hover:border-ocean-500 hover:text-ocean-500 transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
