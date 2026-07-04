import type { Metadata } from "next";
import { AdminDemo } from "./admin-demo";

export const metadata: Metadata = {
  title: "Tray — Admin Cash Book",
  description: "The daily cash book: live orders, revenue, menu edits, staff access and a full audit log — one screen. Live demo, no sign-up.",
};

export default function Page() {
  return <AdminDemo />;
}
