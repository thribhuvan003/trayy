import { LandingPage } from "@/components/landing/landing-page";

export default function Page() {
  // The marketing page is tenant-neutral and can be statically served from the
  // edge. Tenant-specific discovery and ordering live under /c/[slug].
  return <LandingPage tenant={null} />;
}
