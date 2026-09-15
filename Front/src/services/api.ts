import type {
  CreateSubjectRequest,
  CreateTopicRequest,
  CreateGroupRequest,
  CreateUserRequest,
  GeneratedPasswordDto,
  GroupDto,
  AssignTeacherSubjectRequest,
  SubjectDto,
  TeacherSubjectAssignmentDto,
  TopicDto,
  UpdateGroupRequest,
  UpdateSubjectRequest,
  UpdateTopicRequest,
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

export function updateSubject(token: string, subjectId: string, body: UpdateSubjectRequest): Promise<SubjectDto> {
  return request<SubjectDto>(`/api/subjects/${subjectId}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteSubject(token: string, subjectId: string): Promise<void> {
  return request<void>(`/api/subjects/${subjectId}`, token, {
    method: 'DELETE',
  });
}

export function getTopics(token: string): Promise<TopicDto[]> {
  return request<TopicDto[]>('/api/topics', token);
}

export function createTopic(token: string, body: CreateTopicRequest): Promise<TopicDto> {
  return request<TopicDto>('/api/topics', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateTopic(token: string, topicId: string, body: UpdateTopicRequest): Promise<TopicDto> {
  return request<TopicDto>(`/api/topics/${topicId}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteTopic(token: string, topicId: string): Promise<void> {
  return request<void>(`/api/topics/${topicId}`, token, {
    method: 'DELETE',
  });
}

export function getGroups(token: string): Promise<GroupDto[]> {
  return request<GroupDto[]>('/api/groups', token);
}

export function createGroup(token: string, body: CreateGroupRequest): Promise<GroupDto> {
  return request<GroupDto>('/api/groups', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateGroup(token: string, groupId: string, body: UpdateGroupRequest): Promise<GroupDto> {
  return request<GroupDto>(`/api/groups/${groupId}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function addStudentToGroup(token: string, groupId: string, studentId: string): Promise<void> {
  return request<void>(`/api/groups/${groupId}/students/${studentId}`, token, {
    method: 'POST',
  });
}

export function removeStudentFromGroup(token: string, groupId: string, studentId: string): Promise<void> {
  return request<void>(`/api/groups/${groupId}/students/${studentId}`, token, {
    method: 'DELETE',
  });
}

export function getTeacherSubjects(token: string): Promise<TeacherSubjectAssignmentDto[]> {
  return request<TeacherSubjectAssignmentDto[]>('/api/teacher-subjects', token);
}

export function assignTeacherSubject(
  token: string,
  body: AssignTeacherSubjectRequest,
): Promise<TeacherSubjectAssignmentDto> {
  return request<TeacherSubjectAssignmentDto>('/api/teacher-subjects', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getSystemInfo(token: string): Promise<{ name: string; version: string }> {
  return request<{ name: string; version: string }>('/api/system/info', token);
}
