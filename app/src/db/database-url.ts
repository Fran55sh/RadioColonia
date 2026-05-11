/**
 * URL de Postgres construida solo desde variables explícitas (sin DATABASE_URL).
 * DB_HOST lo define el entorno (Compose, Coolify, etc.); la app no asume host ni puerto fijos en código.
 */

export function getDbEnvValidationError(): string | null {
  const missing: string[] = []
  if (!process.env.DB_HOST?.trim()) missing.push("DB_HOST")
  if (!process.env.DB_USER?.trim()) missing.push("DB_USER")
  if (process.env.DB_PASSWORD === undefined) missing.push("DB_PASSWORD")
  if (!process.env.DB_NAME?.trim()) missing.push("DB_NAME")
  if (missing.length === 0) return null
  return `Faltan variables de entorno de base de datos: ${missing.join(", ")}. Copiá .env.example y definí DB_HOST, DB_USER, DB_PASSWORD, DB_NAME (y opcionalmente DB_PORT).`
}

function buildUrl(): string {
  const host = process.env.DB_HOST!.trim()
  const user = process.env.DB_USER!.trim()
  const password = process.env.DB_PASSWORD ?? ""
  const dbName = process.env.DB_NAME!.trim()
  const port = (process.env.DB_PORT ?? "5432").trim() || "5432"
  const u = encodeURIComponent(user)
  const p = encodeURIComponent(password)
  return `postgresql://${u}:${p}@${host}:${port}/${dbName}`
}

/**
 * Falla rápido si falta configuración. Usar en scripts / CLI (drizzle-kit, seed).
 */
export function getDatabaseUrl(): string {
  const err = getDbEnvValidationError()
  if (err) throw new Error(err)
  return buildUrl()
}

/**
 * No lanza si falta configuración (devuelve undefined). Pensado para inicializaciones
 * a nivel de módulo que se evalúan en `next build` sin variables: el error real lo da
 * la conexión al intentar usarse en runtime / /api/health.
 */
export function tryGetDatabaseUrl(): string | undefined {
  if (getDbEnvValidationError()) return undefined
  return buildUrl()
}
