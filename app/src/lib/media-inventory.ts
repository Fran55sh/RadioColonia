import { existsSync } from "fs"
import { readdir, stat } from "fs/promises"
import path from "path"
import { db } from "@/db"
import { products } from "@/db/schema"

export const UPLOAD_PRODUCTS_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "products"
)

export const UPLOAD_URL_PREFIX = "/uploads/products/"

/** UUID v4 + .webp (mismo formato que /api/upload) */
export const UPLOAD_PRODUCT_FILENAME_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i

export type MediaFileStatus = "assigned" | "orphan"

export interface MediaProductRef {
  id: string
  name: string
  isActive: boolean
}

export interface MediaFileEntry {
  filename: string
  url: string
  sizeBytes: number
  modifiedAt: string
  status: MediaFileStatus
  products: MediaProductRef[]
}

export interface BrokenLinkEntry {
  productId: string
  productName: string
  imageUrl: string
  isActive: boolean
}

export interface MediaInventorySummary {
  totalFiles: number
  assigned: number
  orphans: number
  brokenLinks: number
  productsStaticOrPlaceholder: number
}

export interface MediaInventory {
  files: MediaFileEntry[]
  brokenLinks: BrokenLinkEntry[]
  summary: MediaInventorySummary
}

export function normalizeImageUrl(url: string): string {
  const trimmed = url.trim()
  const qIndex = trimmed.indexOf("?")
  return qIndex >= 0 ? trimmed.slice(0, qIndex) : trimmed
}

export function isUploadProductUrl(url: string): boolean {
  return normalizeImageUrl(url).startsWith(UPLOAD_URL_PREFIX)
}

export function publicUrlForUploadFilename(filename: string): string {
  return `${UPLOAD_URL_PREFIX}${filename}`
}

export async function buildMediaInventory(): Promise<MediaInventory> {
  const fileMap = new Map<string, { sizeBytes: number; modifiedAt: Date }>()

  if (existsSync(UPLOAD_PRODUCTS_DIR)) {
    const names = await readdir(UPLOAD_PRODUCTS_DIR)
    for (const name of names) {
      const fullPath = path.join(UPLOAD_PRODUCTS_DIR, name)
      try {
        const st = await stat(fullPath)
        if (st.isFile()) {
          fileMap.set(name, { sizeBytes: st.size, modifiedAt: st.mtime })
        }
      } catch {
        // omitir entradas ilegibles
      }
    }
  }

  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      isActive: products.isActive,
    })
    .from(products)

  const productsByImage = new Map<string, MediaProductRef[]>()
  let productsStaticOrPlaceholder = 0

  for (const p of allProducts) {
    const normalized = normalizeImageUrl(p.image)
    if (!isUploadProductUrl(normalized)) {
      productsStaticOrPlaceholder++
      continue
    }
    const list = productsByImage.get(normalized) ?? []
    list.push({ id: p.id, name: p.name, isActive: p.isActive })
    productsByImage.set(normalized, list)
  }

  const files: MediaFileEntry[] = []
  for (const [filename, meta] of fileMap) {
    const url = publicUrlForUploadFilename(filename)
    const refs = productsByImage.get(url) ?? []
    files.push({
      filename,
      url,
      sizeBytes: meta.sizeBytes,
      modifiedAt: meta.modifiedAt.toISOString(),
      status: refs.length > 0 ? "assigned" : "orphan",
      products: refs,
    })
  }

  files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))

  const fileNamesSet = new Set(fileMap.keys())
  const brokenLinks: BrokenLinkEntry[] = []

  for (const p of allProducts) {
    const normalized = normalizeImageUrl(p.image)
    if (!isUploadProductUrl(normalized)) continue
    const filename = normalized.slice(UPLOAD_URL_PREFIX.length)
    if (!fileNamesSet.has(filename)) {
      brokenLinks.push({
        productId: p.id,
        productName: p.name,
        imageUrl: p.image,
        isActive: p.isActive,
      })
    }
  }

  brokenLinks.sort((a, b) => a.productName.localeCompare(b.productName, "es"))

  const assigned = files.filter((f) => f.status === "assigned").length
  const orphans = files.filter((f) => f.status === "orphan").length

  return {
    files,
    brokenLinks,
    summary: {
      totalFiles: files.length,
      assigned,
      orphans,
      brokenLinks: brokenLinks.length,
      productsStaticOrPlaceholder,
    },
  }
}
