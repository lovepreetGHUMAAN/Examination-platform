// PATH: app/dashboard/page.tsx
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard"
import { StudentDashboard } from "@/components/dashboard/student-dashboard"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return null
  }

  if (session.user.role === "teacher") {
    return <TeacherDashboard user={session.user} />
  }

  return <StudentDashboard user={session.user} />
}