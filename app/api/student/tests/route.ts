import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Group, Submission, User } from "@/lib/types"

// GET available tests for student
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
    const now = new Date()

    // Get student's enrolled groups
    const enrolledGroups = await db
      .collection<Group>("groups")
      .find({ memberIds: studentId })
      .toArray()

    const groupIds = enrolledGroups.map((g) => g._id!)

    // Get available tests
    const tests = await db
      .collection<Test>("tests")
      .find({
        groupIds: { $in: groupIds },
        isPublished: true,
        availableFrom: { $lte: now },
        availableTo: { $gte: now },
      })
      .toArray()

    // Get student's submissions for these tests
    const testIds = tests.map((t) => t._id!)
    const submissions = await db
      .collection<Submission>("submissions")
      .find({ testId: { $in: testIds }, studentId })
      .toArray()

    const submissionMap = new Map<string, Submission>()
    submissions.forEach((s) => submissionMap.set(s.testId.toString(), s))

    // Get teacher names
    const teacherIds = [...new Set(tests.map((t) => t.teacherId))]
    const teachers = await db
      .collection<User>("users")
      .find({ _id: { $in: teacherIds } })
      .project({ password: 0 })
      .toArray()

    const teacherMap = new Map<string, string>()
    teachers.forEach((t) => teacherMap.set(t._id!.toString(), t.name))

    // Get group names map
    const groupMap = new Map<string, string>()
    enrolledGroups.forEach((g) => groupMap.set(g._id!.toString(), g.name))

    const testsWithStatus = tests.map((t) => {
      const submission = submissionMap.get(t._id!.toString())
      const groupName = t.groupIds
        .map((gid) => groupMap.get(gid.toString()))
        .filter(Boolean)[0] || "Unknown"

      return {
        _id: t._id!.toString(),
        title: t.title,
        description: t.description,
        questionCount: t.questions.length,
        totalMarks: t.totalMarks,
        duration: t.duration,
        availableFrom: t.availableFrom.toISOString(),
        availableTo: t.availableTo.toISOString(),
        teacherName: teacherMap.get(t.teacherId.toString()) || "Unknown",
        groupName,
        submissionStatus: submission?.status || null,
        submissionId: submission?._id?.toString() || null,
      }
    })

    return NextResponse.json({ success: true, data: testsWithStatus })
  } catch (error) {
    console.error("Get student tests error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch tests" },
      { status: 500 }
    )
  }
}
