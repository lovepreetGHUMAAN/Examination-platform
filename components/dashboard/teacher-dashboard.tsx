// PATH: components/dashboard/teacher-dashboard.tsx
"use client"

import useSWR from "swr"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  ClipboardList,
  Users,
  FileCheck,
  TrendingUp,
  Plus,
  ArrowRight,
  BookOpen,
  AlertCircle,
  Clock,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface TeacherUser {
  name?: string | null
  email?: string | null
  role?: string
}

export function TeacherDashboard({ user }: { user: TeacherUser }) {
  const { data, isLoading } = useSWR("/api/teacher/stats", fetcher)

  const stats = data?.data

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening in your classes today.
        </p>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tests</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalTests ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.publishedTests ?? 0} published
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalGroups ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.totalStudents ?? 0} students enrolled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Submissions</CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalSubmissions ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.pendingGrading ?? 0} need grading
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.avgScore != null ? `${stats.avgScore}%` : "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">across all tests</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Tests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Tests</CardTitle>
                  <CardDescription>Your latest created tests</CardDescription>
                </div>
                <Link href="/dashboard/tests/new">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Test
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.recentTests?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentTests.map((test: {
                      _id: string
                      title: string
                      isPublished: boolean
                      submissionCount: number
                      createdAt: string
                    }) => (
                      <div key={test._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{test.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {test.submissionCount} submissions ·{" "}
                              {formatDistanceToNow(new Date(test.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={test.isPublished ? "default" : "secondary"} className="text-xs">
                            {test.isPublished ? "Live" : "Draft"}
                          </Badge>
                          <Link href={`/dashboard/tests/${test._id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No tests yet</p>
                    <Link href="/dashboard/tests/new">
                      <Button size="sm" className="mt-3">Create your first test</Button>
                    </Link>
                  </div>
                )}
                {stats?.recentTests?.length > 0 && (
                  <Link href="/dashboard/tests">
                    <Button variant="outline" className="w-full mt-4" size="sm">
                      View all tests
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Pending Grading */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Needs Grading</CardTitle>
                  <CardDescription>Subjective answers awaiting review</CardDescription>
                </div>
                {stats?.pendingGrading > 0 && (
                  <Badge variant="destructive">{stats.pendingGrading}</Badge>
                )}
              </CardHeader>
              <CardContent>
                {stats?.pendingSubmissions?.length > 0 ? (
                  <div className="space-y-3">
                    {stats.pendingSubmissions.map((sub: {
                      _id: string
                      studentName: string
                      testTitle: string
                      submittedAt: string
                    }) => (
                      <div key={sub._id} className="flex items-center justify-between p-3 border rounded-lg border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                          <div>
                            <p className="font-medium text-sm">{sub.studentName}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.testTitle} ·{" "}
                              {formatDistanceToNow(new Date(sub.submittedAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <Link href={`/dashboard/submissions/${sub._id}`}>
                          <Button size="sm" variant="outline">Grade</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All caught up! No pending grading.</p>
                  </div>
                )}
                {stats?.pendingSubmissions?.length > 0 && (
                  <Link href="/dashboard/submissions">
                    <Button variant="outline" className="w-full mt-4" size="sm">
                      View all submissions
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Groups Overview */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Your Groups</CardTitle>
                  <CardDescription>Student groups you manage</CardDescription>
                </div>
                <Link href="/dashboard/groups/new">
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    New Group
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.groups?.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.groups.map((group: {
                      _id: string
                      name: string
                      memberCount: number
                      pendingCount: number
                      inviteCode: string
                    }) => (
                      <Link key={group._id} href={`/dashboard/groups/${group._id}`}>
                        <div className="p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">{group.name}</p>
                            {group.pendingCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="mr-1 h-3 w-3" />
                                {group.pendingCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{group.memberCount} students</span>
                          </div>
                          <code className="text-xs text-muted-foreground mt-1 block font-mono">
                            {group.inviteCode}
                          </code>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No groups yet</p>
                    <Link href="/dashboard/groups/new">
                      <Button size="sm" className="mt-3">Create a group</Button>
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