import type { UserRole } from './auth';

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  phoneNumber: string;
  userName: string;
  email: string;
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
  email?: string | null;
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

