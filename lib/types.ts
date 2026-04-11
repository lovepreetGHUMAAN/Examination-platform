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

export type QuestionType = "mcq" | "numerical" | "subjective"

export interface MCQOption {
  id: string
  text: string
}

export interface Question {
  id: string
  type: QuestionType
  text: string
  marks: number
  options?: MCQOption[]
  correctOptionId?: string
  correctAnswer?: number
  tolerance?: number
  maxWords?: number
  keywords?: string[]
}

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
  createdAt: Date
}

export interface Answer {
  questionId: string
  selectedOptionId?: string
  numericalAnswer?: number
  textAnswer?: string
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
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// FIX: Omit _id as well so the string override doesn't conflict with ObjectId
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