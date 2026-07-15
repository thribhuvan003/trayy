"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { pauseCanteen, updateCanteenHours } from "@/app/(admin)/admin/_actions";

function formatPausedUntil(pausedUntil: string | null): string | null {
  if (!pausedUntil) return null;
  const until = new Date(pausedUntil);
  const diffMs = until.getTime() - Date.now();
  if (diffMs <= 0) return null;
  const diffMin = Math.ceil(diffMs / 60_000);
  if (diffMin >= 60) {
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${diffMin}m`;
}

export function ServiceControls({
  isOpen,
  pausedUntil,
  opensAt,
  closesAt,
}: {
  isOpen: boolean;
  pausedUntil: string | null;
  opensAt: string | null;
  closesAt: string | null;
}) {
  const [open, setOpen] = useState(isOpen);
  const [paused, setPaused] = useState(pausedUntil);
  const [pending, start] = useTransition();
  const pauseLabel = formatPausedUntil(paused);
  const isPaused = pauseLabel !== null;

  const setHours = (nextOpen: boolean) => {
    start(async () => {
      const r = await updateCanteenHours({
        isOpen: nextOpen,
        opensAt,
        closesAt,
      });
      if (!r.ok) {
        toast.error(r.error ?? "Could not update open/close");
        return;
      }
      setOpen(nextOpen);
      toast.success(nextOpen ? "Stall open — students can order" : "Stall closed");
    });
  };

  const setPause = (minutes: number) => {
    start(async () => {
      const r = await pauseCanteen(minutes);
      if (!r.ok) {
        toast.error(r.error ?? "Could not pause");
        return;
      }
      if (minutes <= 0) {
        setPaused(null);
        toast.success("Pause cleared — orders open again");
      } else {
        setPaused(new Date(Date.now() + minutes * 60_000).toISOString());
        toast.success(`Paused ${minutes} min`);
      }
    });
  };

  return (
    <div
      className="rounded-xl p-3 sm:p-4 flex flex-col gap-3"
      style={{
        background: "var(--admin-bg-card)",
        border: "1px solid var(--admin-line)",
        boxShadow: "3px 3px 0 rgba(238,241,247,0.06)",
      }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--admin-ink-3)" }}
          >
            Stall status
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isPaused
                  ? "#f59e0b"
                  : open
                    ? "var(--admin-lime)"
                    : "var(--admin-rose, #f87171)",
                display: "inline-block",
              }}
            />
            <span className="font-semibold text-[14px]" style={{ color: "var(--admin-ink)" }}>
              {isPaused ? `Paused · ${pauseLabel}` : open ? "Open" : "Closed"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || (open && !isPaused)}
            onClick={() => setHours(true)}
            className="h-11 px-4 rounded-lg text-[12px] font-bold uppercase tracking-wide disabled:opacity-40"
            style={{
              background: open && !isPaused ? "var(--admin-lime)" : "var(--admin-bg-3)",
              color: open && !isPaused ? "var(--admin-bg)" : "var(--admin-ink-2)",
              border: "1px solid var(--admin-line-2)",
              cursor: pending ? "wait" : "pointer",
              minWidth: 72,
            }}
          >
            Open
          </button>
          <button
            type="button"
            disabled={pending || (!open && !isPaused)}
            onClick={() => setHours(false)}
            className="h-11 px-4 rounded-lg text-[12px] font-bold uppercase tracking-wide disabled:opacity-40"
            style={{
              background: !open && !isPaused ? "rgba(248,113,113,0.2)" : "var(--admin-bg-3)",
              color: !open && !isPaused ? "#f87171" : "var(--admin-ink-2)",
              border: "1px solid var(--admin-line-2)",
              cursor: pending ? "wait" : "pointer",
              minWidth: 72,
            }}
          >
            Close
          </button>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2 pt-2"
        style={{ borderTop: "1px dashed var(--admin-line)" }}
      >
        <span
          className="w-full font-mono uppercase mb-0.5"
          style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--admin-ink-3)" }}
        >
          Quick pause (gas / rush break)
        </span>
        {[15, 30, 60].map((m) => (
          <button
            key={m}
            type="button"
            disabled={pending}
            onClick={() => setPause(m)}
            className="h-11 px-3 rounded-lg text-[12px] font-mono font-semibold disabled:opacity-40"
            style={{
              background: "var(--admin-bg-3)",
              border: "1px solid var(--admin-line-2)",
              color: "var(--admin-ink-2)",
              cursor: pending ? "wait" : "pointer",
            }}
          >
            {m} min
          </button>
        ))}
        {isPaused && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setPause(0)}
            className="h-11 px-3 rounded-lg text-[12px] font-bold disabled:opacity-40"
            style={{
              background: "var(--admin-lime-soft)",
              border: "1px solid var(--admin-lime)",
              color: "var(--admin-lime)",
              cursor: pending ? "wait" : "pointer",
            }}
          >
            Clear pause
          </button>
        )}
      </div>
    </div>
  );
}
