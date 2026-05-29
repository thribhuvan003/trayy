import { notFound, redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { PayPanel } from "@/components/portal-student/pay-panel";
import { requireTenantContext } from "@/lib/tenant";
import { featureFlags } from "@/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const { tenant } = await requireTenantContext();

  const user = await getCurrentUser();
  if (!user) redirect(`/c/${tenant.slug}/login?next=/c/${tenant.slug}/pay/${orderId}`);

  const supabase = await getServerClient(tenant.id);
  const { data: order } = await supabase
    .from("orders")
    .select("id, short_code, total_paise, status, payment_expires_at, customer_name")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
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
    redirect(`/c/${tenant.slug}/menu?msg=no-upi`);
  }

  // Per-tenant payment rail (migration 0024). Drives the pay UI: direct_upi shows
  // the UPI QR and drops the order into the kitchen queue when the student taps to
  // pay (no "I've Paid" button); razorpay would drive the gateway checkout.
  const { data: tModeRow } = await supabase
    .from("tenants")
    .select("payment_mode")
    .eq("id", tenant.id)
    .maybeSingle<{ payment_mode: string }>();
  const paymentMode: "direct_upi" | "razorpay" =
    tModeRow?.payment_mode === "razorpay" ? "razorpay" : "direct_upi";

  // isSimMode: dev-only simulate button (true only when live Razorpay keys are
  // absent). Independent of payment_mode — it never shows in production.
  const isSimMode = !featureFlags.razorpayLive;

  return (
    <PayPanel
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      tenantUpi={tenant.upi_vpa}
      order={order}
      lines={lines ?? []}
      isSimMode={isSimMode}
      paymentMode={paymentMode}
    />
  );
}
