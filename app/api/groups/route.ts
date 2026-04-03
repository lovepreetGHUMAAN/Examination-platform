import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { nanoid } from "nanoid"
import type { Group, User } from "@/lib/types"

// GET all groups for a teacher
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = await getDatabase()
    const teacherId = new ObjectId(session.user.id)

    const groups = await db
      .collection<Group>("groups")
      .find({ teacherId })
      .sort({ createdAt: -1 })
      .toArray()

    const groupsWithDetails = groups.map((g) => ({
      _id: g._id!.toString(),
      name: g.name,
      description: g.description,
      inviteCode: g.inviteCode,
      memberCount: g.memberIds.length,
      pendingCount: g.pendingRequests.length,
      createdAt: g.createdAt.toISOString(),
    }))

    return NextResponse.json({ success: true, data: groupsWithDetails })
  } catch (error) {
    console.error("Get groups error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch groups" },
      { status: 500 }
    )
  }
}

// POST create new group
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Group name is required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const teacherId = new ObjectId(session.user.id)

    // Generate unique invite code
    const inviteCode = nanoid(8).toUpperCase()

    const newGroup: Group = {
      name,
      description: description || "",
      inviteCode,
      teacherId,
      memberIds: [],
      pendingRequests: [],
      createdAt: new Date(),
    }

    const result = await db.collection<Group>("groups").insertOne(newGroup)

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId.toString(),
        ...newGroup,
        teacherId: teacherId.toString(),
        memberIds: [],
        pendingRequests: [],
        createdAt: newGroup.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("Create group error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create group" },
      { status: 500 }
    )
  }
}
