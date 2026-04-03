"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import useSWR from "swr"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Trophy, Clock, CheckCircle, AlertCircle, Eye } from "lucide-react"

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ResultsPage() {
  const { data: session, status } = useSession()
  const { data, isLoading } = useSWR("/api/student/results", fetcher)

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!session || session.user.role !== "student") {
    redirect("/dashboard")
  }

  const results = data?.results || []

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-emerald-500"
    if (percentage >= 60) return "text-amber-500"
    return "text-red-500"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Results</h1>
        <p className="text-muted-foreground">View your completed test scores and feedback</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Spinner className="h-8 w-8" />
        </div>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No results yet</h3>
            <p className="text-muted-foreground text-center mt-2">
              Complete some tests to see your results here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/available-tests">Browse Available Tests</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result: any) => {
            const percentage = Math.round((result.totalScore / result.maxScore) * 100)
            return (
              <Card key={result._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{result.testTitle}</CardTitle>
                      <CardDescription>
                        Submitted on {new Date(result.submittedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {result.needsGrading ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        <AlertCircle className="mr-1 h-3 w-3" />Pending Review
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500">
                        <CheckCircle className="mr-1 h-3 w-3" />Graded
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <div className={`text-2xl font-bold ${getScoreColor(percentage)}`}>
                          {result.totalScore}/{result.maxScore}
                        </div>
                        <div className="text-sm text-muted-foreground">{percentage}%</div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <Clock className="inline mr-1 h-4 w-4" />
                        {result.timeTaken ? `${Math.round(result.timeTaken / 60)} minutes` : "N/A"}
                      </div>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/dashboard/results/${result._id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
