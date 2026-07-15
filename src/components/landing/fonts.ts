import { Mukta } from "next/font/google";

/**
 * Landing type — body via Mukta (India UI).
 * Display faces already on <html> from root layout (free Google / local):
 * Instrument Serif, Fraunces, Newsreader, Cormorant, Unbounded, Bebas,
 * Space Grotesk, Barlow Condensed, JetBrains Mono, Clash, etc.
 *
 * Per-section CSS maps those vars (see ledger.css --f-*).
 */

export const mukta = Mukta({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-mukta",
  display: "swap",
});

export const landingFontVars = mukta.variable;
