// PATH: app/dashboard/test/[id]/page.tsx
"use client"

import { use, useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Clock, ClipboardList, Send, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import type { Answer } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface QuestionData {
  id: string
  type: "mcq" | "numerical" | "subjective"
  text: string
  marks: number
  options?: { id: string; text: string }[]
  maxWords?: number
}

export default function TakeTestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, error } = useSWR(`/api/student/tests/${id}`, fetcher)

  const [answers, setAnswers] = useState<Answer[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (data?.data?.submission?.answers) {
      setAnswers(data.data.submission.answers)
    }
  }, [data])

  useEffect(() => {
    if (
      data?.data?.test?.duration &&
      data?.data?.submission?.startedAt &&
      !data?.data?.alreadySubmitted
    ) {
      const startTime = new Date(data.data.submission.startedAt).getTime()
      const duration = data.data.test.duration * 60 * 1000
      const endTime = startTime + duration
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
      setTimeLeft(remaining)
    }
  }, [data])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          handleSubmit(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const saveProgress = useCallback(async () => {
    if (isSaving || !answers.length) return
    setIsSaving(true)
    try {
      await fetch(`/api/student/tests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
    } catch {
      // Silent fail for auto-save
    } finally {
      setIsSaving(false)
    }
  }, [id, answers, isSaving])

  useEffect(() => {
    if (data?.data?.alreadySubmitted) return
    const interval = setInterval(saveProgress, 30000)
    return () => clearInterval(interval)
  }, [saveProgress, data])

  const updateAnswer = (questionId: string, update: Partial<Answer>) => {
    setAnswers((prev) =>
      prev.map((a) => (a.questionId === questionId ? { ...a, ...update } : a))
    )
  }

  const handleSubmit = async (autoSubmit = false) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/student/tests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit test")
      }

      if (autoSubmit) {
        toast.info("Time is up! Your test has been automatically submitted.")
      } else {
        toast.success("Test submitted successfully!")
      }

      router.push("/dashboard/results")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit test")
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  // FIX: replaced <Empty> component (which doesn't accept icon/title/description/action props
  // as HTML div attributes) with plain JSX that avoids the type conflict entirely
  if (error || !data?.success) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center text-center gap-4">
          <ClipboardList className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="font-medium">Cannot access test</p>
            <p className="text-sm text-muted-foreground mt-1">
              {data?.error || "You do not have access to this test"}
            </p>
          </div>
          <Link href="/dashboard/available-tests">
            <Button>Back to Tests</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (data.data.alreadySubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-accent mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Test Already Submitted</h2>
            <p className="text-muted-foreground mb-6">
              You have already completed this test. You cannot take it again.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/dashboard/available-tests">
                <Button variant="outline">Back to Tests</Button>
              </Link>
              <Link href="/dashboard/results">
                <Button>View Results</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const test = data.data.test
  const questions: QuestionData[] = test.questions
  const currentQ = questions[currentQuestion]
  const currentAnswer = answers.find((a) => a.questionId === currentQ?.id)
  const answeredCount = answers.filter(
    (a) => a.selectedOptionId || a.numericalAnswer !== undefined || a.textAnswer
  ).length
  const progress = (answeredCount / questions.length) * 100

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{test.title}</h1>
          <p className="text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length} | Total: {test.totalMarks} marks
          </p>
        </div>
        <div className="flex items-center gap-4">
          {timeLeft !== null && (
            <Badge
              variant={timeLeft < 300 ? "destructive" : "secondary"}
              className="text-lg px-4 py-2"
            >
              <Clock className="mr-2 h-4 w-4" />
              {formatTime(timeLeft)}
            </Badge>
          )}
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {answeredCount}/{questions.length} answered
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Question Navigation */}
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => {
          const answer = answers.find((a) => a.questionId === q.id)
          const isAnswered =
            answer &&
            (answer.selectedOptionId ||
              answer.numericalAnswer !== undefined ||
              answer.textAnswer)

          return (
            <Button
              key={q.id}
              variant={
                i === currentQuestion ? "default" : isAnswered ? "secondary" : "outline"
              }
              size="sm"
              onClick={() => setCurrentQuestion(i)}
              className="w-10 h-10"
            >
              {i + 1}
            </Button>
          )
        })}
      </div>

      {/* Current Question */}
      {currentQ && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                {currentQ.type === "mcq"
                  ? "Multiple Choice"
                  : currentQ.type === "numerical"
                  ? "Numerical"
                  : "Subjective"}
              </Badge>
              <span className="text-sm text-muted-foreground">{currentQ.marks} marks</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg whitespace-pre-wrap">{currentQ.text}</p>

            {currentQ.type === "mcq" && currentQ.options && (
              <RadioGroup
                value={currentAnswer?.selectedOptionId || ""}
                onValueChange={(v) => updateAnswer(currentQ.id, { selectedOptionId: v })}
                className="space-y-3"
              >
                {currentQ.options.map((option, i) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value={option.id} />
                    <span>
                      <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                      {option.text}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}

            {currentQ.type === "numerical" && (
              <Input
                type="number"
                step="any"
                placeholder="Enter your numerical answer"
                value={currentAnswer?.numericalAnswer ?? ""}
                onChange={(e) =>
                  updateAnswer(currentQ.id, {
                    numericalAnswer: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                className="text-lg"
              />
            )}

            {currentQ.type === "subjective" && (
              <div>
                <Textarea
                  placeholder="Write your answer here..."
                  value={currentAnswer?.textAnswer || ""}
                  onChange={(e) =>
                    updateAnswer(currentQ.id, { textAnswer: e.target.value })
                  }
                  rows={6}
                  className="text-base"
                />
                {currentQ.maxWords && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Max words: {currentQ.maxWords}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation & Submit */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestion < questions.length - 1 ? (
            <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>Next</Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Spinner className="mr-2" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Submit Test
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit your test?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You have answered {answeredCount} out of {questions.length} questions.
                    Once submitted, you cannot make changes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Review Answers</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleSubmit()}>
                    Submit Test
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  )
}