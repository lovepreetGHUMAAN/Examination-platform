import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Group, Submission } from "@/lib/types"
import { DEFAULT_ANTI_CHEATING } from "@/lib/types"

// GET single test with details
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
    const testId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)

    const test = await db.collection<Test>("tests").findOne({ _id: testId, teacherId })

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Test not found" },
        { status: 404 }
      )
    }

    const groups = await db
      .collection<Group>("groups")
      .find({ _id: { $in: test.groupIds } })
      .toArray()

    const submissionCount = await db
      .collection<Submission>("submissions")
      .countDocuments({ testId })

    return NextResponse.json({
      success: true,
      data: {
        _id: test._id!.toString(),
        title: test.title,
        description: test.description,
        questions: test.questions,
        duration: test.duration,
        availableFrom: test.availableFrom.toISOString(),
        availableTo: test.availableTo.toISOString(),
        totalMarks: test.totalMarks,
        isPublished: test.isPublished,
        antiCheating: test.antiCheating ?? DEFAULT_ANTI_CHEATING,
        createdAt: test.createdAt.toISOString(),
        groups: groups.map((g) => ({ _id: g._id!.toString(), name: g.name })),
        submissionCount,
      },
    })
  } catch (error) {
    console.error("Get test error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch test" },
      { status: 500 }
    )
  }
}

// PUT update test
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
      antiCheating,
    } = body

    const db = await getDatabase()
    const testId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)

    const totalMarks = questions
      ? questions.reduce((sum: number, q: { marks: number }) => sum + q.marks, 0)
      : undefined

    const updateData: Partial<Test> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (questions !== undefined) {
      updateData.questions = questions
      updateData.totalMarks = totalMarks
    }
    if (duration !== undefined) updateData.duration = duration
    if (availableFrom !== undefined) updateData.availableFrom = new Date(availableFrom)
    if (availableTo !== undefined) updateData.availableTo = new Date(availableTo)
    if (groupIds !== undefined)
      updateData.groupIds = groupIds.map((gid: string) => new ObjectId(gid))
    if (isPublished !== undefined) updateData.isPublished = isPublished
    if (antiCheating !== undefined)
      updateData.antiCheating = { ...DEFAULT_ANTI_CHEATING, ...antiCheating }

    const result = await db
      .collection<Test>("tests")
      .updateOne({ _id: testId, teacherId }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Test not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update test error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update test" },
      { status: 500 }
    )
  }
}

// DELETE test
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
    const testId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)

    await db.collection<Submission>("submissions").deleteMany({ testId })

    const result = await db
      .collection<Test>("tests")
      .deleteOne({ _id: testId, teacherId })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Test not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete test error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete test" },
      { status: 500 }
    )
  }
}