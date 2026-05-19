import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) return { title: "Canteen not found" };
  return {
    title: `${tenant.name} — Tray`,
    description: tenant.hero_tagline ?? `Order from ${tenant.name}.`,
  };
}

// Canteen landing page — shown when a student scans a canteen-specific QR.
// Quick gate: shows open/paused/closed state. CTA jumps to the menu.
export default async function CanteenLandingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();

  // If the canteen is healthy, jump the student straight to the menu — the
  // landing is mostly here so that the bare /c/[slug] URL works.
  redirect(`/c/${slug}/menu`);
}
