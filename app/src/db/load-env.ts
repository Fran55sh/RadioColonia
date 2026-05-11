import { config } from "dotenv"
import { existsSync } from "fs"
import { resolve } from "path"

/** Carga `.env` y luego `.env.local` (igual que Next) para drizzle-kit y scripts tsx. */
export function loadEnvFiles(): void {
  const root = process.cwd()
  const env = resolve(root, ".env")
  const local = resolve(root, ".env.local")
  if (existsSync(env)) config({ path: env })
  if (existsSync(local)) config({ path: local, override: true })
}
