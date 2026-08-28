import { NextResponse } from "next/server"
import { db } from "@/db"
import {
  products,
  categories,
  productVariants,
  productVariantPriceTiers,
  productPriceTiers,
  globalAttributes,
} from "@/db/schema"
import { eq, inArray, asc } from "drizzle-orm"
import { resolveVariantTiers } from "@/lib/qtyDiscountScope"
import type { QtyDiscountScope } from "@/db/schema"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const [product] = await db
    .select({
      id:            products.id,
      slug:          products.slug,
      name:          products.name,
      description:   products.description,
      price:         products.price,
      originalPrice: products.originalPrice,
      image:         products.image,
      badge:         products.badge,
      stock:         products.stock,
      rating:        products.rating,
      reviews:       products.reviews,
      categoryName:  categories.name,
      qtyDiscountScope: products.qtyDiscountScope,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, slug))
    .limit(1)

  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const qtyDiscountScope: QtyDiscountScope =
    product.qtyDiscountScope === "shared" ? "shared" : "per_variant"

  let sharedTiers: Array<{ minQty: number; unitPrice: number }> = []
  if (qtyDiscountScope === "shared") {
    const sharedRows = await db
      .select({
        minQty:    productPriceTiers.minQty,
        unitPrice: productPriceTiers.unitPrice,
      })
      .from(productPriceTiers)
      .where(eq(productPriceTiers.productId, product.id))
      .orderBy(asc(productPriceTiers.minQty))

    sharedTiers = sharedRows.map((t) => ({
      minQty: t.minQty,
      unitPrice: parseFloat(t.unitPrice),
    }))
  }

  const variantRows = await db
    .select({
      id:         productVariants.id,
      sku:        productVariants.sku,
      stock:      productVariants.stock,
      attributes: productVariants.attributes,
      salePrice:  productVariants.salePrice,
    })
    .from(productVariants)
    .where(eq(productVariants.productId, product.id))
    .orderBy(productVariants.createdAt)

  const variantIds = variantRows.map((v) => v.id)
  const tierRows = variantIds.length
    ? await db
        .select({
          variantId: productVariantPriceTiers.variantId,
          minQty:    productVariantPriceTiers.minQty,
          unitPrice: productVariantPriceTiers.unitPrice,
        })
        .from(productVariantPriceTiers)
        .where(inArray(productVariantPriceTiers.variantId, variantIds))
        .orderBy(asc(productVariantPriceTiers.minQty))
    : []

  const tiersByVariant: Record<string, Array<{ minQty: number; unitPrice: number }>> = {}
  for (const t of tierRows) {
    if (!tiersByVariant[t.variantId]) tiersByVariant[t.variantId] = []
    tiersByVariant[t.variantId].push({
      minQty: t.minQty,
      unitPrice: parseFloat(t.unitPrice),
    })
  }

  const variants = variantRows.map((v) => ({
    ...v,
    priceTiers: resolveVariantTiers(
      qtyDiscountScope,
      sharedTiers,
      tiersByVariant[v.id] ?? []
    ),
    qtyDiscountScope,
  }))

  const attrRows = await db
    .select({ slug: globalAttributes.slug, name: globalAttributes.name })
    .from(globalAttributes)

  const attributeLabels = Object.fromEntries(attrRows.map((a) => [a.slug, a.name]))

  return NextResponse.json({ product, variants, attributeLabels })
}
