import type {
  CreateSubjectRequest,
  CreateTopicRequest,
  DashboardDailyResultsDto,
  DashboardDailyResultsSort,
  CreateQuestionRequest,
  CreateGroupRequest,
  CreateUserRequest,
  GeneratedPasswordDto,
  GroupDto,
  GroupJournalDto,
  GroupJournalLessonScoreDto,
  AssignTeacherSubjectRequest,
  QuestionDto,
  SubjectDto,
  StudentDashboardDto,
  StudentTestSessionDto,
  StudentTestSubmitResultDto,
  TeacherAssignmentDto,
  TeacherDashboardGroupDto,
  TeacherSubjectAssignmentDto,
  TopicDto,
  UpdateGroupJournalScoreRequest,
  UpdateGroupRequest,
  UpdateQuestionRequest,
  UpdateSubjectRequest,
  UpdateTopicRequest,
  UserDto,
  CreateTodayGroupLessonResult,
  SaveStudentAnswerRequest,
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

export function getCurrentTeacherSubjects(token: string): Promise<SubjectDto[]> {
  return request<SubjectDto[]>('/api/teacher/subjects', token);
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

export function getQuestionsByTopic(token: string, topicId: string): Promise<QuestionDto[]> {
  return request<QuestionDto[]>(`/api/questions/by-topic/${topicId}`, token);
}

export function createQuestion(token: string, body: CreateQuestionRequest): Promise<QuestionDto> {
  return request<QuestionDto>('/api/questions', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateQuestion(token: string, questionId: string, body: UpdateQuestionRequest): Promise<QuestionDto> {
  return request<QuestionDto>(`/api/questions/${questionId}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteQuestion(token: string, questionId: string): Promise<void> {
  return request<void>(`/api/questions/${questionId}`, token, {
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

export function getGroupJournal(token: string, groupId: string): Promise<GroupJournalDto> {
  return request<GroupJournalDto>(`/api/group-journals/${groupId}`, token);
}

export function getDashboardDailyResults(
  token: string,
  filters: { date?: string; groupId?: string; sort?: DashboardDailyResultsSort },
): Promise<DashboardDailyResultsDto> {
  const searchParams = new URLSearchParams();
  if (filters.date) {
    searchParams.set('date', filters.date);
  }
  if (filters.groupId) {
    searchParams.set('groupId', filters.groupId);
  }
  if (filters.sort) {
    searchParams.set('sort', filters.sort);
  }

  const query = searchParams.toString();
  return request<DashboardDailyResultsDto>(`/api/admin/dashboard/daily-results${query ? `?${query}` : ''}`, token);
}

export function getTeacherDashboardGroups(token: string): Promise<TeacherDashboardGroupDto[]> {
  return request<TeacherDashboardGroupDto[]>('/api/teacher/dashboard/groups', token);
}

export function getTeacherDashboardDailyResults(
  token: string,
  filters: { date?: string; groupId?: string; sort?: DashboardDailyResultsSort },
): Promise<DashboardDailyResultsDto> {
  const searchParams = new URLSearchParams();
  if (filters.date) {
    searchParams.set('date', filters.date);
  }
  if (filters.groupId) {
    searchParams.set('groupId', filters.groupId);
  }
  if (filters.sort) {
    searchParams.set('sort', filters.sort);
  }

  const query = searchParams.toString();
  return request<DashboardDailyResultsDto>(`/api/teacher/dashboard/daily-results${query ? `?${query}` : ''}`, token);
}

export function getStudentDashboard(token: string): Promise<StudentDashboardDto> {
  return request<StudentDashboardDto>('/api/student/dashboard', token);
}

export function startStudentTest(
  token: string,
  dailyLessonId: string,
  groupId: string,
): Promise<StudentTestSessionDto> {
  return request<StudentTestSessionDto>(`/api/student/tests/${dailyLessonId}/start`, token, {
    method: 'POST',
    body: JSON.stringify({ groupId }),
  });
}

export function saveStudentTestAnswer(
  token: string,
  attemptId: string,
  body: SaveStudentAnswerRequest,
): Promise<SaveStudentAnswerRequest> {
  return request<SaveStudentAnswerRequest>(`/api/student/tests/${attemptId}/answers`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function checkStudentTestAnswer(
  token: string,
  attemptId: string,
  questionId: string,
): Promise<SaveStudentAnswerRequest> {
  return request<SaveStudentAnswerRequest>(`/api/student/tests/${attemptId}/questions/${questionId}/check`, token, {
    method: 'POST',
  });
}

export function submitStudentTest(token: string, attemptId: string): Promise<StudentTestSubmitResultDto> {
  return request<StudentTestSubmitResultDto>(`/api/student/tests/${attemptId}/submit`, token, {
    method: 'POST',
  });
}

export function createTodayGroupLesson(
  token: string,
  groupId: string,
  subjectId: string,
): Promise<CreateTodayGroupLessonResult> {
  return request<CreateTodayGroupLessonResult>(`/api/group-journals/${groupId}/today-lessons`, token, {
    method: 'POST',
    body: JSON.stringify({ subjectId }),
  });
}

export function updateGroupLessonTopic(
  token: string,
  groupId: string,
  lessonId: string,
  topicId: string,
): Promise<void> {
  return request<void>(`/api/group-journals/${groupId}/lessons/${lessonId}/topic`, token, {
    method: 'PUT',
    body: JSON.stringify({ topicId }),
  });
}

export function updateGroupJournalScore(
  token: string,
  groupId: string,
  lessonId: string,
  studentId: string,
  body: UpdateGroupJournalScoreRequest,
): Promise<GroupJournalLessonScoreDto> {
  return request<GroupJournalLessonScoreDto>(`/api/group-journals/${groupId}/lessons/${lessonId}/students/${studentId}/score`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
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

export function getTeacherAssignments(token: string): Promise<TeacherAssignmentDto[]> {
  return request<TeacherAssignmentDto[]>('/api/teacher-assignments', token);
}

export function setTeacherAssignment(
  token: string,
  groupId: string,
  subjectId: string,
  teacherId: string,
): Promise<TeacherAssignmentDto> {
  return request<TeacherAssignmentDto>(`/api/teacher-assignments/groups/${groupId}/subjects/${subjectId}`, token, {
    method: 'PUT',
    body: JSON.stringify({ teacherId }),
  });
}

export function getSystemInfo(token: string): Promise<{ name: string; version: string }> {
  return request<{ name: string; version: string }>('/api/system/info', token);
}
