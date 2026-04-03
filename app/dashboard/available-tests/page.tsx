"use client"

import useSWR from "swr"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Empty } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Clock, Users, ArrowRight, CheckCircle, Timer } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AvailableTestsPage() {
  const { data, isLoading } = useSWR("/api/student/tests", fetcher)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const tests = data?.data || []
  const availableTests = tests.filter((t: { submissionStatus: string | null }) => !t.submissionStatus || t.submissionStatus === "in-progress")
  const completedTests = tests.filter((t: { submissionStatus: string }) => t.submissionStatus === "submitted" || t.submissionStatus === "graded")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Available Tests</h1>
        <p className="text-muted-foreground mt-1">View and take tests assigned to your groups</p>
      </div>

      {tests.length > 0 ? (
        <div className="space-y-8">
          {/* Available Tests */}
          {availableTests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Ready to Take ({availableTests.length})</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {availableTests.map((test: {
                  _id: string
                  title: string
                  description: string
                  questionCount: number
                  totalMarks: number
                  duration: number
                  availableTo: string
                  teacherName: string
                  groupName: string
                  submissionStatus: string | null
                }) => (
                  <Card key={test._id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {test.description || "No description"}
                          </CardDescription>
                        </div>
                        {test.submissionStatus === "in-progress" && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ClipboardList className="h-4 w-4" />
                          <span>{test.questionCount} questions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{test.totalMarks}</span>
                          <span>marks</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{test.duration} min</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <Badge variant="outline">{test.groupName}</Badge>
                          <span className="ml-2 text-muted-foreground">by {test.teacherName}</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Due {formatDistanceToNow(new Date(test.availableTo), { addSuffix: true })}
                      </div>

                      <Link href={`/dashboard/test/${test._id}`} className="block">
                        <Button className="w-full">
                          {test.submissionStatus === "in-progress" ? "Continue Test" : "Start Test"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tests */}
          {completedTests.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Completed ({completedTests.length})</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {completedTests.map((test: {
                  _id: string
                  title: string
                  description: string
                  questionCount: number
                  totalMarks: number
                  teacherName: string
                  groupName: string
                  submissionStatus: string
                  submissionId: string
                }) => (
                  <Card key={test._id} className="bg-muted/30">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {test.questionCount} questions | {test.totalMarks} marks
                          </CardDescription>
                        </div>
                        <Badge variant={test.submissionStatus === "graded" ? "default" : "secondary"}>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {test.submissionStatus === "graded" ? "Graded" : "Submitted"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{test.groupName}</Badge>
                        <Link href={`/dashboard/my-results/${test.submissionId}`}>
                          <Button variant="outline" size="sm">
                            View Result
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <Empty
              icon={ClipboardList}
              title="No tests available"
              description="Join a group to see available tests"
              action={
                <Link href="/dashboard/my-groups">
                  <Button>
                    <Users className="mr-2 h-4 w-4" />
                    Join a Group
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
