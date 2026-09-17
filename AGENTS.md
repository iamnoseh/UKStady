# Қоидаҳои кор барои AI/Codex

Ин лоиҳа бо AI қисм-қисм сохта мешавад. Пеш аз оғоз кардани ҳар task аввал ин файл, `PROJECT_CONTEXT.md` ва `REPOSITORY_ANALYSIS.md`-ро хонед. Таҳлили охирин ҳолати код, нозукиҳо ва масъалаҳои кушодаро бо commit-и асос нишон медиҳад; тағйироти баъдиро аз git diff санҷед.

## Принсипҳои умумӣ

- Контекст ва бизнес-мантиқро аз `PROJECT_CONTEXT.md` нигоҳ доред.
- Тағйиротро хурд, санҷидашаванда ва мувофиқи марҳилаи ҷорӣ созед.
- Аз refactor-и берун аз task худдорӣ кунед.
- Ҳар feature бояд backend contract, frontend use case ва validation-и равшан дошта бошад.
- Secrets ва connection string-и production-ро commit накунед. Барои local аз env vars ё user-secrets истифода баред.

## Backend

- Stack: ASP.NET Core Web API, EF Core, PostgreSQL, JWT, role-based authorization.
- Target framework: `net10.0`, агар user махсус версияи дигар нахоҳад. Дар ин workspace .NET 9 ва .NET 10 SDK насб аст; .NET 10 LTS интихоби беҳтар аст.
- Architecture: pragmatic Clean Architecture.
- Лоиҳаҳо:
  - `Back/src/Domain`
  - `Back/src/Application`
  - `Back/src/Infrastructure`
  - `Back/src/API`
  - `Back/tests/Application.Tests`
  - `Back/tests/API.Tests`
- Domain entity ва DTO-ро омехта накунед.
- Query-ҳои read-only бо `AsNoTracking()` бошанд.
- Ҳамаи IO ва database calls async бошанд.
- Business time бо `IDateTimeProvider` ва `ITimeZoneProvider` идора шавад.
- Authorization-ро ҳам дар endpoint ва ҳам дар query/service scope enforce кунед.
- Error responses бояд predictable бошанд: validation, unauthorized, forbidden, not found, business conflict.

## Frontend

- Stack: Vite, React, TypeScript strict, Tailwind CSS.
- API logic дар `src/services`, types дар `src/types`.
- UI бояд барои системаи таълимӣ ором, корӣ ва зудхон бошад.
- Role-based routing ва protected routes ҳатмӣ аст.
- Frontend validation UX-ро беҳтар мекунад, вале қоидаи асосӣ бояд дар backend бошад.
- Барои тест room layout stable бошад: timer, progress, autosave/submit state, error recovery.

## Database

- UUID/Guid барои primary keys.
- `CreatedAtUtc`, `UpdatedAtUtc` барои entity-ҳои mutable.
- Many-to-many explicit join entities дошта бошад: `GroupStudent`, `TeacherSubjectGroup` ё equivalent.
- Attempt questions бояд persist шавад, то randomization баъди refresh тағйир наёбад.
- GradeEntry бояд DailyLesson, Student, Attempt, AutoScore, FinalScore, AttendanceStatus ва grading audit fields дошта бошад.

## Testing

- Барои backend business logic unit tests нависед: time window, randomization persistence, submit scoring, expiration.
- Барои authorization integration tests нависед: teacher scope, student own data, manager/admin visibility.
- Барои frontend камаш smoke/build check иҷро шавад.

## Definition of Done

- Code compiles.
- Tests ё build-и мувофиқ мегузарад.
- Migration/model бо business rules мувофиқ аст.
- Endpoint contract дар docs нав мешавад, агар API тағйир ёбад.
- Дар final answer commands/tests ва файлҳои тағйирёфта кӯтоҳ гуфта мешаванд.
