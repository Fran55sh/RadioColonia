"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, CheckCircle2, XCircle, FileText, Loader2 } from "lucide-react"

interface ImportResult {
  productsInserted: number
  variantsInserted: number
  skippedDuplicates: number
  totalRows: number
}

interface ApiError {
  error: string
  details?: string[]
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: ImportResult }
  | { status: "error"; message: string; details?: string[] }

export default function BulkImportForm() {
  const [state, setState] = useState<State>({ status: "idle" })
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileName(e.target.files?.[0]?.name ?? null)
    setState({ status: "idle" })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setState({ status: "loading" })

    const body = new FormData()
    body.append("file", file)

    try {
      const res = await fetch("/api/admin/bulk-import", { method: "POST", body })
      const data: ImportResult & ApiError = await res.json()

      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Error desconocido.", details: data.details })
        return
      }

      setState({ status: "success", result: data })
      if (fileRef.current) fileRef.current.value = ""
      setFileName(null)
    } catch {
      setState({ status: "error", message: "Error de red al comunicarse con el servidor." })
    }
  }

  return (
    <div className="space-y-6">
      {/* File selector */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/20 bg-charcoal/30 p-10 text-center transition hover:border-primary/50 hover:bg-charcoal/50 cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Upload className="w-10 h-10 text-muted-foreground" />
          {fileName ? (
            <div className="flex items-center gap-2 text-white font-medium">
              <FileText className="w-4 h-4 text-primary" />
              {fileName}
            </div>
          ) : (
            <div>
              <p className="text-white font-medium">Haz clic para seleccionar un archivo CSV</p>
              <p className="text-sm text-muted-foreground mt-1">
                Columnas: handle, name, category_slug, description, cost_price, sale_price, sku, stock, attribute_name, attribute_value, image_filename
              </p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="hero"
          disabled={!fileName || state.status === "loading"}
          className="w-full"
        >
          {state.status === "loading" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Importar productos
            </>
          )}
        </Button>
      </form>

      {/* Result messages */}
      {state.status === "success" && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <AlertTitle className="text-green-400">Importación completada</AlertTitle>
          <AlertDescription className="text-green-300 space-y-1 mt-1">
            <p>
              Se {state.result.productsInserted === 1 ? "insertó" : "insertaron"}{" "}
              <strong>{state.result.productsInserted}</strong>{" "}
              producto{state.result.productsInserted !== 1 ? "s" : ""} y{" "}
              <strong>{state.result.variantsInserted}</strong>{" "}
              variante{state.result.variantsInserted !== 1 ? "s" : ""} correctamente.
            </p>
            {state.result.skippedDuplicates > 0 && (
              <p className="text-yellow-400">
                {state.result.skippedDuplicates} fila{state.result.skippedDuplicates !== 1 ? "s" : ""} omitida{state.result.skippedDuplicates !== 1 ? "s" : ""} por SKU duplicado.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {state.status === "error" && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <XCircle className="w-4 h-4 text-destructive" />
          <AlertTitle className="text-destructive">Error en la importación</AlertTitle>
          <AlertDescription className="text-destructive/80 mt-1">
            <p>{state.message}</p>
            {state.details && state.details.length > 0 && (
              <ul className="mt-2 space-y-1 list-disc list-inside text-sm max-h-48 overflow-y-auto">
                {state.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* CSV format reference */}
      <div className="rounded-xl border border-white/10 bg-charcoal/20 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Formato esperado del CSV</h3>
        <p className="text-xs text-muted-foreground">
          Cada fila representa una variante. Productos con el mismo <code className="text-primary">handle</code> se agrupan automáticamente.
        </p>
        <pre className="text-xs text-silver-light overflow-x-auto bg-background/50 rounded p-3 leading-relaxed">
{`handle,name,category_slug,description,cost_price,sale_price,sku,stock,attribute_name,attribute_value,image_filename
auriculares-bt,Auriculares BT,audio,Descripción del producto,1500,2500,AUR-BT-001,50,Color,Negro,auriculares-bt.jpg
auriculares-bt,Auriculares BT,audio,Descripción del producto,1500,2500,AUR-BT-002,30,Color,Blanco,auriculares-bt.jpg`}
        </pre>
      </div>
    </div>
  )
}
