export const dynamic = "force-dynamic"

import { db } from "@/db"
import { products, categories, globalAttributes, productVariants } from "@/db/schema"
import type { ProductSupplierOffer } from "@/db/schema"
import { getAllSuppliers } from "@/server/actions/suppliers"
import { getSupplierOffersByProductId } from "@/server/actions/variants"
import { eq, asc } from "drizzle-orm"
import { notFound } from "next/navigation"
import ProductForm from "../ProductForm"

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
      .orderBy(asc(productVariants.createdAt)),
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
      />
    </div>
  )
}
