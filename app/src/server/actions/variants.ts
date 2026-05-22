"use server"

import { db } from "@/db"
import { productVariants } from "@/db/schema"
import { eq } from "drizzle-orm"
import { productVariantSchema, type ProductVariantInput } from "@/lib/validators"
import { formatZodError } from "@/lib/zodErrors"
import { validateVariantAttributes } from "@/lib/variantAttributes"
import { revalidatePath } from "next/cache"

export type VariantPayload = ProductVariantInput

async function validateVariantPayload(
  data: VariantPayload
): Promise<
  | { ok: true; data: VariantPayload & { attributes: Record<string, string> } }
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

  return {
    ok: true,
    data: { ...parsed.data, attributes: attrResult.normalized },
  }
}

export async function createProductVariant(productId: string, data: VariantPayload) {
  const result = await validateVariantPayload(data)
  if (!result.ok) {
    return { error: result.error, details: result.details }
  }

  const v = result.data
  await db.insert(productVariants).values({
    productId,
    sku:              v.sku,
    stock:            v.stock,
    attributes:       v.attributes,
    costPrice:        v.costPrice != null ? v.costPrice.toFixed(2) : null,
    salePrice:        v.salePrice != null ? v.salePrice.toFixed(2) : null,
  })

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
      costPrice:  v.costPrice != null ? v.costPrice.toFixed(2) : null,
      salePrice:  v.salePrice != null ? v.salePrice.toFixed(2) : null,
    })
    .where(eq(productVariants.id, id))

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
  const validated: Array<VariantPayload & { attributes: Record<string, string> }> = []

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

  await db.delete(productVariants).where(eq(productVariants.productId, productId))

  if (validated.length > 0) {
    await db.insert(productVariants).values(
      validated.map((v) => ({
        productId,
        sku:        v.sku,
        stock:      v.stock,
        attributes: v.attributes,
        costPrice:  v.costPrice != null ? v.costPrice.toFixed(2) : null,
        salePrice:  v.salePrice != null ? v.salePrice.toFixed(2) : null,
      }))
    )
  }

  revalidatePath("/admin/productos")
  revalidatePath(`/admin/productos/${productId}`)
  return { success: true }
}
