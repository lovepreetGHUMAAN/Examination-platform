import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Submission, User } from "@/lib/types"

// GET submissions for a teacher's tests
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "teacher") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const testId = searchParams.get("testId")
    const status = searchParams.get("status")

    const db = await getDatabase()
    const teacherId = new ObjectId(session.user.id)

    // Get teacher's tests
    const testsQuery: Record<string, unknown> = { teacherId }
    if (testId) {
      testsQuery._id = new ObjectId(testId)
    }

    const tests = await db
      .collection<Test>("tests")
      .find(testsQuery)
      .toArray()

    const testIds = tests.map((t) => t._id!)
    const testMap = new Map<string, Test>()
    tests.forEach((t) => testMap.set(t._id!.toString(), t))

    // Get submissions
    const submissionsQuery: Record<string, unknown> = {
      testId: { $in: testIds },
      status: { $ne: "in-progress" },
    }

    if (status) {
      submissionsQuery.status = status
    }

    const submissions = await db
      .collection<Submission>("submissions")
      .find(submissionsQuery)
      .sort({ submittedAt: -1 })
      .toArray()

    // Get student details
    const studentIds = [...new Set(submissions.map((s) => s.studentId))]
    const students = await db
      .collection<User>("users")
      .find({ _id: { $in: studentIds } })
      .project({ password: 0 })
      .toArray()

    const studentMap = new Map<string, User>()
    students.forEach((s) => studentMap.set(s._id!.toString(), s))

    const submissionsWithDetails = submissions.map((s) => {
      const test = testMap.get(s.testId.toString())
      const student = studentMap.get(s.studentId.toString())

      return {
        _id: s._id!.toString(),
        testId: s.testId.toString(),
        testTitle: test?.title || "Unknown Test",
        totalMarks: test?.totalMarks || 0,
        studentId: s.studentId.toString(),
        studentName: student?.name || "Unknown",
        studentEmail: student?.email || "",
        submittedAt: s.submittedAt?.toISOString(),
        status: s.status,
        totalMarksAwarded: s.totalMarksAwarded,
        hasSubjectiveQuestions: test?.questions.some((q) => q.type === "subjective") || false,
      }
    })

    return NextResponse.json({ success: true, data: submissionsWithDetails })
  } catch (error) {
    console.error("Get submissions error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}
