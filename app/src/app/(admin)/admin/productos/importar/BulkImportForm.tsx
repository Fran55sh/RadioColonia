"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Upload, CheckCircle2, XCircle, FileText, Loader2, ClipboardPaste } from "lucide-react"

interface ImportResult {
  productsInserted: number
  variantsInserted: number
  variantsUpdated?: number
  offersInserted?: number
  offersUpdated?: number
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

type InputMode = "file" | "text"

const CSV_COLUMNS_HINT =
  "Columnas: handle, name, category_slug, description, cost_price, sale_price, sku, stock, supplier, supplier_code, supplier_stock, attribute_name, attribute_value, attribute_2_name, attribute_2_value, attribute_3_name, attribute_3_value, qty_discounts (ej: 10:1100|25:1000), image_filename"

export default function BulkImportForm() {
  const [state, setState] = useState<State>({ status: "idle" })
  const [inputMode, setInputMode] = useState<InputMode>("file")
  const [fileName, setFileName] = useState<string | null>(null)
  const [csvText, setCsvText] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const canSubmit =
    inputMode === "file" ? Boolean(fileName) : csvText.trim().length > 0

  function resetInput() {
    if (fileRef.current) fileRef.current.value = ""
    setFileName(null)
    setCsvText("")
  }

  function handleModeChange(mode: string) {
    setInputMode(mode as InputMode)
    setState({ status: "idle" })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileName(e.target.files?.[0]?.name ?? null)
    setState({ status: "idle" })
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setCsvText(e.target.value)
    setState({ status: "idle" })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return

    setState({ status: "loading" })

    const body = new FormData()
    if (inputMode === "file") {
      const file = fileRef.current?.files?.[0]
      if (!file) return
      body.append("file", file)
    } else {
      body.append("csv", csvText.trim())
    }

    try {
      const res = await fetch("/api/admin/bulk-import", { method: "POST", body })
      const data: ImportResult & ApiError = await res.json()

      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Error desconocido.", details: data.details })
        return
      }

      setState({ status: "success", result: data })
      resetInput()
    } catch {
      setState({ status: "error", message: "Error de red al comunicarse con el servidor." })
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Tabs value={inputMode} onValueChange={handleModeChange}>
          <TabsList className="w-full">
            <TabsTrigger value="file" className="flex-1 gap-2">
              <Upload className="w-4 h-4" />
              Subir archivo
            </TabsTrigger>
            <TabsTrigger value="text" className="flex-1 gap-2">
              <ClipboardPaste className="w-4 h-4" />
              Pegar texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4">
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
                  <p className="text-sm text-muted-foreground mt-1">{CSV_COLUMNS_HINT}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="text" className="mt-4 space-y-2">
            <Textarea
              value={csvText}
              onChange={handleTextChange}
              placeholder={`handle,name,category_slug,description,cost_price,sale_price,sku,stock,supplier,supplier_code,supplier_stock,attribute_name,attribute_value,image_filename\nutp-cat6-2m,Cable UTP,redes,Desc,1200,2500,utp6-020,100,proveedor-a,lta020,100,,,imagen.jpg`}
              className="min-h-56 font-mono text-xs bg-charcoal/30 border-white/20"
              spellCheck={false}
            />
            <p className="text-sm text-muted-foreground">{CSV_COLUMNS_HINT}</p>
          </TabsContent>
        </Tabs>

        <Button
          type="submit"
          variant="hero"
          disabled={!canSubmit || state.status === "loading"}
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

      {state.status === "success" && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <AlertTitle className="text-green-400">Importación completada</AlertTitle>
          <AlertDescription className="text-green-300 space-y-1 mt-1">
            <p>
              Productos nuevos: <strong>{state.result.productsInserted}</strong> · Variantes nuevas:{" "}
              <strong>{state.result.variantsInserted}</strong>
              {state.result.variantsUpdated != null && state.result.variantsUpdated > 0 && (
                <> · Variantes actualizadas: <strong>{state.result.variantsUpdated}</strong></>
              )}
            </p>
            {(state.result.offersInserted != null || state.result.offersUpdated != null) && (
              <p>
                Ofertas proveedor: <strong>{state.result.offersInserted ?? 0}</strong> nuevas,{" "}
                <strong>{state.result.offersUpdated ?? 0}</strong> actualizadas
              </p>
            )}
            {state.result.skippedDuplicates > 0 && (
              <p className="text-yellow-400">
                {state.result.skippedDuplicates} fila(s) sin cambios en ofertas.
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

      <div className="rounded-xl border border-white/10 bg-charcoal/20 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Formato esperado del CSV</h3>
        <p className="text-xs text-muted-foreground">
          El <code className="text-primary">sku</code> es el código universal de venta. Varias filas con el mismo SKU
          representan distintos proveedores (códigos internos y costos). Los proveedores deben existir en Admin → Proveedores.
        </p>
        <pre className="text-xs text-silver-light overflow-x-auto bg-background/50 rounded p-3 leading-relaxed">
{`handle,name,...,sku,stock,supplier,supplier_code,...,attribute_name,attribute_value,attribute_2_name,attribute_2_value,qty_discounts,image_filename
utp-cat6-2m,Cable UTP,...,utp6-020,100,proveedor-a,lta020,,,,,,10:2200|50:2000,utp.jpg
cargador,Cargador,...,CHG-65,40,proveedor-a,CHG-65,,,Capacidad,65W,Voltaje,20V,5:1600,chg.jpg`}
        </pre>
      </div>
    </div>
  )
}
