import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/db"

/**
 * GET /api/health — diagnóstico en deploy (Coolify, etc.).
 * No exponer detalles sensibles en producción; solo ok / motivo.
 */
export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is not set" },
      { status: 503 }
    )
  }

  try {
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
