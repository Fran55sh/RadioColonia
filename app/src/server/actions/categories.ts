"use server"

import { db } from "@/db"
import { categories } from "@/db/schema"
import { eq, isNull } from "drizzle-orm"
import { categorySchema } from "@/lib/validators"
import { formatZodError } from "@/lib/zodErrors"
import { revalidatePath } from "next/cache"

async function validateParentId(parentId: string | null | undefined, selfId?: string) {
  if (!parentId) return null

  const [parent] = await db
    .select({ id: categories.id, parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.id, parentId))
    .limit(1)

  if (!parent) {
    return "La categoría padre no existe."
  }

  if (parent.parentId !== null) {
    return "Solo se permiten 2 niveles: la categoría padre no puede ser una subcategoría."
  }

  if (selfId && parent.id === selfId) {
    return "Una categoría no puede ser padre de sí misma."
  }

  return null
}

function parseCategoryForm(formData: FormData) {
  const parentRaw = formData.get("parentId") as string | null
  return {
    name:      formData.get("name") as string,
    slug:      formData.get("slug") as string,
    iconName:  (formData.get("iconName") as string) || "Tag",
    sortOrder: formData.get("sortOrder") || 0,
    parentId:  parentRaw && parentRaw !== "" ? parentRaw : null,
  }
}

export async function createCategory(formData: FormData) {
  const raw = parseCategoryForm(formData)

  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  const parentError = await validateParentId(parsed.data.parentId)
  if (parentError) {
    return { error: parentError }
  }

  await db.insert(categories).values(parsed.data)
  revalidatePath("/admin/categorias")
  revalidatePath("/")
  revalidatePath("/categorias")
  return { success: true }
}

export async function updateCategory(id: string, formData: FormData) {
  const raw = parseCategoryForm(formData)

  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  const parentError = await validateParentId(parsed.data.parentId, id)
  if (parentError) {
    return { error: parentError }
  }

  // Cannot make a parent category a child if it has subcategories
  if (parsed.data.parentId) {
    const children = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, id))
      .limit(1)

    if (children.length > 0) {
      return {
        error: "No se puede convertir en subcategoría: tiene subcategorías hijas.",
      }
    }
  }

  await db.update(categories).set(parsed.data).where(eq(categories.id, id))
  revalidatePath("/admin/categorias")
  revalidatePath("/")
  revalidatePath("/categorias")
  return { success: true }
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id))
  revalidatePath("/admin/categorias")
  revalidatePath("/")
  revalidatePath("/categorias")
  return { success: true }
}

export async function getParentCategories() {
  return db
    .select({
      id:   categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .where(isNull(categories.parentId))
    .orderBy(categories.sortOrder)
}

export async function getSubcategories(parentId: string) {
  return db
    .select({
      id:   categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .where(eq(categories.parentId, parentId))
    .orderBy(categories.sortOrder)
}
