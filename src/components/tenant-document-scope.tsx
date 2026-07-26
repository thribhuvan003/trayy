"use client";

import { useLayoutEffect } from "react";

/**
 * Makes the active tenant available to browser-side Supabase clients without
 * forcing the global root layout to resolve a tenant for public pages.
 */
export function TenantDocumentScope({ tenantId }: { tenantId: string }) {
  useLayoutEffect(() => {
    const previous = document.documentElement.dataset.tenantId;
    document.documentElement.dataset.tenantId = tenantId;

    return () => {
      if (previous) {
        document.documentElement.dataset.tenantId = previous;
      } else {
        delete document.documentElement.dataset.tenantId;
      }
    };
  }, [tenantId]);

  return null;
}
