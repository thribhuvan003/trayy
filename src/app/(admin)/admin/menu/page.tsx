import Link from "next/link";

import { getServerClient } from "@/lib/supabase/server";
import { MenuTable } from "@/components/portal-admin/menu-table";
import { requireTenantContext } from "@/lib/tenant";

type Row = {
  id: string;
  name: string;
  category_id: string | null;
  diet: "veg" | "nonveg" | "egg";
  price_paise: number;
  status: "draft" | "live" | "archived";
  in_stock: boolean;
  stock_qty: number | null;
  prep_target_seconds: number;
};

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  // Production-grade tenant context for owner menu management.
  // Each canteen's menu is fully isolated; changes only affect the correct /c/slug/ surface.
  const { tenant } = await requireTenantContext();
  const supabase = await getServerClient(tenant.id);
  const [{ data: items }, { data: cats }] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id, name, category_id, diet, price_paise, status, in_stock, stock_qty, prep_target_seconds")
      .eq("tenant_id", tenant.id)
      .order("sort_order")
      .returns<Row[]>(),
    supabase
      .from("menu_categories")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .returns<{ id: string; name: string }[]>(),
  ]);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-tight">Menu</h1>
          <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-graphite-400 mt-0.5">
            {items?.length ?? 0} items · draft / live / archived workflow
          </div>
        </div>
        <Link
          href={`/c/${tenant.slug}/admin/menu/new`}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary/90 transition-colors"
        >
          + New item
        </Link>
      </div>
      <MenuTable items={items ?? []} categories={cats ?? []} tenantSlug={tenant.slug} />
    </div>
  );
}
