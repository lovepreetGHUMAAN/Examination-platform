// PATH: app/verify-email/page.tsx
"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { GraduationCap, CheckCircle, XCircle } from "lucide-react"

type State = "loading" | "success" | "error"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [state, setState] = useState<State>("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setState("error")
      setMessage("No verification token found. Please use the link from your email.")
      return
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setState("success")
          setMessage(data.message ?? "Email verified successfully!")
        } else {
          setState("error")
          setMessage(data.error ?? "Verification failed.")
        }
      })
      .catch(() => {
        setState("error")
        setMessage("Something went wrong. Please try again.")
      })
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold text-foreground">ExamHub</span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              {state === "loading" && <Spinner className="h-12 w-12" />}
              {state === "success" && <CheckCircle className="h-12 w-12 text-emerald-500" />}
              {state === "error" && <XCircle className="h-12 w-12 text-red-500" />}
            </div>
            <CardTitle>
              {state === "loading" && "Verifying your email..."}
              {state === "success" && "Email Verified!"}
              {state === "error" && "Verification Failed"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">{message}</p>

            {state === "success" && (
              <Button asChild className="w-full">
                <Link href="/login">Continue to Sign In</Link>
              </Button>
            )}

            {state === "error" && (
              <div className="space-y-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/register">Back to Register</Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}