"use server"

import { db } from "@/db"
import { products } from "@/db/schema"
import { eq } from "drizzle-orm"
import { productSchema } from "@/lib/validators"
import { revalidatePath } from "next/cache"

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u").replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-")
}

export async function createProduct(formData: FormData) {
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
    return { error: parsed.error.issues[0].message }
  }

  const slug = slugify(parsed.data.name)

  await db.insert(products).values({
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

  revalidatePath("/admin/productos")
  revalidatePath("/")
  return { success: true }
}

export async function updateProduct(id: string, formData: FormData) {
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
    return { error: parsed.error.issues[0].message }
  }

  await db.update(products).set({
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
  }).where(eq(products.id, id))

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
