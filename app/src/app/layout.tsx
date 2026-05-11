import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"
import { SessionProvider } from "next-auth/react"
import { CartProvider } from "@/contexts/CartContext"

export const metadata: Metadata = {
  title: "Radio Colonia — Tienda de Electrónica | Teléfonos, Laptops, Audio y Gaming",
  description:
    "Comprá electrónica en Radio Colonia. Smartphones, laptops, auriculares, smartwatches y accesorios gamer.",
  keywords: "electrónica, smartphones, laptops, auriculares, gaming, tech store, Radio Colonia",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <CartProvider>
            {children}
            <Toaster richColors position="top-right" />
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
