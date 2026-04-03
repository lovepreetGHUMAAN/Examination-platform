"use client"

import useSWR from "swr"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Empty } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Copy, ArrowRight } from "lucide-react"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function GroupsPage() {
  const { data, isLoading } = useSWR("/api/groups", fetcher)

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success("Invite code copied to clipboard")
  }

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
          <h1 className="text-3xl font-bold text-foreground">My Groups</h1>
          <p className="text-muted-foreground mt-1">Manage your classes and student groups</p>
        </div>
        <Link href="/dashboard/groups/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </Link>
      </div>

      {data?.data?.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.data.map((group: {
            _id: string
            name: string
            description: string
            inviteCode: string
            memberCount: number
            pendingCount: number
          }) => (
            <Card key={group._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {group.description || "No description"}
                    </CardDescription>
                  </div>
                  {group.pendingCount > 0 && (
                    <Badge variant="secondary">{group.pendingCount} pending</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{group.memberCount} students</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2 py-1 bg-muted rounded text-sm font-mono">
                    {group.inviteCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyInviteCode(group.inviteCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <Link href={`/dashboard/groups/${group._id}`} className="block">
                  <Button variant="outline" className="w-full">
                    Manage Group
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <Empty
              icon={Users}
              title="No groups yet"
              description="Create your first group to start organizing students"
              action={
                <Link href="/dashboard/groups/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Group
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
