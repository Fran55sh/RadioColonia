"use server"

import { db } from "@/db"
import { suppliers } from "@/db/schema"
import { asc, eq } from "drizzle-orm"
import { supplierSchema } from "@/lib/validators"
import { formatZodError } from "@/lib/zodErrors"
import { revalidatePath } from "next/cache"

function parseSupplierForm(formData: FormData) {
  return {
    name:        formData.get("name") as string,
    slug:        formData.get("slug") as string,
    contactName: (formData.get("contactName") as string) || null,
    email:       (formData.get("email") as string) || null,
    phone:       (formData.get("phone") as string) || null,
    notes:       (formData.get("notes") as string) || null,
    isActive:    formData.get("isActive") === "true",
  }
}

export async function getActiveSuppliers() {
  return db
    .select()
    .from(suppliers)
    .where(eq(suppliers.isActive, true))
    .orderBy(asc(suppliers.name))
}

export async function getAllSuppliers() {
  return db.select().from(suppliers).orderBy(asc(suppliers.name))
}

export async function createSupplier(formData: FormData) {
  const parsed = supplierSchema.safeParse(parseSupplierForm(formData))
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  try {
    await db.insert(suppliers).values({
      ...parsed.data,
      email: parsed.data.email || null,
    })
  } catch {
    return { error: "No se pudo crear el proveedor. ¿El slug ya existe?" }
  }

  revalidatePath("/admin/proveedores")
  return { success: true }
}

export async function updateSupplier(id: string, formData: FormData) {
  const parsed = supplierSchema.safeParse(parseSupplierForm(formData))
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  try {
    await db
      .update(suppliers)
      .set({
        ...parsed.data,
        email:     parsed.data.email || null,
        updatedAt: new Date(),
      })
      .where(eq(suppliers.id, id))
  } catch {
    return { error: "No se pudo actualizar el proveedor. ¿El slug ya existe?" }
  }

  revalidatePath("/admin/proveedores")
  revalidatePath("/admin/productos")
  return { success: true }
}

export async function deleteSupplier(id: string) {
  const [row] = await db
    .select({ slug: suppliers.slug })
    .from(suppliers)
    .where(eq(suppliers.id, id))
    .limit(1)

  if (row?.slug === "sin-asignar") {
    return { error: "No se puede eliminar el proveedor por defecto del sistema." }
  }

  await db.delete(suppliers).where(eq(suppliers.id, id))
  revalidatePath("/admin/proveedores")
  revalidatePath("/admin/productos")
  return { success: true }
}
