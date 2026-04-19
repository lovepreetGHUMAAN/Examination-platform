// PATH: app/api/submissions/[id]/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Submission, User, Answer } from "@/lib/types"

// ─── helpers ──────────────────────────────────────────────────────────────────

function gradeObjectiveAnswer(
  q: Test["questions"][number],
  saved: Partial<Answer>
): { marksAwarded: number; isCorrect: boolean } {
  switch (q.type) {
    case "mcq":
      if (saved.selectedOptionId && saved.selectedOptionId === q.correctOptionId)
        return { marksAwarded: q.marks, isCorrect: true }
      return { marksAwarded: 0, isCorrect: false }

    case "true-false":
      if (
        saved.booleanAnswer !== undefined &&
        saved.booleanAnswer === q.correctBoolean
      )
        return { marksAwarded: q.marks, isCorrect: true }
      return { marksAwarded: 0, isCorrect: false }

    case "numerical": {
      if (saved.numericalAnswer === undefined)
        return { marksAwarded: 0, isCorrect: false }
      const tol = q.tolerance ?? 0
      const correct =
        Math.abs(saved.numericalAnswer - (q.correctAnswer ?? 0)) <= tol
      return { marksAwarded: correct ? q.marks : 0, isCorrect: correct }
    }

    case "fill-blank": {
      if (!saved.textAnswer || !q.blanks?.length)
        return { marksAwarded: 0, isCorrect: false }
      const studentParts = saved.textAnswer
        .split("|")
        .map((s) => s.trim().toLowerCase())
      const correctParts = q.blanks.map((b) => b.trim().toLowerCase())
      const allCorrect =
        studentParts.length === correctParts.length &&
        studentParts.every((p, i) => p === correctParts[i])
      return { marksAwarded: allCorrect ? q.marks : 0, isCorrect: allCorrect }
    }

    case "match": {
      if (!saved.matchAnswer || !q.matchPairs?.length)
        return { marksAwarded: 0, isCorrect: false }
      try {
        const studentMatches: { pairId: string; selectedRight: string }[] =
          JSON.parse(saved.matchAnswer)
        const correct = q.matchPairs.every((pair) => {
          const sm = studentMatches.find((m) => m.pairId === pair.id)
          return (
            sm?.selectedRight.trim().toLowerCase() ===
            pair.right.trim().toLowerCase()
          )
        })
        return { marksAwarded: correct ? q.marks : 0, isCorrect: correct }
      } catch {
        return { marksAwarded: 0, isCorrect: false }
      }
    }

    default:
      return { marksAwarded: 0, isCorrect: false }
  }
}

/** Human-readable display of what the student answered */
function buildDisplayAnswer(
  q: Test["questions"][number],
  saved: Partial<Answer> | undefined
): string | number | null {
  if (!saved) return null

  switch (q.type) {
    case "mcq":
      return q.options?.find((o) => o.id === saved.selectedOptionId)?.text ?? null

    case "true-false":
      return saved.booleanAnswer !== undefined
        ? saved.booleanAnswer
          ? "True"
          : "False"
        : null

    case "numerical":
      return saved.numericalAnswer ?? null

    case "subjective":
      return saved.textAnswer ?? null

    case "fill-blank": {
      if (!saved.textAnswer) return null
      // Convert "answer1 | answer2" into "Blank 1: answer1, Blank 2: answer2"
      const parts = saved.textAnswer.split("|").map((s) => s.trim())
      return parts.map((p, i) => `Blank ${i + 1}: ${p}`).join("  •  ")
    }

    case "match": {
      if (!saved.matchAnswer) return null
      try {
        const studentMatches: { pairId: string; selectedRight: string }[] =
          JSON.parse(saved.matchAnswer)
        // Map pairId back to the left label for readability
        return studentMatches
          .map((m) => {
            const pair = q.matchPairs?.find((p) => p.id === m.pairId)
            return `${pair?.left ?? m.pairId} → ${m.selectedRight || "(none)"}`
          })
          .join("  •  ")
      } catch {
        return null
      }
    }

    default:
      return null
  }
}

/** Human-readable display of the correct answer */
function buildCorrectAnswer(
  q: Test["questions"][number]
): string | number | null {
  switch (q.type) {
    case "mcq":
      return q.options?.find((o) => o.id === q.correctOptionId)?.text ?? null

    case "true-false":
      return q.correctBoolean !== undefined
        ? q.correctBoolean
          ? "True"
          : "False"
        : null

    case "numerical":
      return q.correctAnswer ?? null

    case "fill-blank":
      return q.blanks?.map((b, i) => `Blank ${i + 1}: ${b}`).join("  •  ") ?? null

    case "match":
      return (
        q.matchPairs?.map((p) => `${p.left} → ${p.right}`).join("  •  ") ?? null
      )

    case "subjective":
      return null // no single correct answer

    default:
      return null
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

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

    const answers = test.questions.map((q) => {
      const saved = submission.answers.find((a) => a.questionId === q.id)
      const { isCorrect } = saved
        ? gradeObjectiveAnswer(q, saved)
        : { isCorrect: false }

      return {
        questionId: q.id,
        // Human-readable display strings
        answer: buildDisplayAnswer(q, saved),
        // Raw fields (still useful for the grading UI)
        selectedOptionId: saved?.selectedOptionId,
        booleanAnswer: saved?.booleanAnswer,
        numericalAnswer: saved?.numericalAnswer,
        textAnswer: saved?.textAnswer,
        matchAnswer: saved?.matchAnswer,
        score: saved?.marksAwarded ?? 0,
        feedback: saved?.feedback ?? "",
        isGraded: saved?.isGraded ?? false,
        isCorrect: q.type === "subjective" ? null : isCorrect,
      }
    })

    const questions = test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      points: q.marks,
      marks: q.marks,
      // MCQ options as full objects so the UI can show id + text
      options: q.options ?? [],
      matchPairs: q.matchPairs ?? [],
      blanks: q.blanks ?? [],
      correctBoolean: q.correctBoolean,
      correctAnswer: buildCorrectAnswer(q),
      tolerance: q.tolerance,
      maxWords: q.maxWords,
    }))

    const totalScore = submission.totalMarksAwarded ?? 0
    const needsGrading =
      test.questions.some((q) => q.type === "subjective") &&
      submission.status === "submitted"

    return NextResponse.json({
      success: true,
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
        violations: submission.violations ?? [],
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

// ─── PATCH – grade ─────────────────────────────────────────────────────────

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

    const { grades } = await request.json()
    // grades is expected to be: Array<{ questionId: string; score: number; feedback?: string }>
    // Indexed by questionId (not array position) to be safe

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

    const updatedAnswers: Answer[] = test.questions.map((q, index) => {
      const existing: Partial<Answer> = submission.answers.find(
        (a) => a.questionId === q.id
      ) ?? { questionId: q.id, isGraded: false }

      if (q.type === "subjective") {
        // Support both array-index style and questionId style from frontend
        const gradeUpdate =
          grades[q.id] ?? // keyed by questionId
          grades[index]   // keyed by array index (legacy)

        if (gradeUpdate !== undefined) {
          return {
            ...(existing as Answer),
            marksAwarded: Number(gradeUpdate.score ?? gradeUpdate) ?? 0,
            feedback: gradeUpdate.feedback ?? "",
            isGraded: true,
          }
        }
        // No grade provided for this subjective question yet — leave as-is
        return existing as Answer
      }

      // Objective — always (re-)grade from stored answer
      const { marksAwarded } = gradeObjectiveAnswer(q, existing)
      return {
        ...(existing as Answer),
        marksAwarded,
        isGraded: true,
      }
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
          totalMarksAwarded,
        },
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        status: allGraded ? "graded" : "submitted",
        totalMarksAwarded,
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

// Keep PUT for backwards compatibility
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context)
}