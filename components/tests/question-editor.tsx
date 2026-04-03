"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Trash2, GripVertical } from "lucide-react"
import type { Question, QuestionType, MCQOption } from "@/lib/types"
import { nanoid } from "nanoid"

interface QuestionEditorProps {
  question: Question
  index: number
  onChange: (question: Question) => void
  onDelete: () => void
}

export function QuestionEditor({ question, index, onChange, onDelete }: QuestionEditorProps) {
  const handleTypeChange = (type: QuestionType) => {
    const base = {
      id: question.id,
      type,
      text: question.text,
      marks: question.marks,
    }

    if (type === "mcq") {
      onChange({
        ...base,
        options: [
          { id: nanoid(6), text: "" },
          { id: nanoid(6), text: "" },
        ],
        correctOptionId: "",
      })
    } else if (type === "numerical") {
      onChange({
        ...base,
        correctAnswer: 0,
        tolerance: 0,
      })
    } else {
      onChange({
        ...base,
        maxWords: 500,
        keywords: [],
      })
    }
  }

  const addOption = () => {
    if (question.type === "mcq" && question.options) {
      onChange({
        ...question,
        options: [...question.options, { id: nanoid(6), text: "" }],
      })
    }
  }

  const removeOption = (optionId: string) => {
    if (question.type === "mcq" && question.options && question.options.length > 2) {
      onChange({
        ...question,
        options: question.options.filter((o) => o.id !== optionId),
        correctOptionId: question.correctOptionId === optionId ? "" : question.correctOptionId,
      })
    }
  }

  const updateOption = (optionId: string, text: string) => {
    if (question.type === "mcq" && question.options) {
      onChange({
        ...question,
        options: question.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
      })
    }
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
            <CardTitle className="text-base">Question {index + 1}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Question Type</FieldLabel>
              <Select value={question.type} onValueChange={(v) => handleTypeChange(v as QuestionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice</SelectItem>
                  <SelectItem value="numerical">Numerical</SelectItem>
                  <SelectItem value="subjective">Subjective</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Marks</FieldLabel>
              <Input
                type="number"
                min={1}
                value={question.marks}
                onChange={(e) => onChange({ ...question, marks: parseInt(e.target.value) || 1 })}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel>Question Text</FieldLabel>
            <Textarea
              placeholder="Enter your question here..."
              value={question.text}
              onChange={(e) => onChange({ ...question, text: e.target.value })}
              rows={3}
            />
          </Field>

          {/* MCQ Options */}
          {question.type === "mcq" && (
            <Field>
              <FieldLabel>Options (Select the correct answer)</FieldLabel>
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
                    {question.options && question.options.length > 2 && (
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

          {/* Numerical Answer */}
          {question.type === "numerical" && (
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Correct Answer</FieldLabel>
                <Input
                  type="number"
                  step="any"
                  value={question.correctAnswer || 0}
                  onChange={(e) => onChange({ ...question, correctAnswer: parseFloat(e.target.value) || 0 })}
                />
              </Field>
              <Field>
                <FieldLabel>Tolerance (+/-)</FieldLabel>
                <Input
                  type="number"
                  step="any"
                  min={0}
                  value={question.tolerance || 0}
                  onChange={(e) => onChange({ ...question, tolerance: parseFloat(e.target.value) || 0 })}
                />
              </Field>
            </div>
          )}

          {/* Subjective Settings */}
          {question.type === "subjective" && (
            <Field>
              <FieldLabel>Maximum Words (Optional)</FieldLabel>
              <Input
                type="number"
                min={0}
                placeholder="No limit"
                value={question.maxWords || ""}
                onChange={(e) => onChange({ ...question, maxWords: parseInt(e.target.value) || undefined })}
              />
            </Field>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
