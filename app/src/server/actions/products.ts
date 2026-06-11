"use server"

import { db } from "@/db"
import { products } from "@/db/schema"
import { eq } from "drizzle-orm"
import { productSchema, type ProductInput } from "@/lib/validators"
import { formatZodError } from "@/lib/zodErrors"
import { slugify } from "@/lib/slugify"
import { syncProductVariants, type VariantPayload } from "@/server/actions/variants"
import { revalidatePath } from "next/cache"

function defaultVariantForProduct(
  slug: string,
  productId: string,
  product: ProductInput
): VariantPayload {
  return {
    sku: `${slug.toUpperCase()}-${productId.slice(0, 8)}`,
    stock: product.stock,
    costPrice: null,
    salePrice: null,
    attributes: {},
    supplierOffers: [],
  }
}

export async function createProduct(
  formData: FormData,
  variants?: VariantPayload[]
) {
  const raw = {
    name:          formData.get("name") as string,
    description:   formData.get("description") as string,
    price:         formData.get("price"),
    originalPrice: formData.get("originalPrice") || null,
    image:         formData.get("image") as string,
    badge:         (formData.get("badge") as string) || null,
    stock:         formData.get("stock"),
    rating:        formData.get("rating") || 0,
    reviews:       formData.get("reviews") || 0,
    categoryId:    (formData.get("categoryId") as string) || null,
    isActive:      formData.get("isActive") === "true",
  }

  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  const slug = slugify(parsed.data.name)

  const [inserted] = await db
    .insert(products)
    .values({
      slug,
      name:          parsed.data.name,
      description:   parsed.data.description,
      price:         parsed.data.price.toFixed(2),
      originalPrice: parsed.data.originalPrice ? parsed.data.originalPrice.toFixed(2) : null,
      image:         parsed.data.image,
      badge:         parsed.data.badge,
      stock:         parsed.data.stock,
      rating:        parsed.data.rating.toFixed(1),
      reviews:       parsed.data.reviews,
      categoryId:    parsed.data.categoryId,
      isActive:      parsed.data.isActive,
    })
    .returning({ id: products.id })

  const variantsToSync = variants?.length
    ? variants
    : [defaultVariantForProduct(slug, inserted.id, parsed.data)]

  const syncResult = await syncProductVariants(inserted.id, variantsToSync)
  if (!syncResult.success) {
    return syncResult
  }

  revalidatePath("/admin/productos")
  revalidatePath("/")
  return { success: true, productId: inserted.id }
}

export async function updateProduct(
  id: string,
  formData: FormData,
  variants?: VariantPayload[]
) {
  const raw = {
    name:          formData.get("name") as string,
    description:   formData.get("description") as string,
    price:         formData.get("price"),
    originalPrice: formData.get("originalPrice") || null,
    image:         formData.get("image") as string,
    badge:         (formData.get("badge") as string) || null,
    stock:         formData.get("stock"),
    rating:        formData.get("rating") || 0,
    reviews:       formData.get("reviews") || 0,
    categoryId:    (formData.get("categoryId") as string) || null,
    isActive:      formData.get("isActive") === "true",
  }

  const parsed = productSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  await db
    .update(products)
    .set({
      name:          parsed.data.name,
      description:   parsed.data.description,
      price:         parsed.data.price.toFixed(2),
      originalPrice: parsed.data.originalPrice ? parsed.data.originalPrice.toFixed(2) : null,
      image:         parsed.data.image,
      badge:         parsed.data.badge,
      stock:         parsed.data.stock,
      rating:        parsed.data.rating.toFixed(1),
      reviews:       parsed.data.reviews,
      categoryId:    parsed.data.categoryId,
      isActive:      parsed.data.isActive,
      updatedAt:     new Date(),
    })
    .where(eq(products.id, id))

  if (variants !== undefined) {
    const variantsToSync = variants.length
      ? variants
      : [defaultVariantForProduct(slugify(parsed.data.name), id, parsed.data)]

    const syncResult = await syncProductVariants(id, variantsToSync)
    if (!syncResult.success) {
      return syncResult
    }
  }

  revalidatePath("/admin/productos")
  revalidatePath("/")
  return { success: true }
}

export async function deleteProduct(id: string) {
  await db.delete(products).where(eq(products.id, id))
  revalidatePath("/admin/productos")
  revalidatePath("/")
  return { success: true }
}
