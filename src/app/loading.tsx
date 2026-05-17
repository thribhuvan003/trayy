export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-[12px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55">
        <span className="h-2 w-2 rounded-full bg-ocean-500 animate-pulse" />
        Loading…
      </div>
    </div>
  );
}
