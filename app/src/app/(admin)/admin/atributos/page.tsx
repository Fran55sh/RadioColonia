import { db } from "@/db"
import { globalAttributes } from "@/db/schema"
import { asc } from "drizzle-orm"
import GlobalAttributesAdmin from "./GlobalAttributesAdmin"

export default async function AdminAtributosPage() {
  const attrs = await db
    .select()
    .from(globalAttributes)
    .orderBy(asc(globalAttributes.sortOrder))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">Atributos globales</h1>
      <p className="text-muted-foreground mb-8">
        Definí los nombres de atributos permitidos para variantes (Color, Talle, etc.). Los valores son libres por producto.
      </p>
      <GlobalAttributesAdmin attributes={attrs} />
    </div>
  )
}
