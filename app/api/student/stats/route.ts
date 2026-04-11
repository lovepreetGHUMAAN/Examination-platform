// PATH: app/api/student/stats/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Group, Test, Submission } from "@/lib/types"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDatabase()
    const studentId = new ObjectId(session.user.id)
    const now = new Date()

    // Groups student is enrolled in
    const groups = await db
      .collection<Group>("groups")
      .find({ memberIds: studentId })
      .toArray()

    const groupIds = groups.map((g) => g._id!)

    // All published, currently available tests for these groups
    const availableTests = await db
      .collection<Test>("tests")
      .find({
        groupIds: { $in: groupIds },
        isPublished: true,
        availableFrom: { $lte: now },
        availableTo: { $gte: now },
      })
      .sort({ availableTo: 1 })
      .toArray()

    // Student's completed submissions
    const submissions = await db
      .collection<Submission>("submissions")
      .find({ studentId, status: { $in: ["submitted", "graded"] } })
      .sort({ submittedAt: -1 })
      .toArray()

    // In-progress submissions
    const inProgressSubs = await db
      .collection<Submission>("submissions")
      .find({ studentId, status: "in-progress" })
      .toArray()
    const inProgressTestIds = new Set(inProgressSubs.map((s) => s.testId.toString()))

    // Enrich available tests with submission status
    const enrichedTests = availableTests.map((test) => {
      const submitted = submissions.find((s) => s.testId.toString() === test._id!.toString())
      const inProgress = inProgressTestIds.has(test._id!.toString())
      const group = groups.find((g) =>
        test.groupIds.some((gid) => gid.toString() === g._id!.toString())
      )
      return {
        _id: test._id!.toString(),
        title: test.title,
        duration: test.duration,
        totalMarks: test.totalMarks,
        availableTo: test.availableTo,
        groupName: group?.name || "",
        submissionStatus: submitted ? submitted.status : inProgress ? "in-progress" : null,
      }
    })

    // Filter to only not-yet-submitted
    const notYetSubmitted = enrichedTests.filter(
      (t) => !t.submissionStatus || t.submissionStatus === "in-progress"
    )

    // Fetch tests for completed submissions to calculate scores
    const submittedTestIds = submissions.map((s) => s.testId)
    const submittedTests = await db
      .collection<Test>("tests")
      .find({ _id: { $in: submittedTestIds } })
      .toArray()

    const recentResults = submissions.slice(0, 5).map((sub) => {
      const test = submittedTests.find((t) => t._id!.toString() === sub.testId.toString())
      const hasSubjective = test?.questions?.some((q) => q.type === "subjective")
      const needsGrading = hasSubjective && sub.status === "submitted"
      return {
        _id: sub._id!.toString(),
        testTitle: test?.title || "Unknown",
        totalScore: sub.totalMarksAwarded ?? 0,
        maxScore: test?.totalMarks ?? 0,
        submittedAt: sub.submittedAt,
        needsGrading,
      }
    })

    // Avg and best score
    const scoredResults = recentResults.filter((r) => !r.needsGrading && r.maxScore > 0)
    const percentages = scoredResults.map((r) => Math.round((r.totalScore / r.maxScore) * 100))
    const avgScore =
      percentages.length > 0
        ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
        : null
    const bestScore = percentages.length > 0 ? Math.max(...percentages) : null

    // Enrich groups with teacher info
    const teacherIds = groups.map((g) => g.teacherId)
    const teachers = await db
      .collection("users")
      .find({ _id: { $in: teacherIds } }, { projection: { name: 1 } })
      .toArray()

    const enrichedGroups = groups.map((g) => {
      const teacher = teachers.find((t) => t._id.toString() === g.teacherId.toString())
      const testsForGroup = notYetSubmitted.filter((t) =>
        availableTests.find(
          (at) =>
            at._id!.toString() === t._id &&
            at.groupIds.some((gid) => gid.toString() === g._id!.toString())
        )
      )
      return {
        _id: g._id!.toString(),
        name: g.name,
        teacherName: teacher?.name || "Unknown",
        memberCount: (g.memberIds || []).length,
        availableTestsCount: testsForGroup.length,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        testsTaken: submissions.length,
        testsAvailable: notYetSubmitted.length,
        groupsJoined: groups.length,
        avgScore,
        bestScore,
        availableTests: notYetSubmitted.slice(0, 4),
        recentResults,
        groups: enrichedGroups,
      },
    })
  } catch (error) {
    console.error("Student stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}