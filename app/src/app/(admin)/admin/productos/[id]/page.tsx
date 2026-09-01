export const dynamic = "force-dynamic"

import { db } from "@/db"
import {
  products,
  categories,
  globalAttributes,
  productVariants,
  productVariantPriceTiers,
  productPriceTiers,
} from "@/db/schema"
import type { ProductSupplierOffer, ProductVariantPriceTier, ProductPriceTier } from "@/db/schema"
import { getAllSuppliers } from "@/server/actions/suppliers"
import { getSupplierOffersByProductId } from "@/server/actions/variants"
import { eq, asc, inArray } from "drizzle-orm"
import { notFound } from "next/navigation"
import ProductForm from "../ProductForm"
import { variantOrderBy } from "@/lib/variantOrder"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductoPage({ params }: Props) {
  const { id } = await params

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)

  if (!product) notFound()

  const [cats, attrs, variants, supplierList, offers] = await Promise.all([
    db
      .select({
        id:       categories.id,
        name:     categories.name,
        parentId: categories.parentId,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder)),
    db.select().from(globalAttributes).orderBy(asc(globalAttributes.sortOrder)),
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(...variantOrderBy),
    getAllSuppliers(),
    getSupplierOffersByProductId(id),
  ])

  const initialOffersByVariantId: Record<string, ProductSupplierOffer[]> = {}
  for (const offer of offers) {
    if (!initialOffersByVariantId[offer.variantId]) {
      initialOffersByVariantId[offer.variantId] = []
    }
    initialOffersByVariantId[offer.variantId].push(offer)
  }

  const variantIds = variants.map((v) => v.id)
  const tiers = variantIds.length
    ? await db
        .select()
        .from(productVariantPriceTiers)
        .where(inArray(productVariantPriceTiers.variantId, variantIds))
        .orderBy(asc(productVariantPriceTiers.minQty))
    : []

  const initialTiersByVariantId: Record<string, ProductVariantPriceTier[]> = {}
  for (const tier of tiers) {
    if (!initialTiersByVariantId[tier.variantId]) {
      initialTiersByVariantId[tier.variantId] = []
    }
    initialTiersByVariantId[tier.variantId].push(tier)
  }

  const initialSharedTiers: ProductPriceTier[] =
    product.qtyDiscountScope === "shared"
      ? await db
          .select()
          .from(productPriceTiers)
          .where(eq(productPriceTiers.productId, id))
          .orderBy(asc(productPriceTiers.minQty))
      : []

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-8">Editar producto</h1>
      <ProductForm
        categories={cats}
        globalAttributes={attrs}
        suppliers={supplierList}
        product={product}
        initialVariants={variants}
        initialOffersByVariantId={initialOffersByVariantId}
        initialTiersByVariantId={initialTiersByVariantId}
        initialSharedTiers={initialSharedTiers}
      />
    </div>
  )
}
