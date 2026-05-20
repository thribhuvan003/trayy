import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { resolveTenant } from "@/lib/tenant";
import { getServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { PayPanel } from "@/components/portal-student/pay-panel";

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const h = await headers();
  const slug = h.get("x-tenant-slug") ?? "aditya";
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/c/${tenant.slug}/login?next=/c/${tenant.slug}/pay/${orderId}`);

  const supabase = await getServerClient(tenant.id);
  const { data: order } = await supabase
    .from("orders")
    .select("id, short_code, total_paise, status, payment_expires_at, customer_name")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .maybeSingle<{
      id: string;
      short_code: string;
      total_paise: number;
      status: string;
      payment_expires_at: string | null;
      customer_name: string | null;
    }>();
  if (!order) notFound();
  if (order.status !== "pending_payment") {
    redirect(`/c/${tenant.slug}/track/${orderId}`);
  }

  const { data: lines } = await supabase
    .from("order_items")
    .select("id, name_snapshot, qty, price_paise_snapshot, diet_snapshot")
    .eq("order_id", orderId)
    .returns<{
      id: string;
      name_snapshot: string;
      qty: number;
      price_paise_snapshot: number;
      diet_snapshot: "veg" | "nonveg" | "egg";
    }[]>();

  if (!tenant.upi_vpa) {
    // Redirect back to menu with a notice — invalid UPI means payment is impossible
    redirect(`/c/${tenant.slug}/menu?msg=no-upi`);
  }

  return (
    <PayPanel
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      tenantUpi={tenant.upi_vpa}
      order={order}
      lines={lines ?? []}
    />
  );
}
