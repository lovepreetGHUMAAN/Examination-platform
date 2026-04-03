import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDatabase } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { Test, Group, Submission, Answer } from "@/lib/types"

// GET test details for taking
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

    // Get the test
    const test = await db.collection<Test>("tests").findOne({ _id: testId })

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Test not found" },
        { status: 404 }
      )
    }

    // Verify student has access
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

    // Check availability
    if (!test.isPublished || now < test.availableFrom || now > test.availableTo) {
      return NextResponse.json(
        { success: false, error: "This test is not currently available" },
        { status: 403 }
      )
    }

    // Check for existing submission
    let submission = await db.collection<Submission>("submissions").findOne({
      testId,
      studentId,
    })

    // If submission exists and is already submitted/graded, don't allow retaking
    if (submission && (submission.status === "submitted" || submission.status === "graded")) {
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

    // Create or get in-progress submission
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

      const result = await db.collection<Submission>("submissions").insertOne(newSubmission)
      submission = { ...newSubmission, _id: result.insertedId }
    }

    // Return test questions without answers for students
    const questionsForStudent = test.questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      marks: q.marks,
      options: q.type === "mcq" ? q.options?.map((o) => ({ id: o.id, text: o.text })) : undefined,
      maxWords: q.type === "subjective" ? q.maxWords : undefined,
    }))

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

// POST submit test
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

    const { answers } = await request.json()

    const db = await getDatabase()
    const testId = new ObjectId(id)
    const studentId = new ObjectId(session.user.id)

    // Get test for auto-grading
    const test = await db.collection<Test>("tests").findOne({ _id: testId })

    if (!test) {
      return NextResponse.json(
        { success: false, error: "Test not found" },
        { status: 404 }
      )
    }

    // Auto-grade MCQ and numerical questions
    let totalMarksAwarded = 0
    let allGraded = true

    const gradedAnswers: Answer[] = answers.map((answer: Answer) => {
      const question = test.questions.find((q) => q.id === answer.questionId)
      if (!question) return { ...answer, isGraded: true, marksAwarded: 0 }

      if (question.type === "mcq") {
        const isCorrect = answer.selectedOptionId === question.correctOptionId
        const marks = isCorrect ? question.marks : 0
        totalMarksAwarded += marks
        return {
          ...answer,
          isGraded: true,
          marksAwarded: marks,
        }
      } else if (question.type === "numerical") {
        const tolerance = question.tolerance || 0
        const correctAnswer = question.correctAnswer || 0
        const studentAnswer = answer.numericalAnswer || 0
        const isCorrect = Math.abs(studentAnswer - correctAnswer) <= tolerance
        const marks = isCorrect ? question.marks : 0
        totalMarksAwarded += marks
        return {
          ...answer,
          isGraded: true,
          marksAwarded: marks,
        }
      } else {
        // Subjective - needs manual grading
        allGraded = false
        return {
          ...answer,
          isGraded: false,
        }
      }
    })

    // Update submission
    const result = await db.collection<Submission>("submissions").updateOne(
      { testId, studentId },
      {
        $set: {
          answers: gradedAnswers,
          submittedAt: new Date(),
          status: allGraded ? "graded" : "submitted",
          totalMarksAwarded: allGraded ? totalMarksAwarded : undefined,
        },
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        status: allGraded ? "graded" : "submitted",
        totalMarksAwarded: allGraded ? totalMarksAwarded : undefined,
        totalMarks: test.totalMarks,
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

// PUT save progress
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

    // Update answers without submitting
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
