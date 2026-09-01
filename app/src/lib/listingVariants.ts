import { db } from "@/db"
import {
  products,
  productVariants,
  productVariantPriceTiers,
  productPriceTiers,
} from "@/db/schema"
import { inArray, asc } from "drizzle-orm"
import { productPriceDisplay } from "@/lib/productPriceDisplay"
import { resolveVariantTiers } from "@/lib/qtyDiscountScope"
import { variantOrderBy } from "@/lib/variantOrder"
import type { PriceTier } from "@/lib/quantityPricing"
import type { QtyDiscountScope } from "@/db/schema"

export type ListingVariant = {
  id: string
  productId: string
  sku: string
  salePrice: string | null
  attributes: unknown
}

export async function loadVariantsAndTiers(productIds: string[]) {
  if (productIds.length === 0) {
    return {
      variantsByProduct: new Map<string, ListingVariant[]>(),
      tiersByVariantId: {} as Record<string, PriceTier[]>,
    }
  }

  const productRows = await db
    .select({
      id: products.id,
      qtyDiscountScope: products.qtyDiscountScope,
    })
    .from(products)
    .where(inArray(products.id, productIds))

  const scopeByProductId = Object.fromEntries(
    productRows.map((p) => [p.id, p.qtyDiscountScope as QtyDiscountScope])
  ) as Record<string, QtyDiscountScope>

  const sharedProductIds = productRows
    .filter((p) => p.qtyDiscountScope === "shared")
    .map((p) => p.id)

  const productTiersByProductId: Record<string, PriceTier[]> = {}
  if (sharedProductIds.length > 0) {
    const sharedTiers = await db
      .select({
        productId: productPriceTiers.productId,
        minQty:    productPriceTiers.minQty,
        unitPrice: productPriceTiers.unitPrice,
      })
      .from(productPriceTiers)
      .where(inArray(productPriceTiers.productId, sharedProductIds))
      .orderBy(asc(productPriceTiers.minQty))

    for (const t of sharedTiers) {
      if (!productTiersByProductId[t.productId]) {
        productTiersByProductId[t.productId] = []
      }
      productTiersByProductId[t.productId].push({
        minQty: t.minQty,
        unitPrice: parseFloat(t.unitPrice),
      })
    }
  }

  const variants = await db
    .select({
      id:         productVariants.id,
      productId:  productVariants.productId,
      sku:        productVariants.sku,
      salePrice:  productVariants.salePrice,
      attributes: productVariants.attributes,
    })
    .from(productVariants)
    .where(inArray(productVariants.productId, productIds))
    .orderBy(...variantOrderBy)

  const variantsByProduct = new Map<string, ListingVariant[]>()
  for (const variant of variants) {
    const list = variantsByProduct.get(variant.productId) ?? []
    list.push(variant)
    variantsByProduct.set(variant.productId, list)
  }

  const variantIds = variants.map((v) => v.id)
  const rawTiersByVariantId: Record<string, PriceTier[]> = {}
  if (variantIds.length > 0) {
    const tiers = await db
      .select({
        variantId: productVariantPriceTiers.variantId,
        minQty:    productVariantPriceTiers.minQty,
        unitPrice: productVariantPriceTiers.unitPrice,
      })
      .from(productVariantPriceTiers)
      .where(inArray(productVariantPriceTiers.variantId, variantIds))
      .orderBy(asc(productVariantPriceTiers.minQty))

    for (const t of tiers) {
      if (!rawTiersByVariantId[t.variantId]) rawTiersByVariantId[t.variantId] = []
      rawTiersByVariantId[t.variantId].push({
        minQty: t.minQty,
        unitPrice: parseFloat(t.unitPrice),
      })
    }
  }

  const tiersByVariantId: Record<string, PriceTier[]> = {}
  for (const variant of variants) {
    const scope = scopeByProductId[variant.productId] ?? "per_variant"
    tiersByVariantId[variant.id] = resolveVariantTiers(
      scope,
      productTiersByProductId[variant.productId] ?? [],
      rawTiersByVariantId[variant.id] ?? []
    )
  }

  return { variantsByProduct, tiersByVariantId }
}

export function cardPriceProps(
  productPrice: string,
  variants: ListingVariant[],
  tiersByVariantId: Record<string, PriceTier[]>
) {
  return productPriceDisplay(productPrice, variants, tiersByVariantId)
}
