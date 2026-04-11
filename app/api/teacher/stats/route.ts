// PATH: app/api/teacher/stats/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Group, Test, Submission } from "@/lib/types"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDatabase()
    const teacherId = new ObjectId(session.user.id)

    // All teacher's tests
    const tests = await db
      .collection<Test>("tests")
      .find({ teacherId })
      .sort({ createdAt: -1 })
      .toArray()

    const testIds = tests.map((t) => t._id!)

    // All submissions for those tests
    const submissions = await db
      .collection<Submission>("submissions")
      .find({ testId: { $in: testIds }, status: { $in: ["submitted", "graded"] } })
      .toArray()

    // Teacher's groups
    const groups = await db
      .collection<Group>("groups")
      .find({ teacherId })
      .toArray()

    // Count unique students across all groups
    const allMemberIds = groups.flatMap((g) => g.memberIds || [])
    const uniqueStudentIds = new Set(allMemberIds.map((id) => id.toString()))

    // Pending grading: submitted tests that have subjective questions
    const pendingSubmissions = submissions.filter((s) => {
      const test = tests.find((t) => t._id!.toString() === s.testId.toString())
      if (!test) return false
      const hasSubjective = test.questions.some((q) => q.type === "subjective")
      return hasSubjective && s.status === "submitted"
    })

    // Enrich pending submissions with student name and test title
    const studentIds = pendingSubmissions.slice(0, 5).map((s) => s.studentId)
    const students = await db
      .collection("users")
      .find({ _id: { $in: studentIds } }, { projection: { name: 1 } })
      .toArray()

    const pendingWithDetails = pendingSubmissions.slice(0, 5).map((sub) => {
      const student = students.find((u) => u._id.toString() === sub.studentId.toString())
      const test = tests.find((t) => t._id!.toString() === sub.testId.toString())
      return {
        _id: sub._id!.toString(),
        studentName: student?.name || "Unknown",
        testTitle: test?.title || "Unknown Test",
        submittedAt: sub.submittedAt,
      }
    })

    // Avg score across all graded submissions
    const gradedSubs = submissions.filter((s) => s.totalMarksAwarded != null)
    let avgScore: number | null = null
    if (gradedSubs.length > 0) {
      const scores = gradedSubs
        .map((s) => {
          const test = tests.find((t) => t._id!.toString() === s.testId.toString())
          return test ? Math.round(((s.totalMarksAwarded ?? 0) / test.totalMarks) * 100) : null
        })
        .filter((s): s is number => s !== null)
      if (scores.length > 0) {
        avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      }
    }

    // Groups with member/pending counts
    const groupsWithCounts = groups.map((g) => ({
      _id: g._id!.toString(),
      name: g.name,
      inviteCode: g.inviteCode,
      memberCount: (g.memberIds || []).length,
      pendingCount: (g.pendingRequests || []).length,
    }))

    // Recent tests with submission counts
    const recentTests = tests.slice(0, 5).map((t) => ({
      _id: t._id!.toString(),
      title: t.title,
      isPublished: t.isPublished,
      submissionCount: submissions.filter((s) => s.testId.toString() === t._id!.toString()).length,
      createdAt: t.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalTests: tests.length,
        publishedTests: tests.filter((t) => t.isPublished).length,
        totalGroups: groups.length,
        totalStudents: uniqueStudentIds.size,
        totalSubmissions: submissions.length,
        pendingGrading: pendingSubmissions.length,
        avgScore,
        recentTests,
        pendingSubmissions: pendingWithDetails,
        groups: groupsWithCounts,
      },
    })
  } catch (error) {
    console.error("Teacher stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}