import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { resolveTenant } from "@/lib/tenant";
import { getServerClient } from "@/lib/supabase/server";
import { requireRoleForTenant } from "@/lib/auth/get-user";
import { logger } from "@/lib/logging";
import { getExportTenantSlug } from "@/lib/admin-export";

type Row = {
  id: string;
  short_code: string;
  placed_at: string;
  collected_at: string | null;
  status: string;
  total_paise: number;
  customer_name: string | null;
  order_type: "takeaway" | "dine_in";
  table_label: string | null;
};

function csvEscape(v: string | number | null) {
  if (v === null) return "";
  const raw = String(v);
  // Prevent spreadsheet formula execution when an exported user-controlled
  // value is opened in Excel/Sheets.
  const s = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const h = await headers();
  const slug = getExportTenantSlug(req.nextUrl, h);
  if (!slug) return new NextResponse("Tenant is required", { status: 400 });
  const tenant = await resolveTenant(slug);
  if (!tenant) return new NextResponse("Tenant not found", { status: 404 });
  const user = await requireRoleForTenant(tenant, ["canteen_admin", "super_admin"]);
  if (!user) return new NextResponse("Forbidden", { status: 403 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const supabase = await getServerClient(tenant.id);
  let q = supabase
    .from("orders")
    .select("id, short_code, placed_at, collected_at, status, total_paise, customer_name, order_type, table_label")
    .eq("tenant_id", tenant.id)
    .order("placed_at", { ascending: false })
    .limit(5000);
  if (from) q = q.gte("placed_at", from);
  if (to) q = q.lte("placed_at", to);
  const { data, error } = await q.returns<Row[]>();
  if (error) {
    logger.error("admin order CSV export failed", error, {
      tenant_id: tenant.id,
      slug: tenant.slug,
      actor_user_id: user.id,
    });
    return new NextResponse("Could not export orders", { status: 500 });
  }

  const header = "order_id,short_code,placed_at,collected_at,status,total_inr,order_type,table,customer\n";
  const body = (data ?? [])
    .map((r) =>
      [
        csvEscape(r.id),
        csvEscape(r.short_code),
        csvEscape(r.placed_at),
        csvEscape(r.collected_at),
        csvEscape(r.status),
        csvEscape((r.total_paise / 100).toFixed(2)),
        csvEscape(r.order_type),
        csvEscape(r.table_label),
        csvEscape(r.customer_name),
      ].join(",")
    )
    .join("\n");
  const filename = `tray-${tenant.slug}-orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(header + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
