import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Submission, User, Answer } from "@/lib/types"

// GET single submission with full details for grading
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
    const submissionId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)

    const submission = await db.collection<Submission>("submissions").findOne({
      _id: submissionId,
    })

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      )
    }

    // Verify teacher owns the test
    const test = await db.collection<Test>("tests").findOne({
      _id: submission.testId,
      teacherId,
    })

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Get student details
    const student = await db.collection<User>("users").findOne({
      _id: submission.studentId,
    })

    // Merge question details with answers
    const answersWithQuestions = test.questions.map((q) => {
      const answer = submission.answers.find((a) => a.questionId === q.id)
      return {
        question: {
          id: q.id,
          type: q.type,
          text: q.text,
          marks: q.marks,
          options: q.options,
          correctOptionId: q.correctOptionId,
          correctAnswer: q.correctAnswer,
          tolerance: q.tolerance,
          maxWords: q.maxWords,
        },
        answer: answer || { questionId: q.id, isGraded: false },
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        _id: submission._id!.toString(),
        testId: submission.testId.toString(),
        testTitle: test.title,
        totalMarks: test.totalMarks,
        studentId: submission.studentId.toString(),
        studentName: student?.name || "Unknown",
        studentEmail: student?.email || "",
        startedAt: submission.startedAt.toISOString(),
        submittedAt: submission.submittedAt?.toISOString(),
        status: submission.status,
        totalMarksAwarded: submission.totalMarksAwarded,
        answersWithQuestions,
      },
    })
  } catch (error) {
    console.error("Get submission error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch submission" },
      { status: 500 }
    )
  }
}

// PUT - grade submission
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

    const { grades } = await request.json()

    const db = await getDatabase()
    const submissionId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)

    const submission = await db.collection<Submission>("submissions").findOne({
      _id: submissionId,
    })

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      )
    }

    // Verify teacher owns the test
    const test = await db.collection<Test>("tests").findOne({
      _id: submission.testId,
      teacherId,
    })

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Update grades for each answer
    const updatedAnswers = submission.answers.map((answer) => {
      const gradeUpdate = grades.find((g: { questionId: string }) => g.questionId === answer.questionId)
      if (gradeUpdate) {
        return {
          ...answer,
          marksAwarded: gradeUpdate.marks,
          feedback: gradeUpdate.feedback,
          isGraded: true,
        }
      }
      return answer
    })

    // Check if all questions are graded
    const allGraded = updatedAnswers.every((a) => a.isGraded)

    // Calculate total marks
    const totalMarksAwarded = updatedAnswers.reduce(
      (sum, a) => sum + (a.marksAwarded || 0),
      0
    )

    await db.collection<Submission>("submissions").updateOne(
      { _id: submissionId },
      {
        $set: {
          answers: updatedAnswers,
          status: allGraded ? "graded" : "submitted",
          totalMarksAwarded: allGraded ? totalMarksAwarded : undefined,
        },
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        status: allGraded ? "graded" : "submitted",
        totalMarksAwarded: allGraded ? totalMarksAwarded : undefined,
      },
    })
  } catch (error) {
    console.error("Grade submission error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to grade submission" },
      { status: 500 }
    )
  }
}
