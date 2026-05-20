"use server"

import { unlink } from "fs/promises"
import path from "path"
import { eq } from "drizzle-orm"
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

async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return { error: "No autorizado" as const }
  }
  return { session }
}

export async function getMediaInventory(): Promise<
  { inventory: MediaInventory } | { error: string }
> {
  const authResult = await requireAdmin()
  if ("error" in authResult) return authResult

  const inventory = await buildMediaInventory()
  return { inventory }
}

export async function deleteOrphanMedia(
  filename: string
): Promise<{ success: true } | { error: string }> {
  const authResult = await requireAdmin()
  if ("error" in authResult) return authResult

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
