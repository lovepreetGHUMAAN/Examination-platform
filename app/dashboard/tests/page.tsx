"use client"

import useSWR from "swr"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Empty } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Plus, ClipboardList, Clock, Users, ArrowRight } from "lucide-react"
import { format } from "date-fns"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function TestsPage() {
  const { data, isLoading } = useSWR("/api/tests", fetcher)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Tests</h1>
          <p className="text-muted-foreground mt-1">Create and manage your examinations</p>
        </div>
        <Link href="/dashboard/tests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Test
          </Button>
        </Link>
      </div>

      {data?.data?.length > 0 ? (
        <div className="grid gap-4">
          {data.data.map((test: {
            _id: string
            title: string
            description: string
            questionCount: number
            totalMarks: number
            duration: number
            isPublished: boolean
            availableFrom: string
            availableTo: string
            groupNames: string[]
          }) => (
            <Card key={test._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {test.title}
                      <Badge variant={test.isPublished ? "default" : "secondary"}>
                        {test.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-1">
                      {test.description || "No description"}
                    </CardDescription>
                  </div>
                  <Link href={`/dashboard/tests/${test._id}`}>
                    <Button variant="outline" size="sm">
                      View
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
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
                  {test.groupNames.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{test.groupNames.join(", ")}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Available: {format(new Date(test.availableFrom), "MMM d, yyyy")} - {format(new Date(test.availableTo), "MMM d, yyyy")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <Empty
              icon={ClipboardList}
              title="No tests yet"
              description="Create your first test to start assessing students"
              action={
                <Link href="/dashboard/tests/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Test
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
