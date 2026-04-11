// PATH: app/api/student/results/[id]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Submission } from "@/lib/types"

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

    const submission = await db
      .collection<Submission>("submissions")
      .findOne({ _id: submissionId, studentId })

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Result not found" },
        { status: 404 }
      )
    }

    const test = await db
      .collection<Test>("tests")
      .findOne({ _id: submission.testId })

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Test not found" },
        { status: 404 }
      )
    }

    const showCorrect = submission.status === "graded"

    // Build answers array the ResultDetailPage reads:
    // answer.answer, answer.isCorrect, answer.score, answer.feedback
    const answers = test.questions.map((q) => {
      const saved = submission.answers.find((a) => a.questionId === q.id)

      const isCorrect = (() => {
        if (!saved) return false
        if (q.type === "mcq") return saved.selectedOptionId === q.correctOptionId
        if (q.type === "numerical" && saved.numericalAnswer !== undefined) {
          const tolerance = q.tolerance ?? 0
          return Math.abs(saved.numericalAnswer - (q.correctAnswer ?? 0)) <= tolerance
        }
        return false
      })()

      return {
        questionId: q.id,
        // Generic answer field the UI reads as answer.answer
        answer:
          q.type === "mcq"
            ? q.options?.find((o) => o.id === saved?.selectedOptionId)?.text ?? null
            : q.type === "numerical"
            ? saved?.numericalAnswer?.toString() ?? null
            : saved?.textAnswer ?? null,
        isCorrect,
        // UI reads answer.score for subjective marks
        score: saved?.marksAwarded,
        feedback: saved?.feedback,
        isGraded: saved?.isGraded ?? false,
      }
    })

    // Build questions array the ResultDetailPage reads:
    // question.text, question.type, question.points, question.options (strings),
    // question.correctAnswer (string), question.tolerance
    const questions = test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      points: q.marks, // UI reads question.points
      options: q.options?.map((o) => o.text) ?? [],
      correctAnswer: showCorrect
        ? q.type === "mcq"
          ? q.options?.find((o) => o.id === q.correctOptionId)?.text ?? null
          : q.type === "numerical"
          ? q.correctAnswer
          : null
        : null,
      tolerance: showCorrect ? q.tolerance : undefined,
      maxWords: q.maxWords,
    }))

    const totalScore = submission.totalMarksAwarded ?? 0
    const maxScore = test.totalMarks

    return NextResponse.json({
      success: true,
      // Shape ResultDetailPage expects: data.submission and data.test
      submission: {
        _id: submission._id!.toString(),
        testId: submission.testId.toString(),
        totalScore,
        maxScore,
        submittedAt: submission.submittedAt?.toISOString(),
        startedAt: submission.startedAt.toISOString(),
        status: submission.status,
        answers,
      },
      test: {
        _id: test._id!.toString(),
        title: test.title,
        totalMarks: test.totalMarks,
        questions,
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