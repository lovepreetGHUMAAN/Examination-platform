// PATH: app/api/submissions/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Submission, User } from "@/lib/types"

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
    const statusFilter = searchParams.get("status")

    const db = await getDatabase()
    const teacherId = new ObjectId(session.user.id)

    const testsQuery: Record<string, unknown> = { teacherId }
    if (testId) {
      testsQuery._id = new ObjectId(testId)
    }

    const tests = await db.collection<Test>("tests").find(testsQuery).toArray()
    const testIds = tests.map((t) => t._id!)
    const testMap = new Map<string, Test>()
    tests.forEach((t) => testMap.set(t._id!.toString(), t))

    const submissionsQuery: Record<string, unknown> = {
      testId: { $in: testIds },
      status: { $ne: "in-progress" },
    }
    if (statusFilter) {
      submissionsQuery.status = statusFilter
    }

    const submissions = await db
      .collection<Submission>("submissions")
      .find(submissionsQuery)
      .sort({ submittedAt: -1 })
      .toArray()

    const studentIds = [...new Set(submissions.map((s) => s.studentId))]
    const students = await db
      .collection<User>("users")
      .find({ _id: { $in: studentIds } })
      .project({ password: 0 })
      .toArray()

    const studentMap = new Map<string, User>()
    students.forEach((s) => studentMap.set(s._id!.toString(), s as User))

    const submissionsWithDetails = submissions.map((s) => {
      const test = testMap.get(s.testId.toString())
      const student = studentMap.get(s.studentId.toString())
      const hasSubjective = test?.questions.some((q) => q.type === "subjective") ?? false
      // needsGrading = has subjective questions AND not yet fully graded
      const needsGrading = hasSubjective && s.status === "submitted"

      return {
        _id: s._id!.toString(),
        testId: s.testId.toString(),
        testTitle: test?.title ?? "Unknown Test",
        studentId: s.studentId.toString(),
        studentName: student?.name ?? "Unknown",
        studentEmail: student?.email ?? "",
        submittedAt: s.submittedAt?.toISOString(),
        startedAt: s.startedAt.toISOString(),
        status: s.status,
        // Use consistent field names the UI expects
        totalScore: s.totalMarksAwarded ?? 0,
        maxScore: test?.totalMarks ?? 0,
        needsGrading,
      }
    })

    return NextResponse.json({ success: true, submissions: submissionsWithDetails })
  } catch (error) {
    console.error("Get submissions error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}