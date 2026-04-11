// PATH: app/forgot-password/page.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { GraduationCap, Mail, ArrowLeft, MailCheck } from "lucide-react"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? "Something went wrong")

      setSent(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-10 w-10 text-primary" />
            <span className="text-3xl font-bold text-foreground">ExamHub</span>
          </div>
          <p className="text-muted-foreground">Online Examination Platform</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              {sent
                ? <MailCheck className="h-12 w-12 text-primary" />
                : <Mail className="h-12 w-12 text-muted-foreground" />
              }
            </div>
            <CardTitle>{sent ? "Check your email" : "Forgot password?"}</CardTitle>
            <CardDescription>
              {sent
                ? `We've sent a reset link to ${email}`
                : "Enter your email and we'll send you a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Click the link in that email to reset your password. The link expires in 1 hour.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setSent(false) }}
                >
                  Try a different email
                </Button>
                <Link href="/login" className="block text-sm text-primary hover:underline">
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit}>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="email">Email address</FieldLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-10"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </Field>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Spinner className="mr-2" /> : null}
                      {isLoading ? "Sending..." : "Send reset link"}
                    </Button>
                  </FieldGroup>
                </form>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1 mt-6 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to sign in
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}