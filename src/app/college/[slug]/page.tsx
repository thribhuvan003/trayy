import Link from "next/link";
import { notFound } from "next/navigation";
import { collegeCanteens, type CollegeCanteen } from "@/lib/tenant";

export const revalidate = 30;

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  return {
    title: `${slug.toUpperCase()} canteens — Tray`,
    description: `Order from any canteen at ${slug.toUpperCase()}.`,
  };
}

function StatusBadge({ canteen }: { canteen: CollegeCanteen }) {
  if (!canteen.is_open) {
    return <span className="text-xs font-medium text-zinc-400">CLOSED</span>;
  }
  if (canteen.paused_until) {
    return <span className="text-xs font-medium text-amber-500">PAUSED</span>;
  }
  const wait = Math.min(20, Math.max(3, 3 + canteen.pending_orders_count));
  return (
    <span className="text-xs font-medium text-emerald-600">
      OPEN · ~{wait} min wait
    </span>
  );
}

export default async function CollegePortalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const canteens = await collegeCanteens(slug);
  if (!canteens || canteens.length === 0) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          Canteens at {slug.toUpperCase()}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Pick a canteen.
        </h1>
        <p className="mt-2 max-w-prose text-sm text-zinc-600 sm:text-base">
          Live status across every mess, canteen, and food court on campus. Tap one to see its menu and order.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {canteens.map((canteen) => (
          <li key={canteen.slug}>
            <Link
              href={`/c/${canteen.slug}/menu`}
              className="group block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
              aria-disabled={!canteen.is_open}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold tracking-tight">
                    {canteen.name}
                  </h2>
                  {(canteen.building || canteen.zone) && (
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {[canteen.building, canteen.zone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <StatusBadge canteen={canteen} />
              </div>
              {canteen.hero_tagline && (
                <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {canteen.hero_tagline}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <footer className="mt-12 text-center text-xs text-zinc-500">
        Powered by Tray · One platform, every canteen.
      </footer>
    </main>
  );
}
