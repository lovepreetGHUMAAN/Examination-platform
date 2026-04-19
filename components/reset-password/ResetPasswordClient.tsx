// PATH: components/reset-password/ResetPasswordClient.tsx
"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { GraduationCap, Lock, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"

export default function ResetPasswordClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" })

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-3">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle>Invalid Link</CardTitle>
              <CardDescription>
                This password reset link is missing or invalid.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild className="w-full">
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: formData.password }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? "Failed to reset password")

      setDone(true)
      setTimeout(() => router.push("/login"), 3000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password")
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
              {done
                ? <CheckCircle className="h-12 w-12 text-emerald-500" />
                : <Lock className="h-12 w-12 text-muted-foreground" />
              }
            </div>
            <CardTitle>{done ? "Password Reset!" : "Set new password"}</CardTitle>
            <CardDescription>
              {done
                ? "Your password has been updated. Redirecting to sign in..."
                : "Choose a strong password for your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <Button asChild className="w-full">
                <Link href="/login">Go to Sign In</Link>
              </Button>
            ) : (
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="password">New Password</FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="At least 6 characters"
                        className="pl-10"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your new password"
                        className="pl-10"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </Field>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Spinner className="mr-2" /> : null}
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}