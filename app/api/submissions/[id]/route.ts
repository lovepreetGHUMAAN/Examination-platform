// PATH: app/api/submissions/[id]/route.ts
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

    const submission = await db
      .collection<Submission>("submissions")
      .findOne({ _id: submissionId })

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      )
    }

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

    const student = await db
      .collection<User>("users")
      .findOne({ _id: submission.studentId })

    // Build a flat answers array aligned to test.questions order,
    // using field names the SubmissionDetailPage component reads
    const answers = test.questions.map((q) => {
      const saved = submission.answers.find((a) => a.questionId === q.id)
      return {
        questionId: q.id,
        // The answer value (used generically as answer.answer in the UI)
        answer:
          saved?.selectedOptionId ??
          saved?.numericalAnswer?.toString() ??
          saved?.textAnswer ??
          null,
        // Keep structured fields too
        selectedOptionId: saved?.selectedOptionId,
        numericalAnswer: saved?.numericalAnswer,
        textAnswer: saved?.textAnswer,
        // Grading fields — UI reads answer.score
        score: saved?.marksAwarded,
        feedback: saved?.feedback ?? "",
        isGraded: saved?.isGraded ?? false,
        // Correctness for objective questions
        isCorrect: (() => {
          if (!saved) return false
          if (q.type === "mcq") return saved.selectedOptionId === q.correctOptionId
          if (q.type === "numerical" && saved.numericalAnswer !== undefined) {
            const tolerance = q.tolerance ?? 0
            return Math.abs(saved.numericalAnswer - (q.correctAnswer ?? 0)) <= tolerance
          }
          return false
        })(),
      }
    })

    // Build questions array with the field names the UI reads (question.points not question.marks,
    // question.correctAnswer as string for display)
    const questions = test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      points: q.marks, // UI reads question.points
      marks: q.marks,
      options: q.options?.map((o) => o.text) ?? [], // UI iterates option strings
      correctAnswer:
        q.type === "mcq"
          ? q.options?.find((o) => o.id === q.correctOptionId)?.text ?? null
          : q.type === "numerical"
          ? q.correctAnswer
          : null,
      tolerance: q.tolerance,
      maxWords: q.maxWords,
    }))

    const totalScore = submission.totalMarksAwarded ?? 0
    const needsGrading =
      test.questions.some((q) => q.type === "subjective") &&
      submission.status === "submitted"

    return NextResponse.json({
      success: true,
      // Shape the UI expects: data.submission and data.test
      submission: {
        _id: submission._id!.toString(),
        testId: submission.testId.toString(),
        studentId: submission.studentId.toString(),
        studentName: student?.name ?? "Unknown",
        studentEmail: student?.email ?? "",
        startedAt: submission.startedAt.toISOString(),
        submittedAt: submission.submittedAt?.toISOString(),
        status: submission.status,
        totalScore,
        maxScore: test.totalMarks,
        needsGrading,
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
    console.error("Get submission error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch submission" },
      { status: 500 }
    )
  }
}

// PATCH - grade submission (frontend sends PATCH with grades keyed by question index)
export async function PATCH(
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

    // grades: Record<number, { score: number; feedback: string }>
    const { grades } = await request.json()

    const db = await getDatabase()
    const submissionId = new ObjectId(id)
    const teacherId = new ObjectId(session.user.id)

    const submission = await db
      .collection<Submission>("submissions")
      .findOne({ _id: submissionId })

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      )
    }

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

    // grades is indexed by question position in test.questions
    const updatedAnswers: Answer[] = test.questions.map((q, index) => {
      const existing = submission.answers.find((a) => a.questionId === q.id) ?? {
        questionId: q.id,
        isGraded: false,
      }

      const gradeUpdate = grades[index]

      if (q.type === "subjective" && gradeUpdate !== undefined) {
        return {
          ...existing,
          marksAwarded: gradeUpdate.score,
          feedback: gradeUpdate.feedback ?? "",
          isGraded: true,
        }
      }

      // For objective questions, auto-grade if not already done
      if (!existing.isGraded) {
        let marksAwarded = 0
        let isCorrect = false
        if (q.type === "mcq" && existing.selectedOptionId) {
          isCorrect = existing.selectedOptionId === q.correctOptionId
          marksAwarded = isCorrect ? q.marks : 0
        } else if (q.type === "numerical" && existing.numericalAnswer !== undefined) {
          const tolerance = q.tolerance ?? 0
          isCorrect = Math.abs(existing.numericalAnswer - (q.correctAnswer ?? 0)) <= tolerance
          marksAwarded = isCorrect ? q.marks : 0
        }
        return { ...existing, marksAwarded, isGraded: true }
      }

      return existing as Answer
    })

    const allGraded = updatedAnswers.every((a) => a.isGraded)
    const totalMarksAwarded = updatedAnswers.reduce(
      (sum, a) => sum + (a.marksAwarded ?? 0),
      0
    )

    await db.collection<Submission>("submissions").updateOne(
      { _id: submissionId },
      {
        $set: {
          answers: updatedAnswers,
          status: allGraded ? "graded" : "submitted",
          totalMarksAwarded: allGraded ? totalMarksAwarded : submission.totalMarksAwarded,
        },
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        status: allGraded ? "graded" : "submitted",
        totalMarksAwarded: allGraded ? totalMarksAwarded : submission.totalMarksAwarded,
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

// Keep PUT for backwards compatibility, delegates to PATCH logic
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context)
}