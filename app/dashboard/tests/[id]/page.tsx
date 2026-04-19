"use client"

import { use, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Empty } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
import {
  ArrowLeft,
  Clock,
  Users,
  ClipboardList,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  ShieldCheck,
  ShieldOff,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import type { Question, AntiCheatingSettings } from "@/lib/types"
import { DEFAULT_ANTI_CHEATING } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq: "MCQ",
  "true-false": "True/False",
  numerical: "Numerical",
  "fill-blank": "Fill Blank",
  match: "Match",
  subjective: "Subjective",
}

const AC_LABELS: Partial<Record<keyof AntiCheatingSettings, string>> = {
  requireFullscreen: "Fullscreen required",
  blockTabSwitch: "Tab-switch detection",
  requireCamera: "Camera access",
  requireMicrophone: "Microphone access",
  disableRightClick: "Right-click disabled",
  disableCopyPaste: "Copy/paste disabled",
}

export default function TestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(`/api/tests/${id}`, fetcher)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const togglePublish = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/tests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !data?.data?.isPublished }),
      })
      if (!response.ok) throw new Error("Failed to update test")
      toast.success(data?.data?.isPublished ? "Test unpublished" : "Test published")
      mutate()
    } catch {
      toast.error("Failed to update test")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/tests/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete test")
      toast.success("Test deleted successfully")
      router.push("/dashboard/tests")
    } catch {
      toast.error("Failed to delete test")
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!data?.data) {
    return (
      <Card>
        <CardContent className="py-12">
          <Empty
            icon={ClipboardList}
            title="Test not found"
            description="This test may have been deleted"
            action={
              <Link href="/dashboard/tests">
                <Button>Back to Tests</Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    )
  }

  const test = data.data
  const ac: AntiCheatingSettings = test.antiCheating ?? DEFAULT_ANTI_CHEATING
  const activeAC = (Object.keys(AC_LABELS) as (keyof AntiCheatingSettings)[]).filter(
    (k) => ac[k] === true
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{test.title}</h1>
            <Badge variant={test.isPublished ? "default" : "secondary"}>
              {test.isPublished ? "Published" : "Draft"}
            </Badge>
          </div>
          {test.description && (
            <p className="text-muted-foreground mt-1">{test.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={togglePublish} disabled={isUpdating}>
            {isUpdating ? (
              <Spinner className="mr-2" />
            ) : test.isPublished ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {test.isPublished ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Questions ── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Questions ({test.questions.length})
              </CardTitle>
              <CardDescription>Total marks: {test.totalMarks}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {test.questions.map((question: Question, index: number) => (
                  <div key={question.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Q{index + 1}.</span>
                        <Badge variant="outline" className="text-xs">
                          {QUESTION_TYPE_LABELS[question.type] ?? question.type}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {question.marks} marks
                      </span>
                    </div>
                    <p className="mb-3 whitespace-pre-wrap">{question.text}</p>

                    {/* MCQ */}
                    {question.type === "mcq" && question.options && (
                      <div className="space-y-1 ml-4">
                        {question.options.map((option, i) => (
                          <div
                            key={option.id}
                            className={`text-sm ${
                              option.id === question.correctOptionId
                                ? "text-accent font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {option.text}
                            {option.id === question.correctOptionId && " ✓"}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* True/False */}
                    {question.type === "true-false" && (
                      <p className="text-sm text-muted-foreground ml-4">
                        Correct:{" "}
                        <span className="font-medium text-accent">
                          {question.correctBoolean ? "True" : "False"}
                        </span>
                      </p>
                    )}

                    {/* Numerical */}
                    {question.type === "numerical" && (
                      <p className="text-sm text-muted-foreground ml-4">
                        Answer: {question.correctAnswer}
                        {question.tolerance ? ` (± ${question.tolerance})` : ""}
                      </p>
                    )}

                    {/* Fill-blank */}
                    {question.type === "fill-blank" && question.blanks && (
                      <div className="ml-4 space-y-1">
                        {question.blanks.map((b, i) => (
                          <p key={i} className="text-sm text-muted-foreground">
                            Blank {i + 1}:{" "}
                            <span className="font-medium text-accent">{b}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Match */}
                    {question.type === "match" && question.matchPairs && (
                      <div className="ml-4 space-y-1">
                        {question.matchPairs.map((pair) => (
                          <div
                            key={pair.id}
                            className="text-sm text-muted-foreground flex items-center gap-2"
                          >
                            <span className="font-medium">{pair.left}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="text-accent font-medium">
                              {pair.right}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Subjective */}
                    {question.type === "subjective" && question.maxWords && (
                      <p className="text-sm text-muted-foreground ml-4">
                        Max words: {question.maxWords}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Test details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{test.duration} minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="font-medium">
                    {format(new Date(test.availableFrom), "MMM d, yyyy")} –{" "}
                    {format(new Date(test.availableTo), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Submissions</p>
                  <p className="font-medium">{test.submissionCount} submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anti-cheating summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                {activeAC.length > 0 ? (
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                ) : (
                  <ShieldOff className="h-5 w-5 text-muted-foreground" />
                )}
                <CardTitle className="text-lg">Anti-Cheating</CardTitle>
                {activeAC.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {activeAC.length} active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {activeAC.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No anti-cheating measures enabled for this test.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeAC.map((k) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span>{AC_LABELS[k]}</span>
                    </div>
                  ))}
                  {(ac.requireFullscreen || ac.blockTabSwitch) &&
                    ac.maxViolations > 0 && (
                      <>
                        <Separator />
                        <p className="text-sm text-muted-foreground">
                          Auto-submit after{" "}
                          <span className="font-medium">
                            {ac.maxViolations}
                          </span>{" "}
                          violation{ac.maxViolations !== 1 ? "s" : ""}
                        </p>
                      </>
                    )}
                  {(ac.requireFullscreen || ac.blockTabSwitch) &&
                    ac.maxViolations === 0 && (
                      <>
                        <Separator />
                        <p className="text-sm text-muted-foreground">
                          Warn only — no auto-submit
                        </p>
                      </>
                    )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned groups */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigned Groups</CardTitle>
            </CardHeader>
            <CardContent>
              {test.groups.length > 0 ? (
                <div className="space-y-2">
                  {test.groups.map((group: { _id: string; name: string }) => (
                    <div
                      key={group._id}
                      className="flex items-center gap-2 p-2 border rounded"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{group.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No groups assigned</p>
              )}
            </CardContent>
          </Card>

          {test.submissionCount > 0 && (
            <Link href={`/dashboard/submissions?testId=${id}`}>
              <Button className="w-full">View Submissions</Button>
            </Link>
          )}

          {/* Danger zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Spinner className="mr-2" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete Test
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this test?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the test and all submissions.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}