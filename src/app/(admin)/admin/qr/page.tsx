import { requireTenantContext } from "@/lib/tenant";
import { QrPoster } from "./qr-poster";

export const dynamic = "force-dynamic";

export default async function QrPosterPage() {
  // Same tenant/auth path as the other admin pages (see admin/settings/page.tsx).
  // The (admin) layout already enforces the canteen_admin/super_admin role.
  const { tenant } = await requireTenantContext();

  // Absolute customer URL for the QR. APP_URL when set, else the prod default —
  // same fallback the app uses in layout.ts / robots.ts / sitemap.ts.
  const appUrl = process.env.APP_URL ?? "https://trayy.vercel.app";
  const menuUrl = `${appUrl}/c/${tenant.slug}/menu`;

  return (
    <QrPoster outletName={tenant.name} menuUrl={menuUrl} upiVpa={tenant.upi_vpa} />
  );
}
