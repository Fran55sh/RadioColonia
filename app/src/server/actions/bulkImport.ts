
import { Pool } from "pg"
import { tryGetDatabaseUrl } from "@/db/database-url"
import { slugify } from "@/lib/slugify"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CsvRow {
  handle: string
  name: string
  category_slug: string
  description: string
  cost_price: string
  sale_price: string
  sku: string
  stock: string
  attribute_name: string
  attribute_value: string
  image_filename: string
}

export interface ImportResult {
  productsInserted: number
  variantsInserted: number
  skippedDuplicates: number
  errors: string[]
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateRows(rows: CsvRow[], allowedAttributeSlugs: Set<string>): string[] {
  const errors: string[] = []
  const seenSkus = new Set<string>()
  const allowedList = Array.from(allowedAttributeSlugs).sort().join(", ")

  rows.forEach((row, i) => {
    const line = i + 2 // +2: 1-indexed + header row

    if (!row.handle?.trim())    errors.push(`Fila ${line}: "handle" es obligatorio.`)
    if (!row.name?.trim())      errors.push(`Fila ${line}: "name" es obligatorio.`)
    if (!row.sku?.trim())       errors.push(`Fila ${line}: "sku" es obligatorio.`)
    if (!row.sale_price?.trim()) errors.push(`Fila ${line}: "sale_price" es obligatorio.`)

    const salePrice = parseFloat(row.sale_price)
    const costPrice = parseFloat(row.cost_price)

    if (isNaN(salePrice) || salePrice <= 0) {
      errors.push(`Fila ${line}: "sale_price" debe ser un número mayor a 0.`)
    } else if (!isNaN(costPrice) && costPrice >= salePrice) {
      errors.push(`Fila ${line} (SKU: ${row.sku}): "sale_price" (${salePrice}) debe ser mayor que "cost_price" (${costPrice}).`)
    }

    if (row.attribute_name?.trim()) {
      const attrSlug = slugify(row.attribute_name.trim())
      if (!allowedAttributeSlugs.has(attrSlug)) {
        errors.push(
          `Fila ${line}: "attribute_name" '${row.attribute_name}' no es válido. Usá un slug del catálogo: ${allowedList || "(vacío)"}`
        )
      }
      if (!row.attribute_value?.trim()) {
        errors.push(`Fila ${line}: "attribute_value" es obligatorio cuando hay attribute_name.`)
      }
    }

    if (row.sku?.trim()) {
      const sku = row.sku.trim()
      if (seenSkus.has(sku)) {
        errors.push(`Fila ${line}: SKU duplicado en el CSV: "${sku}".`)
      }
      seenSkus.add(sku)
    }
  })

  return errors
}

// ── Database transaction ───────────────────────────────────────────────────────

export async function runBulkImportTransaction(
  rows: CsvRow[],
  sessionId: string
): Promise<{ productsInserted: number; variantsInserted: number; skippedDuplicates: number }> {
  const pool = new Pool({ connectionString: tryGetDatabaseUrl() })
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // Ensure staging table exists (idempotent)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stg_products_import (
        id              SERIAL PRIMARY KEY,
        session_id      TEXT NOT NULL,
        handle          TEXT NOT NULL,
        name            TEXT NOT NULL,
        category_slug   TEXT,
        description     TEXT,
        cost_price      NUMERIC(10, 2),
        sale_price      NUMERIC(10, 2),
        sku             TEXT NOT NULL,
        stock           INTEGER DEFAULT 0,
        attribute_name  TEXT,
        attribute_value TEXT,
        image_filename  TEXT,
        imported_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Clear previous data for this session
    await client.query("DELETE FROM stg_products_import WHERE session_id = $1", [sessionId])

    // Bulk-insert rows into staging table
    const stagingValues: unknown[] = []
    const stagingPlaceholders = rows.map((row, i) => {
      const offset = i * 12
      stagingValues.push(
        sessionId,
        row.handle.trim(),
        row.name.trim(),
        row.category_slug?.trim() || null,
        row.description?.trim() || null,
        row.cost_price ? parseFloat(row.cost_price) : null,
        parseFloat(row.sale_price),
        row.sku.trim(),
        parseInt(row.stock, 10) || 0,
        row.attribute_name?.trim() || null,
        row.attribute_value?.trim() || null,
        row.image_filename?.trim() || null,
      )
      const base = offset + 1
      return `($${base},$${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11})`
    })

    await client.query(
      `INSERT INTO stg_products_import
        (session_id, handle, name, category_slug, description, cost_price, sale_price, sku, stock, attribute_name, attribute_value, image_filename)
       VALUES ${stagingPlaceholders.join(",")}`,
      stagingValues
    )

    // Count total rows for this session (to calculate skipped later)
    const totalRows = rows.length

    // Step 1: insert products (ON CONFLICT DO NOTHING on slug)
    const prodResult = await client.query<{ count: string }>(`
      WITH inserted AS (
        INSERT INTO products (slug, name, description, price, original_price, image, category_id, stock)
        SELECT DISTINCT ON (s.handle)
          s.handle,
          s.name,
          COALESCE(s.description, ''),
          s.sale_price,
          s.cost_price,
          '/products/' || COALESCE(s.image_filename, 'placeholder.png'),
          c.id,
          (
            SELECT COALESCE(SUM(s2.stock), 0)
            FROM stg_products_import s2
            WHERE s2.session_id = $1 AND s2.handle = s.handle
          )
        FROM stg_products_import s
        LEFT JOIN categories c ON c.slug = s.category_slug
        WHERE s.session_id = $1
        ORDER BY s.handle, s.id
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
      )
      SELECT COUNT(*)::text AS count FROM inserted
    `, [sessionId])

    const productsInserted = parseInt(prodResult.rows[0]?.count ?? "0", 10)

    // Ensure product_variants table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sku               TEXT NOT NULL,
        stock             INTEGER NOT NULL DEFAULT 0,
        attributes        JSONB NOT NULL DEFAULT '{}',
        cost_price        NUMERIC(10, 2),
        sale_price        NUMERIC(10, 2),
        margin_percentage NUMERIC(5, 2),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_idx ON product_variants (sku)
    `)

    // Step 2: insert variants linked to inserted/existing products
    const varResult = await client.query<{ count: string }>(`
      WITH inserted AS (
        INSERT INTO product_variants (product_id, sku, stock, attributes, cost_price, sale_price, margin_percentage)
        SELECT
          p.id,
          s.sku,
          s.stock,
          CASE
            WHEN s.attribute_name IS NOT NULL AND trim(s.attribute_name) <> ''
            THEN jsonb_build_object(
              lower(regexp_replace(trim(s.attribute_name), '\s+', '-', 'g')),
              trim(s.attribute_value)
            )
            ELSE '{}'::jsonb
          END,
          s.cost_price,
          s.sale_price,
          CASE
            WHEN s.sale_price IS NOT NULL AND s.sale_price > 0 AND s.cost_price IS NOT NULL
            THEN ROUND(((s.sale_price - s.cost_price) / s.sale_price) * 100, 2)
            ELSE NULL
          END
        FROM stg_products_import s
        JOIN products p ON p.slug = s.handle
        WHERE s.session_id = $1
        ON CONFLICT (sku) DO NOTHING
        RETURNING id
      )
      SELECT COUNT(*)::text AS count FROM inserted
    `, [sessionId])

    const variantsInserted = parseInt(varResult.rows[0]?.count ?? "0", 10)
    const skippedDuplicates = totalRows - variantsInserted

    await client.query("COMMIT")

    return { productsInserted, variantsInserted, skippedDuplicates }
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}
