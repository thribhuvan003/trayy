import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveTenant } from "@/lib/tenant";
import { getServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { formatRupees, formatDateIST, formatTimeIST } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pending_payment: { label: "Awaiting payment", tone: "amber" },
  placed: { label: "Placed", tone: "ocean" },
  preparing: { label: "Preparing", tone: "amber" },
  ready: { label: "Ready", tone: "ocean" },
  collected: { label: "Collected", tone: "emerald" },
  rejected: { label: "Rejected", tone: "rose" },
  expired: { label: "Expired", tone: "rose" },
  cancelled_by_kitchen: { label: "Cancelled", tone: "rose" },
  refunded: { label: "Refunded", tone: "rose" },
  partially_ready: { label: "Partially ready", tone: "amber" },
};

export default async function OrdersPage() {
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) return null;
  const user = await getCurrentUser();
  if (!user) redirect(`/c/${tenant.slug}/login?next=/c/${tenant.slug}/orders`);

  const supabase = await getServerClient(tenant.id);
  const { data: orders } = await supabase
    .from("orders")
    .select("id, short_code, status, total_paise, placed_at")
    .eq("user_id", user.id)
    .eq("tenant_id", tenant.id)
    .order("placed_at", { ascending: false })
    .limit(50)
    .returns<{ id: string; short_code: string; status: string; total_paise: number; placed_at: string }[]>();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 pb-12">
      <h1 className="font-display text-[clamp(32px,5.5vw,52px)] font-medium tracking-tight">
        Your <span className="italic text-ocean-500">orders.</span>
      </h1>
      <p className="text-[14px] text-[color:var(--color-ink)]/65 mt-1">
        Tap any order to reopen the receipt or pickup code.
      </p>

      {(!orders || orders.length === 0) && (
        <div className="mt-10 rounded-2xl border border-dashed border-[color:var(--color-line)] p-10 text-center">
          <p className="text-[15px] text-[color:var(--color-ink)]/60">No orders yet.</p>
          <Link
            href={`/c/${tenant.slug}/menu`}
            className="mt-4 inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-ocean-500 text-white text-[13px] font-medium hover:bg-ocean-600 transition-colors"
          >
            Open the menu →
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <ul className="mt-6 flex flex-col gap-2">
          {orders.map((o) => {
            const meta = STATUS_LABEL[o.status] ?? { label: o.status, tone: "ocean" };
            return (
              <li key={o.id}>
                <Link
                  href={o.status === "pending_payment" ? `/c/${tenant.slug}/pay/${o.id}` : `/c/${tenant.slug}/track/${o.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-line)] bg-[color:var(--color-paper)] p-4 hover:border-ocean-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-ocean-50 dark:bg-ocean-500/10 text-ocean-500 inline-flex items-center justify-center font-mono text-[11px] font-semibold">
                      {o.short_code.replace("T-", "")}
                    </div>
                    <div>
                      <div className="text-[14px] font-medium">{o.short_code}</div>
                      <div className="text-[11px] font-mono text-[color:var(--color-ink)]/55">
                        {formatDateIST(o.placed_at)} · {formatTimeIST(o.placed_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-semibold tabular">{formatRupees(o.total_paise)}</div>
                    <span
                      className={
                        "inline-block mt-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full " +
                        (meta.tone === "emerald"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : meta.tone === "rose"
                          ? "bg-rose-500/10 text-rose-600"
                          : meta.tone === "amber"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-ocean-500/10 text-ocean-500")
                      }
                    >
                      {meta.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
