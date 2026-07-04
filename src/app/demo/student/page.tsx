import type { Metadata } from "next";
import { StudentDemo } from "./student-demo";

export const metadata: Metadata = {
  title: "Tray Demo — Today's Board (Student)",
  description: "Order off the board, pay by UPI, track prep live and collect with a four-digit code. Live demo, no sign-up.",
};

export default function Page() {
  return <StudentDemo />;
}
