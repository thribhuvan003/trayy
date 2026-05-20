import "server-only";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { ExternalLink } from "lucide-react";
import { OpenToggle } from "./_open-toggle";

export const dynamic = "force-dynamic";

export default async function CanteensPage() {
  const serverClient = await getServerClient();
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  if (!user) redirect("/login?next=/college-admin/canteens");

  const admin = getAdminClient();

  const { data: membership } = await admin
    .from("college_memberships")
    .select("college_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/login?next=/college-admin/canteens");

  const { data: canteens } = await admin
    .from("tenants")
    .select("id, slug, name, is_open, paused_until, building, zone, mess_type")
    .eq("college_id", membership.college_id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-graphite-200">Canteens</h1>
        <p className="text-[13px] text-graphite-400 mt-1">
          All canteens under your college. Use the toggle to open or close a canteen.
        </p>
      </div>

      <div className="border border-graphite-200/[0.08] rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-graphite-200/[0.08] bg-graphite-800/40">
              <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-graphite-400 font-medium">
                Name
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-graphite-400 font-medium hidden sm:table-cell">
                Slug
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-graphite-400 font-medium hidden md:table-cell">
                Location
              </th>
              <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-graphite-400 font-medium hidden md:table-cell">
                Type
              </th>
              <th className="text-center px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-graphite-400 font-medium">
                Open
              </th>
              <th className="text-right px-4 py-3 text-[10px] font-mono uppercase tracking-wider text-graphite-400 font-medium">
                Admin
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-graphite-200/[0.05]">
            {(canteens ?? []).map((c) => (
              <tr
                key={c.id}
                className="hover:bg-graphite-200/[0.03] transition-colors"
              >
                <td className="px-4 py-3 text-graphite-200 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-graphite-400 font-mono hidden sm:table-cell">
                  {c.slug}
                </td>
                <td className="px-4 py-3 text-graphite-400 hidden md:table-cell">
                  {[c.building, c.zone].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 text-graphite-400 hidden md:table-cell">
                  {c.mess_type ?? "—"}
                </td>
                <td className="px-4 py-3 text-center">
                  <OpenToggle tenantId={c.id} initialIsOpen={c.is_open} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/c/${c.slug}/admin/dashboard`}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-graphite-400 hover:text-lime transition-colors"
                  >
                    Dashboard <ExternalLink size={10} />
                  </Link>
                </td>
              </tr>
            ))}

            {(canteens ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-graphite-400 text-[13px]"
                >
                  No canteens found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
