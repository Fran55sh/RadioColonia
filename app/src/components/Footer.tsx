import { Zap, Globe, MessageCircle, Camera, Play } from "lucide-react"
import Link from "next/link"

const footerLinks = {
  Tienda:      ["Todos los productos", "Ofertas", "Nuevos ingresos", "Más vendidos"],
  Categorías:  ["Teléfonos", "Laptops", "Audio", "Gaming", "Cámaras"],
  Soporte:     ["Contacto", "Preguntas frecuentes", "Envíos", "Devoluciones"],
  Empresa:     ["Nosotros", "Empleos", "Prensa", "Blog"],
}

const socialLinks = [
  { icon: Globe,         href: "#" },
  { icon: MessageCircle, href: "#" },
  { icon: Camera,        href: "#" },
  { icon: Play,          href: "#" },
]

export default function Footer() {
  return (
    <footer className="bg-gradient-dark border-t border-white/10">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-orange flex items-center justify-center shadow-orange">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Radio<span className="text-primary"> Colonia</span>
              </span>
            </Link>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Tu destino para electrónica de punta y gadgets tech premium.
            </p>
            <div className="flex gap-4">
              {socialLinks.map(({ icon: Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-10 h-10 rounded-xl bg-charcoal/50 hover:bg-primary flex items-center justify-center text-silver-light hover:text-white transition-all duration-300"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-semibold text-white mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">© 2026 Radio Colonia. Todos los derechos reservados.</p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Política de privacidad</a>
            <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Términos de servicio</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
