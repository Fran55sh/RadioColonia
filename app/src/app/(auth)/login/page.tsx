"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Zap, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loginAction } from "@/server/actions/auth"
import { Suspense } from "react"

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl   = searchParams.get("callbackUrl") ?? "/"
  const registered    = searchParams.get("registered") === "1"

  const [error, setError]   = useState<string | null>(null)
  const [showPw, setShowPw] = useState(false)
  const [isPending, start]  = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set("callbackUrl", callbackUrl)
    start(async () => {
      const result = await loginAction(fd)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
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

        {/* Card */}
        <div className="bg-charcoal/50 backdrop-blur-sm border border-border/20 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">Iniciar sesión</h1>
          <p className="text-muted-foreground mb-6">Ingresá a tu cuenta Radio Colonia</p>

          {registered && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-xl text-sm text-primary">
              ¡Cuenta creada! Podés iniciar sesión ahora.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-silver-light mb-1.5">
                Email
              </label>
              <Input
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                autoComplete="email"
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
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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

            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="w-full mt-2"
              disabled={isPending}
            >
              {isPending ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tenés cuenta?{" "}
            <Link href="/registro" className="text-primary hover:underline font-medium">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
