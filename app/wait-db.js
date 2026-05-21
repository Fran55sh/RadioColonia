const { Client } = require("pg")

function missingEnvVars() {
  const missing = []
  if (!process.env.DB_HOST?.trim()) missing.push("DB_HOST")
  if (!process.env.DB_USER?.trim()) missing.push("DB_USER")
  if (process.env.DB_PASSWORD === undefined) missing.push("DB_PASSWORD")
  if (!process.env.DB_NAME?.trim()) missing.push("DB_NAME")
  return missing
}

const missing = missingEnvVars()
if (missing.length > 0) {
  console.error(
    `❌ Faltan variables de entorno de base de datos: ${missing.join(", ")}`
  )
  process.exit(1)
}

const host = process.env.DB_HOST.trim()
const port = parseInt(process.env.DB_PORT || "5432", 10)

const client = new Client({
  host,
  port,
  user: process.env.DB_USER.trim(),
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME.trim(),
})

async function wait() {
  for (let i = 1; i <= 30; i++) {
    try {
      console.log(`[${i}/30] Esperando Postgres en ${host}:${port}...`)
      await client.connect()
      await client.end()
      console.log("✅ Postgres está listo. Continuando...")
      process.exit(0)
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  console.error("❌ No se pudo conectar a Postgres tras 60 segundos.")
  process.exit(1)
}

wait()
