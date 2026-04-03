"use client"

import useSWR from "swr"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Empty } from "@/components/ui/empty"
import { Users, ClipboardList, FileText, Plus, ArrowRight } from "lucide-react"

interface TeacherDashboardProps {
  user: {
    id: string
    name: string
    email: string
    role: "teacher" | "student"
  }
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function TeacherDashboard({ user }: TeacherDashboardProps) {
  const { data: stats, isLoading } = useSWR("/api/teacher/stats", fetcher)

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your classes</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/groups/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </Link>
        <Link href="/dashboard/tests/new">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Create Test
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Groups</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.data?.totalGroups ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.data?.totalStudents ?? 0} students enrolled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tests</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.data?.totalTests ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.data?.publishedTests ?? 0} published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Reviews</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.data?.pendingSubmissions ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                submissions need grading
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Groups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Groups</CardTitle>
            <CardDescription>Your most recently created groups</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.data?.recentGroups?.length > 0 ? (
              <div className="space-y-3">
                {stats.data.recentGroups.map((group: { _id: string; name: string; memberCount: number }) => (
                  <Link
                    key={group._id}
                    href={`/dashboard/groups/${group._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">{group.memberCount} students</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                icon={Users}
                title="No groups yet"
                description="Create your first group to get started"
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Tests</CardTitle>
            <CardDescription>Your most recently created tests</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.data?.recentTests?.length > 0 ? (
              <div className="space-y-3">
                {stats.data.recentTests.map((test: { _id: string; title: string; isPublished: boolean }) => (
                  <Link
                    key={test._id}
                    href={`/dashboard/tests/${test._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{test.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {test.isPublished ? "Published" : "Draft"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                icon={ClipboardList}
                title="No tests yet"
                description="Create your first test to get started"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
