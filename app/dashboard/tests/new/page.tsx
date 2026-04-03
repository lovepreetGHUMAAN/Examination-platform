"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { QuestionEditor } from "@/components/tests/question-editor"
import { ArrowLeft, Plus, Save, Eye } from "lucide-react"
import { toast } from "sonner"
import { nanoid } from "nanoid"
import type { Question } from "@/lib/types"
import { format } from "date-fns"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function NewTestPage() {
  const router = useRouter()
  const { data: groupsData } = useSWR("/api/groups", fetcher)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration: 60,
    availableFrom: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    availableTo: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
    groupIds: [] as string[],
    isPublished: false,
  })

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
    const newQuestions = [...questions]
    newQuestions[index] = question
    setQuestions(newQuestions)
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
        if (!q.options || q.options.some((o) => !o.text.trim())) {
          toast.error(`Question ${i + 1}: All options must be filled`)
          return false
        }
        if (!q.correctOptionId) {
          toast.error(`Question ${i + 1}: Please select the correct answer`)
          return false
        }
      }
    }

    return true
  }

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
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create test")
      }

      toast.success(publish ? "Test published successfully!" : "Test saved as draft")
      router.push(`/dashboard/tests/${data.data._id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create test")
    } finally {
      setIsLoading(false)
    }
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0)

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">Create New Test</h1>
          <p className="text-muted-foreground mt-1">
            Add questions and configure test settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Eye className="mr-2 h-4 w-4" />}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Questions */}
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
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">Description (Optional)</FieldLabel>
                  <Textarea
                    id="description"
                    placeholder="Brief instructions or description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={isLoading}
                    rows={2}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
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

          <Button variant="outline" onClick={addQuestion} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {/* Sidebar - Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="duration">Duration (minutes)</FieldLabel>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="availableFrom">Available From</FieldLabel>
                  <Input
                    id="availableFrom"
                    type="datetime-local"
                    value={formData.availableFrom}
                    onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="availableTo">Available Until</FieldLabel>
                  <Input
                    id="availableTo"
                    type="datetime-local"
                    value={formData.availableTo}
                    onChange={(e) => setFormData({ ...formData, availableTo: e.target.value })}
                    disabled={isLoading}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assign to Groups</CardTitle>
              <CardDescription>Select which groups can take this test</CardDescription>
            </CardHeader>
            <CardContent>
              {groupsData?.data?.length > 0 ? (
                <div className="space-y-3">
                  {groupsData.data.map((group: { _id: string; name: string; memberCount: number }) => (
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
                        <p className="text-sm text-muted-foreground">{group.memberCount} students</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No groups available.{" "}
                  <Link href="/dashboard/groups/new" className="text-primary hover:underline">
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
  )
}
