"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[tray:admin:error]", error.digest, error.message);
  }, [error]);
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-graphite-200">
      <div className="max-w-md text-center">
        <div className="text-[11px] font-mono uppercase tracking-wider text-graphite-400 mb-3">
          Admin · error · {error.digest ?? "—"}
        </div>
        <h1 className="font-display text-[28px] leading-tight font-medium">
          The console choked on that.
        </h1>
        <p className="mt-3 text-[13px] text-graphite-400">{error.message || "Unknown error"}</p>
        <div className="mt-5 flex gap-2 justify-center">
          <button
            onClick={reset}
            className="h-10 px-4 rounded-md bg-lime text-graphite-900 text-[12px] font-semibold hover:bg-lime/90 transition-colors"
          >
            Retry
          </button>
          <Link
            href="/admin/dashboard"
            className="h-10 px-4 inline-flex items-center rounded-md border border-graphite-200/15 text-[12px] font-medium hover:border-lime hover:text-lime transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
