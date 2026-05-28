import { notFound, redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
import { PayPanel } from "@/components/portal-student/pay-panel";
import { requireTenantContext } from "@/lib/tenant";

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

  // Fetch the Razorpay order ID linked to this payment so verifyPaymentNow
  // can poll the gateway correctly. Fetched server-side so it never hits the client.
  const adminClient = getAdminClient(tenant.id);
  const { data: paymentRow } = await adminClient
    .from("payments")
    .select("razorpay_order_id")
    .eq("order_id", orderId)
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ razorpay_order_id: string | null }>();

  // isSimMode: true when Razorpay live keys are absent — shows DEV simulate button.
  // Computed server-side so it can't be spoofed from the client.
  const isSimMode =
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET ||
    process.env.NEXT_PUBLIC_RAZORPAY_LIVE !== "true";

  return (
    <PayPanel
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      tenantUpi={tenant.upi_vpa}
      order={order}
      lines={lines ?? []}
      razorpayOrderId={paymentRow?.razorpay_order_id ?? null}
      isSimMode={isSimMode}
      userEmail={user.email}
    />
  );
}
