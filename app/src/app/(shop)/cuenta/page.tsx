export const dynamic = "force-dynamic"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { users, orders } from "@/db/schema"
import { eq, count } from "drizzle-orm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { User, Package, LogOut } from "lucide-react"
import { logoutAction } from "@/server/actions/auth"

export default async function CuentaPage() {
  const session = await auth()
  if (!session?.user) return null

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  const [{ value: orderCount }] = await db
    .select({ value: count(orders.id) })
    .from(orders)
    .where(eq(orders.userId, session.user.id))

  return (
    <div className="py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Mi cuenta</h1>

        {/* Profile card */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-orange flex items-center justify-center shadow-orange">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              {user.role === "admin" && (
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Administrador
                </span>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-muted rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Total de pedidos</p>
              <p className="text-2xl font-bold text-foreground">{orderCount}</p>
            </div>
            <div className="bg-muted rounded-xl p-4">
              <p className="text-sm text-muted-foreground">Miembro desde</p>
              <p className="text-lg font-semibold text-foreground">
                {new Date(user.createdAt).toLocaleDateString("es-AR", { year: "numeric", month: "long" })}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/cuenta/ordenes">
            <div className="bg-card rounded-2xl border border-border p-6 hover:border-primary/40 transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Mis pedidos</h3>
              <p className="text-sm text-muted-foreground mt-1">Revisá el estado de tus órdenes</p>
            </div>
          </Link>

          {session.user.role === "admin" && (
            <Link href="/admin">
              <div className="bg-card rounded-2xl border border-border p-6 hover:border-primary/40 transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">Panel admin</h3>
                <p className="text-sm text-muted-foreground mt-1">Gestionar productos y órdenes</p>
              </div>
            </Link>
          )}
        </div>

        <div className="mt-8">
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
