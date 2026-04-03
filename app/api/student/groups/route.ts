import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Group, User } from "@/lib/types"

// GET - get student's enrolled groups and pending requests
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = await getDatabase()
    const studentId = new ObjectId(session.user.id)

    // Get enrolled groups
    const enrolledGroups = await db
      .collection<Group>("groups")
      .find({ memberIds: studentId })
      .toArray()

    // Get pending requests
    const pendingGroups = await db
      .collection<Group>("groups")
      .find({ pendingRequests: studentId })
      .toArray()

    // Get teacher names
    const teacherIds = [
      ...enrolledGroups.map((g) => g.teacherId),
      ...pendingGroups.map((g) => g.teacherId),
    ]
    const teachers = await db
      .collection<User>("users")
      .find({ _id: { $in: teacherIds } })
      .project({ password: 0 })
      .toArray()

    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t._id!.toString(), t.name))

    const enrolledData = enrolledGroups.map((g) => ({
      _id: g._id!.toString(),
      name: g.name,
      description: g.description,
      teacherName: teacherMap.get(g.teacherId.toString()) || "Unknown",
      memberCount: g.memberIds.length,
    }))

    const pendingData = pendingGroups.map((g) => ({
      _id: g._id!.toString(),
      name: g.name,
      description: g.description,
      teacherName: teacherMap.get(g.teacherId.toString()) || "Unknown",
    }))

    return NextResponse.json({
      success: true,
      data: {
        enrolled: enrolledData,
        pending: pendingData,
      },
    })
  } catch (error) {
    console.error("Get student groups error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch groups" },
      { status: 500 }
    )
  }
}

// POST - request to join a group using invite code
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { inviteCode } = await request.json()

    if (!inviteCode) {
      return NextResponse.json(
        { success: false, error: "Invite code is required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const studentId = new ObjectId(session.user.id)

    const group = await db.collection<Group>("groups").findOne({
      inviteCode: inviteCode.toUpperCase(),
    })

    if (!group) {
      return NextResponse.json(
        { success: false, error: "Invalid invite code" },
        { status: 404 }
      )
    }

    // Check if already a member
    if (group.memberIds.some((id) => id.equals(studentId))) {
      return NextResponse.json(
        { success: false, error: "You are already a member of this group" },
        { status: 400 }
      )
    }

    // Check if already has pending request
    if (group.pendingRequests.some((id) => id.equals(studentId))) {
      return NextResponse.json(
        { success: false, error: "You already have a pending request for this group" },
        { status: 400 }
      )
    }

    // Add to pending requests
    await db.collection<Group>("groups").updateOne(
      { _id: group._id },
      { $addToSet: { pendingRequests: studentId } }
    )

    return NextResponse.json({
      success: true,
      data: { message: "Join request sent successfully" },
    })
  } catch (error) {
    console.error("Join group error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to send join request" },
      { status: 500 }
    )
  }
}
