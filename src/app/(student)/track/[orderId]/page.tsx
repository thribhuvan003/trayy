import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { resolveTenant } from "@/lib/tenant";
import { getServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { TrackPanel } from "@/components/portal-student/track-panel";

export default async function TrackPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/c/${tenant.slug}/login?next=/c/${tenant.slug}/track/${orderId}`);

  const supabase = await getServerClient(tenant.id);
  type OrderRow = {
    id: string;
    short_code: string;
    status: "pending_payment" | "placed" | "preparing" | "ready" | "collected" | "rejected" | "expired" | "cancelled_by_kitchen" | "partially_ready" | "refunded";
    total_paise: number;
    placed_at: string;
    ready_at: string | null;
    collected_at: string | null;
    customer_name: string | null;
  };
  const { data: order } = await supabase
    .from("orders")
    .select("id, short_code, status, total_paise, placed_at, ready_at, collected_at, customer_name")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .maybeSingle<OrderRow>();
  if (!order) notFound();
  const { data: lines } = await supabase
    .from("order_items")
    .select("id, name_snapshot, qty, diet_snapshot, price_paise_snapshot")
    .eq("order_id", orderId)
    .returns<{
      id: string;
      name_snapshot: string;
      qty: number;
      diet_snapshot: "veg" | "nonveg" | "egg";
      price_paise_snapshot: number;
    }[]>();

  return <TrackPanel tenantSlug={tenant.slug} tenantName={tenant.name} order={order} lines={lines ?? []} />;
}
