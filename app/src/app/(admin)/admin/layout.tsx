import Link from "next/link"
import { Zap, LayoutDashboard, Package, Tag, ShoppingBag, LogOut, SlidersHorizontal } from "lucide-react"
import { logoutAction } from "@/server/actions/auth"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

const navItems = [
  { href: "/admin",            label: "Dashboard",   icon: LayoutDashboard },
  { href: "/admin/productos",  label: "Productos",   icon: Package },
  { href: "/admin/categorias", label: "Categorías",  icon: Tag },
  { href: "/admin/atributos",  label: "Atributos",   icon: SlidersHorizontal },
  { href: "/admin/ordenes",    label: "Órdenes",     icon: ShoppingBag },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/admin")
  if (session.user.role !== "admin") redirect("/")

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gradient-dark border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-orange flex items-center justify-center shadow-orange">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white">Radio Colonia</span>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-silver-light hover:text-white hover:bg-charcoal/50 transition-all group"
            >
              <Icon className="w-5 h-5 group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link href="/" className="block mb-2">
            <Button variant="ghost" size="sm" className="w-full text-silver-light hover:text-white justify-start">
              ← Ver tienda
            </Button>
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive justify-start">
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
