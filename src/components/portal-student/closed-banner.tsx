"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  tenantName: string;
  isClosed: boolean;
  pausedUntil: string | null;
};

function formatPausedTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ClosedBanner({ tenantName, isClosed, pausedUntil }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const isPaused = !isClosed && !!pausedUntil && new Date(pausedUntil) > new Date();

  if (dismissed || (!isClosed && !isPaused)) return null;

  const message = isClosed
    ? `${tenantName} is closed. Ordering is unavailable; you can still browse the menu.`
    : `Ordering is paused until ${formatPausedTime(pausedUntil!)}. You can still browse the menu, but Add and checkout are disabled.`;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-0 lg:max-w-none pt-4"
    >
      <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 px-4 py-3">
        <p className="text-[13px] text-amber-800 dark:text-amber-300 leading-snug">
          <span className="mr-1">&#x26A0;&#xFE0F;</span>
          {message}
        </p>
        <button
          aria-label="Dismiss banner"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 transition-colors mt-0.5"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
