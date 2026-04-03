import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Group, Test, Submission } from "@/lib/types"

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

    // Get total groups and students
    const groups = await db
      .collection<Group>("groups")
      .find({ teacherId })
      .toArray()

    const totalGroups = groups.length
    const totalStudents = groups.reduce((sum, g) => sum + g.memberIds.length, 0)

    // Get tests stats
    const tests = await db
      .collection<Test>("tests")
      .find({ teacherId })
      .toArray()

    const totalTests = tests.length
    const publishedTests = tests.filter((t) => t.isPublished).length

    // Get pending submissions that need grading
    const testIds = tests.map((t) => t._id!)
    const pendingSubmissions = await db
      .collection<Submission>("submissions")
      .countDocuments({
        testId: { $in: testIds },
        status: "submitted",
      })

    // Get recent groups
    const recentGroups = await db
      .collection<Group>("groups")
      .find({ teacherId })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray()

    const recentGroupsData = recentGroups.map((g) => ({
      _id: g._id!.toString(),
      name: g.name,
      memberCount: g.memberIds.length,
    }))

    // Get recent tests
    const recentTests = await db
      .collection<Test>("tests")
      .find({ teacherId })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray()

    const recentTestsData = recentTests.map((t) => ({
      _id: t._id!.toString(),
      title: t.title,
      isPublished: t.isPublished,
    }))

    return NextResponse.json({
      success: true,
      data: {
        totalGroups,
        totalStudents,
        totalTests,
        publishedTests,
        pendingSubmissions,
        recentGroups: recentGroupsData,
        recentTests: recentTestsData,
      },
    })
  } catch (error) {
    console.error("Teacher stats error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
