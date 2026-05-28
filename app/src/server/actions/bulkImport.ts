import { parse } from "fast-csv"
import { Readable } from "stream"
import { Pool } from "pg"
import { tryGetDatabaseUrl } from "@/db/database-url"
import { slugify } from "@/lib/slugify"

export const REQUIRED_CSV_HEADERS = [
  "handle",
  "name",
  "sale_price",
  "sku",
  "supplier",
  "supplier_code",
] as const

export interface CsvRow {
  handle: string
  name: string
  category_slug: string
  description: string
  cost_price: string
  sale_price: string
  sku: string
  stock: string
  supplier: string
  supplier_code: string
  supplier_stock: string
  attribute_name: string
  attribute_value: string
  image_filename: string
}

export interface ImportResult {
  productsInserted: number
  variantsInserted: number
  variantsUpdated: number
  offersInserted: number
  offersUpdated: number
  skippedDuplicates: number
  errors: string[]
}

function stripUtf8Bom(buffer: Buffer): Buffer {
  return buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf
    ? buffer.subarray(3)
    : buffer
}

export async function parseCsvBuffer(buffer: Buffer): Promise<CsvRow[]> {
  const stripped = stripUtf8Bom(buffer)
  const firstLine = stripped.toString("utf8").split(/\r?\n/)[0] ?? ""
  const delimiter = firstLine.includes(";") ? ";" : ","

  return new Promise<CsvRow[]>((resolve, reject) => {
    const results: CsvRow[] = []
    let headersValidated = false

    const readable = Readable.from([stripped])
    readable
      .pipe(parse({ headers: true, trim: true, ignoreEmpty: true, delimiter }))
      .on("headers", (headers: string[]) => {
        const missing = REQUIRED_CSV_HEADERS.filter((h) => !headers.includes(h))
        if (missing.length > 0) {
          reject(
            new Error(
              `El CSV no tiene las columnas requeridas: ${missing.join(", ")}. ` +
                `Columnas detectadas: ${headers.join(", ")}.`
            )
          )
        } else {
          headersValidated = true
        }
      })
      .on("data", (row: CsvRow) => {
        if (headersValidated) results.push(row)
      })
      .on("error", reject)
      .on("end", () => resolve(results))
  })
}

export function validateRows(rows: CsvRow[], allowedAttributeSlugs: Set<string>): string[] {
  const errors: string[] = []
  const seenSupplierCodes = new Set<string>()
  const skuSalePrices = new Map<string, number>()
  const allowedList = Array.from(allowedAttributeSlugs).sort().join(", ")

  rows.forEach((row, i) => {
    const line = i + 2

    if (!row.handle?.trim()) errors.push(`Fila ${line}: "handle" es obligatorio.`)
    if (!row.name?.trim()) errors.push(`Fila ${line}: "name" es obligatorio.`)
    if (!row.sku?.trim()) errors.push(`Fila ${line}: "sku" es obligatorio.`)
    if (!row.sale_price?.trim()) errors.push(`Fila ${line}: "sale_price" es obligatorio.`)
    if (!row.supplier?.trim()) errors.push(`Fila ${line}: "supplier" (slug del proveedor) es obligatorio.`)
    if (!row.supplier_code?.trim()) {
      errors.push(`Fila ${line}: "supplier_code" (código interno) es obligatorio.`)
    }

    const salePrice = parseFloat(row.sale_price)
    const costPrice = row.cost_price?.trim() ? parseFloat(row.cost_price) : NaN

    if (isNaN(salePrice) || salePrice <= 0) {
      errors.push(`Fila ${line}: "sale_price" debe ser un número mayor a 0.`)
    } else {
      const sku = row.sku?.trim()
      if (sku) {
        const prev = skuSalePrices.get(sku)
        if (prev !== undefined && Math.abs(prev - salePrice) > 0.01) {
          errors.push(
            `Fila ${line}: el SKU "${sku}" tiene distinto sale_price (${salePrice}) que otra fila (${prev}).`
          )
        } else {
          skuSalePrices.set(sku, salePrice)
        }
      }
    }

    if (!isNaN(costPrice) && costPrice > 0 && !isNaN(salePrice) && costPrice >= salePrice) {
      errors.push(
        `Fila ${line} (SKU: ${row.sku}): "sale_price" debe ser mayor que "cost_price".`
      )
    }

    if (row.attribute_name?.trim()) {
      const attrSlug = slugify(row.attribute_name.trim())
      if (!allowedAttributeSlugs.has(attrSlug)) {
        errors.push(
          `Fila ${line}: "attribute_name" '${row.attribute_name}' no es válido. Usá: ${allowedList || "(vacío)"}`
        )
      }
      if (!row.attribute_value?.trim()) {
        errors.push(`Fila ${line}: "attribute_value" es obligatorio cuando hay attribute_name.`)
      }
    }

    const supplierKey = `${row.supplier?.trim()}::${row.supplier_code?.trim()}`
    if (row.supplier?.trim() && row.supplier_code?.trim()) {
      if (seenSupplierCodes.has(supplierKey)) {
        errors.push(
          `Fila ${line}: código de proveedor duplicado en el CSV (${row.supplier} / ${row.supplier_code}).`
        )
      }
      seenSupplierCodes.add(supplierKey)
    }
  })

  return errors
}

export async function runBulkImportTransaction(
  rows: CsvRow[],
  sessionId: string
): Promise<{
  productsInserted: number
  variantsInserted: number
  variantsUpdated: number
  offersInserted: number
  offersUpdated: number
  skippedDuplicates: number
}> {
  const pool = new Pool({ connectionString: tryGetDatabaseUrl() })
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

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
        supplier_slug   TEXT,
        supplier_code   TEXT,
        supplier_stock  INTEGER DEFAULT 0,
        attribute_name  TEXT,
        attribute_value TEXT,
        image_filename  TEXT,
        imported_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await client.query(`
      ALTER TABLE stg_products_import
        ADD COLUMN IF NOT EXISTS supplier_slug TEXT,
        ADD COLUMN IF NOT EXISTS supplier_code TEXT,
        ADD COLUMN IF NOT EXISTS supplier_stock INTEGER DEFAULT 0
    `)

    await client.query("DELETE FROM stg_products_import WHERE session_id = $1", [sessionId])

    const stagingValues: unknown[] = []
    const stagingPlaceholders = rows.map((row, i) => {
      const offset = i * 15
      stagingValues.push(
        sessionId,
        row.handle.trim(),
        row.name.trim(),
        row.category_slug?.trim() || null,
        row.description?.trim() || null,
        row.cost_price?.trim() ? parseFloat(row.cost_price) : null,
        parseFloat(row.sale_price),
        row.sku.trim(),
        parseInt(row.stock, 10) || 0,
        row.supplier.trim(),
        row.supplier_code.trim(),
        parseInt(row.supplier_stock, 10) || parseInt(row.stock, 10) || 0,
        row.attribute_name?.trim() || null,
        row.attribute_value?.trim() || null,
        row.image_filename?.trim() || null
      )
      const base = offset + 1
      return `($${base},$${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13},$${base + 14})`
    })

    await client.query(
      `INSERT INTO stg_products_import
        (session_id, handle, name, category_slug, description, cost_price, sale_price, sku, stock,
         supplier_slug, supplier_code, supplier_stock, attribute_name, attribute_value, image_filename)
       VALUES ${stagingPlaceholders.join(",")}`,
      stagingValues
    )

    const prodResult = await client.query<{ count: string }>(`
      WITH inserted AS (
        INSERT INTO products (slug, name, description, price, original_price, image, category_id, stock)
        SELECT DISTINCT ON (s.handle)
          s.handle,
          s.name,
          COALESCE(s.description, ''),
          s.sale_price,
          NULL,
          '/products/' || COALESCE(s.image_filename, 'placeholder.png'),
          c.id,
          (
            SELECT COALESCE(MAX(s2.stock), 0)
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

    const varUpsert = await client.query<{ inserted: string; updated: string }>(`
      WITH upserted AS (
        INSERT INTO product_variants (product_id, sku, stock, attributes, cost_price, sale_price, margin_percentage)
        SELECT DISTINCT ON (s.sku)
          p.id,
          s.sku,
          (
            SELECT COALESCE(MAX(s2.stock), 0)
            FROM stg_products_import s2
            WHERE s2.session_id = $1 AND s2.sku = s.sku
          ),
          CASE
            WHEN s.attribute_name IS NOT NULL AND trim(s.attribute_name) <> ''
            THEN jsonb_build_object(
              lower(regexp_replace(trim(s.attribute_name), '\\s+', '-', 'g')),
              trim(s.attribute_value)
            )
            ELSE '{}'::jsonb
          END,
          NULL,
          s.sale_price,
          NULL
        FROM stg_products_import s
        JOIN products p ON p.slug = s.handle
        WHERE s.session_id = $1
        ORDER BY s.sku, s.id
        ON CONFLICT (sku) DO UPDATE SET
          sale_price = EXCLUDED.sale_price,
          stock = GREATEST(product_variants.stock, EXCLUDED.stock),
          attributes = EXCLUDED.attributes,
          cost_price = NULL
        RETURNING id, (xmax = 0) AS was_inserted
      )
      SELECT
        COUNT(*) FILTER (WHERE was_inserted)::text AS inserted,
        COUNT(*) FILTER (WHERE NOT was_inserted)::text AS updated
      FROM upserted
    `, [sessionId])

    const variantsInserted = parseInt(varUpsert.rows[0]?.inserted ?? "0", 10)
    const variantsUpdated = parseInt(varUpsert.rows[0]?.updated ?? "0", 10)

    const offerUpsert = await client.query<{ inserted: string; updated: string }>(`
      WITH upserted AS (
        INSERT INTO product_supplier_offers (
          variant_id, supplier_id, supplier_code, cost_price, stock, is_preferred, last_cost_update
        )
        SELECT
          pv.id,
          sup.id,
          s.supplier_code,
          s.cost_price,
          s.supplier_stock,
          FALSE,
          CASE WHEN s.cost_price IS NOT NULL THEN NOW() ELSE NULL END
        FROM stg_products_import s
        JOIN products p ON p.slug = s.handle
        JOIN product_variants pv ON pv.sku = s.sku
        JOIN suppliers sup ON sup.slug = s.supplier_slug
        WHERE s.session_id = $1
        ON CONFLICT (supplier_id, supplier_code) DO UPDATE SET
          variant_id = EXCLUDED.variant_id,
          cost_price = EXCLUDED.cost_price,
          stock = EXCLUDED.stock,
          last_cost_update = CASE
            WHEN EXCLUDED.cost_price IS NOT NULL THEN NOW()
            ELSE product_supplier_offers.last_cost_update
          END,
          updated_at = NOW()
        RETURNING id, (xmax = 0) AS was_inserted
      )
      SELECT
        COUNT(*) FILTER (WHERE was_inserted)::text AS inserted,
        COUNT(*) FILTER (WHERE NOT was_inserted)::text AS updated
      FROM upserted
    `, [sessionId])

    const offersInserted = parseInt(offerUpsert.rows[0]?.inserted ?? "0", 10)
    const offersUpdated = parseInt(offerUpsert.rows[0]?.updated ?? "0", 10)

    const skippedDuplicates = Math.max(0, rows.length - offersInserted - offersUpdated)

    await client.query("COMMIT")

    return {
      productsInserted,
      variantsInserted,
      variantsUpdated,
      offersInserted,
      offersUpdated,
      skippedDuplicates,
    }
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}
