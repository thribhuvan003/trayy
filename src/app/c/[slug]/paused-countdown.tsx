"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

function formatDuration(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function PausedCountdown({ pausedUntil }: { pausedUntil: string }) {
  const target = new Date(pausedUntil).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      const newRemaining = Math.max(0, target - Date.now());
      setRemaining(newRemaining);
      if (newRemaining <= 0) {
        clearInterval(id);
        // Auto-reload after 2 seconds so the server re-evaluates open status
        setTimeout(() => window.location.reload(), 2000);
      }
    }, 1_000);
    return () => clearInterval(id);
  }, [target, remaining]);

  if (remaining <= 0) {
    return (
      <p
        className="cg-status"
        style={{ marginBottom: "24px" }}
        aria-live="polite"
      >
        Should be open now — reloading… <Loader2 className="animate-spin" style={{ display: "inline", verticalAlign: "middle", width: "1em", height: "1em" }} />
      </p>
    );
  }

  return (
    <>
      <div className="cg-countdown" aria-live="polite" aria-atomic="true">
        {formatDuration(remaining)}
      </div>
      <p className="cg-countdown-label">minutes remaining</p>
    </>
  );
}
