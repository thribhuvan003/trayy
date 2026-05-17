import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[color:var(--color-paper)] text-[color:var(--color-ink)]">
      <div className="max-w-md text-center">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[color:var(--color-ink)]/55 mb-3">
          404 · Not found
        </div>
        <h1 className="font-display text-[56px] leading-[1.02] tracking-tight font-medium">
          That page <span className="italic text-ocean-500">isn't on the menu.</span>
        </h1>
        <div className="mt-6 flex gap-2 justify-center">
          <Link
            href="/"
            className="h-11 px-5 inline-flex items-center rounded-full bg-ocean-500 text-white text-[13px] font-medium hover:bg-ocean-600 transition-colors"
          >
            Back to landing
          </Link>
          <Link
            href="/menu"
            className="h-11 px-5 inline-flex items-center rounded-full border border-[color:var(--color-ink)]/15 text-[13px] font-medium hover:border-ocean-500 hover:text-ocean-500 transition-colors"
          >
            Open the menu
          </Link>
        </div>
      </div>
    </div>
  );
}
