export const dynamic = "force-dynamic"

import HeroSection from "@/components/HeroSection"
import CategoriesSection from "@/components/CategoriesSection"
import ProductsSection from "@/components/ProductsSection"
import DealsSection from "@/components/DealsSection"
import NewsletterSection from "@/components/NewsletterSection"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Radio Colonia — Electrónica",
  description: "Descubrí la mejor electrónica: smartphones, laptops, audio y gaming con envío gratis.",
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CategoriesSection />
      <ProductsSection />
      <DealsSection />
      <NewsletterSection />
    </>
  )
}
