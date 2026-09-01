import { Pool } from "pg"
import { getDatabaseUrl } from "./database-url"
import { loadEnvFiles } from "./load-env"

loadEnvFiles()

let pool: Pool
try {
  pool = new Pool({ connectionString: getDatabaseUrl() })
} catch (e) {
  console.error("❌", e instanceof Error ? e.message : e)
  process.exit(1)
}

/**
 * Validates that all tables/columns the seed and the app expect actually exist.
 * Runs after drizzle-kit push to catch silent failures (push prints errors but
 * sometimes exits 0).
 */
const REQUIRED_TABLES = [
  "users",
  "accounts",
  "categories",
  "global_attributes",
  "products",
  "product_variants",
  "product_variant_price_tiers",
  "product_price_tiers",
  "product_supplier_offers",
  "suppliers",
  "carts",
  "cart_items",
  "addresses",
  "orders",
  "order_items",
  "order_status_history",
  // Tablas operativas POS (única autoridad: 0005_pos_operational_tables.sql)
  "pos_clientes",
  "pos_ventas",
  "pos_lineas_venta",
  "pos_iva_registro",
  "pos_ordenes_compra",
  "pos_ordenes_compra_lineas",
  "pos_facturas_compra",
  "pos_comprobantes_fiscales",
  "pos_compras_importaciones",
]

const REQUIRED_COLUMNS: Array<{ table: string; column: string }> = [
  { table: "categories", column: "parent_id" },
  { table: "orders", column: "fulfillment_type" },
  { table: "orders", column: "customer_email" },
  { table: "orders", column: "preferred_contact_channel" },
  { table: "order_items", column: "sku_snapshot" },
  { table: "suppliers", column: "cuit" },
  { table: "pos_ordenes_compra", column: "origen" },
  { table: "pos_facturas_compra", column: "tipo_comprobante" },
  { table: "pos_facturas_compra", column: "punto_venta" },
  { table: "pos_facturas_compra", column: "numero" },
  { table: "pos_facturas_compra", column: "descuento_total" },
  { table: "pos_ordenes_compra_lineas", column: "descuento_porcentaje" },
  { table: "pos_ordenes_compra_lineas", column: "alicuota_iva" },
  { table: "pos_ordenes_compra_lineas", column: "neto_linea" },
  { table: "pos_ordenes_compra_lineas", column: "iva_linea" },
  { table: "pos_ordenes_compra_lineas", column: "total_linea" },
  { table: "pos_compras_importaciones", column: "review_json" },
  { table: "pos_compras_importaciones", column: "origen" },
]

async function verify() {
  const client = await pool.connect()
  try {
    for (const table of REQUIRED_TABLES) {
      const r = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
        [table]
      )
      if (r.rowCount === 0) {
        throw new Error(`Falta tabla requerida: ${table}`)
      }
    }
    for (const { table, column } of REQUIRED_COLUMNS) {
      const r = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
        [table, column]
      )
      if (r.rowCount === 0) {
        throw new Error(`Falta columna requerida: ${table}.${column}`)
      }
    }
    console.log("  ✓ Schema verification passed")
  } finally {
    client.release()
    await pool.end()
  }
}

verify().catch((err) => {
  console.error("❌ Schema verification failed:", err instanceof Error ? err.message : err)
  process.exit(1)
})
