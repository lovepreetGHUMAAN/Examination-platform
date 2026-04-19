"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { QuestionEditor } from "@/components/tests/question-editor"
import {
  ArrowLeft,
  Plus,
  Save,
  Eye,
  ShieldCheck,
  Info,
  Zap,
  ZapOff,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { nanoid } from "nanoid"
import type { Question, AntiCheatingSettings } from "@/lib/types"
import { DEFAULT_ANTI_CHEATING, hasAntiCheating } from "@/lib/types"
import { format } from "date-fns"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const AC_OPTIONS: {
  key: keyof AntiCheatingSettings
  label: string
  description: string
}[] = [
  {
    key: "requireFullscreen",
    label: "Require Fullscreen",
    description:
      "Forces the student into fullscreen mode. A violation is recorded each time they exit.",
  },
  {
    key: "blockTabSwitch",
    label: "Detect Tab / Window Switch",
    description:
      "Records a violation whenever the student switches to another tab or window.",
  },
  {
    key: "requireCamera",
    label: "Request Camera Access",
    description:
      "Asks the student for camera access and shows a small live preview to discourage proxy test-taking.",
  },
  {
    key: "requireMicrophone",
    label: "Request Microphone Access",
    description: "Asks the student for microphone access during the test.",
  },
  {
    key: "disableRightClick",
    label: "Disable Right-Click",
    description: "Prevents the context menu from opening during the test.",
  },
  {
    key: "disableCopyPaste",
    label: "Disable Copy / Paste",
    description: "Blocks Ctrl+C, Ctrl+V, Ctrl+X keyboard shortcuts.",
  },
]

export default function NewTestPage() {
  const router = useRouter()
  const { data: groupsData } = useSWR("/api/groups", fetcher)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 60,
    availableFrom: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    availableTo: format(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd'T'HH:mm"
    ),
    groupIds: [] as string[],
    isPublished: false,
  })

  const [antiCheating, setAntiCheating] =
    useState<AntiCheatingSettings>(DEFAULT_ANTI_CHEATING)

  // autoGrade: teacher can toggle, but forced off when any anti-cheat is active
  const [autoGrade, setAutoGrade] = useState(true)

  const [questions, setQuestions] = useState<Question[]>([
    {
      id: nanoid(8),
      type: "mcq",
      text: "",
      marks: 1,
      options: [
        { id: nanoid(6), text: "" },
        { id: nanoid(6), text: "" },
      ],
      correctOptionId: "",
    },
  ])

  const acActive = hasAntiCheating(antiCheating)
  const hasSubjective = questions.some((q) => q.type === "subjective")

  // When any anti-cheat option is turned on, force autoGrade off
  useEffect(() => {
    if (acActive) setAutoGrade(false)
  }, [acActive])

  // Derived: what will actually be used
  // autoGrade is also meaningless if there are subjective questions
  const effectiveAutoGrade = autoGrade && !acActive && !hasSubjective

  // ── question helpers ──────────────────────────────────────────────────────
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: nanoid(8),
        type: "mcq",
        text: "",
        marks: 1,
        options: [
          { id: nanoid(6), text: "" },
          { id: nanoid(6), text: "" },
        ],
        correctOptionId: "",
      },
    ])
  }

  const updateQuestion = (index: number, question: Question) => {
    const next = [...questions]
    next[index] = question
    setQuestions(next)
  }

  const deleteQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    } else {
      toast.error("A test must have at least one question")
    }
  }

  const toggleGroup = (groupId: string) => {
    setFormData((prev) => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter((id) => id !== groupId)
        : [...prev.groupIds, groupId],
    }))
  }

  // ── validation ────────────────────────────────────────────────────────────
  const validateTest = () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a test title")
      return false
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) {
        toast.error(`Question ${i + 1} is empty`)
        return false
      }
      if (q.type === "mcq") {
        if (q.options?.some((o) => !o.text.trim())) {
          toast.error(`Question ${i + 1}: All options must be filled`)
          return false
        }
        if (!q.correctOptionId) {
          toast.error(`Question ${i + 1}: Please select the correct answer`)
          return false
        }
      }
      if (
        q.type === "fill-blank" &&
        (!q.blanks?.length || q.blanks.some((b) => !b.trim()))
      ) {
        toast.error(`Question ${i + 1}: Fill in all blank answers`)
        return false
      }
      if (
        q.type === "match" &&
        (!q.matchPairs?.length ||
          q.matchPairs.some((p) => !p.left.trim() || !p.right.trim()))
      ) {
        toast.error(`Question ${i + 1}: Fill in all match pairs`)
        return false
      }
    }
    return true
  }

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (publish: boolean) => {
    if (!validateTest()) return
    setIsLoading(true)
    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          questions,
          isPublished: publish,
          antiCheating,
          autoGrade: effectiveAutoGrade,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create test")
      toast.success(
        publish ? "Test published successfully!" : "Test saved as draft"
      )
      router.push(`/dashboard/tests/${data.data._id}`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create test"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)
  const activeACCount = (
    Object.keys(DEFAULT_ANTI_CHEATING) as (keyof AntiCheatingSettings)[]
  ).filter((k) => k !== "maxViolations" && antiCheating[k] === true).length

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">
              Create New Test
            </h1>
            <p className="text-muted-foreground mt-1">
              Add questions and configure test settings
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Spinner className="mr-2" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Draft
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={isLoading}>
              {isLoading ? (
                <Spinner className="mr-2" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Main ── */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Details</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="title">Test Title</FieldLabel>
                    <Input
                      id="title"
                      placeholder="e.g., Chapter 5 Quiz"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="description">
                      Description (Optional)
                    </FieldLabel>
                    <Textarea
                      id="description"
                      placeholder="Brief instructions or description..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      disabled={isLoading}
                      rows={2}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Questions ({questions.length})
              </h2>
              <p className="text-muted-foreground">Total: {totalMarks} marks</p>
            </div>

            {questions.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index}
                onChange={(q) => updateQuestion(index, q)}
                onDelete={() => deleteQuestion(index)}
              />
            ))}

            <Button
              variant="outline"
              onClick={addQuestion}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">
            {/* Test Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="duration">
                      Duration (minutes)
                    </FieldLabel>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration: parseInt(e.target.value) || 60,
                        })
                      }
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="availableFrom">
                      Available From
                    </FieldLabel>
                    <Input
                      id="availableFrom"
                      type="datetime-local"
                      value={formData.availableFrom}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          availableFrom: e.target.value,
                        })
                      }
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="availableTo">
                      Available Until
                    </FieldLabel>
                    <Input
                      id="availableTo"
                      type="datetime-local"
                      value={formData.availableTo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          availableTo: e.target.value,
                        })
                      }
                      disabled={isLoading}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>

            {/* ── Auto-grading ── */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {effectiveAutoGrade ? (
                    <Zap className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ZapOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  <CardTitle className="text-lg">Grading</CardTitle>
                </div>
                <CardDescription>
                  Control whether answers are graded automatically on submission
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toggle — disabled when anti-cheat or subjective forces it off */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Auto-grade on submit</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {acActive
                        ? "Disabled — anti-cheat is active. Teacher must review first."
                        : hasSubjective
                        ? "Disabled — test has subjective questions that need manual grading."
                        : autoGrade
                        ? "Objective answers will be graded instantly on submission."
                        : "Teacher will manually review and grade this test."}
                    </p>
                  </div>
                  <Switch
                    checked={effectiveAutoGrade}
                    onCheckedChange={(v) => setAutoGrade(v)}
                    disabled={isLoading || acActive || hasSubjective}
                  />
                </div>

                {/* Status pill */}
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border ${
                    effectiveAutoGrade
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {effectiveAutoGrade ? (
                    <>
                      <Zap className="h-4 w-4 shrink-0" />
                      Results shown to student immediately after submission
                    </>
                  ) : (
                    <>
                      <ZapOff className="h-4 w-4 shrink-0" />
                      Teacher reviews submission before results are visible
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Anti-cheating */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Anti-Cheating</CardTitle>
                  </div>
                  {activeACCount > 0 && (
                    <Badge variant="secondary">{activeACCount} active</Badge>
                  )}
                </div>
                <CardDescription>
                  Optional measures to maintain test integrity.{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Enabling any option disables auto-grading.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {AC_OPTIONS.map((opt) => (
                  <div key={opt.key} className="flex items-start gap-3">
                    <Checkbox
                      id={`ac-${opt.key}`}
                      checked={antiCheating[opt.key] as boolean}
                      onCheckedChange={(checked) =>
                        setAntiCheating((prev) => ({
                          ...prev,
                          [opt.key]: !!checked,
                        }))
                      }
                      disabled={isLoading}
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`ac-${opt.key}`}
                        className="text-sm font-medium cursor-pointer flex items-center gap-1"
                      >
                        {opt.label}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground inline" />
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs text-xs">
                            {opt.description}
                          </TooltipContent>
                        </Tooltip>
                      </label>
                    </div>
                  </div>
                ))}

                {(antiCheating.requireFullscreen ||
                  antiCheating.blockTabSwitch) && (
                  <>
                    <Separator />
                    <Field>
                      <FieldLabel htmlFor="maxViolations">
                        Max violations before auto-submit
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground inline ml-1" />
                          </TooltipTrigger>
                          <TooltipContent
                            side="left"
                            className="max-w-xs text-xs"
                          >
                            After this many fullscreen exits or tab switches the
                            test is automatically submitted. Set to 0 to warn
                            only and never auto-submit.
                          </TooltipContent>
                        </Tooltip>
                      </FieldLabel>
                      <Input
                        id="maxViolations"
                        type="number"
                        min={0}
                        value={antiCheating.maxViolations}
                        onChange={(e) =>
                          setAntiCheating((prev) => ({
                            ...prev,
                            maxViolations: parseInt(e.target.value) || 0,
                          }))
                        }
                        disabled={isLoading}
                      />
                    </Field>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Assign Groups */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assign to Groups</CardTitle>
                <CardDescription>
                  Select which groups can take this test
                </CardDescription>
              </CardHeader>
              <CardContent>
                {groupsData?.data?.length > 0 ? (
                  <div className="space-y-3">
                    {groupsData.data.map(
                      (group: {
                        _id: string
                        name: string
                        memberCount: number
                      }) => (
                        <label
                          key={group._id}
                          className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={formData.groupIds.includes(group._id)}
                            onCheckedChange={() => toggleGroup(group._id)}
                            disabled={isLoading}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{group.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {group.memberCount} students
                            </p>
                          </div>
                        </label>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No groups available.{" "}
                    <Link
                      href="/dashboard/groups/new"
                      className="text-primary hover:underline"
                    >
                      Create a group
                    </Link>{" "}
                    first.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}