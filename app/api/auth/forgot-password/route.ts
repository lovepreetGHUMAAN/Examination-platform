// PATH: app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import crypto from "crypto"
import type { User } from "@/lib/types"
import { sendPasswordResetEmail } from "@/lib/email"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const user = await db.collection<User>("users").findOne({
      email: email.toLowerCase().trim(),
    })

    // Always return success — never reveal whether an account exists
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, we've sent a password reset link.",
      })
    }

    const passwordResetToken = crypto.randomBytes(32).toString("hex")
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.collection<User>("users").updateOne(
      { _id: user._id },
      { $set: { passwordResetToken, passwordResetExpires } }
    )

    await sendPasswordResetEmail(user.email, passwordResetToken)

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, we've sent a password reset link.",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}