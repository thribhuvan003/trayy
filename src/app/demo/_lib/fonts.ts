import {
  Rozha_One,
  Mukta,
  Spline_Sans_Mono,
  Caveat,
  Barlow,
  Barlow_Semi_Condensed,
  IBM_Plex_Mono,
  Alegreya,
  Familjen_Grotesk,
  Courier_Prime,
} from "next/font/google";

const rozha = Rozha_One({ subsets: ["latin"], weight: "400", variable: "--font-rozha", display: "swap" });
const mukta = Mukta({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-mukta", display: "swap" });
const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-spline-mono",
  display: "swap",
});
const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-caveat", display: "swap" });

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow", display: "swap" });
const barlowSC = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow-sc",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-mono", display: "swap" });

const alegreya = Alegreya({ subsets: ["latin"], weight: ["500", "700"], style: ["normal", "italic"], variable: "--font-alegreya", display: "swap" });
const familjen = Familjen_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-familjen", display: "swap" });
const courierPrime = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-courier", display: "swap" });

export const studentFontVars = [rozha.variable, mukta.variable, splineMono.variable, caveat.variable].join(" ");
export const kitchenFontVars = [barlow.variable, barlowSC.variable, plexMono.variable].join(" ");
export const adminFontVars = [alegreya.variable, familjen.variable, courierPrime.variable].join(" ");
