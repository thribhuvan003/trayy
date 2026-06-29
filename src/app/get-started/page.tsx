import { headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { GetStartedWizard } from "./wizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started — Tray",
  description: "Set up your canteen ordering system in minutes.",
};

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sp = await searchParams;
  const isNewUser = sp.new === "1";

  // Check if user is signed in — if so, show wizard immediately.
  // If not, the wizard handles its own auth prompt.
  let isSignedIn = false;
  try {
    const h = await headers();
    const cookieHeader = h.get("cookie") ?? "";
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieHeader.split(";").map((c) => c.trim()).filter(Boolean).map((c) => {
              const idx = c.indexOf("=");
              return idx === -1 ? { name: c, value: "" } : { name: c.slice(0, idx), value: c.slice(idx + 1) };
            });
          },
          setAll() {},
        },
      }
    );
    const { data: { session: _gsSession } } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, error: null }), 1200),
      ),
    ]);
    if (_gsSession?.user) isSignedIn = true;
  } catch {
    // Show wizard anyway
  }

  return <GetStartedWizard isNewUser={isNewUser} isSignedIn={isSignedIn} />;
}
