// PATH: app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import type { User } from "@/lib/types"

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: "Token and new password are required" },
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

    const user = await db.collection<User>("users").findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await db.collection<User>("users").updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { passwordResetToken: "", passwordResetExpires: "" },
      }
    )

    return NextResponse.json({ success: true, message: "Password reset successfully. You can now sign in." })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to reset password. Please try again." },
      { status: 500 }
    )
  }
}