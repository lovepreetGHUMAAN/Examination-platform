import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import type { User, UserRole } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      )
    }

    if (!["teacher", "student"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    const existingUser = await db.collection<User>("users").findOne({
      email: email.toLowerCase(),
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const newUser: User = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role as UserRole,
      createdAt: new Date(),
    }

    await db.collection<User>("users").insertOne(newUser)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to register. Please try again." },
      { status: 500 }
    )
  }
}
