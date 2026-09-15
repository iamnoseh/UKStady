import type { UserRole } from './auth';

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  phoneNumber: string;
  userName: string;
  role: UserRole;
  isActive: boolean;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  middleName: string | null;
  phoneNumber: string;
  password: string;
  role: UserRole;
  userName?: string | null;
}

export interface GeneratedPasswordDto {
  password: string;
}

export interface SubjectDto {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  topicCount: number;
}

export interface CreateSubjectRequest {
  name: string;
  description: string | null;
}

export interface UpdateSubjectRequest {
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface TopicDto {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string;
  description: string | null;
  source: string | null;
  grade: string | null;
  isActive: boolean;
  questionCount: number;
}

export interface CreateTopicRequest {
  subjectId: string;
  title: string;
  description: string | null;
  source: string | null;
  grade: string | null;
}

export interface UpdateTopicRequest {
  title: string;
  description: string | null;
  source: string | null;
  grade: string | null;
  isActive: boolean;
}

export type QuestionType = 'ClosedAnswer' | 'SingleChoice';

export interface QuestionOptionDto {
  id: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface QuestionDto {
  id: string;
  topicId: string;
  text: string;
  type: QuestionType;
  points: number;
  isActive: boolean;
  options: QuestionOptionDto[];
}

export interface CreateQuestionOptionRequest {
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface CreateQuestionRequest {
  topicId: string;
  text: string;
  type: QuestionType;
  points: number;
  options: CreateQuestionOptionRequest[];
}

export interface UpdateQuestionRequest {
  text: string;
  type: QuestionType;
  points: number;
  isActive: boolean;
  options: CreateQuestionOptionRequest[];
}

export interface GroupSubjectDto {
  id: string;
  name: string;
}

export interface GroupStudentDto {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface GroupDto {
  id: string;
  name: string;
  description: string | null;
  branch: string;
  isActive: boolean;
  studentCount: number;
  subjects: GroupSubjectDto[];
  students: GroupStudentDto[];
}

export interface CreateGroupRequest {
  name: string;
  description: string | null;
  branch: string;
  subjectIds: string[];
}

export interface UpdateGroupRequest {
  name: string;
  description: string | null;
  branch: string;
  isActive: boolean;
  subjectIds: string[];
}

export interface DailyLessonDto {
  id: string;
  teacherId: string;
  subjectId: string;
  subjectName: string;
  topicId: string | null;
  topicTitle: string | null;
  lessonDate: string;
  title: string;
  questionCount: number;
  opensAtUtc: string;
  closesAtUtc: string;
  assignedGroupIds: string[];
}

export interface CreateTodayGroupLessonResult {
  lesson: DailyLessonDto;
  created: boolean;
}

export interface GroupJournalStudentDto {
  studentId: string;
  fullName: string;
  phoneNumber: string;
  todayScore: number | null;
  averageScore: number | null;
  status: string;
  lessonScores: GroupJournalLessonScoreDto[];
}

export interface GroupJournalLessonScoreDto {
  lessonId: string;
  score: number | null;
  status: string;
}

export interface GroupJournalLessonDto {
  id: string;
  lessonDate: string;
  title: string;
  topicId: string | null;
  topicTitle: string | null;
  questionCount: number;
}

export interface GroupSubjectJournalDto {
  subjectId: string;
  subjectName: string;
  todayLessonId: string | null;
  todayTopicId: string | null;
  todayTopicTitle: string | null;
  todayQuestionCount: number;
  averageScore: number | null;
  lessons: GroupJournalLessonDto[];
  students: GroupJournalStudentDto[];
}

export interface GroupJournalDto {
  groupId: string;
  groupName: string;
  today: string;
  subjects: GroupSubjectJournalDto[];
}

export interface AssignTeacherSubjectRequest {
  teacherId: string;
  subjectId: string;
}

export interface TeacherSubjectAssignmentDto {
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  assignedAtUtc: string;
}
