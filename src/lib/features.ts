import type { OrderMode, TenantTier } from "@/lib/tenant";

// Per-tenant feature switches derived from tier + order_mode (migration 0028).
// ALL conditional rendering for Street Edition goes through resolveFeatures —
// components must never branch on the raw columns, so the mapping from tenant
// shape to behaviour lives in exactly one place.
export type TenantFeatures = {
  // The kitchen board pipeline (placed → preparing → ready → collected).
  // false ⇒ paid orders are terminal at 'placed'; the customer's short_code
  // is the counter token and the kitchen queue ignores these orders.
  hasKitchenQueue: boolean;
};

export function resolveFeatures(tenant: {
  tier: TenantTier;
  order_mode: OrderMode;
}): TenantFeatures {
  return {
    hasKitchenQueue: tenant.order_mode === "kitchen_flow",
  };
}
