import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Group } from "@/lib/types"

// DELETE - leave a group or cancel pending request
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session || session.user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = await getDatabase()
    const groupId = new ObjectId(id)
    const studentId = new ObjectId(session.user.id)

    // Remove from both memberIds and pendingRequests
    const result = await db.collection<Group>("groups").updateOne(
      { _id: groupId },
      {
        $pull: {
          memberIds: studentId,
          pendingRequests: studentId,
        },
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Leave group error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to leave group" },
      { status: 500 }
    )
  }
}
