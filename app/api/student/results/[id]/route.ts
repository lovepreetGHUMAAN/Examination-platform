import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Submission } from "@/lib/types"

// GET single result with full details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session || session.user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = await getDatabase()
    const submissionId = new ObjectId(id)
    const studentId = new ObjectId(session.user.id)

    const submission = await db.collection<Submission>("submissions").findOne({
      _id: submissionId,
      studentId,
    })

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Result not found" },
        { status: 404 }
      )
    }

    // Get test details
    const test = await db.collection<Test>("tests").findOne({
      _id: submission.testId,
    })

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Test not found" },
        { status: 404 }
      )
    }

    // Merge question details with answers (without revealing correct answers for ungraded)
    const answersWithQuestions = test.questions.map((q) => {
      const answer = submission.answers.find((a) => a.questionId === q.id)
      const showCorrect = submission.status === "graded"

      return {
        question: {
          id: q.id,
          type: q.type,
          text: q.text,
          marks: q.marks,
          options: q.options?.map((o) => ({
            id: o.id,
            text: o.text,
            isCorrect: showCorrect && o.id === q.correctOptionId,
          })),
          correctAnswer: showCorrect && q.type === "numerical" ? q.correctAnswer : undefined,
          tolerance: showCorrect && q.type === "numerical" ? q.tolerance : undefined,
          maxWords: q.maxWords,
        },
        answer: {
          selectedOptionId: answer?.selectedOptionId,
          numericalAnswer: answer?.numericalAnswer,
          textAnswer: answer?.textAnswer,
          marksAwarded: answer?.marksAwarded,
          feedback: answer?.feedback,
          isGraded: answer?.isGraded,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        _id: submission._id!.toString(),
        testId: submission.testId.toString(),
        testTitle: test.title,
        totalMarks: test.totalMarks,
        startedAt: submission.startedAt.toISOString(),
        submittedAt: submission.submittedAt?.toISOString(),
        status: submission.status,
        totalMarksAwarded: submission.totalMarksAwarded,
        percentage:
          submission.status === "graded" && submission.totalMarksAwarded !== undefined
            ? Math.round((submission.totalMarksAwarded / test.totalMarks) * 100)
            : null,
        answersWithQuestions,
      },
    })
  } catch (error) {
    console.error("Get result error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch result" },
      { status: 500 }
    )
  }
}
