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
  "carts",
  "cart_items",
  "addresses",
  "orders",
  "order_items",
]

const REQUIRED_COLUMNS: Array<{ table: string; column: string }> = [
  { table: "categories", column: "parent_id" },
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
