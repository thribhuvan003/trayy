import type { Metadata, Viewport } from "next";
import {
  Inter, Fraunces, Manrope, JetBrains_Mono, Instrument_Serif,
  Newsreader, Geist, Geist_Mono, Space_Grotesk,
  Bebas_Neue, Cormorant_Garamond, Plus_Jakarta_Sans, Barlow_Condensed, DM_Serif_Display,
  DM_Mono, Krona_One, Bricolage_Grotesque,
  Unbounded, Hanken_Grotesk, Space_Mono,
} from "next/font/google";
import localFont from "next/font/local";
import { headers } from "next/headers";

// Self-hosted Fontshare faces — distinctive, designer-grade, not Google/AI defaults.
const clashDisplay = localFont({
  variable: "--font-clash",
  display: "swap",
  src: [
    { path: "./fonts/ClashDisplay-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ClashDisplay-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ClashDisplay-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/ClashDisplay-700.woff2", weight: "700", style: "normal" },
  ],
});
const switzer = localFont({
  variable: "--font-switzer",
  display: "swap",
  src: [
    { path: "./fonts/Switzer-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Switzer-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Switzer-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Switzer-700.woff2", weight: "700", style: "normal" },
  ],
});
import { Toaster } from "sonner";
import { resolveTenant, getTenantSlugFromHeaders } from "@/lib/tenant";
import { Providers } from "@/components/providers";
import { AuthRescue } from "@/components/auth-rescue";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});
// Expressive typography — landing + student portal art direction
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});
// Note: bigShoulders removed — was a duplicate Barlow_Condensed instantiation;
// barlowCondensed (line below) covers the same font with full weight range.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-barlow",
  display: "swap",
});
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  display: "swap",
});
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-dm-mono",
  display: "swap",
});
const kronaOne = Krona_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-krona-one",
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
// Neobrutalist student-portal art direction — distinctive, non-generic type.
const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  display: "swap",
});
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

const SITE_URL = process.env.APP_URL ?? "https://trayy.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Tray — Campus food, without the queue.",
    template: "%s · Tray",
  },
  description:
    "Students order from any canteen in their campus. Kitchens run live queues. Admins see orders, revenue, and handovers in real time.",
  applicationName: "Tray",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  keywords: [
    "Tray",
    "campus canteen ordering app",
    "canteen ordering software",
    "QR menu ordering",
    "food court ordering system",
    "canteen management software",
    "online food ordering for colleges",
    "skip the canteen queue",
  ],
  openGraph: {
    title: "Tray — Campus food, without the queue.",
    description: "One system, three doors. Run the canteen from one screen.",
    url: SITE_URL,
    siteName: "Tray",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tray — Campus food, without the queue.",
    description: "One system, three doors. Run the canteen from one screen.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  verification: {
    google:
      process.env.GOOGLE_SITE_VERIFICATION ??
      "bdXPEujT8mmPWOU_WIdpaMTSjJYIKyEIoDM9XwTCxF8",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0c0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const slug = getTenantSlugFromHeaders(h);
  const tenant = await resolveTenant(slug);

  // Blocking inline script: resolve theme synchronously before first paint so
  // dark-mode users never see a white flash (FOUC). Mirrors the logic in
  // ThemeProvider; that effect later re-applies idempotently.
  const fouc = `(()=>{try{var t=localStorage.getItem('tray:theme')||'light';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.setAttribute('data-theme',d?'dark':'light');if(sessionStorage.getItem('tray_landing_intro_seen')==='1'){r.classList.add('tl-intro-seen');}}catch(e){}})();`;

  return (
    <html
      lang="en"
      data-tenant-id={tenant?.id ?? ""}
      data-tenant-slug={tenant?.slug ?? ""}
      className={`${clashDisplay.variable} ${switzer.variable} ${inter.variable} ${fraunces.variable} ${manrope.variable} ${jetbrains.variable} ${instrumentSerif.variable} ${newsreader.variable} ${spaceGrotesk.variable} ${geist.variable} ${geistMono.variable} ${bebasNeue.variable} ${cormorant.variable} ${plusJakarta.variable} ${barlowCondensed.variable} ${dmSerif.variable} ${dmMono.variable} ${kronaOne.variable} ${bricolage.variable} ${unbounded.variable} ${hankenGrotesk.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: fouc }} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Tray",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: SITE_URL,
              description:
                "Campus canteen ordering platform. Students order from any canteen, kitchens run live queues, and admins track orders, revenue, and handovers in real time.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
              publisher: { "@type": "Organization", name: "Tray", url: SITE_URL },
            }),
          }}
        />
        <AuthRescue />
        <Providers tenantId={tenant?.id ?? null}>
          {children}
        </Providers>
        <Toaster
          position="top-center"
          richColors
          toastOptions={{ style: { fontFamily: "var(--font-sans)" } }}
        />
      </body>
    </html>
  );
}
