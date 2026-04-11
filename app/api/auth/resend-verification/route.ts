// PATH: app/api/auth/resend-verification/route.ts
import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import crypto from "crypto"
import type { User } from "@/lib/types"
import { sendVerificationEmail } from "@/lib/email"

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

    // Always return success to avoid leaking whether an email exists
    if (!user || user.isVerified) {
      return NextResponse.json({ success: true, message: "If that email exists and is unverified, we've sent a new link." })
    }

    const emailVerificationToken = crypto.randomBytes(32).toString("hex")
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.collection<User>("users").updateOne(
      { _id: user._id },
      { $set: { emailVerificationToken, emailVerificationExpires } }
    )

    await sendVerificationEmail(user.email, emailVerificationToken)

    return NextResponse.json({ success: true, message: "Verification email sent. Please check your inbox." })
  } catch (error) {
    console.error("Resend verification error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to resend verification email." },
      { status: 500 }
    )
  }
}