import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "user" | "admin"
    } & DefaultSession["user"]
  }
}

/**
 * Credentials-only sign-in requires JWT sessions (`UnsupportedStrategy` if using database sessions).
 * `trustHost` avoids UntrustedHost when using LAN IPs or proxies in dev/deploy.
 *
 * Drizzle adapter is omitted here; OAuth can be added later with `adapter` + a non-password provider.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim() : ""
        if (!email || !credentials?.password) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        if (!user || !user.passwordHash) return null

        const valid = await compare(credentials.password as string, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Tras login, `user` trae id/role desde authorize(). No usar solo `"role" in user`:
      // el tipo User de Auth.js puede no declarar `role` y el bloque se saltaba.
      if (user) {
        const id = String(user.id)
        token.id = id
        token.sub = id
        token.name = user.name
        token.email = user.email
        const r = (user as { role?: "user" | "admin" }).role
        if (r) token.role = r
      }
      return token
    },
    async session({ session, token }) {
      if (!session.user) return session

      const id = typeof token.id === "string" ? token.id : (token.sub as string | undefined)
      if (!id) return session

      session.user.id = id

      const [dbUser] = await db
        .select({
          role: users.role,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      session.user.role =
        dbUser?.role ?? (token.role as "user" | "admin" | undefined) ?? "user"

      if (dbUser) {
        session.user.name = dbUser.name ?? ""
        session.user.email = dbUser.email ?? ""
      }

      return session
    },
  },
})
