import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { getDbEnvValidationError } from "@/db/database-url"

/**
 * GET /api/health — diagnóstico en deploy (Coolify, etc.).
 * No exponer detalles sensibles en producción; solo ok / motivo.
 */
export async function GET() {
  const envErr = getDbEnvValidationError()
  if (envErr) {
    return NextResponse.json(
      { ok: false, error: "db_env_incomplete", detail: envErr },
      { status: 503 }
    )
  }

  try {
    const { db } = await import("@/db")
    await db.execute(sql`select 1`)
    return NextResponse.json({ ok: true, db: "up" })
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error"
    return NextResponse.json(
      { ok: false, error: "database_unreachable", detail: message },
      { status: 503 }
    )
  }
}
