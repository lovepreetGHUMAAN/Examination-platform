import { ObjectId } from "mongodb"

export type UserRole = "teacher" | "student"

export interface User {
  _id?: ObjectId
  name: string
  email: string
  password: string
  role: UserRole
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
  // MCQ specific
  options?: MCQOption[]
  correctOptionId?: string
  // Numerical specific
  correctAnswer?: number
  tolerance?: number
  // Subjective specific
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
  duration: number // in minutes
  availableFrom: Date
  availableTo: Date
  totalMarks: number
  isPublished: boolean
  createdAt: Date
}

export interface Answer {
  questionId: string
  // MCQ
  selectedOptionId?: string
  // Numerical
  numericalAnswer?: number
  // Subjective
  textAnswer?: string
  // Grading
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

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Extended types for frontend
export interface GroupWithTeacher extends Omit<Group, "teacherId"> {
  teacherId: string
  teacherName: string
  memberCount: number
  _id: string
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
