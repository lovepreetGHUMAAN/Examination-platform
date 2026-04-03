"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  CheckSquare,
  Settings,
} from "lucide-react"

interface SidebarProps {
  user: {
    id: string
    name: string
    email: string
    role: "teacher" | "student"
  }
}

const teacherLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/groups", label: "My Groups", icon: Users },
  { href: "/dashboard/tests", label: "My Tests", icon: ClipboardList },
  { href: "/dashboard/submissions", label: "Submissions", icon: FileText },
]

const studentLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/my-groups", label: "My Groups", icon: Users },
  { href: "/dashboard/available-tests", label: "Available Tests", icon: ClipboardList },
  { href: "/dashboard/my-results", label: "My Results", icon: CheckSquare },
]

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const links = user.role === "teacher" ? teacherLinks : studentLinks

  return (
    <aside className="w-64 border-r bg-card hidden md:block">
      <div className="h-full flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-2 px-6 border-b">
          <GraduationCap className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-foreground">ExamHub</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || 
                (link.href !== "/dashboard" && pathname.startsWith(link.href))
              
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Settings Link */}
        <div className="p-4 border-t">
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === "/dashboard/settings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </div>
      </div>
    </aside>
  )
}
