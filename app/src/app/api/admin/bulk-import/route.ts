import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { globalAttributes } from "@/db/schema"
import {
  parseCsvBuffer,
  validateRows,
  runBulkImportTransaction,
} from "@/server/actions/bulkImport"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 })
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Error al leer el formulario." }, { status: 400 })
  }

  const file = formData.get("file")
  const csvText = formData.get("csv")

  let buffer: Buffer
  if (file instanceof Blob) {
    buffer = Buffer.from(await file.arrayBuffer())
  } else if (typeof csvText === "string" && csvText.trim()) {
    buffer = Buffer.from(csvText.trim(), "utf8")
  } else {
    return NextResponse.json(
      { error: 'Se requiere un archivo CSV en "file" o contenido CSV en "csv".' },
      { status: 400 }
    )
  }

  let rows
  try {
    rows = await parseCsvBuffer(buffer)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al parsear el CSV."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "El CSV está vacío o no tiene filas de datos." },
      { status: 400 }
    )
  }

  const attrRows = await db.select({ slug: globalAttributes.slug }).from(globalAttributes)
  const allowedSlugs = new Set(attrRows.map((a) => a.slug))

  const validationErrors = validateRows(rows, allowedSlugs)
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "El CSV contiene errores de validación.", details: validationErrors },
      { status: 422 }
    )
  }

  const sessionId = randomUUID()

  try {
    const result = await runBulkImportTransaction(rows, sessionId)
    return NextResponse.json({
      success: true,
      productsInserted: result.productsInserted,
      variantsInserted: result.variantsInserted,
      skippedDuplicates: result.skippedDuplicates,
      totalRows: rows.length,
    })
  } catch (err) {
    console.error("[bulk-import] Transaction failed:", err)
    const message = err instanceof Error ? err.message : "Error desconocido."
    return NextResponse.json(
      { error: `Error al importar: ${message}` },
      { status: 500 }
    )
  }
}
