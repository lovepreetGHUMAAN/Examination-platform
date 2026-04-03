import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Group, User } from "@/lib/types"

// GET single group with members
export async function GET(
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

    const db = await getDatabase()
    const groupId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)

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

    // Get member details
    const members = await db
      .collection<User>("users")
      .find({ _id: { $in: group.memberIds } })
      .project({ password: 0 })
      .toArray()

    // Get pending request details
    const pendingUsers = await db
      .collection<User>("users")
      .find({ _id: { $in: group.pendingRequests } })
      .project({ password: 0 })
      .toArray()

    return NextResponse.json({
      success: true,
      data: {
        _id: group._id!.toString(),
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        createdAt: group.createdAt.toISOString(),
        members: members.map((m) => ({
          _id: m._id!.toString(),
          name: m.name,
          email: m.email,
        })),
        pendingRequests: pendingUsers.map((u) => ({
          _id: u._id!.toString(),
          name: u.name,
          email: u.email,
        })),
      },
    })
  } catch (error) {
    console.error("Get group error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch group" },
      { status: 500 }
    )
  }
}

// PUT update group
export async function PUT(
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

    const { name, description } = await request.json()

    const db = await getDatabase()
    const groupId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)

    const result = await db.collection<Group>("groups").updateOne(
      { _id: groupId, teacherId },
      { $set: { name, description } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update group error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update group" },
      { status: 500 }
    )
  }
}

// DELETE group
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

    const db = await getDatabase()
    const groupId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)

    const result = await db.collection<Group>("groups").deleteOne({
      _id: groupId,
      teacherId,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Group not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete group error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete group" },
      { status: 500 }
    )
  }
}
