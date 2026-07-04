import {
  Rozha_One,
  Mukta,
  Spline_Sans_Mono,
  Bricolage_Grotesque,
  Anek_Latin,
  Yatra_One,
  Khand,
  Young_Serif,
} from "next/font/google";

export const rozha = Rozha_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rozha",
  display: "swap",
});

export const mukta = Mukta({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mukta",
  display: "swap",
});

export const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-spline-mono",
  display: "swap",
});

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-bricolage-lp",
  display: "swap",
});

export const anekLatin = Anek_Latin({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-anek",
  display: "swap",
});

export const yatra = Yatra_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-yatra",
  display: "swap",
});

export const khand = Khand({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-khand",
  display: "swap",
});

export const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-young-serif",
  display: "swap",
});

export const landingFontVars = [
  rozha.variable,
  mukta.variable,
  splineMono.variable,
  bricolage.variable,
  anekLatin.variable,
  yatra.variable,
  khand.variable,
  youngSerif.variable,
].join(" ");
