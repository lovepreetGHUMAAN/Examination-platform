// PATH: lib/types.ts
import { ObjectId } from "mongodb"

export type UserRole = "teacher" | "student"

export interface User {
  _id?: ObjectId
  name: string
  email: string
  password: string
  role: UserRole
  isVerified: boolean
  emailVerificationToken?: string
  emailVerificationExpires?: Date
  passwordResetToken?: string
  passwordResetExpires?: Date
  createdAt: Date
}

export interface Group {
  _id?: ObjectId
  name: string
  description: string
  inviteCode: string
  teacherId: ObjectId
  memberIds: ObjectId[]
  pendingRequests: ObjectId[]
  createdAt: Date
}

// ─── Question types ───────────────────────────────────────────────────────────

export type QuestionType =
  | "mcq"
  | "numerical"
  | "subjective"
  | "true-false"
  | "fill-blank"
  | "match"

export interface MCQOption {
  id: string
  text: string
}

export interface MatchPair {
  id: string
  left: string
  right: string
}

export interface Question {
  id: string
  type: QuestionType
  text: string
  marks: number
  // MCQ
  options?: MCQOption[]
  correctOptionId?: string
  // Numerical
  correctAnswer?: number
  tolerance?: number
  // Subjective
  maxWords?: number
  keywords?: string[]
  // True / False
  correctBoolean?: boolean
  // Fill in the blank
  blanks?: string[]
  // Match the following
  matchPairs?: MatchPair[]
}

// ─── Anti-cheating ────────────────────────────────────────────────────────────

export interface AntiCheatingSettings {
  requireFullscreen: boolean
  blockTabSwitch: boolean
  /**
   * How many violations before auto-submit.
   * 0 = warn only, never auto-submit.
   */
  maxViolations: number
  requireCamera: boolean
  requireMicrophone: boolean
  disableRightClick: boolean
  disableCopyPaste: boolean
}

export const DEFAULT_ANTI_CHEATING: AntiCheatingSettings = {
  requireFullscreen: false,
  blockTabSwitch: false,
  maxViolations: 3,
  requireCamera: false,
  requireMicrophone: false,
  disableRightClick: false,
  disableCopyPaste: false,
}

/** Returns true if any anti-cheat option that can produce violations is active */
export function hasAntiCheating(ac: AntiCheatingSettings): boolean {
  return (
    ac.requireFullscreen ||
    ac.blockTabSwitch ||
    ac.requireCamera ||
    ac.requireMicrophone ||
    ac.disableRightClick ||
    ac.disableCopyPaste
  )
}

// ─── Violation log ────────────────────────────────────────────────────────────

export type ViolationType =
  | "fullscreen_exit"
  | "tab_switch"
  | "window_blur"
  | "auto_submitted"

export interface ViolationEvent {
  type: ViolationType
  timestamp: string
  count: number
}

// ─── Test ─────────────────────────────────────────────────────────────────────

export interface Test {
  _id?: ObjectId
  title: string
  description: string
  teacherId: ObjectId
  groupIds: ObjectId[]
  questions: Question[]
  duration: number
  availableFrom: Date
  availableTo: Date
  totalMarks: number
  isPublished: boolean
  antiCheating: AntiCheatingSettings
  /**
   * Whether to auto-grade objective answers on submission.
   * Forced to false when any anti-cheat measure is active —
   * teacher must review the submission first.
   */
  autoGrade: boolean
  createdAt: Date
}

// ─── Answer ───────────────────────────────────────────────────────────────────

export interface Answer {
  questionId: string
  selectedOptionId?: string
  booleanAnswer?: boolean
  numericalAnswer?: number
  /** Subjective & Fill-in-blank. For fill-blank, answers separated with " | " */
  textAnswer?: string
  /** Match — JSON array of { pairId: string; selectedRight: string } */
  matchAnswer?: string
  marksAwarded?: number
  feedback?: string
  isGraded: boolean
}

export type SubmissionStatus = "in-progress" | "submitted" | "graded"

export interface Submission {
  _id?: ObjectId
  testId: ObjectId
  studentId: ObjectId
  answers: Answer[]
  startedAt: Date
  submittedAt?: Date
  totalMarksAwarded?: number
  status: SubmissionStatus
  violations?: ViolationEvent[]
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface GroupWithTeacher extends Omit<Group, "teacherId" | "_id"> {
  _id: string
  teacherId: string
  teacherName: string
  memberCount: number
}

export interface TestWithDetails extends Omit<Test, "_id" | "teacherId" | "groupIds"> {
  _id: string
  teacherId: string
  groupIds: string[]
  teacherName?: string
  groupNames?: string[]
  submissionStatus?: SubmissionStatus
  totalMarksAwarded?: number
}

export interface SubmissionWithDetails extends Omit<Submission, "_id" | "testId" | "studentId"> {
  _id: string
  testId: string
  studentId: string
  studentName?: string
  studentEmail?: string
  testTitle?: string
}