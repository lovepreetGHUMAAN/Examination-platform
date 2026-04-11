// PATH: app/api/auth/register/route.ts
import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import type { User } from "@/lib/types"
import { sendVerificationEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      )
    }

    if (!["student", "teacher"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await db
      .collection<User>("users")
      .findOne({ email: normalizedEmail })

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate a secure verification token (valid 24 hours)
    const emailVerificationToken = crypto.randomBytes(32).toString("hex")
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const newUser: User = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      isVerified: false,
      emailVerificationToken,
      emailVerificationExpires,
      createdAt: new Date(),
    }

    await db.collection<User>("users").insertOne(newUser)

    // Send verification email — don't let email errors break registration
    try {
      await sendVerificationEmail(normalizedEmail, emailVerificationToken)
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError)
      // User is created; they can request a resend later
    }

    return NextResponse.json(
      {
        success: true,
        message: "Account created! Please check your email to verify your account before signing in.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    )
  }
}