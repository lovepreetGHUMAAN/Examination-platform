// PATH: app/api/student/results/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Submission, User } from "@/lib/types"

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

    const submissions = await db
      .collection<Submission>("submissions")
      .find({ studentId, status: { $ne: "in-progress" } })
      .sort({ submittedAt: -1 })
      .toArray()

    const testIds = submissions.map((s) => s.testId)
    const tests = await db
      .collection<Test>("tests")
      .find({ _id: { $in: testIds } })
      .toArray()

    const testMap = new Map<string, Test>()
    tests.forEach((t) => testMap.set(t._id!.toString(), t))

    const teacherIds = [...new Set(tests.map((t) => t.teacherId))]
    const teachers = await db
      .collection<User>("users")
      .find({ _id: { $in: teacherIds } })
      .project({ password: 0 })
      .toArray()

    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t._id!.toString(), t.name))

    // Map to field names ResultsPage expects: totalScore, maxScore, needsGrading
    const results = submissions.map((s) => {
      const test = testMap.get(s.testId.toString())
      const hasSubjective = test?.questions.some((q) => q.type === "subjective") ?? false
      const needsGrading = hasSubjective && s.status === "submitted"

      return {
        _id: s._id!.toString(),
        testId: s.testId.toString(),
        testTitle: test?.title ?? "Unknown Test",
        teacherName: test ? (teacherMap.get(test.teacherId.toString()) ?? "Unknown") : "Unknown",
        submittedAt: s.submittedAt?.toISOString(),
        status: s.status,
        // Field names the UI reads
        totalScore: s.totalMarksAwarded ?? 0,
        maxScore: test?.totalMarks ?? 0,
        needsGrading,
        timeTaken:
          s.submittedAt && s.startedAt
            ? Math.round(
                (new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime()) / 1000
              )
            : null,
      }
    })

    // Response key the UI reads: data.results
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("Get results error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch results" },
      { status: 500 }
    )
  }
}