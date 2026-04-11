// PATH: components/dashboard/student-dashboard.tsx
"use client"

import useSWR from "swr"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import {
  ClipboardList,
  Users,
  Trophy,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Timer,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface StudentUser {
  name?: string | null
  email?: string | null
  role?: string
}

export function StudentDashboard({ user }: { user: StudentUser }) {
  const { data, isLoading } = useSWR("/api/student/stats", fetcher)

  const stats = data?.data

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-500"
    if (pct >= 60) return "text-amber-500"
    return "text-red-500"
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Keep up the great work. Here's your progress.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tests Taken</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.testsTaken ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.testsAvailable ?? 0} available
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Groups Joined</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.groupsJoined ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">active groups</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stats?.avgScore != null ? getScoreColor(stats.avgScore) : ""}`}>
                  {stats?.avgScore != null ? `${stats.avgScore}%` : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">overall performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Best Score</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-500">
                  {stats?.bestScore != null ? `${stats.bestScore}%` : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">your personal best</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upcoming / Available Tests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Available Tests</CardTitle>
                  <CardDescription>Tests you can take right now</CardDescription>
                </div>
                <Link href="/dashboard/available-tests">
                  <Button size="sm" variant="outline">View all</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.availableTests?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.availableTests.slice(0, 4).map((test: {
                      _id: string
                      title: string
                      duration: number
                      totalMarks: number
                      availableTo: string
                      submissionStatus: string | null
                      groupName: string
                    }) => (
                      <div key={test._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {test.submissionStatus === "in-progress" ? (
                            <Timer className="h-4 w-4 text-amber-500 shrink-0" />
                          ) : (
                            <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{test.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {test.duration} min · {test.totalMarks} marks · Due{" "}
                              {formatDistanceToNow(new Date(test.availableTo), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <Link href={`/dashboard/test/${test._id}`}>
                          <Button size="sm">
                            {test.submissionStatus === "in-progress" ? "Resume" : "Start"}
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No tests available right now</p>
                    <Link href="/dashboard/my-groups">
                      <Button size="sm" className="mt-3">Join a group</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Results */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Results</CardTitle>
                  <CardDescription>Your latest test scores</CardDescription>
                </div>
                <Link href="/dashboard/results">
                  <Button size="sm" variant="outline">View all</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.recentResults?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentResults.slice(0, 4).map((result: {
                      _id: string
                      testTitle: string
                      totalScore: number
                      maxScore: number
                      submittedAt: string
                      needsGrading: boolean
                    }) => {
                      const pct = Math.round((result.totalScore / result.maxScore) * 100)
                      return (
                        <div key={result._id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">{result.testTitle}</p>
                            {result.needsGrading ? (
                              <Badge variant="outline" className="border-amber-500 text-amber-600 text-xs">
                                <AlertCircle className="mr-1 h-3 w-3" />
                                Pending
                              </Badge>
                            ) : (
                              <span className={`text-sm font-bold ${getScoreColor(pct)}`}>
                                {result.totalScore}/{result.maxScore}
                              </span>
                            )}
                          </div>
                          {!result.needsGrading && (
                            <Progress value={pct} className="h-1.5" />
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(result.submittedAt), { addSuffix: true })}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No results yet. Take a test!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Groups */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>My Groups</CardTitle>
                  <CardDescription>Classes you're enrolled in</CardDescription>
                </div>
                <Link href="/dashboard/my-groups">
                  <Button size="sm" variant="outline">Manage</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.groups?.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.groups.map((group: {
                      _id: string
                      name: string
                      teacherName: string
                      memberCount: number
                      availableTestsCount: number
                    }) => (
                      <div key={group._id} className="p-4 border rounded-lg">
                        <p className="font-medium text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {group.teacherName}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{group.memberCount} students</span>
                          </div>
                          {group.availableTestsCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {group.availableTestsCount} test{group.availableTestsCount !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">You haven't joined any groups yet</p>
                    <Link href="/dashboard/my-groups">
                      <Button size="sm" className="mt-3">Join a group</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}