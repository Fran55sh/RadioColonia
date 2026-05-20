"use server"

import { existsSync } from "fs"
import { unlink } from "fs/promises"
import path from "path"
import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { products } from "@/db/schema"
import { auth } from "@/lib/auth"
import {
  buildMediaInventory,
  publicUrlForUploadFilename,
  UPLOAD_PRODUCT_FILENAME_REGEX,
  UPLOAD_PRODUCTS_DIR,
  type MediaInventory,
} from "@/lib/media-inventory"

export interface ProductForMediaAssignment {
  id: string
  name: string
  image: string
  isActive: boolean
}

async function requireAdmin(): Promise<{ error: string } | null> {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return { error: "No autorizado" }
  }
  return null
}

export async function getMediaInventory(): Promise<
  { inventory: MediaInventory } | { error: string }
> {
  const authError = await requireAdmin()
  if (authError) return authError

  const inventory = await buildMediaInventory()
  return { inventory }
}

export async function deleteOrphanMedia(
  filename: string
): Promise<{ success: true } | { error: string }> {
  const authError = await requireAdmin()
  if (authError) return authError

  if (!UPLOAD_PRODUCT_FILENAME_REGEX.test(filename)) {
    return { error: "Nombre de archivo no válido" }
  }

  const imageUrl = publicUrlForUploadFilename(filename)

  const [inUse] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.image, imageUrl))
    .limit(1)

  if (inUse) {
    return { error: "La imagen está asignada a un producto" }
  }

  const filePath = path.join(UPLOAD_PRODUCTS_DIR, filename)
  try {
    await unlink(filePath)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "ENOENT") {
      return { error: "El archivo no existe" }
    }
    console.error("deleteOrphanMedia:", err)
    return { error: "No se pudo eliminar el archivo" }
  }

  revalidatePath("/admin/imagenes")
  return { success: true }
}

export async function listProductsForMediaAssignment(): Promise<
  { products: ProductForMediaAssignment[] } | { error: string }
> {
  const authError = await requireAdmin()
  if (authError) return authError

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      isActive: products.isActive,
    })
    .from(products)
    .orderBy(asc(products.name))

  return { products: rows }
}

export async function assignOrphanMediaToProduct(
  filename: string,
  productId: string
): Promise<{ success: true; productName: string } | { error: string }> {
  const authError = await requireAdmin()
  if (authError) return authError

  if (!UPLOAD_PRODUCT_FILENAME_REGEX.test(filename)) {
    return { error: "Nombre de archivo no válido" }
  }

  if (!productId?.trim()) {
    return { error: "Seleccioná un producto" }
  }

  const imageUrl = publicUrlForUploadFilename(filename)
  const filePath = path.join(UPLOAD_PRODUCTS_DIR, filename)

  if (!existsSync(filePath)) {
    return { error: "El archivo no existe en el servidor" }
  }

  const [inUse] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.image, imageUrl))
    .limit(1)

  if (inUse) {
    return { error: "La imagen ya está asignada a un producto" }
  }

  const [product] = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)

  if (!product) {
    return { error: "Producto no encontrado" }
  }

  await db
    .update(products)
    .set({ image: imageUrl, updatedAt: new Date() })
    .where(eq(products.id, productId))

  revalidatePath("/admin/imagenes")
  revalidatePath("/admin/productos")
  revalidatePath(`/admin/productos/${productId}`)
  revalidatePath("/")

  return { success: true, productName: product.name }
}
