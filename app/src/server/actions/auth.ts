"use server"

import { signIn, signOut } from "@/lib/auth"
import { db } from "@/db"
import { users } from "@/db/schema"
import { hash } from "bcryptjs"
import { eq } from "drizzle-orm"
import { registerSchema } from "@/lib/validators"
import { formatZodError } from "@/lib/zodErrors"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"

export async function loginAction(formData: FormData) {
  const emailRaw     = formData.get("email") as string | null
  const password     = formData.get("password") as string | null
  const callbackUrl = formData.get("callbackUrl") as string | null
  const email        = emailRaw?.trim() ?? ""

  if (!email || !password) {
    return { error: "Completá email y contraseña" }
  }

  try {
    // redirect: true hace redirect() dentro de signIn; en Server Actions a veces la cookie
    // de sesión no llega al navegador. Con false, signIn setea cookies y devuelve la URL;
    // luego redirect() aplica el destino con la respuesta ya preparada.
    const dest = await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl || "/",
      redirect: false,
    })
    if (typeof dest === "string" && dest.length > 0) {
      redirect(dest)
    }
    return { error: "No se pudo completar el inicio de sesión" }
  } catch (e) {
    if (isRedirectError(e)) throw e
    return { error: "Email o contraseña incorrectos" }
  }
}

export async function registerAction(data: {
  name: string
  email: string
  password: string
  confirm: string
}) {
  const parsed = registerSchema.safeParse(data)
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)

  if (existing.length > 0) {
    return { error: "Ya existe una cuenta con ese email" }
  }

  const passwordHash = await hash(parsed.data.password, 12)
  await db.insert(users).values({
    name:         parsed.data.name,
    email:        parsed.data.email,
    passwordHash,
    role:         "user",
  })

  redirect("/login?registered=1")
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" })
}
