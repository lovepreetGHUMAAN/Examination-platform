import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Group, Submission, Answer, ViolationEvent } from "@/lib/types"

// ─── helpers ──────────────────────────────────────────────────────────────────

function gradeAnswer(
  question: Test["questions"][number],
  answer: Answer
): { marksAwarded: number; isGraded: boolean } {
  switch (question.type) {
    case "mcq": {
      const correct = answer.selectedOptionId === question.correctOptionId
      return { marksAwarded: correct ? question.marks : 0, isGraded: true }
    }
    case "true-false": {
      const correct =
        answer.booleanAnswer !== undefined &&
        answer.booleanAnswer === question.correctBoolean
      return { marksAwarded: correct ? question.marks : 0, isGraded: true }
    }
    case "numerical": {
      const tolerance = question.tolerance ?? 0
      const correctAnswer = question.correctAnswer ?? 0
      const studentAnswer = answer.numericalAnswer ?? 0
      const correct = Math.abs(studentAnswer - correctAnswer) <= tolerance
      return { marksAwarded: correct ? question.marks : 0, isGraded: true }
    }
    case "fill-blank": {
      if (!answer.textAnswer || !question.blanks?.length)
        return { marksAwarded: 0, isGraded: true }
      const studentParts = answer.textAnswer
        .split("|")
        .map((s) => s.trim().toLowerCase())
      const correctParts = question.blanks.map((b) => b.trim().toLowerCase())
      const correct =
        studentParts.length === correctParts.length &&
        studentParts.every((p, i) => p === correctParts[i])
      return { marksAwarded: correct ? question.marks : 0, isGraded: true }
    }
    case "match": {
      if (!answer.matchAnswer || !question.matchPairs?.length)
        return { marksAwarded: 0, isGraded: true }
      try {
        const studentMatches: { pairId: string; selectedRight: string }[] =
          JSON.parse(answer.matchAnswer)
        const correct = question.matchPairs.every((pair) => {
          const sm = studentMatches.find((m) => m.pairId === pair.id)
          return (
            sm?.selectedRight.trim().toLowerCase() ===
            pair.right.trim().toLowerCase()
          )
        })
        return { marksAwarded: correct ? question.marks : 0, isGraded: true }
      } catch {
        return { marksAwarded: 0, isGraded: true }
      }
    }
    case "subjective":
      return { marksAwarded: 0, isGraded: false }
    default:
      return { marksAwarded: 0, isGraded: true }
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

    if (!session || session.user.role !== "student") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = await getDatabase()
    const testId = new ObjectId(id)
    const studentId = new ObjectId(session.user.id)
    const now = new Date()

    const test = await db.collection<Test>("tests").findOne({ _id: testId })
    if (!test) {
      return NextResponse.json(
        { success: false, error: "Test not found" },
        { status: 404 }
      )
    }

    const enrolledGroups = await db
      .collection<Group>("groups")
      .find({ memberIds: studentId, _id: { $in: test.groupIds } })
      .toArray()

    if (enrolledGroups.length === 0) {
      return NextResponse.json(
        { success: false, error: "You do not have access to this test" },
        { status: 403 }
      )
    }

    if (!test.isPublished || now < test.availableFrom || now > test.availableTo) {
      return NextResponse.json(
        { success: false, error: "This test is not currently available" },
        { status: 403 }
      )
    }

    let submission = await db
      .collection<Submission>("submissions")
      .findOne({ testId, studentId })

    if (
      submission &&
      (submission.status === "submitted" || submission.status === "graded")
    ) {
      return NextResponse.json({
        success: true,
        data: {
          test: {
            _id: test._id!.toString(),
            title: test.title,
            description: test.description,
            duration: test.duration,
            totalMarks: test.totalMarks,
          },
          submission: {
            _id: submission._id!.toString(),
            status: submission.status,
            submittedAt: submission.submittedAt?.toISOString(),
            totalMarksAwarded: submission.totalMarksAwarded,
          },
          alreadySubmitted: true,
        },
      })
    }

    if (!submission) {
      const newSubmission: Submission = {
        testId,
        studentId,
        answers: test.questions.map((q) => ({
          questionId: q.id,
          isGraded: false,
        })),
        startedAt: new Date(),
        status: "in-progress",
      }
      const result = await db
        .collection<Submission>("submissions")
        .insertOne(newSubmission)
      submission = { ...newSubmission, _id: result.insertedId }
    }

    const questionsForStudent = test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      marks: q.marks,
      options:
        q.type === "mcq"
          ? q.options?.map((o) => ({ id: o.id, text: o.text }))
          : undefined,
      maxWords: q.type === "subjective" ? q.maxWords : undefined,
      blanks:
        q.type === "fill-blank" && q.blanks?.length
          ? q.blanks.map(() => "")
          : undefined,
      matchPairs:
        q.type === "match" && q.matchPairs?.length
          ? q.matchPairs.map((p) => ({ id: p.id, left: p.left, right: p.right }))
          : undefined,
    }))

    // Tell the student whether results will be shown immediately
    const autoGrade = test.autoGrade ?? true

    return NextResponse.json({
      success: true,
      data: {
        test: {
          _id: test._id!.toString(),
          title: test.title,
          description: test.description,
          duration: test.duration,
          totalMarks: test.totalMarks,
          questions: questionsForStudent,
          antiCheating: test.antiCheating,
          autoGrade,
        },
        submission: {
          _id: submission._id!.toString(),
          answers: submission.answers,
          startedAt: submission.startedAt.toISOString(),
          status: submission.status,
        },
        alreadySubmitted: false,
      },
    })
  } catch (error) {
    console.error("Get test for student error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch test" },
      { status: 500 }
    )
  }
}

// ─── POST — submit ─────────────────────────────────────────────────────────

export async function POST(
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

    const { answers, violations } = (await request.json()) as {
      answers: Answer[]
      violations?: ViolationEvent[]
    }

    const db = await getDatabase()
    const testId = new ObjectId(id)
    const studentId = new ObjectId(session.user.id)

    const test = await db.collection<Test>("tests").findOne({ _id: testId })
    if (!test) {
      return NextResponse.json(
        { success: false, error: "Test not found" },
        { status: 404 }
      )
    }

    const hasViolations = Array.isArray(violations) && violations.length > 0

    // Respect the test-level autoGrade setting.
    // Also skip auto-grading if there were violations — teacher reviews first.
    const shouldAutoGrade = (test.autoGrade ?? true) && !hasViolations

    let totalMarksAwarded = 0
    let allGraded = true

    const gradedAnswers: Answer[] = answers.map((answer) => {
      const question = test.questions.find((q) => q.id === answer.questionId)
      if (!question) return { ...answer, isGraded: false, marksAwarded: 0 }

      if (!shouldAutoGrade) {
        allGraded = false
        return { ...answer, isGraded: false, marksAwarded: 0 }
      }

      const { marksAwarded, isGraded } = gradeAnswer(question, answer)
      if (!isGraded) allGraded = false
      totalMarksAwarded += marksAwarded
      return { ...answer, isGraded, marksAwarded }
    })

    await db.collection<Submission>("submissions").updateOne(
      { testId, studentId },
      {
        $set: {
          answers: gradedAnswers,
          submittedAt: new Date(),
          status: allGraded ? "graded" : "submitted",
          totalMarksAwarded: allGraded ? totalMarksAwarded : undefined,
          violations: violations ?? [],
        },
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        status: allGraded ? "graded" : "submitted",
        totalMarksAwarded: allGraded ? totalMarksAwarded : undefined,
        totalMarks: test.totalMarks,
        autoGraded: shouldAutoGrade && allGraded,
      },
    })
  } catch (error) {
    console.error("Submit test error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit test" },
      { status: 500 }
    )
  }
}

// ─── PUT — save progress ───────────────────────────────────────────────────

export async function PUT(
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

    const { answers } = await request.json()

    const db = await getDatabase()
    const testId = new ObjectId(id)
    const studentId = new ObjectId(session.user.id)

    await db.collection<Submission>("submissions").updateOne(
      { testId, studentId, status: "in-progress" },
      { $set: { answers } }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Save progress error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to save progress" },
      { status: 500 }
    )
  }
}