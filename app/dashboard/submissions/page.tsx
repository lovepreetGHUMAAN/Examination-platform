"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import useSWR from "swr"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { FileText, Clock, CheckCircle, AlertCircle, Eye } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function SubmissionsPage() {
  const { data: session, status } = useSession()
  const { data, isLoading } = useSWR("/api/submissions", fetcher)

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!session || session.user.role !== "teacher") {
    redirect("/dashboard")
  }

  const submissions = data?.submissions || []

  const getStatusBadge = (status: string, needsGrading: boolean) => {
    if (status === "in_progress") {
      return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />In Progress</Badge>
    }
    if (needsGrading) {
      return <Badge variant="outline" className="border-amber-500 text-amber-600"><AlertCircle className="mr-1 h-3 w-3" />Needs Grading</Badge>
    }
    return <Badge className="bg-emerald-500"><CheckCircle className="mr-1 h-3 w-3" />Graded</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
        <p className="text-muted-foreground">Review and grade student test submissions</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner className="h-8 w-8" />
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No submissions yet</h3>
            <p className="text-muted-foreground text-center mt-2">
              Student submissions will appear here once they complete tests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission: any) => (
            <Card key={submission._id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{submission.testTitle}</CardTitle>
                    <CardDescription>
                      Submitted by {submission.studentName} ({submission.studentEmail})
                    </CardDescription>
                  </div>
                  {getStatusBadge(submission.status, submission.needsGrading)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>
                      Submitted: {new Date(submission.submittedAt || submission.startedAt).toLocaleDateString()}
                    </span>
                    {submission.status === "submitted" && (
                      <span>
                        Score: {submission.totalScore}/{submission.maxScore} ({Math.round((submission.totalScore / submission.maxScore) * 100)}%)
                      </span>
                    )}
                  </div>
                  <Button asChild variant={submission.needsGrading ? "default" : "outline"}>
                    <Link href={`/dashboard/submissions/${submission._id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      {submission.needsGrading ? "Grade Now" : "View Details"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
