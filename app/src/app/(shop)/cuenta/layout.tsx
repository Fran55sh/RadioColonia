import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

/** Protección en servidor (Node): middleware corre en Edge y no puede decodificar el JWT de Auth.js. */
export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login?callbackUrl=/cuenta")
  }
  return <>{children}</>
}
