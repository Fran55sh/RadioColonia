import { NextRequest, NextResponse } from "next/server"
import { parse } from "fast-csv"
import { Readable } from "stream"
import { auth } from "@/lib/auth"
import { validateRows, runBulkImportTransaction, type CsvRow } from "@/server/actions/bulkImport"
import { randomUUID } from "crypto"

const REQUIRED_HEADERS = [
  "handle",
  "name",
  "sale_price",
  "sku",
]

export async function POST(req: NextRequest) {
  // Auth guard — admin only
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
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'Se requiere un archivo CSV en el campo "file".' }, { status: 400 })
  }

  const raw = Buffer.from(await file.arrayBuffer())
  // Strip UTF-8 BOM that Excel adds automatically (EF BB BF)
  const stripped = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf
    ? raw.subarray(3)
    : raw

  // Auto-detect delimiter: Spanish Excel uses ";" by default
  const firstLine = stripped.toString("utf8").split(/\r?\n/)[0] ?? ""
  const delimiter = firstLine.includes(";") ? ";" : ","
  const buffer = stripped

  // Parse CSV into rows using fast-csv
  const rows = await new Promise<CsvRow[]>((resolve, reject) => {
    const results: CsvRow[] = []
    let headersValidated = false

    const readable = Readable.from([buffer])
    readable
      .pipe(parse({ headers: true, trim: true, ignoreEmpty: true, delimiter }))
      .on("headers", (headers: string[]) => {
        const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h))
        if (missing.length > 0) {
          reject(new Error(
            `El CSV no tiene las columnas requeridas: ${missing.join(", ")}. ` +
            `Columnas detectadas: ${headers.join(", ")}.`
          ))
        } else {
          headersValidated = true
        }
      })
      .on("data", (row: CsvRow) => {
        if (headersValidated) results.push(row)
      })
      .on("error", reject)
      .on("end", () => resolve(results))
  }).catch((err: Error) => {
    throw err
  })

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "El archivo CSV está vacío o no tiene filas de datos." }, { status: 400 })
  }

  // Validate all rows before touching the database
  const validationErrors = validateRows(rows)
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
