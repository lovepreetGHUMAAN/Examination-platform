// PATH: app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import type { User } from "@/lib/types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()

    const user = await db.collection<User>("users").findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification link. Please request a new one." },
        { status: 400 }
      )
    }

    if (user.isVerified) {
      return NextResponse.json({ success: true, message: "Email already verified." })
    }

    await db.collection<User>("users").updateOne(
      { _id: user._id },
      {
        $set: { isVerified: true },
        $unset: { emailVerificationToken: "", emailVerificationExpires: "" },
      }
    )

    return NextResponse.json({ success: true, message: "Email verified successfully! You can now sign in." })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json(
      { success: false, error: "Verification failed. Please try again." },
      { status: 500 }
    )
  }
}