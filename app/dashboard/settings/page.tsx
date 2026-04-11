// PATH: app/dashboard/settings/page.tsx
"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { User, Lock, Shield, Mail } from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const user = session?.user

  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileData.name.trim()) {
      toast.error("Name cannot be empty")
      return
    }

    setProfileLoading(true)
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileData.name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update profile")
      await update({ name: profileData.name })
      toast.success("Profile updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error("Please fill in all password fields")
      return
    }
    if (passwordData.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to change password")
      toast.success("Password changed successfully")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account preferences</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Update your display name and see your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  disabled={profileLoading}
                  placeholder="Your full name"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={profileData.email}
                    disabled
                    className="pl-9 bg-muted/50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed after registration</p>
              </Field>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Account role:</span>
                  <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
                </div>
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading && <Spinner className="mr-2" />}
                  Save Changes
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Change Password</CardTitle>
          </div>
          <CardDescription>Use a strong password that you don't use elsewhere</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  disabled={passwordLoading}
                  placeholder="Enter current password"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  disabled={passwordLoading}
                  placeholder="At least 8 characters"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">Confirm New Password</FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  disabled={passwordLoading}
                  placeholder="Repeat new password"
                />
                {passwordData.newPassword && passwordData.confirmPassword && (
                  <p className={`text-xs mt-1 ${
                    passwordData.newPassword === passwordData.confirmPassword
                      ? "text-emerald-500"
                      : "text-red-500"
                  }`}>
                    {passwordData.newPassword === passwordData.confirmPassword
                      ? "✓ Passwords match"
                      : "✗ Passwords do not match"}
                  </p>
                )}
              </Field>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading && <Spinner className="mr-2" />}
                  Update Password
                </Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}