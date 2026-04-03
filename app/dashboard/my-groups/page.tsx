"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Empty } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Users, UserPlus, LogOut, Clock } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MyGroupsPage() {
  const { data, isLoading, mutate } = useSWR("/api/student/groups", fetcher)
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [leavingGroupId, setLeavingGroupId] = useState<string | null>(null)

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code")
      return
    }

    setIsJoining(true)
    try {
      const response = await fetch("/api/student/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to join group")
      }

      toast.success("Join request sent! Waiting for teacher approval.")
      setInviteCode("")
      setIsJoinDialogOpen(false)
      mutate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join group")
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveGroup = async (groupId: string) => {
    setLeavingGroupId(groupId)
    try {
      const response = await fetch(`/api/student/groups/${groupId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to leave group")

      toast.success("Left group successfully")
      mutate()
    } catch {
      toast.error("Failed to leave group")
    } finally {
      setLeavingGroupId(null)
    }
  }

  const handleCancelRequest = async (groupId: string) => {
    setLeavingGroupId(groupId)
    try {
      const response = await fetch(`/api/student/groups/${groupId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to cancel request")

      toast.success("Request cancelled")
      mutate()
    } catch {
      toast.error("Failed to cancel request")
    } finally {
      setLeavingGroupId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const enrolledGroups = data?.data?.enrolled || []
  const pendingGroups = data?.data?.pending || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Groups</h1>
          <p className="text-muted-foreground mt-1">View and manage your enrolled classes</p>
        </div>
        <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Join a Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join a Group</DialogTitle>
              <DialogDescription>
                Enter the invite code provided by your teacher to join their class
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleJoinGroup}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="inviteCode">Invite Code</FieldLabel>
                  <Input
                    id="inviteCode"
                    placeholder="Enter invite code (e.g., ABC123XY)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    disabled={isJoining}
                    className="uppercase font-mono"
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={isJoining}>
                  {isJoining ? <Spinner className="mr-2" /> : null}
                  {isJoining ? "Sending request..." : "Request to Join"}
                </Button>
              </FieldGroup>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="enrolled">
        <TabsList>
          <TabsTrigger value="enrolled">
            Enrolled Groups ({enrolledGroups.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Requests
            {pendingGroups.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingGroups.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrolled" className="mt-6">
          {enrolledGroups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enrolledGroups.map((group: {
                _id: string
                name: string
                description: string
                teacherName: string
                memberCount: number
              }) => (
                <Card key={group._id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {group.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{group.memberCount} students</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Teacher: </span>
                      <span className="font-medium">{group.teacherName}</span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full text-destructive hover:text-destructive"
                          disabled={leavingGroupId === group._id}
                        >
                          {leavingGroupId === group._id ? (
                            <Spinner className="mr-2" />
                          ) : (
                            <LogOut className="mr-2 h-4 w-4" />
                          )}
                          Leave Group
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Leave this group?</AlertDialogTitle>
                          <AlertDialogDescription>
                            You will no longer have access to tests assigned to this group. 
                            You can request to join again later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleLeaveGroup(group._id)}>
                            Leave Group
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <Empty
                  icon={Users}
                  title="No enrolled groups"
                  description="Join a group using an invite code from your teacher"
                  action={
                    <Button onClick={() => setIsJoinDialogOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Join a Group
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {pendingGroups.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingGroups.map((group: {
                _id: string
                name: string
                description: string
                teacherName: string
              }) => (
                <Card key={group._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {group.description || "No description"}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Teacher: </span>
                      <span className="font-medium">{group.teacherName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Waiting for teacher approval...
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleCancelRequest(group._id)}
                      disabled={leavingGroupId === group._id}
                    >
                      {leavingGroupId === group._id ? (
                        <Spinner className="mr-2" />
                      ) : null}
                      Cancel Request
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <Empty
                  icon={Clock}
                  title="No pending requests"
                  description="Your join requests will appear here"
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
