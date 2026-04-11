// PATH: components/dashboard/sidebar.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileCheck,
  BookOpen,
  Trophy,
  Settings,
  GraduationCap,
} from "lucide-react"

interface SidebarUser {
  name?: string | null
  email?: string | null
  role?: string
}

const teacherLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/tests", label: "My Tests", icon: ClipboardList },
  { href: "/dashboard/groups", label: "Groups", icon: Users },
  { href: "/dashboard/submissions", label: "Submissions", icon: FileCheck },
]

const studentLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/available-tests", label: "Available Tests", icon: BookOpen },
  { href: "/dashboard/my-groups", label: "My Groups", icon: Users },
  { href: "/dashboard/results", label: "My Results", icon: Trophy },
]

export function DashboardSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname()
  const links = user.role === "teacher" ? teacherLinks : studentLinks

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="font-bold text-lg">ExamPortal</span>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {user.role === "teacher" ? "Teacher Portal" : "Student Portal"}
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 space-y-1">
        {links.map((link) => {
          const Icon = link.icon
          const active = isActive(link.href, link.exact)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Settings */}
      <div className="px-3 py-4 border-t space-y-1">
        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
    </aside>
  )
}