"use server"

import { db } from "@/db"
import { globalAttributes, productVariants } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { globalAttributeSchema } from "@/lib/validators"
import { revalidatePath } from "next/cache"

export async function createGlobalAttribute(formData: FormData) {
  const raw = {
    name:      formData.get("name") as string,
    slug:      formData.get("slug") as string,
    sortOrder: formData.get("sortOrder") || 0,
  }

  const parsed = globalAttributeSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  await db.insert(globalAttributes).values(parsed.data)
  revalidatePath("/admin/atributos")
  return { success: true }
}

export async function updateGlobalAttribute(id: string, formData: FormData) {
  const raw = {
    name:      formData.get("name") as string,
    slug:      formData.get("slug") as string,
    sortOrder: formData.get("sortOrder") || 0,
  }

  const parsed = globalAttributeSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const [existing] = await db
    .select({ slug: globalAttributes.slug })
    .from(globalAttributes)
    .where(eq(globalAttributes.id, id))
    .limit(1)

  if (existing && existing.slug !== parsed.data.slug) {
    const inUse = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(sql`${productVariants.attributes} ? ${existing.slug}`)
      .limit(1)

    if (inUse.length > 0) {
      return {
        error: `No se puede cambiar el slug porque hay variantes usando '${existing.slug}'.`,
      }
    }
  }

  await db.update(globalAttributes).set(parsed.data).where(eq(globalAttributes.id, id))
  revalidatePath("/admin/atributos")
  return { success: true }
}

export async function deleteGlobalAttribute(id: string) {
  const [attr] = await db
    .select({ slug: globalAttributes.slug })
    .from(globalAttributes)
    .where(eq(globalAttributes.id, id))
    .limit(1)

  if (!attr) {
    return { error: "Atributo no encontrado" }
  }

  const inUse = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(sql`${productVariants.attributes} ? ${attr.slug}`)
    .limit(1)

  if (inUse.length > 0) {
    return {
      error: `No se puede eliminar: hay variantes que usan el atributo '${attr.slug}'.`,
    }
  }

  await db.delete(globalAttributes).where(eq(globalAttributes.id, id))
  revalidatePath("/admin/atributos")
  return { success: true }
}
