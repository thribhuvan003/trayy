"use client";

import { useEffect } from "react";

export default function KitchenError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[tray:kitchen:error]", error.message);
  }, [error]);
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-tomato-900 dark:text-cream-200">
      <div className="max-w-md text-center border-2 border-tomato-900 dark:border-cream-200/30 p-6 bg-cream-50 dark:bg-graphite-800 shadow-[6px_6px_0_0_var(--color-tomato-900)]">
        <h1 className="font-display text-[28px] font-medium">Queue is jammed.</h1>
        <p className="mt-2 text-[13px]">{error.message || "Refresh to retry."}</p>
        <button
          onClick={reset}
          className="mt-4 h-10 px-4 rounded-md bg-tomato-500 text-white text-[12px] font-semibold hover:bg-tomato-600 transition-colors"
        >
          Reload kitchen
        </button>
      </div>
    </div>
  );
}
