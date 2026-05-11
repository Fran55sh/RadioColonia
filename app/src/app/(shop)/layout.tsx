import Header from "@/components/Header"
import Footer from "@/components/Footer"
import CartDrawer from "@/components/CartDrawer"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  )
}
