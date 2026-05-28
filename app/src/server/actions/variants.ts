"use server"

import { db } from "@/db"
import { productSupplierOffers, productVariants } from "@/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import {
  productVariantSchema,
  supplierOfferSchema,
  type ProductVariantInput,
  type SupplierOfferInput,
} from "@/lib/validators"
import { formatZodError } from "@/lib/zodErrors"
import { validateVariantAttributes } from "@/lib/variantAttributes"
import { revalidatePath } from "next/cache"

export type VariantPayload = ProductVariantInput

type ValidatedVariant = ProductVariantInput & {
  attributes: Record<string, string>
  supplierOffers: SupplierOfferInput[]
}

async function validateVariantPayload(
  data: VariantPayload
): Promise<
  | { ok: true; data: ValidatedVariant }
  | { ok: false; error: string; details?: string[] }
> {
  const parsed = productVariantSchema.safeParse(data)
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) }
  }

  const attrResult = await validateVariantAttributes(parsed.data.attributes)
  if (!attrResult.ok) {
    return {
      ok: false,
      error: "Validación de variantes fallida",
      details: attrResult.errors,
    }
  }

  const offers = parsed.data.supplierOffers ?? []
  for (let i = 0; i < offers.length; i++) {
    const offerParsed = supplierOfferSchema.safeParse(offers[i])
    if (!offerParsed.success) {
      return { ok: false, error: formatZodError(offerParsed.error) }
    }
  }

  const supplierIds = offers.map((o) => o.supplierId)
  if (new Set(supplierIds).size !== supplierIds.length) {
    return { ok: false, error: "No puede haber dos ofertas del mismo proveedor en una variante." }
  }

  return {
    ok: true,
    data: {
      ...parsed.data,
      attributes: attrResult.normalized,
      supplierOffers: offers,
    },
  }
}

async function syncSupplierOffersForVariant(
  variantId: string,
  offers: SupplierOfferInput[]
) {
  const existing = await db
    .select({ id: productSupplierOffers.id })
    .from(productSupplierOffers)
    .where(eq(productSupplierOffers.variantId, variantId))

  const keepIds = offers.map((o) => o.id).filter(Boolean) as string[]
  const toDelete = existing
    .map((e) => e.id)
    .filter((id) => !keepIds.includes(id))

  if (toDelete.length > 0) {
    await db
      .delete(productSupplierOffers)
      .where(inArray(productSupplierOffers.id, toDelete))
  }

  let preferredSet = false
  for (const offer of offers) {
    const isPreferred = offer.isPreferred && !preferredSet
    if (isPreferred) preferredSet = true

    const values = {
      variantId,
      supplierId:     offer.supplierId,
      supplierCode:   offer.supplierCode.trim(),
      costPrice:      offer.costPrice != null ? offer.costPrice.toFixed(2) : null,
      stock:          offer.stock ?? 0,
      isPreferred,
      lastCostUpdate: offer.costPrice != null ? new Date() : null,
      updatedAt:      new Date(),
    }

    if (offer.id) {
      await db
        .update(productSupplierOffers)
        .set(values)
        .where(eq(productSupplierOffers.id, offer.id))
    } else {
      await db.insert(productSupplierOffers).values(values)
    }
  }

  if (!preferredSet && offers.length > 0) {
    const [first] = await db
      .select({ id: productSupplierOffers.id })
      .from(productSupplierOffers)
      .where(eq(productSupplierOffers.variantId, variantId))
      .limit(1)

    if (first) {
      await db
        .update(productSupplierOffers)
        .set({ isPreferred: true, updatedAt: new Date() })
        .where(eq(productSupplierOffers.id, first.id))
    }
  }
}

export async function createProductVariant(productId: string, data: VariantPayload) {
  const result = await validateVariantPayload(data)
  if (!result.ok) {
    return { error: result.error, details: result.details }
  }

  const v = result.data
  const [inserted] = await db
    .insert(productVariants)
    .values({
      productId,
      sku:        v.sku,
      stock:      v.stock,
      attributes: v.attributes,
      costPrice:  null,
      salePrice:  v.salePrice != null ? v.salePrice.toFixed(2) : null,
    })
    .returning({ id: productVariants.id })

  if (v.supplierOffers.length > 0) {
    await syncSupplierOffersForVariant(inserted.id, v.supplierOffers)
  }

  revalidatePath("/admin/productos")
  revalidatePath(`/admin/productos/${productId}`)
  return { success: true }
}

export async function updateProductVariant(id: string, productId: string, data: VariantPayload) {
  const result = await validateVariantPayload(data)
  if (!result.ok) {
    return { error: result.error, details: result.details }
  }

  const v = result.data
  await db
    .update(productVariants)
    .set({
      sku:        v.sku,
      stock:      v.stock,
      attributes: v.attributes,
      costPrice:  null,
      salePrice:  v.salePrice != null ? v.salePrice.toFixed(2) : null,
    })
    .where(eq(productVariants.id, id))

  await syncSupplierOffersForVariant(id, v.supplierOffers)

  revalidatePath("/admin/productos")
  revalidatePath(`/admin/productos/${productId}`)
  return { success: true }
}

export async function deleteProductVariant(id: string, productId: string) {
  await db.delete(productVariants).where(eq(productVariants.id, id))
  revalidatePath("/admin/productos")
  revalidatePath(`/admin/productos/${productId}`)
  return { success: true }
}

export async function syncProductVariants(productId: string, variants: VariantPayload[]) {
  const errors: string[] = []
  const validated: ValidatedVariant[] = []

  for (let i = 0; i < variants.length; i++) {
    const result = await validateVariantPayload(variants[i])
    if (!result.ok) {
      const prefix = variants.length > 1 ? `Variante ${i + 1}: ` : ""
      if (result.details) {
        errors.push(...result.details.map((d) => prefix + d))
      } else {
        errors.push(prefix + result.error)
      }
    } else {
      validated.push(result.data)
    }
  }

  const skus = validated.map((v) => v.sku)
  if (new Set(skus).size !== skus.length) {
    return { error: "Hay SKUs duplicados entre las variantes." }
  }

  if (errors.length > 0) {
    return { error: "Validación de variantes fallida", details: errors }
  }

  const existing = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId))

  const existingBySku = new Map(existing.map((v) => [v.sku, v]))
  const existingById = new Map(existing.map((v) => [v.id, v]))
  const keptIds: string[] = []

  for (const v of validated) {
    let variantId: string | undefined

    if (v.id && existingById.has(v.id)) {
      variantId = v.id
      await db
        .update(productVariants)
        .set({
          sku:        v.sku,
          stock:      v.stock,
          attributes: v.attributes,
          costPrice:  null,
          salePrice:  v.salePrice != null ? v.salePrice.toFixed(2) : null,
        })
        .where(eq(productVariants.id, v.id))
    } else if (existingBySku.has(v.sku)) {
      const row = existingBySku.get(v.sku)!
      variantId = row.id
      await db
        .update(productVariants)
        .set({
          stock:      v.stock,
          attributes: v.attributes,
          costPrice:  null,
          salePrice:  v.salePrice != null ? v.salePrice.toFixed(2) : null,
        })
        .where(eq(productVariants.id, row.id))
    } else {
      const [inserted] = await db
        .insert(productVariants)
        .values({
          productId,
          sku:        v.sku,
          stock:      v.stock,
          attributes: v.attributes,
          costPrice:  null,
          salePrice:  v.salePrice != null ? v.salePrice.toFixed(2) : null,
        })
        .returning({ id: productVariants.id })
      variantId = inserted.id
    }

    if (variantId) {
      keptIds.push(variantId)
      await syncSupplierOffersForVariant(variantId, v.supplierOffers)
    }
  }

  const toRemove = existing.filter((e) => !keptIds.includes(e.id)).map((e) => e.id)
  if (toRemove.length > 0) {
    await db
      .delete(productVariants)
      .where(
        and(
          eq(productVariants.productId, productId),
          inArray(productVariants.id, toRemove)
        )
      )
  } else if (validated.length === 0 && existing.length > 0) {
    await db.delete(productVariants).where(eq(productVariants.productId, productId))
  }

  revalidatePath("/admin/productos")
  revalidatePath(`/admin/productos/${productId}`)
  return { success: true }
}

export async function getSupplierOffersByProductId(productId: string) {
  const variants = await db
    .select({ id: productVariants.id, sku: productVariants.sku })
    .from(productVariants)
    .where(eq(productVariants.productId, productId))

  if (variants.length === 0) return []

  const variantIds = variants.map((v) => v.id)
  const offers = await db
    .select()
    .from(productSupplierOffers)
    .where(inArray(productSupplierOffers.variantId, variantIds))

  return offers
}
