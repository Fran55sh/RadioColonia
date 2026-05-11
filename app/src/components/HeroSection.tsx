import { ArrowRight, Truck, Shield, Headphones } from "lucide-react"
import { Button } from "./ui/button"
import Image from "next/image"
import Link from "next/link"

const features = [
  { icon: Truck,       label: "Envío gratis" },
  { icon: Shield,      label: "2 años de garantía" },
  { icon: Headphones,  label: "Soporte 24/7" },
]

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-dark">
      {/* Background blobs */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left space-y-6 md:space-y-8 z-10">
            <div className="inline-flex items-center gap-2 bg-charcoal/50 border border-primary/20 rounded-full px-4 py-2 text-sm">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-silver-light">Nuevos Ingresos 2025</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight">
              Electrónica
              <span className="block text-gradient-orange">de Última Generación</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Descubrí tecnología de punta: audio premium, dispositivos inteligentes
              y accesorios gamer. Experimentá el futuro hoy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/productos">
                <Button variant="hero" size="xl" className="group">
                  Comprar Ahora
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/productos">
                <Button variant="dark" size="xl">Ver Catálogo</Button>
              </Link>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-6 pt-4">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-silver-light">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative animate-float">
              <Image
                src="/products/hero-headphones.png"
                alt="Auriculares premium inalámbricos Radio Colonia"
                width={500}
                height={500}
                className="w-full max-w-md lg:max-w-lg xl:max-w-xl drop-shadow-2xl"
                priority
              />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl -z-10 scale-75" />
            </div>

            {/* Discount badge */}
            <div
              className="absolute top-10 right-0 lg:right-10 bg-charcoal/80 backdrop-blur-sm border border-primary/30 rounded-2xl p-4 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="text-2xl font-bold text-primary">-30%</div>
              <div className="text-sm text-silver-light">Oferta limitada</div>
            </div>

            {/* Price badge */}
            <div
              className="absolute bottom-10 left-0 lg:left-10 bg-charcoal/80 backdrop-blur-sm border border-white/20 rounded-2xl p-4 animate-fade-in"
              style={{ animationDelay: "0.5s" }}
            >
              <div className="text-sm text-muted-foreground line-through">$399</div>
              <div className="text-2xl font-bold text-white">$279</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
