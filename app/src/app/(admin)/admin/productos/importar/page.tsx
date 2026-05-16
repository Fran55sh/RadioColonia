import { FileSpreadsheet } from "lucide-react"
import BulkImportForm from "./BulkImportForm"

export const metadata = {
  title: "Importar productos — Admin",
}

export default function ImportarProductosPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Importar productos desde CSV</h1>
        </div>
        <p className="text-muted-foreground">
          Cargá masivamente productos y variantes. La importación es atómica: si hay errores de validación,
          ningún dato se escribe en la base de datos.
        </p>
      </div>

      <BulkImportForm />
    </div>
  )
}
