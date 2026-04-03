import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar user={session.user} />
      <div className="flex-1 flex flex-col">
        <DashboardHeader user={session.user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
