"use client"

import { useSession } from "next-auth/react"
import { redirect, useParams } from "next/navigation"
import useSWR, { mutate } from "swr"
import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// ─── types (mirrors what the API returns) ────────────────────────────────────

interface ApiOption {
  id: string
  text: string
}

interface ApiMatchPair {
  id: string
  left: string
  right: string
}

interface ApiQuestion {
  id: string
  type: "mcq" | "numerical" | "subjective" | "true-false" | "fill-blank" | "match"
  text: string
  points: number
  marks: number
  options: ApiOption[]
  matchPairs: ApiMatchPair[]
  blanks: string[]
  correctBoolean?: boolean
  correctAnswer: string | number | null
  tolerance?: number
  maxWords?: number
}

interface ApiAnswer {
  questionId: string
  answer: string | number | null   // human-readable display string from API
  selectedOptionId?: string
  booleanAnswer?: boolean
  numericalAnswer?: number
  textAnswer?: string
  matchAnswer?: string
  score: number
  feedback: string
  isGraded: boolean
  isCorrect: boolean | null
}

// ─── component ────────────────────────────────────────────────────────────────

export default function SubmissionDetailPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const { data, isLoading } = useSWR(`/api/submissions/${params.id}`, fetcher)

  // grades keyed by questionId (not index) to avoid mismatch
  const [grades, setGrades] = useState<
    Record<string, { score: number; feedback: string }>
  >({})
  const [saving, setSaving] = useState(false)

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!session || session.user.role !== "teacher") {
    redirect("/dashboard")
  }

  if (!data?.submission) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Submission not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/submissions">Back to Submissions</Link>
        </Button>
      </div>
    )
  }

  const { submission, test } = data as {
    submission: {
      _id: string
      studentName: string
      studentEmail: string
      submittedAt?: string
      startedAt: string
      totalScore: number
      maxScore: number
      status: string
      answers: ApiAnswer[]
    }
    test: {
      _id: string
      title: string
      totalMarks: number
      questions: ApiQuestion[]
    }
  }

  // ── grade change handler (keyed by questionId) ──────────────────────────
  const handleGradeChange = (
    questionId: string,
    field: "score" | "feedback",
    value: string | number,
    currentScore: number,
    currentFeedback: string
  ) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        score: prev[questionId]?.score ?? currentScore,
        feedback: prev[questionId]?.feedback ?? currentFeedback,
        [field]: value,
      },
    }))
  }

  // ── save — send grades keyed by questionId ──────────────────────────────
  const handleSaveGrades = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/submissions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to save grades")
      }

      toast.success("Grades saved successfully")
      mutate(`/api/submissions/${params.id}`)
      mutate("/api/submissions")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save grades"
      )
    } finally {
      setSaving(false)
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────
  const getAnswerByQuestionId = (questionId: string): ApiAnswer =>
    submission.answers.find((a) => a.questionId === questionId) ?? {
      questionId,
      answer: null,
      score: 0,
      feedback: "",
      isGraded: false,
      isCorrect: null,
    }

  const needsGrading = test.questions.some((q) => {
    if (q.type !== "subjective") return false
    const ans = getAnswerByQuestionId(q.id)
    return !ans.isGraded
  })

  // ── status badge per question ────────────────────────────────────────────
  const getAnswerStatus = (answer: ApiAnswer, question: ApiQuestion) => {
    if (question.type === "subjective") {
      if (!answer.isGraded)
        return { icon: AlertCircle, color: "text-amber-500", label: "Needs grading" }
      return answer.score > 0
        ? { icon: CheckCircle, color: "text-emerald-500", label: `${answer.score}/${question.points} pts` }
        : { icon: XCircle, color: "text-red-500", label: "0 pts" }
    }
    return answer.isCorrect
      ? { icon: CheckCircle, color: "text-emerald-500", label: "Correct" }
      : { icon: XCircle, color: "text-red-500", label: "Incorrect" }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/submissions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
          <p className="text-muted-foreground">
            Submitted by {submission.studentName} on{" "}
            {new Date(
              submission.submittedAt || submission.startedAt
            ).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {submission.totalScore}/{submission.maxScore}
          </div>
          <div className="text-sm text-muted-foreground">
            {submission.maxScore > 0
              ? Math.round((submission.totalScore / submission.maxScore) * 100)
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {test.questions.map((question, index) => {
          const answer = getAnswerByQuestionId(question.id)
          const answerStatus = getAnswerStatus(answer, question)
          const StatusIcon = answerStatus.icon
          const currentGrade = grades[question.id] ?? {
            score: answer.score,
            feedback: answer.feedback,
          }

          return (
            <Card key={question.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize">
                        {question.type === "true-false"
                          ? "True / False"
                          : question.type === "fill-blank"
                          ? "Fill in the Blank"
                          : question.type === "match"
                          ? "Match"
                          : question.type}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {question.points} pts
                      </span>
                    </div>
                    <CardTitle className="text-base font-medium">
                      Q{index + 1}. {question.text}
                    </CardTitle>
                  </div>
                  <div className={`flex items-center gap-1 shrink-0 ${answerStatus.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    <span className="text-sm">{answerStatus.label}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* ── MCQ ── */}
                {question.type === "mcq" && (
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const isCorrect = option.text === question.correctAnswer
                      const isStudentAnswer = option.id === answer.selectedOptionId
                      return (
                        <div
                          key={option.id}
                          className={`p-3 rounded-lg border flex items-center gap-2 ${
                            isCorrect
                              ? "border-emerald-500 bg-emerald-500/10"
                              : isStudentAnswer && !isCorrect
                              ? "border-red-500 bg-red-500/10"
                              : "border-border"
                          }`}
                        >
                          {isCorrect && (
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                          )}
                          {isStudentAnswer && !isCorrect && (
                            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                          )}
                          <span className="flex-1">{option.text}</span>
                          {isStudentAnswer && (
                            <Badge variant="secondary">Your answer</Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── True / False ── */}
                {question.type === "true-false" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Student Answer</Label>
                      <div
                        className={`mt-1 p-3 rounded-lg border ${
                          answer.isCorrect
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-red-500 bg-red-500/10"
                        }`}
                      >
                        {answer.answer ?? "No answer"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Correct Answer</Label>
                      <div className="mt-1 p-3 rounded-lg border border-emerald-500 bg-emerald-500/10">
                        {question.correctAnswer ?? "—"}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Numerical ── */}
                {question.type === "numerical" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Student Answer</Label>
                      <div
                        className={`mt-1 p-3 rounded-lg border ${
                          answer.isCorrect
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-red-500 bg-red-500/10"
                        }`}
                      >
                        {answer.answer ?? "No answer"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Correct Answer</Label>
                      <div className="mt-1 p-3 rounded-lg border border-emerald-500 bg-emerald-500/10">
                        {question.correctAnswer}
                        {question.tolerance ? ` (±${question.tolerance})` : ""}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Fill in the Blank ── */}
                {question.type === "fill-blank" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Student Answer</Label>
                      <div
                        className={`mt-1 p-3 rounded-lg border text-sm whitespace-pre-wrap ${
                          answer.isCorrect
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-red-500 bg-red-500/10"
                        }`}
                      >
                        {answer.answer
                          ? String(answer.answer).split("  •  ").map((part, i) => (
                              <div key={i}>{part}</div>
                            ))
                          : "No answer"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Correct Answer</Label>
                      <div className="mt-1 p-3 rounded-lg border border-emerald-500 bg-emerald-500/10 text-sm">
                        {question.correctAnswer
                          ? String(question.correctAnswer).split("  •  ").map((part, i) => (
                              <div key={i}>{part}</div>
                            ))
                          : "—"}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Match the Following ── */}
                {question.type === "match" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <Label className="text-muted-foreground">Student Matches</Label>
                      <Label className="text-muted-foreground">Correct Matches</Label>
                    </div>
                    {question.matchPairs.map((pair) => {
                      // Parse student's match for this pair
                      let studentRight = "(no answer)"
                      try {
                        const parsed: { pairId: string; selectedRight: string }[] =
                          JSON.parse(answer.matchAnswer ?? "[]")
                        studentRight =
                          parsed.find((m) => m.pairId === pair.id)?.selectedRight ||
                          "(no answer)"
                      } catch {
                        // leave default
                      }
                      const isCorrect =
                        studentRight.trim().toLowerCase() ===
                        pair.right.trim().toLowerCase()

                      return (
                        <div key={pair.id} className="grid grid-cols-2 gap-4">
                          <div
                            className={`p-3 rounded-lg border text-sm ${
                              isCorrect
                                ? "border-emerald-500 bg-emerald-500/10"
                                : "border-red-500 bg-red-500/10"
                            }`}
                          >
                            <span className="font-medium">{pair.left}</span>
                            <span className="text-muted-foreground mx-2">→</span>
                            {studentRight}
                          </div>
                          <div className="p-3 rounded-lg border border-emerald-500 bg-emerald-500/10 text-sm">
                            <span className="font-medium">{pair.left}</span>
                            <span className="text-muted-foreground mx-2">→</span>
                            {pair.right}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Subjective ── */}
                {question.type === "subjective" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Student Answer</Label>
                      <div className="mt-1 p-3 rounded-lg border bg-muted/50 whitespace-pre-wrap text-sm">
                        {answer.answer || "No answer provided"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`score-${question.id}`}>
                          Score (max {question.points})
                        </Label>
                        <Input
                          id={`score-${question.id}`}
                          type="number"
                          min={0}
                          max={question.points}
                          value={currentGrade.score ?? ""}
                          onChange={(e) =>
                            handleGradeChange(
                              question.id,
                              "score",
                              parseFloat(e.target.value) || 0,
                              answer.score,
                              answer.feedback
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`feedback-${question.id}`}>
                          Feedback (optional)
                        </Label>
                        <Textarea
                          id={`feedback-${question.id}`}
                          value={currentGrade.feedback}
                          onChange={(e) =>
                            handleGradeChange(
                              question.id,
                              "feedback",
                              e.target.value,
                              answer.score,
                              answer.feedback
                            )
                          }
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Save button — show whenever there are subjective questions */}
      {test.questions.some((q) => q.type === "subjective") && (
        <div className="flex justify-end">
          <Button onClick={handleSaveGrades} disabled={saving}>
            {saving ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Grades
          </Button>
        </div>
      )}
    </div>
  )
}