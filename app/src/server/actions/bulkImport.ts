import { parse } from "fast-csv"
import { Readable } from "stream"
import { Pool } from "pg"
import { tryGetDatabaseUrl } from "@/db/database-url"
import { slugify } from "@/lib/slugify"
import { normalizeTiers, type PriceTier } from "@/lib/quantityPricing"

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
  attribute_2_name?: string
  attribute_2_value?: string
  attribute_3_name?: string
  attribute_3_value?: string
  qty_discounts?: string
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

/** Parse `10:1100|25:1000` → PriceTier[]. Empty string → null (leave tiers unchanged). */
export function parseQtyDiscounts(raw: string | undefined | null): PriceTier[] | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const tiers: PriceTier[] = []
  for (const part of trimmed.split("|")) {
    const piece = part.trim()
    if (!piece) continue
    const [minStr, priceStr] = piece.split(":")
    const minQty = parseInt(minStr?.trim() ?? "", 10)
    const unitPrice = parseFloat(priceStr?.trim() ?? "")
    if (!Number.isFinite(minQty) || minQty < 2 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error(`tramo inválido "${piece}" (formato min:precio, min>=2)`)
    }
    tiers.push({ minQty, unitPrice })
  }
  return normalizeTiers(tiers)
}

function buildAttributesFromRow(row: CsvRow): Record<string, string> {
  const attrs: Record<string, string> = {}
  const pairs: Array<[string | undefined, string | undefined]> = [
    [row.attribute_name, row.attribute_value],
    [row.attribute_2_name, row.attribute_2_value],
    [row.attribute_3_name, row.attribute_3_value],
  ]
  for (const [name, value] of pairs) {
    if (!name?.trim()) continue
    const slug = slugify(name.trim())
    if (slug && value?.trim()) {
      attrs[slug] = value.trim()
    }
  }
  return attrs
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

function validateAttrPair(
  line: number,
  label: string,
  name: string | undefined,
  value: string | undefined,
  allowedAttributeSlugs: Set<string>,
  allowedList: string,
  usedSlugs: Set<string>,
  errors: string[]
) {
  if (!name?.trim()) return
  const attrSlug = slugify(name.trim())
  if (!allowedAttributeSlugs.has(attrSlug)) {
    errors.push(
      `Fila ${line}: "${label}" '${name}' no es válido. Usá: ${allowedList || "(vacío)"}`
    )
  }
  if (!value?.trim()) {
    errors.push(`Fila ${line}: valor obligatorio cuando hay ${label}.`)
  }
  if (usedSlugs.has(attrSlug)) {
    errors.push(`Fila ${line}: atributo duplicado "${attrSlug}".`)
  }
  usedSlugs.add(attrSlug)
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

    const usedSlugs = new Set<string>()
    validateAttrPair(
      line, "attribute_name", row.attribute_name, row.attribute_value,
      allowedAttributeSlugs, allowedList, usedSlugs, errors
    )
    validateAttrPair(
      line, "attribute_2_name", row.attribute_2_name, row.attribute_2_value,
      allowedAttributeSlugs, allowedList, usedSlugs, errors
    )
    validateAttrPair(
      line, "attribute_3_name", row.attribute_3_name, row.attribute_3_value,
      allowedAttributeSlugs, allowedList, usedSlugs, errors
    )

    if (row.qty_discounts?.trim()) {
      try {
        const tiers = parseQtyDiscounts(row.qty_discounts)
        if (tiers) {
          const mins = tiers.map((t) => t.minQty)
          if (new Set(mins).size !== mins.length) {
            errors.push(`Fila ${line}: "qty_discounts" tiene cantidades mínimas duplicadas.`)
          }
          if (!isNaN(salePrice) && salePrice > 0) {
            for (const t of tiers) {
              if (t.unitPrice >= salePrice) {
                errors.push(
                  `Fila ${line}: tramo desde ${t.minQty} ($${t.unitPrice}) debe ser menor a sale_price ($${salePrice}).`
                )
              }
            }
          }
        }
      } catch (e) {
        errors.push(
          `Fila ${line}: "qty_discounts" inválido — ${e instanceof Error ? e.message : String(e)}`
        )
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
        attributes_json JSONB,
        price_tiers_json JSONB,
        imported_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await client.query(`
      ALTER TABLE stg_products_import
        ADD COLUMN IF NOT EXISTS supplier_slug TEXT,
        ADD COLUMN IF NOT EXISTS supplier_code TEXT,
        ADD COLUMN IF NOT EXISTS supplier_stock INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS attributes_json JSONB,
        ADD COLUMN IF NOT EXISTS price_tiers_json JSONB
    `)

    await client.query("DELETE FROM stg_products_import WHERE session_id = $1", [sessionId])

    const stagingValues: unknown[] = []
    const stagingPlaceholders = rows.map((row, i) => {
      const offset = i * 17
      let tiersJson: string | null = null
      if (row.qty_discounts != null && String(row.qty_discounts).trim() !== "") {
        const tiers = parseQtyDiscounts(row.qty_discounts) ?? []
        tiersJson = JSON.stringify(tiers.map((t) => ({
          min_qty: t.minQty,
          unit_price: t.unitPrice,
        })))
      } else if (row.qty_discounts != null && String(row.qty_discounts).trim() === "") {
        // Explicit empty → clear tiers
        tiersJson = "[]"
      }

      const attrs = buildAttributesFromRow(row)

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
        row.image_filename?.trim() || null,
        JSON.stringify(attrs),
        tiersJson
      )
      const base = offset + 1
      return `($${base},$${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12},$${base + 13},$${base + 14},$${base + 15}::jsonb,$${base + 16}::jsonb)`
    })

    await client.query(
      `INSERT INTO stg_products_import
        (session_id, handle, name, category_slug, description, cost_price, sale_price, sku, stock,
         supplier_slug, supplier_code, supplier_stock, attribute_name, attribute_value, image_filename,
         attributes_json, price_tiers_json)
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
      WITH sku_first AS (
        SELECT DISTINCT ON (p.id, s.sku)
          p.id AS product_id,
          s.sku,
          s.sale_price,
          COALESCE(s.attributes_json, '{}'::jsonb) AS attributes_json,
          (
            SELECT COALESCE(MAX(s2.stock), 0)
            FROM stg_products_import s2
            WHERE s2.session_id = $1 AND s2.sku = s.sku
          ) AS stock,
          s.id AS staging_id
        FROM stg_products_import s
        JOIN products p ON p.slug = s.handle
        WHERE s.session_id = $1
        ORDER BY p.id, s.sku, s.id
      ),
      ranked AS (
        SELECT
          *,
          ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY staging_id) - 1 AS sort_order
        FROM sku_first
      ),
      upserted AS (
        INSERT INTO product_variants (
          product_id, sku, stock, attributes, cost_price, sale_price, margin_percentage, sort_order
        )
        SELECT
          product_id,
          sku,
          stock,
          attributes_json,
          NULL,
          sale_price,
          NULL,
          sort_order
        FROM ranked
        ON CONFLICT (sku) DO UPDATE SET
          sale_price = EXCLUDED.sale_price,
          stock = GREATEST(product_variants.stock, EXCLUDED.stock),
          attributes = EXCLUDED.attributes,
          cost_price = NULL,
          sort_order = EXCLUDED.sort_order
        RETURNING id, (xmax = 0) AS was_inserted
      )
      SELECT
        COUNT(*) FILTER (WHERE was_inserted)::text AS inserted,
        COUNT(*) FILTER (WHERE NOT was_inserted)::text AS updated
      FROM upserted
    `, [sessionId])

    const variantsInserted = parseInt(varUpsert.rows[0]?.inserted ?? "0", 10)
    const variantsUpdated = parseInt(varUpsert.rows[0]?.updated ?? "0", 10)

    // Step D: sync price tiers for SKUs that have price_tiers_json set
    await client.query(`
      DELETE FROM product_variant_price_tiers pvpt
      USING product_variants pv, stg_products_import s
      WHERE pvpt.variant_id = pv.id
        AND pv.sku = s.sku
        AND s.session_id = $1
        AND s.price_tiers_json IS NOT NULL
    `, [sessionId])

    await client.query(`
      INSERT INTO product_variant_price_tiers (variant_id, min_qty, unit_price)
      SELECT DISTINCT ON (pv.id, (tier->>'min_qty')::int)
        pv.id,
        (tier->>'min_qty')::int,
        (tier->>'unit_price')::numeric
      FROM stg_products_import s
      JOIN product_variants pv ON pv.sku = s.sku
      CROSS JOIN LATERAL jsonb_array_elements(s.price_tiers_json) AS tier
      WHERE s.session_id = $1
        AND s.price_tiers_json IS NOT NULL
        AND jsonb_typeof(s.price_tiers_json) = 'array'
        AND jsonb_array_length(s.price_tiers_json) > 0
      ORDER BY pv.id, (tier->>'min_qty')::int, s.id
      ON CONFLICT (variant_id, min_qty) DO UPDATE SET
        unit_price = EXCLUDED.unit_price
    `, [sessionId])

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
