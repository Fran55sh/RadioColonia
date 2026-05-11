"use client"

import { ShoppingCart, Search, Menu, Zap, X } from "lucide-react"
import { Button } from "./ui/button"
import { useState } from "react"
import { useCart } from "@/contexts/CartContext"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { logoutAction } from "@/server/actions/auth"

const navLinks = [
  { label: "Productos",   href: "/productos" },
  { label: "Categorías",  href: "/categorias" },
  { label: "Ofertas",     href: "/#deals" },
  { label: "Soporte",     href: "/#soporte" },
]

export default function Header() {
  const { totalItems, toggleCart } = useCart()
  const { data: session }         = useSession()
  const [menuOpen, setMenuOpen]   = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-gradient-dark backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-orange flex items-center justify-center shadow-orange group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white hidden sm:inline">
              Radio<span className="text-primary"> Colonia</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-silver-light hover:text-primary transition-colors duration-300 font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/productos">
              <Button variant="ghost" size="icon" className="text-silver-light hover:text-primary hover:bg-charcoal">
                <Search className="w-5 h-5" />
              </Button>
            </Link>

            <Button
              variant="ghost" size="icon"
              className="text-silver-light hover:text-primary hover:bg-charcoal relative"
              onClick={toggleCart}
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-orange text-white text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                  {totalItems > 9 ? "9+" : totalItems}
                </span>
              )}
            </Button>

            {session?.user ? (
              <div className="hidden sm:flex items-center gap-2">
                {session.user.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="text-silver-light border-border/30 hover:border-primary">
                      Admin
                    </Button>
                  </Link>
                )}
                <Link href="/cuenta">
                  <Button variant="ghost" size="sm" className="text-silver-light hover:text-primary">
                    {session.user.name?.split(" ")[0]}
                  </Button>
                </Link>
                <form action={logoutAction}>
                  <Button variant="ghost" size="sm" type="submit" className="text-silver-light hover:text-destructive">
                    Salir
                  </Button>
                </form>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="hero" size="sm" className="hidden sm:flex">
                  Ingresar
                </Button>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost" size="icon"
              className="md:hidden text-silver-light hover:text-primary hover:bg-charcoal"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="md:hidden py-4 border-t border-white/10 animate-fade-in">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="block py-3 text-silver-light hover:text-primary transition-colors font-medium"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {session?.user ? (
              <div className="flex flex-col gap-2 mt-4">
                {session.user.role === "admin" && (
                  <Link href="/admin"><Button variant="outline" className="w-full">Admin</Button></Link>
                )}
                <Link href="/cuenta"><Button variant="ghost" className="w-full text-silver-light">Mi cuenta</Button></Link>
                <form action={logoutAction}>
                  <Button variant="ghost" type="submit" className="w-full text-destructive">Cerrar sesión</Button>
                </form>
              </div>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="hero" className="w-full mt-4">Ingresar</Button>
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}
