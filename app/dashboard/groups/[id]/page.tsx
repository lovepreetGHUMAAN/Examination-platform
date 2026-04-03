"use client"

import { use, useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Empty } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Copy, Users, UserPlus, Check, X, Trash2, Save } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(`/api/groups/${id}`, fetcher)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editData, setEditData] = useState({ name: "", description: "" })
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const copyInviteCode = () => {
    if (data?.data?.inviteCode) {
      navigator.clipboard.writeText(data.data.inviteCode)
      toast.success("Invite code copied to clipboard")
    }
  }

  const startEditing = () => {
    setEditData({
      name: data?.data?.name || "",
      description: data?.data?.description || "",
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      })

      if (!response.ok) throw new Error("Failed to update group")

      toast.success("Group updated successfully")
      setIsEditing(false)
      mutate()
    } catch {
      toast.error("Failed to update group")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/groups/${id}`, { method: "DELETE" })

      if (!response.ok) throw new Error("Failed to delete group")

      toast.success("Group deleted successfully")
      router.push("/dashboard/groups")
    } catch {
      toast.error("Failed to delete group")
      setIsDeleting(false)
    }
  }

  const handleMemberAction = async (studentId: string, action: "approve" | "reject") => {
    setActionLoading(`${studentId}-${action}`)
    try {
      const response = await fetch(`/api/groups/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, action }),
      })

      if (!response.ok) throw new Error(`Failed to ${action} request`)

      toast.success(action === "approve" ? "Student added to group" : "Request rejected")
      mutate()
    } catch {
      toast.error(`Failed to ${action} request`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveMember = async (studentId: string) => {
    setActionLoading(`remove-${studentId}`)
    try {
      const response = await fetch(`/api/groups/${id}/members?studentId=${studentId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to remove member")

      toast.success("Member removed from group")
      mutate()
    } catch {
      toast.error("Failed to remove member")
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!data?.data) {
    return (
      <Card>
        <CardContent className="py-12">
          <Empty
            icon={Users}
            title="Group not found"
            description="This group may have been deleted"
            action={
              <Link href="/dashboard/groups">
                <Button>Back to Groups</Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    )
  }

  const group = data.data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/groups">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{group.name}</h1>
          <p className="text-muted-foreground mt-1">
            {group.members.length} students enrolled
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Group Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invite Code</CardTitle>
              <CardDescription>Share this code with students to join</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-lg font-mono text-center">
                  {group.inviteCode}
                </code>
                <Button variant="outline" size="icon" onClick={copyInviteCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Group Details</CardTitle>
                {!isEditing && (
                  <Button variant="ghost" size="sm" onClick={startEditing}>
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <Input
                      id="name"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      disabled={isSaving}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <Textarea
                      id="description"
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      disabled={isSaving}
                      rows={3}
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={isSaving} size="sm">
                      {isSaving ? <Spinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </FieldGroup>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="mt-1">{group.description || "No description"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={isDeleting}>
                    {isDeleting ? <Spinner className="mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this group?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the group and remove all students. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Members */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="members">
                <TabsList className="mb-4">
                  <TabsTrigger value="members">
                    Members ({group.members.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending Requests
                    {group.pendingRequests.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {group.pendingRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="members">
                  {group.members.length > 0 ? (
                    <div className="space-y-2">
                      {group.members.map((member: { _id: string; name: string; email: string }) => (
                        <div
                          key={member._id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                disabled={actionLoading === `remove-${member._id}`}
                              >
                                {actionLoading === `remove-${member._id}` ? (
                                  <Spinner className="h-4 w-4" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove member?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.name} from this group?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveMember(member._id)}>
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={Users}
                      title="No members yet"
                      description="Share the invite code to add students"
                    />
                  )}
                </TabsContent>

                <TabsContent value="pending">
                  {group.pendingRequests.length > 0 ? (
                    <div className="space-y-2">
                      {group.pendingRequests.map((request: { _id: string; name: string; email: string }) => (
                        <div
                          key={request._id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <p className="font-medium">{request.name}</p>
                            <p className="text-sm text-muted-foreground">{request.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleMemberAction(request._id, "approve")}
                              disabled={actionLoading?.startsWith(request._id)}
                            >
                              {actionLoading === `${request._id}-approve` ? (
                                <Spinner className="mr-2" />
                              ) : (
                                <Check className="mr-2 h-4 w-4" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMemberAction(request._id, "reject")}
                              disabled={actionLoading?.startsWith(request._id)}
                            >
                              {actionLoading === `${request._id}-reject` ? (
                                <Spinner className="mr-2" />
                              ) : (
                                <X className="mr-2 h-4 w-4" />
                              )}
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={UserPlus}
                      title="No pending requests"
                      description="New join requests will appear here"
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
