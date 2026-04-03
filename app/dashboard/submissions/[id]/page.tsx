"use client"

import { useSession } from "next-auth/react"
import { redirect, useParams, useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function SubmissionDetailPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const { data, isLoading } = useSWR(`/api/submissions/${params.id}`, fetcher)
  const [grades, setGrades] = useState<Record<number, { score: number; feedback: string }>>({})
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

  const { submission, test } = data

  const handleGradeChange = (questionIndex: number, field: "score" | "feedback", value: string | number) => {
    setGrades(prev => ({
      ...prev,
      [questionIndex]: {
        ...prev[questionIndex],
        score: prev[questionIndex]?.score ?? submission.answers[questionIndex]?.score ?? 0,
        feedback: prev[questionIndex]?.feedback ?? submission.answers[questionIndex]?.feedback ?? "",
        [field]: value
      }
    }))
  }

  const handleSaveGrades = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/submissions/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save grades")
      }

      toast.success("Grades saved successfully")
      mutate(`/api/submissions/${params.id}`)
      mutate("/api/submissions")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save grades")
    } finally {
      setSaving(false)
    }
  }

  const getAnswerStatus = (answer: any, question: any) => {
    if (question.type === "subjective") {
      if (answer.score === undefined || answer.score === null) {
        return { icon: AlertCircle, color: "text-amber-500", label: "Needs grading" }
      }
      return answer.score > 0
        ? { icon: CheckCircle, color: "text-emerald-500", label: `${answer.score}/${question.points} points` }
        : { icon: XCircle, color: "text-red-500", label: "0 points" }
    }

    return answer.isCorrect
      ? { icon: CheckCircle, color: "text-emerald-500", label: "Correct" }
      : { icon: XCircle, color: "text-red-500", label: "Incorrect" }
  }

  const needsGrading = submission.answers.some(
    (a: any, i: number) => test.questions[i]?.type === "subjective" && (a.score === undefined || a.score === null)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/submissions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
          <p className="text-muted-foreground">
            Submitted by {submission.studentName} on {new Date(submission.submittedAt || submission.startedAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {submission.totalScore}/{submission.maxScore}
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round((submission.totalScore / submission.maxScore) * 100)}%
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {test.questions.map((question: any, index: number) => {
          const answer = submission.answers[index] || {}
          const status = getAnswerStatus(answer, question)
          const StatusIcon = status.icon
          const currentGrade = grades[index] || { score: answer.score, feedback: answer.feedback || "" }

          return (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="capitalize">{question.type}</Badge>
                      <span className="text-sm text-muted-foreground">{question.points} points</span>
                    </div>
                    <CardTitle className="text-base font-medium">
                      Q{index + 1}. {question.text}
                    </CardTitle>
                  </div>
                  <div className={`flex items-center gap-1 ${status.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    <span className="text-sm">{status.label}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {question.type === "mcq" && (
                  <div className="space-y-2">
                    {question.options.map((option: string, optIndex: number) => (
                      <div
                        key={optIndex}
                        className={`p-3 rounded-lg border ${
                          option === question.correctAnswer
                            ? "border-emerald-500 bg-emerald-500/10"
                            : option === answer.answer && option !== question.correctAnswer
                            ? "border-red-500 bg-red-500/10"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {option === question.correctAnswer && (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          )}
                          {option === answer.answer && option !== question.correctAnswer && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span>{option}</span>
                          {option === answer.answer && (
                            <Badge variant="secondary" className="ml-auto">Student answer</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {question.type === "numerical" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Student Answer</Label>
                      <div className={`mt-1 p-3 rounded-lg border ${answer.isCorrect ? "border-emerald-500 bg-emerald-500/10" : "border-red-500 bg-red-500/10"}`}>
                        {answer.answer ?? "No answer"}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Correct Answer</Label>
                      <div className="mt-1 p-3 rounded-lg border border-emerald-500 bg-emerald-500/10">
                        {question.correctAnswer}
                        {question.tolerance && ` (±${question.tolerance})`}
                      </div>
                    </div>
                  </div>
                )}

                {question.type === "subjective" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Student Answer</Label>
                      <div className="mt-1 p-3 rounded-lg border bg-muted/50 whitespace-pre-wrap">
                        {answer.answer || "No answer provided"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`score-${index}`}>Score (max {question.points})</Label>
                        <Input
                          id={`score-${index}`}
                          type="number"
                          min={0}
                          max={question.points}
                          value={currentGrade.score ?? ""}
                          onChange={(e) => handleGradeChange(index, "score", parseFloat(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`feedback-${index}`}>Feedback (optional)</Label>
                        <Textarea
                          id={`feedback-${index}`}
                          value={currentGrade.feedback}
                          onChange={(e) => handleGradeChange(index, "feedback", e.target.value)}
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

      {needsGrading && (
        <div className="flex justify-end">
          <Button onClick={handleSaveGrades} disabled={saving}>
            {saving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            Save Grades
          </Button>
        </div>
      )}
    </div>
  )
}
