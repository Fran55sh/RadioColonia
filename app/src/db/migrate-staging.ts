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

async function createStagingTable() {
  const client = await pool.connect()
  try {
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
    await client.query(`
      CREATE INDEX IF NOT EXISTS stg_products_import_session_idx
        ON stg_products_import (session_id)
    `)
    console.log("  ✓ Staging table: stg_products_import")
  } finally {
    client.release()
    await pool.end()
  }
}

createStagingTable().catch((err) => {
  console.error("❌ Failed to create staging table:", err)
  process.exit(1)
})
