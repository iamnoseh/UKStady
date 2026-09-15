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
