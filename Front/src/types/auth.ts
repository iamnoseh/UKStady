export type UserRole = 'SuperAdmin' | 'Admin' | 'Manager' | 'Teacher' | 'Student';

export interface AuthResult {
  userId: string;
  phoneNumber: string;
  userName: string;
  fullName: string;
  role: UserRole;
  accessToken: string;
}

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}
