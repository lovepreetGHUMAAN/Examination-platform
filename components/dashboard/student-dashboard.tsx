"use client"

import useSWR from "swr"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Empty } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Users, ClipboardList, CheckSquare, Clock, ArrowRight, UserPlus } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface StudentDashboardProps {
  user: {
    id: string
    name: string
    email: string
    role: "teacher" | "student"
  }
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function StudentDashboard({ user }: StudentDashboardProps) {
  const { data: stats, isLoading } = useSWR("/api/student/stats", fetcher)

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground mt-1">Here&apos;s your learning progress</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/my-groups">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Join a Group
          </Button>
        </Link>
        <Link href="/dashboard/available-tests">
          <Button variant="outline">
            <ClipboardList className="mr-2 h-4 w-4" />
            View Available Tests
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Enrolled Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.data?.enrolledGroups ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.data?.pendingRequests ?? 0} pending requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Tests</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.data?.availableTests ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ready to take
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed Tests</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.data?.completedTests ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.data?.averageScore !== undefined ? `${stats.data.averageScore}% avg score` : "No scores yet"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Tests & Recent Results */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Tests</CardTitle>
            <CardDescription>Tests available for you to take</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.data?.upcomingTests?.length > 0 ? (
              <div className="space-y-3">
                {stats.data.upcomingTests.map((test: { 
                  _id: string; 
                  title: string; 
                  duration: number; 
                  availableTo: string;
                  groupName: string;
                }) => (
                  <Link
                    key={test._id}
                    href={`/dashboard/test/${test._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{test.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {test.groupName}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {test.duration} min
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Due {formatDistanceToNow(new Date(test.availableTo), { addSuffix: true })}
                      </p>
                      <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 ml-auto" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                icon={ClipboardList}
                title="No upcoming tests"
                description="Join a group to see available tests"
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Results</CardTitle>
            <CardDescription>Your latest test scores</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.data?.recentResults?.length > 0 ? (
              <div className="space-y-3">
                {stats.data.recentResults.map((result: { 
                  _id: string; 
                  testTitle: string; 
                  totalMarksAwarded: number;
                  totalMarks: number;
                  status: string;
                }) => (
                  <Link
                    key={result._id}
                    href={`/dashboard/my-results/${result._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{result.testTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.status === "graded" 
                          ? `Score: ${result.totalMarksAwarded}/${result.totalMarks}` 
                          : "Awaiting grading"}
                      </p>
                    </div>
                    {result.status === "graded" && (
                      <Badge 
                        variant={
                          (result.totalMarksAwarded / result.totalMarks) >= 0.7 
                            ? "default" 
                            : (result.totalMarksAwarded / result.totalMarks) >= 0.4 
                              ? "secondary" 
                              : "destructive"
                        }
                      >
                        {Math.round((result.totalMarksAwarded / result.totalMarks) * 100)}%
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                icon={CheckSquare}
                title="No results yet"
                description="Complete a test to see your results"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
