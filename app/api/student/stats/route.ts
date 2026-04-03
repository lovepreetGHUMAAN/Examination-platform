import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Group, Test, Submission } from "@/lib/types"

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

    // Get pending join requests
    const pendingRequests = await db
      .collection<Group>("groups")
      .countDocuments({ pendingRequests: studentId })

    // Get available tests
    const now = new Date()
    const groupIds = enrolledGroups.map((g) => g._id!)

    const availableTests = await db
      .collection<Test>("tests")
      .find({
        groupIds: { $in: groupIds },
        isPublished: true,
        availableFrom: { $lte: now },
        availableTo: { $gte: now },
      })
      .toArray()

    // Filter out tests already completed
    const submissions = await db
      .collection<Submission>("submissions")
      .find({ studentId })
      .toArray()

    const completedTestIds = new Set(
      submissions
        .filter((s) => s.status === "submitted" || s.status === "graded")
        .map((s) => s.testId.toString())
    )

    const testsNotCompleted = availableTests.filter(
      (t) => !completedTestIds.has(t._id!.toString())
    )

    // Get completed tests count
    const completedTests = submissions.filter(
      (s) => s.status === "submitted" || s.status === "graded"
    ).length

    // Calculate average score
    const gradedSubmissions = submissions.filter((s) => s.status === "graded")
    let averageScore: number | undefined
    if (gradedSubmissions.length > 0) {
      const testMap = new Map<string, Test>()
      const testIdsToFetch = gradedSubmissions.map((s) => s.testId)
      const testsForScores = await db
        .collection<Test>("tests")
        .find({ _id: { $in: testIdsToFetch } })
        .toArray()
      testsForScores.forEach((t) => testMap.set(t._id!.toString(), t))

      let totalPercentage = 0
      let count = 0
      gradedSubmissions.forEach((s) => {
        const test = testMap.get(s.testId.toString())
        if (test && s.totalMarksAwarded !== undefined) {
          totalPercentage += (s.totalMarksAwarded / test.totalMarks) * 100
          count++
        }
      })
      if (count > 0) {
        averageScore = Math.round(totalPercentage / count)
      }
    }

    // Get upcoming tests with group names
    const groupMap = new Map<string, string>()
    enrolledGroups.forEach((g) => groupMap.set(g._id!.toString(), g.name))

    const upcomingTests = testsNotCompleted.slice(0, 3).map((t) => {
      const groupName = t.groupIds
        .map((gid) => groupMap.get(gid.toString()))
        .filter(Boolean)[0] || "Unknown"
      return {
        _id: t._id!.toString(),
        title: t.title,
        duration: t.duration,
        availableTo: t.availableTo.toISOString(),
        groupName,
      }
    })

    // Get recent results
    const recentSubmissions = await db
      .collection<Submission>("submissions")
      .find({
        studentId,
        status: { $in: ["submitted", "graded"] },
      })
      .sort({ submittedAt: -1 })
      .limit(3)
      .toArray()

    const testIdsForResults = recentSubmissions.map((s) => s.testId)
    const testsForResults = await db
      .collection<Test>("tests")
      .find({ _id: { $in: testIdsForResults } })
      .toArray()
    const testResultMap = new Map<string, Test>()
    testsForResults.forEach((t) => testResultMap.set(t._id!.toString(), t))

    const recentResults = recentSubmissions.map((s) => {
      const test = testResultMap.get(s.testId.toString())
      return {
        _id: s._id!.toString(),
        testTitle: test?.title || "Unknown Test",
        totalMarksAwarded: s.totalMarksAwarded || 0,
        totalMarks: test?.totalMarks || 100,
        status: s.status,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        enrolledGroups: enrolledGroups.length,
        pendingRequests,
        availableTests: testsNotCompleted.length,
        completedTests,
        averageScore,
        upcomingTests,
        recentResults,
      },
    })
  } catch (error) {
    console.error("Student stats error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
