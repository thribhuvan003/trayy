export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--tray-bg, #F4EFE6)" }}
    >
      <div className="flex items-center gap-3 text-[11px] font-mono uppercase tracking-[0.22em]"
        style={{ color: "var(--tray-ink, #1A1A19)", opacity: 0.45 }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full animate-pulse"
          style={{ background: "var(--tray-clay, #e60000)" }}
        />
        Loading
      </div>
    </div>
  );
}
