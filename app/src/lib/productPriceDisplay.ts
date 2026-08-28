import { priceRange, type PriceTier } from "@/lib/quantityPricing"

type VariantPriceInput = {
  id?: string
  salePrice: string | null
}

type TierInput = {
  variantId: string
  minQty: number
  unitPrice: string
}

/**
 * Across all variants of a product: unit price at qty 1 (max) and lowest
 * reachable tier/base price (min). Used by listing cards.
 */
export function productPriceDisplay(
  productPrice: string | number,
  variants: VariantPriceInput[],
  tiersByVariantId: Record<string, PriceTier[]> | TierInput[]
): { price: number; priceMin: number; priceMax: number } {
  const baseProduct = typeof productPrice === "string"
    ? parseFloat(productPrice)
    : productPrice

  const tiersMap: Record<string, PriceTier[]> = Array.isArray(tiersByVariantId)
    ? (() => {
        const m: Record<string, PriceTier[]> = {}
        for (const t of tiersByVariantId) {
          if (!m[t.variantId]) m[t.variantId] = []
          m[t.variantId].push({
            minQty: t.minQty,
            unitPrice: parseFloat(t.unitPrice),
          })
        }
        return m
      })()
    : tiersByVariantId

  if (variants.length === 0) {
    return { price: baseProduct, priceMin: baseProduct, priceMax: baseProduct }
  }

  let overallMin = Infinity
  let overallMax = -Infinity
  let firstUnit = baseProduct

  variants.forEach((v, i) => {
    const base = v.salePrice ? parseFloat(v.salePrice) : baseProduct
    const tiers = (v.id ? tiersMap[v.id] : undefined) ?? []
    const range = priceRange(base, tiers)
    if (i === 0) firstUnit = range.max
    overallMin = Math.min(overallMin, range.min)
    overallMax = Math.max(overallMax, range.max)
  })

  if (!Number.isFinite(overallMin)) overallMin = baseProduct
  if (!Number.isFinite(overallMax)) overallMax = baseProduct

  return {
    price: firstUnit,
    priceMin: overallMin,
    priceMax: overallMax,
  }
}
