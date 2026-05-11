import { getDatabaseUrl } from "./src/db/database-url"
import { loadEnvFiles } from "./src/db/load-env"
import type { Config } from "drizzle-kit"

loadEnvFiles()

/** Evita colgarse indefinidamente si Postgres no responde (URL mal, Docker apagado, etc.). */
function withConnectTimeout(url: string, seconds = 10): string {
  if (/(?:[?&])connect_timeout=/.test(url)) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}connect_timeout=${seconds}`
}

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: withConnectTimeout(getDatabaseUrl()),
  },
} satisfies Config
