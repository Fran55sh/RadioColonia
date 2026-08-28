import type { PriceTier } from "@/lib/quantityPricing"
import type { QtyDiscountScope } from "@/db/schema"

/** Tiers efectivos para un SKU según el alcance configurado en el producto. */
export function resolveVariantTiers(
  scope: QtyDiscountScope,
  productTiers: PriceTier[],
  variantTiers: PriceTier[]
): PriceTier[] {
  return scope === "shared" ? productTiers : variantTiers
}
