import type { Metadata } from "next";
import { KitchenDemo } from "./kitchen-demo";

export const metadata: Metadata = {
  title: "Tray — Kitchen Queue",
  description: "The live kitchen pass: tickets land pre-paid, prep timers count, OTP clears the handover. Live demo, no sign-up.",
};

export default function Page() {
  return <KitchenDemo />;
}
