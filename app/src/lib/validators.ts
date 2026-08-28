import { z } from "zod"

/** Vacío, null o 0 se interpretan como "sin precio". */
const optionalPositivePrice = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return null
    const n = Number(v)
    if (!Number.isNaN(n) && n === 0) return null
    return v
  },
  z.coerce
    .number({ message: "Debe ser un número válido" })
    .positive("Debe ser mayor a 0")
    .nullable()
    .optional()
)

const emptyToNull = (v: unknown) => (v === "" ? null : v)

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
  country:  z.string().min(2, "País inválido").default("Argentina"),
})

/** Checkout retiro en local: contacto obligatorio + canal preferido. */
export const checkoutContactSchema = z.object({
  fullName:                z.string().min(2, "Ingresá tu nombre completo"),
  phone:                   z.string().min(8, "Teléfono inválido"),
  email:                   z.string().email("Email inválido"),
  preferredContactChannel: z.enum(["whatsapp", "email"], {
    message: "Elegí un canal de contacto",
  }),
})

export type CheckoutContactInput = z.infer<typeof checkoutContactSchema>

export const productSchema = z.object({
  name:          z.string().min(2, "Nombre requerido"),
  description:   z.string().min(10, "Descripción muy corta"),
  price:         z.coerce.number({ message: "Precio inválido" }).positive("El precio debe ser mayor a 0"),
  originalPrice: optionalPositivePrice,
  image:         z.string().min(1, "Imagen requerida"),
  badge:         z.string().optional().nullable(),
  stock:         z.coerce.number({ message: "Stock inválido" }).int().min(0, "El stock no puede ser negativo"),
  rating:        z.coerce.number().min(0, "El rating no puede ser negativo").max(5, "El rating no puede superar 5").default(0),
  reviews:       z.coerce.number().int().min(0, "Las reviews no pueden ser negativas").default(0),
  categoryId:    z.preprocess(
    emptyToNull,
    z.string().uuid("Seleccioná una categoría válida").nullable().optional()
  ),
  isActive:      z.boolean().default(true),
})

export const categorySchema = z.object({
  name:      z.string().min(2, "Nombre requerido"),
  slug:      z.string().min(2, "El slug debe tener al menos 2 caracteres").regex(/^[a-z0-9-]+$/, "Solo letras, números y guiones"),
  iconName:  z.string().min(1, "Ícono requerido").default("Tag"),
  sortOrder: z.coerce.number().int().min(0, "El orden no puede ser negativo").default(0),
  parentId:  z.preprocess(
    emptyToNull,
    z.string().uuid("Categoría padre inválida").nullable().optional()
  ),
})

export const globalAttributeSchema = z.object({
  name:      z.string().min(2, "Nombre requerido"),
  slug:      z.string().min(2, "El slug debe tener al menos 2 caracteres").regex(/^[a-z0-9-]+$/, "Solo letras, números y guiones"),
  sortOrder: z.coerce.number().int().min(0, "El orden no puede ser negativo").default(0),
})

export const supplierSchema = z.object({
  name:        z.string().min(2, "Nombre requerido"),
  slug:        z.string().min(2, "El slug debe tener al menos 2 caracteres").regex(/^[a-z0-9-]+$/, "Solo letras, números y guiones"),
  contactName: z.string().optional().nullable(),
  email:       z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  phone:       z.string().optional().nullable(),
  notes:       z.string().optional().nullable(),
  isActive:    z.boolean().default(true),
})

export const supplierOfferSchema = z.object({
  id:           z.string().uuid().optional(),
  supplierId:   z.string().uuid("Seleccioná un proveedor"),
  supplierCode: z.string().min(1, "Código del proveedor requerido"),
  costPrice:    optionalPositivePrice,
  stock:        z.coerce.number({ message: "Stock inválido" }).int().min(0, "El stock no puede ser negativo").default(0),
  isPreferred:  z.boolean().default(false),
})

/** Vincular código interno de proveedor a un SKU vendible ya existente. */
export const linkSupplierCodeSchema = z.object({
  parentSku:      z.string().min(1, "SKU vendible requerido"),
  supplierId:     z.string().uuid("Seleccioná un proveedor"),
  supplierCode:   z.string().min(1, "Código del proveedor requerido"),
  costPrice:      optionalPositivePrice,
  supplierStock:  z.coerce.number().int().min(0, "El stock no puede ser negativo").default(0),
  addToSaleStock: z.boolean().default(true),
  isPreferred:    z.boolean().default(false),
})

export const priceTierSchema = z.object({
  id:        z.string().uuid().optional(),
  minQty:    z.coerce.number({ message: "Cantidad inválida" }).int().min(2, "La cantidad mínima del tramo debe ser al menos 2"),
  unitPrice: z.coerce.number({ message: "Precio inválido" }).positive("El precio unitario debe ser mayor a 0"),
})

export const productVariantSchema = z.object({
  id:         z.string().uuid().optional(),
  sku:        z.string().min(1, "SKU requerido"),
  stock:      z.coerce.number({ message: "Stock inválido" }).int().min(0, "El stock no puede ser negativo"),
  costPrice:  optionalPositivePrice,
  salePrice:  optionalPositivePrice,
  attributes: z.record(z.string(), z.string()),
  supplierOffers: z.array(supplierOfferSchema).optional().default([]),
  priceTiers: z.array(priceTierSchema).optional().default([]),
}).superRefine((data, ctx) => {
  const tiers = data.priceTiers ?? []
  const minQtys = tiers.map((t) => t.minQty)
  if (new Set(minQtys).size !== minQtys.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "No puede haber dos tramos con la misma cantidad mínima",
      path: ["priceTiers"],
    })
  }
})

export type LoginInput           = z.infer<typeof loginSchema>
export type RegisterInput        = z.infer<typeof registerSchema>
export type AddressInput         = z.infer<typeof addressSchema>
export type ProductInput         = z.infer<typeof productSchema>
export type CategoryInput        = z.infer<typeof categorySchema>
export type GlobalAttributeInput = z.infer<typeof globalAttributeSchema>
export type SupplierInput        = z.infer<typeof supplierSchema>
export type SupplierOfferInput   = z.infer<typeof supplierOfferSchema>
export type LinkSupplierCodeInput = z.infer<typeof linkSupplierCodeSchema>
export type PriceTierInput       = z.infer<typeof priceTierSchema>
export type ProductVariantInput  = z.infer<typeof productVariantSchema>
