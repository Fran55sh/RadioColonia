import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { getDatabaseUrl } from "./database-url"
import * as schema from "./schema"

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
}

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: getDatabaseUrl(),
  })

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

export const db = drizzle(pool, { schema })
