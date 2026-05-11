import { z } from "zod"

export const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
})

export const registerSchema = z.object({
  name:     z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email:    z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  confirm:  z.string(),
}).refine((d) => d.password === d.confirm, {
  message: "Las contraseñas no coinciden",
  path:    ["confirm"],
})

export const addressSchema = z.object({
  fullName: z.string().min(2, "Ingresá tu nombre completo"),
  phone:    z.string().min(8, "Teléfono inválido"),
  street:   z.string().min(4, "Ingresá la dirección completa"),
  city:     z.string().min(2, "Ingresá la ciudad"),
  province: z.string().min(2, "Ingresá la provincia"),
  zip:      z.string().min(4, "Código postal inválido"),
  country:  z.string().min(2).default("Argentina"),
})

export const productSchema = z.object({
  name:          z.string().min(2, "Nombre requerido"),
  description:   z.string().min(10, "Descripción muy corta"),
  price:         z.coerce.number().positive("Precio inválido"),
  originalPrice: z.coerce.number().positive().optional().nullable(),
  image:         z.string().min(1, "Imagen requerida"),
  badge:         z.string().optional().nullable(),
  stock:         z.coerce.number().int().min(0, "Stock inválido"),
  rating:        z.coerce.number().min(0).max(5).default(0),
  reviews:       z.coerce.number().int().min(0).default(0),
  categoryId:    z.string().uuid("Categoría inválida").optional().nullable(),
  isActive:      z.boolean().default(true),
})

export const categorySchema = z.object({
  name:      z.string().min(2, "Nombre requerido"),
  slug:      z.string().min(2).regex(/^[a-z0-9-]+$/, "Solo letras, números y guiones"),
  iconName:  z.string().min(1, "Ícono requerido").default("Tag"),
  sortOrder: z.coerce.number().int().min(0).default(0),
})

export type LoginInput    = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type AddressInput  = z.infer<typeof addressSchema>
export type ProductInput  = z.infer<typeof productSchema>
export type CategoryInput = z.infer<typeof categorySchema>
