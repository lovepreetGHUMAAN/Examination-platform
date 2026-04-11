// PATH: middleware.ts  (project root, next to package.json)
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// Teacher-only route prefixes — students are redirected to /dashboard
const TEACHER_ONLY = [
  "/dashboard/tests/new",
  "/dashboard/tests",        // includes /dashboard/tests/[id] edit pages
  "/dashboard/groups",       // includes /dashboard/groups/new and /dashboard/groups/[id]
  "/dashboard/submissions",  // includes /dashboard/submissions/[id]
]

// Student-only route prefixes — teachers are redirected to /dashboard
const STUDENT_ONLY = [
  "/dashboard/available-tests",
  "/dashboard/my-groups",
  "/dashboard/results",
  "/dashboard/test",         // /dashboard/test/[id] — taking a test
]

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const role = req.nextauth.token?.role as string | undefined

    if (!role) {
      // Should never happen because withAuth handles unauthenticated,
      // but guard anyway
      return NextResponse.redirect(new URL("/login", req.url))
    }

    const isTeacherOnly = TEACHER_ONLY.some((p) => pathname.startsWith(p))
    const isStudentOnly = STUDENT_ONLY.some((p) => pathname.startsWith(p))

    if (isTeacherOnly && role !== "teacher") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    if (isStudentOnly && role !== "student") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Run middleware only when a valid JWT exists
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ["/dashboard/:path*"],
}