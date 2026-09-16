# Нақшаи такмилшудаи татбиқ

Ин нақша версияи беҳтаршудаи implementation plan-и аввал аст. Нақшаи аввал аз ҷиҳати умумӣ дуруст буд, аммо барои сохтани воқеӣ чанд чизро дақиқтар кардан лозим аст: версияи .NET, timezone, data model-и attempt, endpoint contract, tests, seed data ва edge-case-ҳои саҳифаи 10-и консепсия.

## Қарорҳои техникӣ

- Backend: ASP.NET Core Web API бо `net10.0`.
- Database: PostgreSQL.
- ORM: EF Core.
- Auth: JWT access token, role claims, password hashing бо BCrypt.
- Architecture: pragmatic Clean Architecture.
- Frontend: React + TypeScript + Vite + Tailwind CSS.
- Timezone-и бизнес: `Asia/Dushanbe`, вақтҳо дар DB ҳамчун UTC.
- Docker: барои MVP истифода намешавад, вале config-и local бояд содда бошад.

## Марҳилаи 0: Омодасозии контекст

- [x] Хондани PDF-и консепсия.
- [x] Санҷидани implementation plan-и мавҷуда.
- [x] Сохтани `PROJECT_CONTEXT.md`.
- [x] Сохтани `AGENTS.md`.
- [x] Сохтани нақшаи такмилшуда.

## Марҳилаи 1: Backend skeleton

- [x] Сохтани solution дар `Back/`.
- [x] Сохтани project-ҳо: `Domain`, `Application`, `Infrastructure`, `API`.
- [x] Иловаи test project-ҳо.
- [x] Танзими nullable, implicit usings, analyzers/basic warnings.
- [x] Танзими Swagger/OpenAPI.
- [x] Global exception middleware ва response model.
- [x] Health endpoint: `/health`.

## Марҳилаи 2: Domain ва database model

- [x] Entities: User, Group, GroupStudent, Subject, Topic, Question, QuestionOption.
- [x] Assignment entities: TeacherSubjectGroup, DailyLesson, TestAssignment.
- [x] Attempt entities: StudentTestAttempt, AttemptQuestion, StudentAnswer.
- [x] Grade entities: GradeEntry, GradeAuditLog.
- [x] Enums: UserRole, QuestionType, TestStatus, AttendanceStatus.
- [x] EF configurations, indexes ва constraints.
- [x] Initial migration.
- [x] Seed data барои SuperAdmin.
- [ ] Demo data баъди татбиқи password hashing/auth seed мешавад.

## Марҳилаи 3: Authentication ва RBAC

- [x] Password hashing service.
- [x] JWT generator.
- [x] Login endpoint.
- [x] Current user service.
- [x] Authorization policies барои 5 нақш.
- [x] Integration tests барои unauthorized/forbidden cases.

## Марҳилаи 4: Admin/Manager APIs

- [x] CRUD users бо role assignment.
- [x] CRUD groups.
- [x] Add/remove students to groups.
- [x] CRUD subjects.
- [x] Assign teacher to subject/group.
- [x] Dashboard summary барои admin/manager.

## Марҳилаи 5: Teacher education workflow

- [x] CRUD topics scoped by teacher subject/group assignment.
- [x] CRUD questions and options.
- [x] Teacher DOCX/TXT question import through the shared admin question workflow.
- [x] Validation барои single/multiple correct answers.
- [x] Create daily lesson.
- [x] Assign daily lesson to group with question count.
- [x] Teacher dashboard: active lessons, submitted/absent counts.

## Марҳилаи 6: Student test workflow

- [ ] Endpoint: get current test availability.
- [ ] Start or resume attempt.
- [ ] Persist randomized `AttemptQuestion` records.
- [ ] Save answers.
- [ ] Submit attempt.
- [ ] Auto-score calculation.
- [ ] Student history endpoint.
- [ ] Tests for 20:00-07:00 window and refresh stability.

## Марҳилаи 7: Expiration job

- [ ] Background service that runs after the availability window.
- [ ] Expire in-progress attempts.
- [ ] Create absent grade records for students who never started.
- [ ] Ensure job is idempotent.
- [ ] Tests for repeated job execution.

## Марҳилаи 8: Grading ва gradebook

- [ ] Teacher grading queue.
- [ ] Approve AutoScore as FinalScore.
- [ ] Override FinalScore with comment/reason.
- [ ] Grade audit log.
- [ ] Gradebook matrix by group/subject/date.
- [ ] Student personal gradebook.
- [ ] Manager/Admin gradebook visibility.

## Марҳилаи 9: Frontend foundation

- [ ] Vite React TypeScript project дар `Front/`.
- [ ] Tailwind setup.
- [ ] API client бо auth interceptor.
- [ ] Auth context/store.
- [ ] Protected routes.
- [ ] Role-based layout.
- [ ] Shared UI components: button, input, select, table, modal, badge, toast.

## Марҳилаи 10: Frontend screens

- [ ] Login.
- [ ] Admin dashboard and user management.
- [ ] Manager groups/subjects/teacher assignment.
- [x] Teacher question bank with topic management and file import.
- [ ] Teacher daily lesson setup.
- [ ] Teacher grading queue.
- [ ] Student current test room.
- [ ] Student history.
- [ ] Gradebook views.

## Марҳилаи 11: Integration ва QA

- [ ] Backend build.
- [ ] Backend tests.
- [ ] Frontend build.
- [ ] Manual flow: manager creates group -> teacher creates lesson -> student submits -> teacher grades -> journal updates.
- [ ] Санҷиши 8 ҳолати махсуси консепсия.
- [ ] README барои run local.

## API contract draft

Endpoint-ҳо ҳангоми implement метавонанд майда тағйир ёбанд, вале ин contract роҳнамои аввал аст.

| Area | Method | Path |
| --- | --- | --- |
| Auth | POST | `/api/auth/login` |
| Users | GET/POST | `/api/users` |
| Users | GET/PUT/DELETE | `/api/users/{id}` |
| Groups | GET/POST | `/api/groups` |
| Groups | POST/DELETE | `/api/groups/{groupId}/students/{studentId}` |
| Teacher Assignments | GET/POST | `/api/teacher-assignments` |
| Teacher Assignments | PUT | `/api/teacher-assignments/groups/{groupId}/subjects/{subjectId}` |
| Teacher Assignments | DELETE | `/api/teacher-assignments/{teacherId}/{subjectId}/{groupId}` |
| Teacher Subjects | GET | `/api/teacher/subjects` |
| Subjects | GET/POST | `/api/subjects` |
| Topics | GET/POST | `/api/subjects/{subjectId}/topics` |
| Questions | GET/POST | `/api/topics/{topicId}/questions` |
| Daily Lessons | GET/POST | `/api/daily-lessons` |
| Student Tests | GET | `/api/student/tests/current` |
| Student Tests | POST | `/api/student/tests/{assignmentId}/start` |
| Student Tests | PUT | `/api/student/attempts/{attemptId}/answers` |
| Student Tests | POST | `/api/student/attempts/{attemptId}/submit` |
| Grading | GET | `/api/teacher/grading` |
| Grading | PUT | `/api/teacher/grading/{attemptId}` |
| Gradebook | GET | `/api/gradebook` |
| Gradebook | GET | `/api/student/gradebook` |

## Хулосаи арзёбии нақшаи аввал

Нақшаи аввал дуруст аст ва бо консепсияи PDF мувофиқат мекунад. Барои сохтани система бо сифати беҳтар, онро бо ин нуқтаҳо пурра кардем:

- `net10.0` ба ҷои `.NET 8/9`, чун дар workspace .NET 10 насб аст ва он LTS мебошад.
- Timezone-и бизнес ва UTC storage равшан шуд.
- AttemptQuestion илова шуд, то randomization баъди refresh дигар нашавад.
- GradeAuditLog илова шуд, то тағйири баҳо пайгирӣ шавад.
- Tests ва idempotency барои background job илова шуд.
- API contract draft илова шуд.
- Edge-case-ҳои саҳифаи 10 бо қарорҳои пешфарз сабт шуданд.
