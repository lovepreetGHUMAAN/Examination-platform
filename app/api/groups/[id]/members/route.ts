import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Group } from "@/lib/types"

// POST - approve a pending request
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { studentId, action } = await request.json()

    if (!studentId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const groupId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)
    const studentObjectId = new ObjectId(studentId)

    const group = await db.collection<Group>("groups").findOne({
      _id: groupId,
      teacherId,
    })

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      )
    }

    if (action === "approve") {
      // Move from pending to members
      await db.collection<Group>("groups").updateOne(
        { _id: groupId },
        {
          $pull: { pendingRequests: studentObjectId },
          $addToSet: { memberIds: studentObjectId },
        }
      )
    } else {
      // Just remove from pending
      await db.collection<Group>("groups").updateOne(
        { _id: groupId },
        { $pull: { pendingRequests: studentObjectId } }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Member action error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    )
  }
}

// DELETE - remove a member from group
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: "Student ID is required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const groupId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)
    const studentObjectId = new ObjectId(studentId)

    const result = await db.collection<Group>("groups").updateOne(
      { _id: groupId, teacherId },
      { $pull: { memberIds: studentObjectId } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Remove member error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to remove member" },
      { status: 500 }
    )
  }
}
