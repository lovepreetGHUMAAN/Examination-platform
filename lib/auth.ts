import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getDatabase } from "./mongodb"
import bcrypt from "bcryptjs"
import type { User } from "./types"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: "teacher" | "student"
    }
  }

  interface User {
    id: string
    email: string
    name: string
    role: "teacher" | "student"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "teacher" | "student"
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
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
          throw new Error("No account found with this email")
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)

        if (!isValid) {
          throw new Error("Invalid password")
        }

        return {
          id: user._id!.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
