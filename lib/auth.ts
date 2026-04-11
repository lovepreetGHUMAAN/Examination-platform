// PATH: lib/auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import type { User, UserRole } from "@/lib/types"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required")
        }

        const db = await getDatabase()
        const user = await db.collection<User>("users").findOne({
          email: credentials.email.toLowerCase(),
        })

        if (!user) {
          throw new Error("Invalid email or password")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error("Invalid email or password")
        }

        if (!user.isVerified) {
          throw new Error("Please verify your email before signing in. Check your inbox for the verification link.")
        }

        return {
          id: user._id!.toString(),
          email: user.email,
          name: user.name,
          // FIX: cast to UserRole — authorize() return type uses next-auth's User
          // which types role as string; we know it's always UserRole from the DB
          role: user.role as UserRole,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // FIX: user.role comes from authorize() return, cast to preserve the value
        token.role = (user as unknown as { role: UserRole }).role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        // FIX: cast through unknown to avoid string→UserRole assignment error
        session.user.role = token.role as UserRole
      }
      return session
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET,
}