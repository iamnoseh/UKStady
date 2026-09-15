import type {
  CreateSubjectRequest,
  CreateUserRequest,
  GeneratedPasswordDto,
  SubjectDto,
  UserDto,
} from '../types/admin';
import type { AuthResult, LoginRequest } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5036';

export async function login(request: LoginRequest): Promise<AuthResult> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Рақами телефон ё парол нодуруст аст.');
  }

  return response.json() as Promise<AuthResult>;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? 'Дархост иҷро нашуд.';
  } catch {
    return 'Дархост иҷро нашуд.';
  }
}

export function getUsers(token: string): Promise<UserDto[]> {
  return request<UserDto[]>('/api/users', token);
}

export function createUser(token: string, body: CreateUserRequest): Promise<UserDto> {
  return request<UserDto>('/api/users', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function generatePassword(token: string): Promise<GeneratedPasswordDto> {
  return request<GeneratedPasswordDto>('/api/users/generated-password', token);
}

export function getSubjects(token: string): Promise<SubjectDto[]> {
  return request<SubjectDto[]>('/api/subjects', token);
}

export function createSubject(token: string, body: CreateSubjectRequest): Promise<SubjectDto> {
  return request<SubjectDto>('/api/subjects', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getSystemInfo(token: string): Promise<{ name: string; version: string }> {
  return request<{ name: string; version: string }>('/api/system/info', token);
}

