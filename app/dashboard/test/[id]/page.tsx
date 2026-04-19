"use client"

import { use, useState, useEffect, useCallback, useRef } from "react"
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
import {
  ArrowLeft,
  Clock,
  ClipboardList,
  Send,
  CheckCircle,
  AlertTriangle,
  Maximize,
  Camera,
  ArrowRight,
  Loader2,
  Zap,
  ZapOff,
} from "lucide-react"
import { toast } from "sonner"
import type {
  Answer,
  AntiCheatingSettings,
  ViolationEvent,
  ViolationType,
} from "@/lib/types"
import { DEFAULT_ANTI_CHEATING } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface QuestionData {
  id: string
  type: "mcq" | "numerical" | "subjective" | "true-false" | "fill-blank" | "match"
  text: string
  marks: number
  options?: { id: string; text: string }[]
  maxWords?: number
  blanks?: string[]
  matchPairs?: { id: string; left: string; right: string }[]
}

function enterFullscreen() {
  const el = document.documentElement
  if (el.requestFullscreen) el.requestFullscreen()
  // @ts-expect-error vendor prefix
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
  // @ts-expect-error vendor prefix
  else if (el.mozRequestFullScreen) el.mozRequestFullScreen()
}

function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    // @ts-expect-error vendor prefix
    document.webkitFullscreenElement ||
    // @ts-expect-error vendor prefix
    document.mozFullScreenElement
  )
}

export default function TakeTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, error } = useSWR(`/api/student/tests/${id}`, fetcher)

  const [answers, setAnswers] = useState<Answer[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const ac: AntiCheatingSettings = data?.data?.test?.antiCheating ?? DEFAULT_ANTI_CHEATING
  const autoGrade: boolean = data?.data?.test?.autoGrade ?? true

  const [violations, setViolations] = useState<ViolationEvent[]>([])
  const [violationCount, setViolationCount] = useState(0)
  const [showViolationWarning, setShowViolationWarning] = useState(false)
  const [violationReason, setViolationReason] = useState("")

  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const [awaitingPermissions, setAwaitingPermissions] = useState(false)
  const permissionsResolvedRef = useRef(false)
  const hasStartedRef = useRef(false)
  const violationsRef = useRef<ViolationEvent[]>([])

  useEffect(() => { violationsRef.current = violations }, [violations])

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (autoSubmit = false, finalViolations?: ViolationEvent[]) => {
      if (isSubmitting) return
      setIsSubmitting(true)
      try {
        const response = await fetch(`/api/student/tests/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers,
            violations: finalViolations ?? violationsRef.current,
          }),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Failed to submit test")
        if (autoSubmit) toast.info("Test auto-submitted due to too many violations.")
        else toast.success("Test submitted successfully!")
        router.push("/dashboard/results")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to submit test")
        setIsSubmitting(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, answers, isSubmitting, router]
  )

  // ── Record violation ─────────────────────────────────────────────────────
  const recordViolation = useCallback(
    (type: ViolationType) => {
      if (!permissionsResolvedRef.current) return
      setViolationCount((prev) => {
        const next = prev + 1
        const event: ViolationEvent = { type, timestamp: new Date().toISOString(), count: next }
        setViolations((v) => {
          const updated = [...v, event]
          violationsRef.current = updated
          if (ac.maxViolations > 0 && next >= ac.maxViolations) {
            const autoEvent: ViolationEvent = { type: "auto_submitted", timestamp: new Date().toISOString(), count: next }
            const final = [...updated, autoEvent]
            violationsRef.current = final
            handleSubmit(true, final)
          }
          return updated
        })
        return next
      })
    },
    [ac.maxViolations, handleSubmit]
  )

  useEffect(() => {
    if (data?.data?.submission?.answers) setAnswers(data.data.submission.answers)
  }, [data])

  useEffect(() => {
    if (data?.data?.test?.duration && data?.data?.submission?.startedAt && !data?.data?.alreadySubmitted) {
      const startTime = new Date(data.data.submission.startedAt).getTime()
      const duration = data.data.test.duration * 60 * 1000
      setTimeLeft(Math.max(0, Math.floor((startTime + duration - Date.now()) / 1000)))
    }
  }, [data])

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) { clearInterval(timer); handleSubmit(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft, handleSubmit])

  // ── Anti-cheat setup — camera FIRST, listeners AFTER ────────────────────
  useEffect(() => {
    if (!data?.data?.test || data?.data?.alreadySubmitted || hasStartedRef.current) return
    hasStartedRef.current = true
    const settings: AntiCheatingSettings = data.data.test.antiCheating ?? DEFAULT_ANTI_CHEATING

    const handleContextMenu = (e: MouseEvent) => { if (settings.disableRightClick) e.preventDefault() }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (settings.disableCopyPaste && (e.ctrlKey || e.metaKey) && ["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault()
        toast.warning("Copy/paste is disabled during this test.")
      }
    }
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)

    const startMonitoring = () => {
      if (settings.requireFullscreen) enterFullscreen()
      // Give browser 1s to fully refocus after permission dialog / fullscreen
      setTimeout(() => { permissionsResolvedRef.current = true }, 1000)
    }

    if (settings.requireCamera || settings.requireMicrophone) {
      setAwaitingPermissions(true)
      navigator.mediaDevices
        .getUserMedia({ video: settings.requireCamera, audio: settings.requireMicrophone })
        .then((stream) => {
          setMediaStream(stream)
          if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream
          if (settings.requireCamera) toast.success("Camera access granted.")
          if (settings.requireMicrophone) toast.success("Microphone access granted.")
        })
        .catch(() => {
          if (settings.requireCamera) toast.warning("Camera access denied. This will be noted.")
          if (settings.requireMicrophone) toast.warning("Microphone access denied.")
        })
        .finally(() => { setAwaitingPermissions(false); startMonitoring() })
    } else {
      startMonitoring()
    }

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [data])

  useEffect(() => {
    if (mediaStream && cameraVideoRef.current) cameraVideoRef.current.srcObject = mediaStream
  }, [mediaStream])

  useEffect(() => {
    if (!data?.data?.test?.antiCheating?.requireFullscreen || data?.data?.alreadySubmitted) return
    const handleFSChange = () => {
      if (!isFullscreen()) { setViolationReason("You exited fullscreen mode."); setShowViolationWarning(true); recordViolation("fullscreen_exit") }
    }
    document.addEventListener("fullscreenchange", handleFSChange)
    document.addEventListener("webkitfullscreenchange", handleFSChange)
    document.addEventListener("mozfullscreenchange", handleFSChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange)
      document.removeEventListener("webkitfullscreenchange", handleFSChange)
      document.removeEventListener("mozfullscreenchange", handleFSChange)
    }
  }, [data, recordViolation])

  useEffect(() => {
    if (!data?.data?.test?.antiCheating?.blockTabSwitch || data?.data?.alreadySubmitted) return
    const handleVisibilityChange = () => {
      if (document.hidden) { setViolationReason("You switched to another tab or window."); setShowViolationWarning(true); recordViolation("tab_switch") }
    }
    const handleBlur = () => {
      if (!permissionsResolvedRef.current) return
      setViolationReason("You left the test window."); setShowViolationWarning(true); recordViolation("window_blur")
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleBlur)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleBlur)
    }
  }, [data, recordViolation])

  useEffect(() => { return () => { mediaStream?.getTracks().forEach((t) => t.stop()) } }, [mediaStream])

  const saveProgress = useCallback(async () => {
    if (isSaving || !answers.length) return
    setIsSaving(true)
    try {
      await fetch(`/api/student/tests/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) })
    } catch { /* silent */ } finally { setIsSaving(false) }
  }, [id, answers, isSaving])

  useEffect(() => {
    if (data?.data?.alreadySubmitted) return
    const interval = setInterval(saveProgress, 30000)
    return () => clearInterval(interval)
  }, [saveProgress, data])

  const updateAnswer = (questionId: string, update: Partial<Answer>) => {
    setAnswers((prev) => prev.map((a) => a.questionId === questionId ? { ...a, ...update } : a))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins}:${(seconds % 60).toString().padStart(2, "0")}`
  }

  const getMatchSelections = (answer: Answer | undefined): Record<string, string> => {
    if (!answer?.matchAnswer) return {}
    try {
      const arr: { pairId: string; selectedRight: string }[] = JSON.parse(answer.matchAnswer)
      return Object.fromEntries(arr.map((m) => [m.pairId, m.selectedRight]))
    } catch { return {} }
  }

  const updateMatchSelection = (questionId: string, pairId: string, selectedRight: string, allPairs: { id: string }[]) => {
    const current = getMatchSelections(answers.find((a) => a.questionId === questionId))
    current[pairId] = selectedRight
    updateAnswer(questionId, { matchAnswer: JSON.stringify(allPairs.map((p) => ({ pairId: p.id, selectedRight: current[p.id] ?? "" }))) })
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner className="h-8 w-8" /></div>

  if (error || !data?.success) {
    return (
      <Card>
        <CardContent className="py-12 flex flex-col items-center text-center gap-4">
          <ClipboardList className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="font-medium">Cannot access test</p>
            <p className="text-sm text-muted-foreground mt-1">{data?.error || "You do not have access to this test"}</p>
          </div>
          <Link href="/dashboard/available-tests"><Button>Back to Tests</Button></Link>
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
            <p className="text-muted-foreground mb-6">You have already completed this test.</p>
            <div className="flex justify-center gap-4">
              <Link href="/dashboard/available-tests"><Button variant="outline">Back to Tests</Button></Link>
              <Link href="/dashboard/results"><Button>View Results</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (awaitingPermissions) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        <p className="text-lg font-medium">Requesting permissions…</p>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Please allow camera and/or microphone access in the browser prompt. The test will start automatically once you respond.
        </p>
      </div>
    )
  }

  const test = data.data.test
  const questions: QuestionData[] = test.questions
  const currentQ = questions[currentQuestion]
  const currentAnswer = answers.find((a) => a.questionId === currentQ?.id)

  const answeredCount = answers.filter((a) => {
    const q = questions.find((q) => q.id === a.questionId)
    if (!q) return false
    switch (q.type) {
      case "mcq": return !!a.selectedOptionId
      case "true-false": return a.booleanAnswer !== undefined
      case "numerical": return a.numericalAnswer !== undefined
      case "fill-blank": return !!a.textAnswer
      case "match": return !!a.matchAnswer
      case "subjective": return !!a.textAnswer
      default: return false
    }
  }).length

  const willBeAutoGraded = autoGrade && violationCount === 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Violation warning */}
      <AlertDialog open={showViolationWarning} onOpenChange={setShowViolationWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Warning — Violation Recorded
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">{violationReason}</span>
              <span className="block font-medium">
                Violation {violationCount} of {ac.maxViolations > 0 ? ac.maxViolations : "∞"}
              </span>
              {ac.maxViolations > 0 && (
                <span className="block text-destructive">
                  Your test will be automatically submitted after {ac.maxViolations} violation{ac.maxViolations !== 1 ? "s" : ""}.
                </span>
              )}
              <span className="block text-amber-600 font-medium">
                ⚠ Violations disable auto-grading. Your teacher will review this submission manually.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {ac.requireFullscreen ? (
              <AlertDialogAction onClick={() => { enterFullscreen(); setShowViolationWarning(false) }}>
                <Maximize className="mr-2 h-4 w-4" /> Return to Fullscreen
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={() => setShowViolationWarning(false)}>Continue Test</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Auto-grade info banner ── */}
      <div className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm border ${
        willBeAutoGraded
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
          : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
      }`}>
        {willBeAutoGraded ? (
          <><Zap className="h-4 w-4 shrink-0" /><span><strong>Auto-graded:</strong> Your results will be shown immediately after you submit.</span></>
        ) : (
          <><ZapOff className="h-4 w-4 shrink-0" /><span><strong>Manual review:</strong> Your teacher will review and grade this submission before results are visible.</span></>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{test.title}</h1>
          <p className="text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length} | Total: {test.totalMarks} marks
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ac.requireCamera && mediaStream && (
            <div className="relative w-20 h-16 rounded overflow-hidden border bg-muted">
              <video ref={cameraVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <Camera className="absolute bottom-1 right-1 h-3 w-3 text-white drop-shadow" />
            </div>
          )}
          {(ac.requireFullscreen || ac.blockTabSwitch) && violationCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {violationCount} violation{violationCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {timeLeft !== null && (
            <Badge variant={timeLeft < 300 ? "destructive" : "secondary"} className="text-lg px-4 py-2">
              <Clock className="mr-2 h-4 w-4" />{formatTime(timeLeft)}
            </Badge>
          )}
          {isSaving && <span className="text-xs text-muted-foreground">Saving…</span>}
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{answeredCount}/{questions.length} answered</span>
          </div>
          <Progress value={(answeredCount / questions.length) * 100} className="h-2" />
        </CardContent>
      </Card>

      {/* Question navigation */}
      <div className="flex flex-wrap gap-2">
        {questions.map((q, i) => {
          const ans = answers.find((a) => a.questionId === q.id)
          const isAnswered = ans && (ans.selectedOptionId || ans.booleanAnswer !== undefined || ans.numericalAnswer !== undefined || ans.textAnswer || ans.matchAnswer)
          return (
            <Button key={q.id} variant={i === currentQuestion ? "default" : isAnswered ? "secondary" : "outline"} size="sm" onClick={() => setCurrentQuestion(i)} className="w-10 h-10">
              {i + 1}
            </Button>
          )
        })}
      </div>

      {/* Current question */}
      {currentQ && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                {currentQ.type === "mcq" ? "Multiple Choice" : currentQ.type === "true-false" ? "True / False" : currentQ.type === "numerical" ? "Numerical" : currentQ.type === "fill-blank" ? "Fill in the Blank" : currentQ.type === "match" ? "Match the Following" : "Subjective"}
              </Badge>
              <span className="text-sm text-muted-foreground">{currentQ.marks} marks</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg whitespace-pre-wrap">{currentQ.text}</p>

            {currentQ.type === "mcq" && currentQ.options && (
              <RadioGroup value={currentAnswer?.selectedOptionId || ""} onValueChange={(v) => updateAnswer(currentQ.id, { selectedOptionId: v })} className="space-y-3">
                {currentQ.options.map((option, i) => (
                  <label key={option.id} className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={option.id} />
                    <span><span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{option.text}</span>
                  </label>
                ))}
              </RadioGroup>
            )}

            {currentQ.type === "true-false" && (
              <RadioGroup value={currentAnswer?.booleanAnswer === true ? "true" : currentAnswer?.booleanAnswer === false ? "false" : ""} onValueChange={(v) => updateAnswer(currentQ.id, { booleanAnswer: v === "true" })} className="flex gap-6">
                {["true", "false"].map((val) => (
                  <label key={val} className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors flex-1 justify-center">
                    <RadioGroupItem value={val} />
                    <span className="font-medium capitalize">{val}</span>
                  </label>
                ))}
              </RadioGroup>
            )}

            {currentQ.type === "numerical" && (
              <Input type="number" step="any" placeholder="Enter your numerical answer" value={currentAnswer?.numericalAnswer ?? ""} onChange={(e) => updateAnswer(currentQ.id, { numericalAnswer: e.target.value ? parseFloat(e.target.value) : undefined })} className="text-lg" />
            )}

            {currentQ.type === "fill-blank" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Fill in each blank in order:</p>
                {(currentQ.blanks ?? []).map((_, i) => {
                  const parts = (currentAnswer?.textAnswer ?? "").split("|").map((s) => s.trim())
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-16 shrink-0">Blank {i + 1}</span>
                      <Input placeholder={`Answer for blank ${i + 1}`} value={parts[i] ?? ""} onChange={(e) => { const updated = [...parts]; updated[i] = e.target.value; updateAnswer(currentQ.id, { textAnswer: updated.join(" | ") }) }} className="flex-1" />
                    </div>
                  )
                })}
              </div>
            )}

            {currentQ.type === "match" && currentQ.matchPairs && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Match each item on the left with the correct item on the right:</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {currentQ.matchPairs.map((pair) => <Badge key={pair.id} variant="outline" className="text-sm">{pair.right}</Badge>)}
                </div>
                {currentQ.matchPairs.map((pair) => {
                  const selections = getMatchSelections(currentAnswer)
                  return (
                    <div key={pair.id} className="flex items-center gap-3">
                      <span className="flex-1 font-medium text-sm border rounded-lg p-3 bg-muted/30">{pair.left}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <select className="flex-1 border rounded-lg p-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={selections[pair.id] ?? ""} onChange={(e) => updateMatchSelection(currentQ.id, pair.id, e.target.value, currentQ.matchPairs!)}>
                        <option value="">— Select —</option>
                        {currentQ.matchPairs!.map((p) => <option key={p.id} value={p.right}>{p.right}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>
            )}

            {currentQ.type === "subjective" && (
              <div>
                <Textarea placeholder="Write your answer here..." value={currentAnswer?.textAnswer || ""} onChange={(e) => updateAnswer(currentQ.id, { textAnswer: e.target.value })} rows={6} className="text-base" />
                {currentQ.maxWords && <p className="text-sm text-muted-foreground mt-2">Max words: {currentQ.maxWords}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation & Submit */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))} disabled={currentQuestion === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <div className="flex gap-2">
          {currentQuestion < questions.length - 1 ? (
            <Button onClick={() => setCurrentQuestion(currentQuestion + 1)}>Next</Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isSubmitting}>
                  {isSubmitting ? <Spinner className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                  Submit Test
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit your test?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <span className="block">
                      You have answered {answeredCount} out of {questions.length} questions. Once submitted, you cannot make changes.
                    </span>
                    {violationCount > 0 && (
                      <span className="block text-destructive font-medium">
                        ⚠ {violationCount} violation{violationCount !== 1 ? "s" : ""} recorded — your teacher will review this submission manually.
                      </span>
                    )}
                    <span className={`block text-sm font-medium ${willBeAutoGraded ? "text-emerald-600" : "text-amber-600"}`}>
                      {willBeAutoGraded
                        ? "⚡ Results will be shown immediately after submission."
                        : "📋 Your teacher will review and grade this submission before results are visible."}
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Review Answers</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleSubmit()}>Submit Test</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  )
}