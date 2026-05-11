import { loadEnvFiles } from "./src/db/load-env"
import type { Config } from "drizzle-kit"

loadEnvFiles()

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error(
    "DATABASE_URL no está definida. Copiá .env.example a .env.local en la carpeta app/ y configurá la URL (puerto 5433 si usás el docker-compose del proyecto)."
  )
}

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
    url: withConnectTimeout(process.env.DATABASE_URL.trim()),
  },
} satisfies Config
