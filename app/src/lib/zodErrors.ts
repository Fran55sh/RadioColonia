import type { ZodError, ZodIssue } from "zod"

const FIELD_LABELS: Record<string, string> = {
  name:          "Nombre",
  description:   "Descripción",
  price:         "Precio",
  originalPrice: "Precio original",
  image:         "Imagen",
  badge:         "Badge",
  stock:         "Stock",
  rating:        "Rating",
  reviews:       "Reviews",
  categoryId:    "Categoría",
  isActive:      "Estado activo",
  slug:          "Slug",
  iconName:      "Ícono",
  sortOrder:     "Orden",
  parentId:      "Categoría padre",
  sku:           "SKU",
  costPrice:     "Precio de costo",
  salePrice:     "Precio de venta",
  attributes:    "Atributos",
  email:         "Email",
  password:      "Contraseña",
  confirm:       "Confirmar contraseña",
  fullName:      "Nombre completo",
  phone:         "Teléfono",
  street:        "Dirección",
  city:          "Ciudad",
  province:      "Provincia",
  zip:           "Código postal",
  country:       "País",
  preferredContactChannel: "Canal de contacto",
  contact:       "Contacto",
  orderId:       "Pedido",
}

function labelForPath(path: PropertyKey[]): string {
  const parts: string[] = []

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]

    if (typeof segment === "number") {
      parts.push(`Variante ${segment + 1}`)
      continue
    }

    const key = String(segment)
    parts.push(FIELD_LABELS[key] ?? key)
  }

  return parts.join(" › ")
}

function defaultMessageInSpanish(issue: ZodIssue): string {
  const custom = issue.message
  if (
    custom &&
    !custom.startsWith("Too small:") &&
    !custom.startsWith("Too big:") &&
    !custom.startsWith("Invalid")
  ) {
    return custom
  }

  const issueRecord = issue as ZodIssue & {
    origin?: string
    minimum?: number
    maximum?: number
    inclusive?: boolean
    format?: string
    expected?: string
    received?: string
  }

  switch (issue.code) {
    case "too_small":
      if (issueRecord.origin === "number" && issueRecord.minimum != null) {
        const cmp = issueRecord.inclusive ? ">=" : ">"
        return `Debe ser un número ${cmp} ${issueRecord.minimum}`
      }
      if (issueRecord.origin === "string" && issueRecord.minimum != null) {
        return `Debe tener al menos ${issueRecord.minimum} caracteres`
      }
      break
    case "too_big":
      if (issueRecord.origin === "number" && issueRecord.maximum != null) {
        const cmp = issueRecord.inclusive ? "<=" : "<"
        return `Debe ser un número ${cmp} ${issueRecord.maximum}`
      }
      if (issueRecord.origin === "string" && issueRecord.maximum != null) {
        return `Debe tener como máximo ${issueRecord.maximum} caracteres`
      }
      break
    case "invalid_format":
      if (issueRecord.format === "uuid") return "Debe ser un identificador válido (UUID)"
      if (issueRecord.format === "email") return "Email inválido"
      break
    case "invalid_type":
      if (issueRecord.expected && issueRecord.received) {
        return `Tipo inválido: se esperaba ${issueRecord.expected}, se recibió ${issueRecord.received}`
      }
      break
  }

  return custom
}

/** Primer error con nombre de campo en español. */
export function formatZodError(error: ZodError): string {
  const issue = error.issues[0]
  const field = labelForPath(issue.path)
  const message = defaultMessageInSpanish(issue)

  if (!field) return message
  if (message.toLowerCase().startsWith(field.toLowerCase())) return message
  return `${field}: ${message}`
}

/** Todos los errores con nombre de campo en español. */
export function formatZodErrors(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const field = labelForPath(issue.path)
    const message = defaultMessageInSpanish(issue)
    if (!field) return message
    if (message.toLowerCase().startsWith(field.toLowerCase())) return message
    return `${field}: ${message}`
  })
}
