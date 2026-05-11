"use server"

import { db } from "@/db"
import { categories } from "@/db/schema"
import { eq } from "drizzle-orm"
import { categorySchema } from "@/lib/validators"
import { revalidatePath } from "next/cache"

export async function createCategory(formData: FormData) {
  const raw = {
    name:      formData.get("name") as string,
    slug:      formData.get("slug") as string,
    iconName:  (formData.get("iconName") as string) || "Tag",
    sortOrder: formData.get("sortOrder") || 0,
  }

  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  await db.insert(categories).values(parsed.data)
  revalidatePath("/admin/categorias")
  revalidatePath("/")
  return { success: true }
}

export async function updateCategory(id: string, formData: FormData) {
  const raw = {
    name:      formData.get("name") as string,
    slug:      formData.get("slug") as string,
    iconName:  (formData.get("iconName") as string) || "Tag",
    sortOrder: formData.get("sortOrder") || 0,
  }

  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  await db.update(categories).set(parsed.data).where(eq(categories.id, id))
  revalidatePath("/admin/categorias")
  revalidatePath("/")
  return { success: true }
}

export async function deleteCategory(id: string) {
  await db.delete(categories).where(eq(categories.id, id))
  revalidatePath("/admin/categorias")
  revalidatePath("/")
  return { success: true }
}
