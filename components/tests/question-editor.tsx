"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, GripVertical, ArrowRight } from "lucide-react"
import type { Question, QuestionType, MCQOption, MatchPair } from "@/lib/types"
import { nanoid } from "nanoid"

interface QuestionEditorProps {
  question: Question
  index: number
  onChange: (question: Question) => void
  onDelete: () => void
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Multiple Choice",
  "true-false": "True / False",
  numerical: "Numerical",
  "fill-blank": "Fill in the Blank",
  match: "Match the Following",
  subjective: "Subjective",
}

export function QuestionEditor({
  question,
  index,
  onChange,
  onDelete,
}: QuestionEditorProps) {
  // ── type change ──────────────────────────────────────────────────────────
  const handleTypeChange = (type: QuestionType) => {
    const base = { id: question.id, type, text: question.text, marks: question.marks }

    switch (type) {
      case "mcq":
        return onChange({
          ...base,
          options: [
            { id: nanoid(6), text: "" },
            { id: nanoid(6), text: "" },
          ],
          correctOptionId: "",
        })
      case "true-false":
        return onChange({ ...base, correctBoolean: true })
      case "numerical":
        return onChange({ ...base, correctAnswer: 0, tolerance: 0 })
      case "fill-blank":
        return onChange({ ...base, blanks: [""] })
      case "match":
        return onChange({
          ...base,
          matchPairs: [
            { id: nanoid(6), left: "", right: "" },
            { id: nanoid(6), left: "", right: "" },
          ],
        })
      case "subjective":
        return onChange({ ...base, maxWords: 500, keywords: [] })
    }
  }

  // ── MCQ helpers ──────────────────────────────────────────────────────────
  const addOption = () => {
    if (question.type !== "mcq" || !question.options) return
    onChange({ ...question, options: [...question.options, { id: nanoid(6), text: "" }] })
  }

  const removeOption = (optionId: string) => {
    if (question.type !== "mcq" || !question.options || question.options.length <= 2) return
    onChange({
      ...question,
      options: question.options.filter((o) => o.id !== optionId),
      correctOptionId:
        question.correctOptionId === optionId ? "" : question.correctOptionId,
    })
  }

  const updateOption = (optionId: string, text: string) => {
    if (question.type !== "mcq" || !question.options) return
    onChange({
      ...question,
      options: question.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
    })
  }

  // ── Fill-blank helpers ───────────────────────────────────────────────────
  const updateBlank = (i: number, value: string) => {
    const blanks = [...(question.blanks ?? [])]
    blanks[i] = value
    onChange({ ...question, blanks })
  }

  const addBlank = () =>
    onChange({ ...question, blanks: [...(question.blanks ?? []), ""] })

  const removeBlank = (i: number) => {
    const blanks = (question.blanks ?? []).filter((_, idx) => idx !== i)
    onChange({ ...question, blanks })
  }

  // ── Match helpers ────────────────────────────────────────────────────────
  const updatePair = (pairId: string, field: "left" | "right", value: string) => {
    onChange({
      ...question,
      matchPairs: (question.matchPairs ?? []).map((p) =>
        p.id === pairId ? { ...p, [field]: value } : p
      ),
    })
  }

  const addPair = () =>
    onChange({
      ...question,
      matchPairs: [
        ...(question.matchPairs ?? []),
        { id: nanoid(6), left: "", right: "" },
      ],
    })

  const removePair = (pairId: string) => {
    if ((question.matchPairs?.length ?? 0) <= 2) return
    onChange({
      ...question,
      matchPairs: (question.matchPairs ?? []).filter((p) => p.id !== pairId),
    })
  }

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <Card className="relative">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
            <CardTitle className="text-base">Question {index + 1}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {QUESTION_TYPE_LABELS[question.type]}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <FieldGroup>
          {/* Type + Marks row */}
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Question Type</FieldLabel>
              <Select
                value={question.type}
                onValueChange={(v) => handleTypeChange(v as QuestionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Marks</FieldLabel>
              <Input
                type="number"
                min={1}
                value={question.marks}
                onChange={(e) =>
                  onChange({ ...question, marks: parseInt(e.target.value) || 1 })
                }
              />
            </Field>
          </div>

          {/* Question text */}
          <Field>
            <FieldLabel>
              {question.type === "fill-blank"
                ? "Question Text (use ___ for blanks)"
                : "Question Text"}
            </FieldLabel>
            <Textarea
              placeholder={
                question.type === "fill-blank"
                  ? "e.g. The capital of France is ___ and it lies on the river ___."
                  : "Enter your question here..."
              }
              value={question.text}
              onChange={(e) => onChange({ ...question, text: e.target.value })}
              rows={3}
            />
          </Field>

          {/* ── MCQ ── */}
          {question.type === "mcq" && (
            <Field>
              <FieldLabel>Options (select the correct answer)</FieldLabel>
              <RadioGroup
                value={question.correctOptionId || ""}
                onValueChange={(v) => onChange({ ...question, correctOptionId: v })}
                className="space-y-2"
              >
                {question.options?.map((option, i) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={option.text}
                      onChange={(e) => updateOption(option.id, e.target.value)}
                      className="flex-1"
                    />
                    {(question.options?.length ?? 0) > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(option.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </RadioGroup>
              <Button variant="outline" size="sm" onClick={addOption} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Add Option
              </Button>
            </Field>
          )}

          {/* ── True / False ── */}
          {question.type === "true-false" && (
            <Field>
              <FieldLabel>Correct Answer</FieldLabel>
              <RadioGroup
                value={question.correctBoolean === true ? "true" : "false"}
                onValueChange={(v) =>
                  onChange({ ...question, correctBoolean: v === "true" })
                }
                className="flex gap-6"
              >
                {["true", "false"].map((val) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value={val} id={`tf-${question.id}-${val}`} />
                    <span className="capitalize font-medium">{val}</span>
                  </label>
                ))}
              </RadioGroup>
            </Field>
          )}

          {/* ── Numerical ── */}
          {question.type === "numerical" && (
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Correct Answer</FieldLabel>
                <Input
                  type="number"
                  step="any"
                  value={question.correctAnswer ?? 0}
                  onChange={(e) =>
                    onChange({
                      ...question,
                      correctAnswer: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Tolerance (+/−)</FieldLabel>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={question.tolerance ?? 0}
                  onChange={(e) =>
                    onChange({
                      ...question,
                      tolerance: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Field>
            </div>
          )}

          {/* ── Fill in the Blank ── */}
          {question.type === "fill-blank" && (
            <Field>
              <FieldLabel>
                Correct Answers for Each Blank (in order)
              </FieldLabel>
              <div className="space-y-2">
                {(question.blanks ?? []).map((blank, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-16 shrink-0">
                      Blank {i + 1}
                    </span>
                    <Input
                      placeholder={`Answer for blank ${i + 1}`}
                      value={blank}
                      onChange={(e) => updateBlank(i, e.target.value)}
                      className="flex-1"
                    />
                    {(question.blanks?.length ?? 0) > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBlank(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addBlank} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Add Blank
              </Button>
            </Field>
          )}

          {/* ── Match the Following ── */}
          {question.type === "match" && (
            <Field>
              <FieldLabel>Match Pairs (left → right)</FieldLabel>
              <div className="space-y-2">
                {(question.matchPairs ?? []).map((pair, i) => (
                  <div key={pair.id} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-8 shrink-0 text-center">
                      {i + 1}
                    </span>
                    <Input
                      placeholder="Left item"
                      value={pair.left}
                      onChange={(e) => updatePair(pair.id, "left", e.target.value)}
                      className="flex-1"
                    />
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="Right item"
                      value={pair.right}
                      onChange={(e) => updatePair(pair.id, "right", e.target.value)}
                      className="flex-1"
                    />
                    {(question.matchPairs?.length ?? 0) > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePair(pair.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addPair} className="mt-2">
                <Plus className="mr-2 h-4 w-4" />
                Add Pair
              </Button>
            </Field>
          )}

          {/* ── Subjective ── */}
          {question.type === "subjective" && (
            <Field>
              <FieldLabel>Maximum Words (optional)</FieldLabel>
              <Input
                type="number"
                min={0}
                placeholder="No limit"
                value={question.maxWords ?? ""}
                onChange={(e) =>
                  onChange({
                    ...question,
                    maxWords: parseInt(e.target.value) || undefined,
                  })
                }
              />
            </Field>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}