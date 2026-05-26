"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";

export function MenuLiveSync({ tenantId }: { tenantId: string }) {
  const router = useRouter();

  useEffect(() => {
    const sb = getBrowserClient();
    const ch = sb
      .channel(`menu:${tenantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items", filter: `tenant_id=eq.${tenantId}` },
        () => {
          // Admin added/removed/out-of-stocked an item — re-fetch the page
          // so students on the menu see the change without a manual reload.
          router.refresh();
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [tenantId, router]);

  return null;
}
