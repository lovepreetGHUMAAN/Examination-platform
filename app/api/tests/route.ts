import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Group } from "@/lib/types"

// GET all tests for a teacher
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

    const tests = await db
      .collection<Test>("tests")
      .find({ teacherId })
      .sort({ createdAt: -1 })
      .toArray()

    // Get group names
    const groupIds = tests.flatMap((t) => t.groupIds)
    const groups = await db
      .collection<Group>("groups")
      .find({ _id: { $in: groupIds } })
      .toArray()

    const groupMap = new Map<string, string>()
    groups.forEach((g) => groupMap.set(g._id!.toString(), g.name))

    const testsWithDetails = tests.map((t) => ({
      _id: t._id!.toString(),
      title: t.title,
      description: t.description,
      questionCount: t.questions.length,
      totalMarks: t.totalMarks,
      duration: t.duration,
      isPublished: t.isPublished,
      availableFrom: t.availableFrom.toISOString(),
      availableTo: t.availableTo.toISOString(),
      groupNames: t.groupIds.map((gid) => groupMap.get(gid.toString()) || "Unknown"),
      createdAt: t.createdAt.toISOString(),
    }))

    return NextResponse.json({ success: true, data: testsWithDetails })
  } catch (error) {
    console.error("Get tests error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch tests" },
      { status: 500 }
    )
  }
}

// POST create new test
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      questions,
      duration,
      availableFrom,
      availableTo,
      groupIds,
      isPublished,
    } = body

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: "Title and at least one question are required" },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const teacherId = new ObjectId(session.user.id)

    // Calculate total marks
    const totalMarks = questions.reduce((sum: number, q: { marks: number }) => sum + q.marks, 0)

    const newTest: Test = {
      title,
      description: description || "",
      teacherId,
      groupIds: (groupIds || []).map((id: string) => new ObjectId(id)),
      questions,
      duration: duration || 60,
      availableFrom: new Date(availableFrom || Date.now()),
      availableTo: new Date(availableTo || Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalMarks,
      isPublished: isPublished || false,
      createdAt: new Date(),
    }

    const result = await db.collection<Test>("tests").insertOne(newTest)

    return NextResponse.json({
      success: true,
      data: {
        _id: result.insertedId.toString(),
      },
    })
  } catch (error) {
    console.error("Create test error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create test" },
      { status: 500 }
    )
  }
}
