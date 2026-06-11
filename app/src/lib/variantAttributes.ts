import { db } from "@/db"
import { globalAttributes } from "@/db/schema"
import { slugify } from "@/lib/slugify"
import { unstable_cache } from "next/cache"

export type ValidateResult =
  | { ok: true; normalized: Record<string, string> }
  | { ok: false; errors: string[] }

const getAllowedSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const rows = await db.select({ slug: globalAttributes.slug }).from(globalAttributes)
    return rows.map((r) => r.slug)
  },
  ["global-attribute-slugs"],
  { revalidate: 60 }
)

export async function getGlobalAttributeSlugMap(): Promise<Map<string, string>> {
  const rows = await db
    .select({ slug: globalAttributes.slug, name: globalAttributes.name })
    .from(globalAttributes)
  return new Map(rows.map((r) => [r.slug, r.name]))
}

/**
 * Validates that every key in attributes matches a global attribute slug.
 * Values are free-text per product. Keys are normalized to canonical slugs.
 */
export async function validateVariantAttributes(
  attributes: Record<string, string>
): Promise<ValidateResult> {
  const allowed = new Set(await getAllowedSlugs())
  const allowedList = Array.from(allowed).sort().join(", ")

  if (Object.keys(attributes).length === 0) {
    return { ok: true, normalized: {} }
  }

  const errors: string[] = []
  const normalized: Record<string, string> = {}
  const seenKeys = new Set<string>()

  for (const [rawKey, rawValue] of Object.entries(attributes)) {
    const key = slugify(rawKey.trim())
    const value = rawValue.trim()

    if (!key) {
      errors.push("Hay un atributo con nombre vacío.")
      continue
    }

    if (seenKeys.has(key)) {
      errors.push(`El atributo '${key}' está duplicado.`)
      continue
    }
    seenKeys.add(key)

    if (!allowed.has(key)) {
      errors.push(
        `El atributo '${rawKey.trim()}' no es un atributo global válido. Usá uno de: ${allowedList || "(ninguno definido)"}`
      )
      continue
    }

    if (!value) {
      errors.push(`El valor de '${key}' no puede estar vacío.`)
      continue
    }

    normalized[key] = value
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, normalized }
}

export async function resolveAttributeSlug(
  attributeNameOrSlug: string
): Promise<string | null> {
  const trimmed = attributeNameOrSlug.trim()
  if (!trimmed) return null

  const rows = await db
    .select({ slug: globalAttributes.slug, name: globalAttributes.name })
    .from(globalAttributes)

  const bySlug = rows.find((r) => r.slug === slugify(trimmed))
  if (bySlug) return bySlug.slug

  const lower = trimmed.toLowerCase()
  const byName = rows.find((r) => r.name.toLowerCase() === lower)
  if (byName) return byName.slug

  return null
}
