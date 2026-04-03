"use client"

import { useSession } from "next-auth/react"
import { redirect, useParams } from "next/navigation"
import useSWR from "swr"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, MessageSquare } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ResultDetailPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const { data, isLoading } = useSWR(`/api/student/results/${params.id}`, fetcher)

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!session || session.user.role !== "student") {
    redirect("/dashboard")
  }

  if (!data?.submission) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Result not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/results">Back to Results</Link>
        </Button>
      </div>
    )
  }

  const { submission, test } = data
  const percentage = Math.round((submission.totalScore / submission.maxScore) * 100)

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-500"
    if (pct >= 60) return "text-amber-500"
    return "text-red-500"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/results">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
          <p className="text-muted-foreground">
            Submitted on {new Date(submission.submittedAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${getScoreColor(percentage)}`}>
            {submission.totalScore}/{submission.maxScore}
          </div>
          <div className="text-sm text-muted-foreground">{percentage}%</div>
        </div>
      </div>

      <div className="space-y-4">
        {test.questions.map((question: any, index: number) => {
          const answer = submission.answers[index] || {}
          const isSubjective = question.type === "subjective"
          const isPending = isSubjective && (answer.score === undefined || answer.score === null)

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
                  <div className="flex items-center gap-1">
                    {isPending ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-amber-500">Pending</span>
                      </>
                    ) : answer.isCorrect || (isSubjective && answer.score > 0) ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-emerald-500">
                          {isSubjective ? `${answer.score}/${question.points}` : "Correct"}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-500">
                          {isSubjective ? `${answer.score || 0}/${question.points}` : "Incorrect"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
                            <Badge variant="secondary" className="ml-auto">Your answer</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {question.type === "numerical" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Your Answer</p>
                      <div className={`p-3 rounded-lg border ${
                        answer.isCorrect
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-red-500 bg-red-500/10"
                      }`}>
                        {answer.answer ?? "No answer"}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Correct Answer</p>
                      <div className="p-3 rounded-lg border border-emerald-500 bg-emerald-500/10">
                        {question.correctAnswer}
                        {question.tolerance && ` (±${question.tolerance})`}
                      </div>
                    </div>
                  </div>
                )}

                {question.type === "subjective" && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Your Answer</p>
                      <div className="p-3 rounded-lg border bg-muted/50 whitespace-pre-wrap">
                        {answer.answer || "No answer provided"}
                      </div>
                    </div>
                    {answer.feedback && (
                      <div className="flex items-start gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Teacher Feedback</p>
                          <p className="text-sm text-muted-foreground">{answer.feedback}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
