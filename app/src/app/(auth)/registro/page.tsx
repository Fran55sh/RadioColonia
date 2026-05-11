"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Zap, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { registerAction } from "@/server/actions/auth"

export default function RegisterPage() {
  const [error, setError]   = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [isPending, start]  = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const result = await registerAction({
        name:     fd.get("name") as string,
        email:    fd.get("email") as string,
        password: fd.get("password") as string,
        confirm:  fd.get("confirm") as string,
      })
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-orange flex items-center justify-center shadow-orange group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">
              Radio<span className="text-primary"> Colonia</span>
            </span>
          </Link>
        </div>

        <div className="bg-charcoal/50 backdrop-blur-sm border border-border/20 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Crear cuenta</h1>
          <p className="text-muted-foreground mb-6">Uníte a Radio Colonia</p>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-silver-light mb-1.5">
                Nombre completo
              </label>
              <Input
                name="name"
                type="text"
                placeholder="Juan Pérez"
                required
                className="bg-midnight/50 border-border/30 text-white placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-silver-light mb-1.5">
                Email
              </label>
              <Input
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                className="bg-midnight/50 border-border/30 text-white placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-silver-light mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPw ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  required
                  className="bg-midnight/50 border-border/30 text-white placeholder:text-muted-foreground focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-silver-light mb-1.5">
                Confirmar contraseña
              </label>
              <Input
                name="confirm"
                type={showPw ? "text" : "password"}
                placeholder="Repetí la contraseña"
                required
                className="bg-midnight/50 border-border/30 text-white placeholder:text-muted-foreground focus:border-primary"
              />
            </div>

            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="w-full mt-2"
              disabled={isPending}
            >
              {isPending ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
