import { Pool } from "pg"
import { readdirSync, readFileSync } from "fs"
import { resolve } from "path"
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
 * Applies idempotent SQL migrations from src/db/migrations/*.sql.
 *
 * Strategy:
 * - If the database is empty (no base tables), skip SQL. `drizzle-kit push`
 *   will create everything from the TS schema, including new tables/columns.
 * - If base tables exist (previous deploy), apply SQL to bring the DB in sync
 *   BEFORE the push, so push detects no differences and won't open interactive
 *   prompts that crash in CI (no TTY).
 */
async function applySqlMigrations() {
  const client = await pool.connect()
  try {
    const baseCheck = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users' LIMIT 1`
    )
    if (baseCheck.rowCount === 0) {
      console.log("  ~ Empty database: skipping incremental SQL (push will create all tables)")
      return
    }

    const migrationsDir = resolve(process.cwd(), "src/db/migrations")
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort()

    if (files.length === 0) {
      console.log("  ~ No SQL migrations to apply")
      return
    }

    for (const file of files) {
      const sql = readFileSync(resolve(migrationsDir, file), "utf8").trim()
      if (!sql) continue
      console.log(`  ▸ ${file}`)
      await client.query(sql)
    }
    console.log(`  ✓ Applied ${files.length} SQL migration file(s)`)
  } finally {
    client.release()
    await pool.end()
  }
}

applySqlMigrations().catch((err) => {
  console.error("❌ Failed to apply SQL migrations:", err)
  process.exit(1)
})
