import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Submission, User } from "@/lib/types"

// GET student's results
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

    // Get student's submissions
    const submissions = await db
      .collection<Submission>("submissions")
      .find({
        studentId,
        status: { $ne: "in-progress" },
      })
      .sort({ submittedAt: -1 })
      .toArray()

    // Get test details
    const testIds = submissions.map((s) => s.testId)
    const tests = await db
      .collection<Test>("tests")
      .find({ _id: { $in: testIds } })
      .toArray()

    const testMap = new Map<string, Test>()
    tests.forEach((t) => testMap.set(t._id!.toString(), t))

    // Get teacher names
    const teacherIds = [...new Set(tests.map((t) => t.teacherId))]
    const teachers = await db
      .collection<User>("users")
      .find({ _id: { $in: teacherIds } })
      .project({ password: 0 })
      .toArray()

    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t._id!.toString(), t.name))

    const results = submissions.map((s) => {
      const test = testMap.get(s.testId.toString())
      return {
        _id: s._id!.toString(),
        testId: s.testId.toString(),
        testTitle: test?.title || "Unknown Test",
        totalMarks: test?.totalMarks || 0,
        teacherName: test ? teacherMap.get(test.teacherId.toString()) || "Unknown" : "Unknown",
        submittedAt: s.submittedAt?.toISOString(),
        status: s.status,
        totalMarksAwarded: s.totalMarksAwarded,
        percentage:
          s.status === "graded" && s.totalMarksAwarded !== undefined && test
            ? Math.round((s.totalMarksAwarded / test.totalMarks) * 100)
            : null,
      }
    })

    return NextResponse.json({ success: true, data: results })
  } catch (error) {
    console.error("Get results error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch results" },
      { status: 500 }
    )
  }
}
