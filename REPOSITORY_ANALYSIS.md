# UKStady — таҳлили код ва контексти корӣ

Сана: **17.09.2026**. Версияи таҳлилшуда: `1a562ad3aaaa5a16af1e1ec0ccfd1f83bcae5c83` аз `main`.
Веткаи корӣ: **`codex/ukstady-work-2026-09-17`**.

Ин ҳуҷҷат натиҷаи хондани код, model/configuration/migration, API, UI ва тестҳои репозиторий мебошад. Он ҳолати воқеии версияи болоиро аз талаботи ҳанӯз татбиқнашуда ҷудо мекунад. Пеш аз идомаи кор diff-и commit-ҳои навро низ хонед. Ин таҳлил аудити production-и фаъол ё кафолати набудани ҳамаи хатогиҳо нест.

## 1. Хулосаи воқеӣ

UKStady системаи идоракунии санҷиши ҳаррӯзаи дониши хонандагон барои муассисаи таълимӣ аст. Занҷири пешбинишуда: фан → мавзӯъ → бонки саволҳо → дарси рӯз барои гурӯҳ → тести инфиродӣ → AutoScore → тасдиқи муаллим → журнал.

Дар ин commit қисми маъмурӣ, бонки саволҳо, таъини муаллимон, сохтани дарс ва **хондани** журнал татбиқ шудаанд. Қисми асосии донишҷӯ — оғоз/идомаи attempt, ҷавобҳо, submit, scoring, expiration ва grading — ҳанӯз сервис/API/UI надорад. Мавҷуд будани entity ё enum маънои тайёр будани workflow-ро надорад.

Ин лоиҳаро бо ADEEB омехта накунед: gamification, XP, дуэл, ММТ ва league дар ин repo нестанд. Номи маҳсулот дар код **UKStady** аст; худсарона ба UKStudy иваз накунед.

## 2. Харитаи архитектура

| Қисм | Вазифа ва ҷойи асосӣ |
| --- | --- |
| `Back/src/Domain` | 17 entity, 4 enum, `AuditableEntity`; қоидаҳои workflow дар entity-ҳо ҷойгир нашудаанд |
| `Back/src/Application` | `AuthService`, `AdministrationService`, `TeachingService`, DTO ва interface-ҳо |
| `Back/src/Infrastructure` | PostgreSQL/EF Core, конфигуратсияи model, 7 migration, BCrypt, JWT, вақт |
| `Back/src/API` | Minimal APIs, policies, current-user claims, CORS, Swagger, exception middleware |
| `Back/tests/API.Tests` | 19 `[Fact]`, `WebApplicationFactory`, EF InMemory |
| `Back/tests/Application.Tests` | 1 `[Fact]` барои DI; business-unit-test ҳанӯз нест |
| `Front/src/pages` | 8 саҳифа: login, dashboard, students, teachers, groups, subjects, topics, questions |
| `Front/src/services/api.ts` | Fetch wrapper ва API calls |
| `Front/src/context/AuthContext.tsx` | Login/logout ва нигоҳдории auth дар localStorage |
| `Front/src/auth/permissions.ts` | Ҳуқуқи намоиши саҳифаҳо |
| `Front/src/components` | Shell, button, pagination, searchable select/multi-select |
| `Front/src/types` | Contract-ҳои TypeScript барои auth ва administration/teaching |

Dependency: API → Application + Infrastructure; Infrastructure → Application + Domain; Application → Domain. Application ҳам EF Core-ро тавассути `IAppDbContext` истифода мебарад: ин pragmatic Clean Architecture аст, repository/CQRS/MediatR нест.

Backend target `net10.0`; Microsoft/EF packages дар csproj асосан `10.0.12`, Npgsql provider `10.0.3`, BCrypt `4.2.0`, Swagger `10.2.3`. Ин версияҳои **repo** мебошанд; restore дар ин муҳит санҷида нашуд.
Frontend: React 19, TypeScript 5.9 strict, Vite 7, Tailwind 3, lucide-react, mammoth. `package-lock.json` мавҷуд аст; build Vite `7.3.6`-ро истифода кард. Router, query-cache, form library ва frontend test runner насб нашудаанд.

## 3. Нақшҳо ва ҳудуди воқеии дастрасӣ

| Нақш | API/UI-и мавҷуд |
| --- | --- |
| SuperAdmin / Admin / Manager | User CRUD/deactivate, гурӯҳ, фан, teacher-subject, teacher-group assignment; endpoint-ҳои таълимӣ |
| Teacher | Фанҳои вобаста, мавзӯъ/саволи ҳамин фанҳо; гурӯҳ/журнали вобаста; сохтани дарс; натиҷаҳои гурӯҳҳои худ |
| Student | Login ва `/api/auth/me`; dashboard танҳо welcome; «Тестҳо» ҳамон dashboard-ро мекушояд |

Policies: `Managers` = SuperAdmin/Admin/Manager; `EducationStaff` = ин се + Teacher; `Teachers` = танҳо Teacher; `Students` = танҳо Student, вале endpoint-и student workflow нест. `Administrators` policy таъриф шудааст, аммо user-management ҳоло онро истифода намекунад.

**Се муносибатро ҷудо нигоҳ доред:**

- `TeacherSubject`: муаллим ин фанро дорад; барои бонки саволҳо кофист.
- `GroupSubject`: фан ба гурӯҳ дохил аст.
- `TeacherSubjectGroup`: муаллими фан дар гурӯҳи муайян. Барои journal/dashboard ва дарси гурӯҳ ҳамин ҷуфт муҳим аст.

`SetTeacherAssignmentAsync` муаллими фаъол, фани фаъол, гурӯҳи фаъол ва ҳар ду муносибати аввалро месанҷад; муаллими дигари ҳамон group+subject-ро хориҷ мекунад. Вале DB uniqueness танҳо triple-и teacher+subject+group аст: як муаллим барои group+subject дар DB алоҳида enforce намешавад.

## 4. Account ва authentication

- Login бо `PhoneNumber` ва password; рақам танҳо trim ва аз фосилаи одӣ тоза мешавад. E.164/рақами дурусти Тоҷикистон validation надорад.
- BCrypt hash; login танҳо user-и `IsActive=true`-ро қабул мекунад.
- Пароли account-и нав: дақиқан 6 рамз, 5 рақами ASCII + 1 ҳарфи англисӣ. Generator аз `RandomNumberGenerator` истифода мебарад; ин талаботи мавҷудро бе қарор иваз накунед.
- DTO барои create/update нақшро аз request қабул мекунад. UI барои донишҷӯ `Student`, барои муаллим `Teacher` мефиристад; ин маҳдудияти backend нест.
- JWT дорои user id, username, phone ва role аст. `/me` claims-ро бармегардонад, на сабти навшудаи DB.
- Дар ҳар ду appsettings `ExpirationMinutes=0`: token бе expiration сохта ва lifetime validation хомӯш мешавад. Refresh token, revoke, token-version, password-change/reset ва rate limiter татбиқ нашудаанд.
- Auth JSON зери `ukstady.auth` дар localStorage; parsing бе try/catch ва schema validation. Logout танҳо storage/state-ро пок мекунад.
- Seed-и SuperAdmin дар EF `HasData` аст ва ба Development маҳдуд нашудааст; LoginPage низ credentials-и demo-ро пешакӣ пур мекунад. Дар deployment-и воқеӣ инро ислоҳ кардан лозим аст. Қиматҳои signing key/connection string-ро дар ҳуҷҷат такрор накунед.

## 5. Гурӯҳ, фан ва муаллим

- User/group/subject/topic/question DELETE одатан `IsActive=false` аст. Хориҷ кардани membership ё assignment воқеан join row-ро delete мекунад.
- `Group.Branch` string аст; entity-и Branch ва tenant isolation нест. Номи гурӯҳ дар тамоми база unique аст, на дар ҳар филиал.
- Хонанда метавонад дар якчанд гурӯҳ бошад. Ҳангоми add student танҳо мавҷудияти гурӯҳ ва role=Student санҷида мешавад; active будани ҳар ду шарт нест.
- Create/update group `SubjectIds`-и вуҷуднадоштаро хомӯшона партофта мегузарад. Create group ду SaveChanges дорад; амалиёти умумӣ transaction-и алоҳида надорад.
- Аз гурӯҳ хориҷ кардани фан инчунин teacher-group assignment-ҳои ҳамон фанро хориҷ мекунад. Дарсҳо/баҳоҳои таърихӣ delete намешаванд, аммо аз journal-и ҷории ин гурӯҳ метавонанд пинҳон шаванд.
- Аз муаллим хориҷ кардани `TeacherSubject` assignment-ҳои group-и ҳамон teacher+subject-ро ҳам хориҷ мекунад.
- UI-и Teachers аввал account, баъд subject assignment месозад: хатои қадами дуюм account-и бе assignment мегузорад. UI-и Students/Teachers ҳоло асосан list/create аст; ҳамаи update/deactivate endpoint-ҳо UI надоранд.

## 6. Мавзӯъ, савол ва import

Topic дорои `Title`, `Description`, `Source`, `Grade` мебошад. `Grade` string-и синф/сатҳи мавзӯъ аст, **баҳои хонанда нест**. Title дар дохили subject unique аст.

| Enum/API | Ҳолати воқеӣ | Номи UI |
| --- | --- | --- |
| `ClosedAnswer=1` | Як ҷавоби матнии дуруст дар QuestionOption | «Пӯшида» |
| `OpenAnswer=1` | Alias-и legacy-и ҳамон арзиш; навъи мустақил нест | Дар union-и TS нест |
| `SingleChoice=2` | 4 вариант, маҳз 1 дуруст | «Кушода» |

`MultipleChoice` дар enum/UI нест, ҳарчанд PROJECT_CONTEXT-и аввал онро талаб мекунад. Пеш аз scoring бояд навъи матнӣ ва номи canonical-и serialization қарор дода шавад; alias-и `OpenAnswer`/`ClosedAnswer` хатари номувофиқии DB/JSON дорад.

Question: `Points>0`, option text nonempty, sort order unique. Validation дар endpoint аст; барои enum-и рақамии ношинос switch ба `_ => null` меравад. MaxLength-ҳои DB ба validation-и пурраи request табдил дода нашудаанд.

Import дар **browser** иҷро мешавад, backend endpoint-и bulk upload нест:

1. DOCX бо dynamic import-и mammoth ва `extractRawText`; TXT бо `file.text()`.
2. `.doc` қабул мешавад, вале бо `file.text()` хонда мешавад: parser-и binary Word нест.
3. Маркери савол `</<Матни савол>/>`; вариантҳо A–D ё ҳарфҳои кириллӣ, ҷавоби дуруст бо `---`/`--`/`—`.
4. Як вариант → ClosedAnswer; дигар ҳолатҳо → SingleChoice. Барои SingleChoice танҳо 4 варианти аввал гирифта мешавад.
5. Preview/edit/validation; танҳо draft-ҳои valid сабт мешаванд.
6. Ҳар савол POST-и мустақил аст, ҳамаи онҳо бо `Promise.all`. Partial success/rollback/idempotency/deduplication нест: retry метавонад дубора сабт кунад.

Question update ҳамаи options-ро тоза карда аз нав месозад. Вақте StudentAnswer мавҷуд шавад, FK-и Restrict ва тағйири option-id-ҳо мушкил мешавад. AttemptQuestion танҳо question-id/order дорад; snapshot-и матн, вариантҳо, correct answer ва points нест.

## 7. Ду роҳи сохтани дарс

**Роҳи `/api/daily-lessons`:** TopicId ҳатмист (гарчанде nullable DTO), QuestionCount мусбат ва аз саволҳои фаъоли мавзӯъ зиёд набошад. Teacher бояд ба ҳамин subject дар ҳамаи group-ҳо вобаста бошад. Admin/Manager санҷиши ҳамарзиши group-subject/active state надоранд. `TeacherId` ҳамеша user-и ҷорӣ мешавад, ҳатто агар admin бошад.

**Роҳи журнал:** `today-lessons` барои санаи имрӯзаи Asia/Dushanbe дарси бе мавзӯъ ва бо QuestionCount=0 месозад. Агар subject+group+today аллакай бошад, ҳамон дарсро бо `Created=false` медиҳад. Ин idempotency танҳо барои иҷрои пайдарпай аст; concurrent insert алоҳида ҳифз нашудааст.

Ҳангоми `PUT .../topic`, TopicId/Title нав мешаванд ва **QuestionCount ба ҳамаи саволҳои фаъоли мавзӯъ баробар мешавад**. UI-и журнал интихоби миқдори N савол надорад. Topic-и бе савол низ қабул шуда count=0 мемонад. Барои draft/published дарс status-и алоҳида нест.

Вақт дар `BuildAvailabilityWindow`: LessonDate 20:00 → рӯзи баъдӣ 07:00, Asia/Dushanbe; дар DB UTC. Ин танҳо сохтани window аст: ҳанӯз student endpoint нест, ки start/save/submit-ро дар ин window enforce кунад. Санаи имрӯза баъди нимашаб аз lessonDate-и тести шаби гузашта фарқ мекунад; ҳангоми татбиқи availability аз UTC range истифода кунед.

Unique-и мавҷуда `(TeacherId, TopicId, LessonDate)` бо роҳи журнал мувофиқ нест: ҳамон муаллим/мавзӯъ/рӯз дар ду дарси ҷудогонаи гурӯҳҳои гуногун метавонад conflict диҳад. Draft-и TopicId=null аз duplicate-и concurrent ҳифзи group+subject+date намегирад. Роҳи якум як DailyLesson-ро ба якчанд гурӯҳ мебандад; роҳи журнал одатан як lesson барои як гурӯҳ месозад.

## 8. Journal ва dashboard

- Journal танҳо барои фанҳои ҳозираи GroupSubject ва хонандагони **ҳозираи** GroupStudent ҳисоб мешавад. Teacher танҳо фанҳои teacher-group assignment-и худро мебинад.
- Барои ҳар фан 50 дарси охирин нишон дода мешаванд; query аввал ҳамаи дарсҳо ва grades-ро аз DB мехонад, баъд дар memory `Take(50)` мекунад.
- Score = `FinalScore ?? AutoScore`. Average аз grade row-ҳои мавҷуда ҳисоб мешавад; `NoGrade` худкор zero/Absent намешавад.
- Backend missing score-ро null медиҳад; `GroupsPage.formatScore(null)` онро `0` менамояд. «Ҳанӯз баҳо нест» аз «0 хол» дар UI дуруст ҷудо нест.
- Journal барои subject average аз ҳамаи grades-и 50 дарси интихобшуда истифода мебарад; weighting by question points дар ин aggregation нест.
- Dashboard default санаи **дирӯзи бизнес** ва `scoreAsc`; `scoreDesc` низ дастгирӣ мешавад. Натиҷа танҳо аз GradeEntry-и мавҷуда меояд.
- Teacher daily-results ҷуфти дақиқи teacher/group/subject ва membership-и ҷории донишҷӯро месанҷад. Ин намунаи беҳтар барои mutation authorization аст.
- UI dashboard танҳо SuperAdmin ва Teacher-ро нишон медиҳад, дар ҳоле ки API admin daily-results ба Admin/Manager ҳам иҷозат медиҳад.
- Frontend «дирӯз»-ро аз timezone-и browser месозад, backend аз Asia/Dushanbe: барои корбарони берун аз Тоҷикистон сана метавонад фарқ кунад.
- Баҳо дар DB ба lesson+student баста аст, на group snapshot; membership иваз шавад, таърих метавонад аз report пинҳон/дубора гурӯҳбандӣ шавад. Агар student дар ду гурӯҳи як lesson бошад, dashboard метавонад як grade-ро ду бор ҳисоб кунад.

## 9. Model ва маҳдудиятҳои DB

| Entity / relation | Constraint-и муҳим |
| --- | --- |
| User | UUID, username unique, phone unique; role string; IsActive |
| Group | name unique глобалӣ; branch text |
| Subject / Topic | subject name unique; topic subject+title unique |
| GroupStudent / GroupSubject / TeacherSubject | Composite PK-и ду ID |
| TeacherSubjectGroup | Composite PK-и се ID; group+subject unique нест |
| QuestionOption | question+sort-order unique |
| DailyLesson | teacher+topic+date unique; subject+date index; nullable topic |
| TestAssignment | lesson+group unique |
| StudentTestAttempt | assignment+student unique; enum status; nullable AutoScore |
| AttemptQuestion | attempt+question PK; attempt+sort-order unique |
| StudentAnswer | attempt+question+option unique; option ҳатмӣ; text answer field нест |
| GradeEntry | lesson+student unique; optional attempt one-to-one; AutoScore/FinalScore decimal(5,2) |
| GradeAuditLog | previous/new FinalScore, ChangedByUserId, Reason, audit timestamp |

`AuditableEntity` GUID-ро пешакӣ медиҳад. AppDbContext SaveChangesAsync creation/update timestamp-ро аз IDateTimeProvider мегузорад. Join timestamps баъзеҳо default `UtcNow`, баъзеҳо аз service мебошанд. Concurrency token/row version ва score-range CHECK (0–100) нест. Soft-delete query filter-и умумӣ нест; ҳар query active state-ро бояд худаш муайян кунад.

FK барои QuestionOption→StudentAnswer Restrict аст. StudentAnswer composite invariant-и «option ба ҳамин question ва question ба ҳамин attempt тааллуқ дорад»-ро танҳо бо FK-ҳои мустақил таъмин намекунад: service validation лозим мешавад. Unique-и ҷавоб single-choice буданро enforce намекунад.

Migration-ҳо: InitialCreate → AddUserPhoneNumber → AddTeacherSubjects → RemoveUserEmail → AddGroupBranchAndSubjects → AddTopicSourceAndGrade → AllowDailyLessonWithoutTopic (ҳама аз 15.09.2026).

**Фарқи migration/model:** AddUserPhoneNumber column-ро nullable месозад; model ва snapshot онро required нишон медиҳанд; migration-и минбаъдаи NOT NULL дар repo нест. Схемаи воқеӣ бояд бо fresh PostgreSQL replay муқоиса шавад. Down-и RemoveUserEmail барои чанд user арзиши холии такрорӣ дода unique email index месозад; rollback-и populated DB-ро бе санҷиш иҷро накунед.

## 10. API-и воқеӣ

`M` = SuperAdmin/Admin/Manager; `E` = M + Teacher; `T` = танҳо Teacher. GUID route constraints дар код мавҷуданд. Роҳҳои API contract draft дар IMPLEMENTATION_PLAN ҳамааш воқеӣ нестанд.

| Method | Path | Дастрасӣ |
| --- | --- | --- |
| GET | `/health`, `/api/system/info` | Anonymous |
| POST | `/api/auth/login` | Anonymous |
| GET | `/api/auth/me` | Authenticated |
| GET, POST | `/api/users` | M |
| GET, PUT, DELETE | `/api/users/{id}` | M |
| GET | `/api/users/generated-password` | M |
| GET | `/api/groups`, `/api/groups/{id}` | E, teacher scope |
| POST | `/api/groups` | M |
| PUT, DELETE | `/api/groups/{id}` | M |
| POST, DELETE | `/api/groups/{groupId}/students/{studentId}` | M |
| GET, POST | `/api/subjects` | M |
| GET, PUT, DELETE | `/api/subjects/{id}` | M |
| GET, POST | `/api/teacher-subjects` | M |
| DELETE | `/api/teacher-subjects/{teacherId}/{subjectId}` | M |
| GET, POST | `/api/teacher-assignments` | M |
| PUT | `/api/teacher-assignments/groups/{groupId}/subjects/{subjectId}` | M |
| DELETE | `/api/teacher-assignments/{teacherId}/{subjectId}/{groupId}` | M |
| GET | `/api/admin/dashboard`, `/api/admin/dashboard/daily-results` | M |
| GET | `/api/teacher/subjects` | T |
| GET, POST | `/api/topics` | E, subject scope |
| PUT, DELETE | `/api/topics/{id}` | E, subject scope |
| GET | `/api/questions/by-topic/{topicId}` | E, subject scope |
| POST | `/api/questions` | E, subject scope |
| PUT, DELETE | `/api/questions/{id}` | E, subject scope |
| GET, POST | `/api/daily-lessons` | E; teacher list by creator, create by assignment |
| GET | `/api/group-journals/{groupId}` | E, group/subject scope |
| POST | `/api/group-journals/{groupId}/today-lessons` | E, exact group/subject for Teacher |
| PUT | `/api/group-journals/{groupId}/lessons/{lessonId}/topic` | E, scope gap below |
| GET | `/api/teacher/dashboard` | E |
| GET | `/api/teacher/dashboard/groups`, `/api/teacher/dashboard/daily-results` | T |

Development: `/openapi/v1.json`, `/swagger`, `/swagger/v1/swagger.json`. Swagger ва ASP.NET OpenAPI ду механизми schema мебошанд.

API enums string мебошанд; DateOnly барои lesson/dashboard, DateTimeOffset барои UTC window. DELETE-и successful 204; create одатан 201. Business failures ҳоло омехтаи null→400/404/[] мебошанд; DB exceptions ба generic 500 табдил меёбанд. Middleware `{title,status,traceId}` медиҳад, frontend танҳо `{message}` мехонад. Created Location-и баъзе resource-ҳо GET-by-id endpoint надорад.

## 11. Frontend ва нозукиҳои UX

- Navigation бо React state-и `activeView`, на URL router. Refresh саҳифаи дохилиро ба dashboard мебарад; deep link/back-forward-и browser кор намекунад.
- Brand-и воқеӣ сафед/хокистарӣ + бунафши `#8158f2`; login_banner.jpg ва UKStady_Logo.png мавҷуданд. Рангҳои ADEEB-ро худсарона татбиқ накунед.
- Sidebar танҳо `lg` ва калонтар; тугмаи mobile Menu handler надорад. Корбари телефон аз менюи асосӣ гузариш карда наметавонад.
- GroupsPage 1352 сатр: cards, student membership, subject journals, teacher assignment, edit, placeholder «дигар қисмҳо», modal-и topic ва teacher. Ин файли асосии workflow-и ҷорӣ аст.
- QuestionsPage 858 сатр: CRUD ва parser/import. Барои вазифаи маҳдуд тамоми файлро refactor накунед; parser-ро ҳангоми кори import ҷудо кардан мумкин аст.
- Pagination/search аксаран client-side; backend ҳамаи user/topic/question/group row-ҳоро бармегардонад. Group list ҳатто membership detail-ро мегирад.
- API base аз `VITE_API_BASE_URL`, fallback `http://localhost:5036`; env-и Vite ҳангоми build дохил мешавад. Иваз кардани env баъди build bundle-ро тағйир намедиҳад.
- Fetch cancellation/cache/401 auto-logout/refresh нест. Ҷавоби request-и кӯҳна баъди иваз кардани filter метавонад state-и навро overwrite кунад.
- Login ҳама non-2xx-ро «телефон ё парол нодуруст» менависад, ҳатто ҳангоми 500.
- Topic modal пас аз handleUpdateLessonTopic баста мешавад, ҳатто агар он error-ро catch карда бошад.
- Матнҳо асосан тоҷикӣ бо унсурҳои русӣ/англисӣ; i18n framework нест. Component-ҳои modal focus trap ва Escape management-и умумӣ надоранд.

## 12. Масъалаҳои афзалиятнок

Ҳамаи масъалаҳои зерин **таҳлили статикӣ** мебошанд, агар санҷиши runtime махсус гуфта нашуда бошад. Таъсири production бе дастрасӣ ба конфигуратсия/DB-и deployed тасдиқ нашудааст.

### P0 — пеш аз истифодаи воқеӣ

1. **Manager метавонад role-и privileged диҳад.** `AdministrationEndpoints.MapUserEndpoints` бо Managers policy; `AdministrationService.CreateUserAsync/UpdateUserAsync` request.Role-ро бевосита истифода мебаранд. Target-role/current-role hierarchy, self-escalation ва ҳифзи SuperAdmin нест. Regression: Manager барои create/update-и Admin/SuperAdmin бояд 403 гирад; account-и оддӣ иҷозат дошта бошад.
2. **JWT бе муҳлат ва demo access дар default deployment.** `Program.cs`, `JwtTokenGenerator.cs`, `JwtOptions.cs`, `appsettings*.json`, `UserConfiguration`, `LoginPage.tsx`. Deactivate ё role change token-и пешинаро бекор намекунад. Қиматҳои repo-ро ҳамчун production secrets истифода накунед; expiry/active-user validation/seed-и environment-specific лозим аст.

### P1 — дурустии scope ва маълумот

3. **Topic update scope нопурра аст.** `TeachingService.UpdateDailyLessonTopicAsync` CanUseSubject ва CanUseGroup-ро алоҳида месанҷад. Муаллими subject A ва гурӯҳи G бо subject B метавонад lesson-и A дар G-ро тағйир диҳад, гарчанде exact assignment надорад. Илова бар ин lesson-и shared байни чанд гурӯҳ пурра тағйир меёбад. Exact pair, ҳамаи гурӯҳҳои таъсиргирифта ва қоидаи past/started lesson лозим аст.
4. **Navigation-ҳои EF дар projection-и method load намешаванд.** `GetQuestionsAsync/GetQuestionDtoAsync` → `Select(question => ToQuestionDto(question))` бе Include Options; `GetDailyLessonsAsync` → `ToDailyLessonDto` бе Include Subject/Topic/TestAssignments. Бо DbContext-и нав эҳтимоли options=[] ва null reference барои lesson list вуҷуд дорад. Инро бо PostgreSQL/API integration test ва explicit DTO projection ё Include санҷед; тестҳои мавҷуд options content ва list lessons-ро намесанҷанд.
5. **Student model ба ClosedAnswer тайёр нест.** `StudentAnswer` танҳо QuestionOptionId-и ҳатмӣ дорад; барои ҷавоби навиштаи донишҷӯ text field нест. Snapshot/version-и саволҳо низ нест; update метавонад таърихи attempt ё FK-ҳоро вайрон кунад.
6. **Uniqueness/concurrency-и дарс ва assignment мувофиқ нест.** Group+subject teacher uniqueness, draft lesson concurrency ва teacher+topic+date collision; ҷузъиёти бахшҳои 3/7/9.
7. **Migration-и phone бо snapshot фарқ дорад.** NOT NULL enforce нашудааст; аз нав generate кардани migration танҳо аз snapshot метавонад ин фарқро набинад. Schema replay ва corrective migration-и explicit лозим мешавад.
8. **Validation ва status codes.** Unknown numeric enums, inactive references, request-и null collection, invalid FK ва duplicate unique names ба қоидаҳои равшан табдил дода нашудаанд. Баъзе request-ҳо ба generic 500 мерасанд. Student endpoint-и оянда ҳеҷ гоҳ IsCorrect-ро аз staff QuestionDto нагирад.

### P2 — мукаммалӣ ва UX

9. Partial import/teacher create; idempotency ва recovery-и UI нест.
10. NoGrade ҳамчун 0; average/history аз membership-и ҷорӣ вобаста; фан/муаллим иваз шавад дастрасии таърих тағйир меёбад.
11. Mobile menu, state-only navigation, dashboard-и Admin/Manager ва date timezone нопурраанд.
12. Bulk list queries ва journal-и бе server limit барои маълумоти калон гарон мешаванд; pagination/filter-ро дар server ҷойгир кардан лозим мешавад.

## 13. Чӣ ҳанӯз сохта нашудааст

- Student availability/start/resume/save/submit/history/personal gradebook endpoints ва UI.
- Random selection ва persist-и AttemptQuestion дар workflow; table ҳаст, algorithm нест.
- Scoring-и single-choice ва text answer; normalization, exact/partial credit ва Points weighting қарор надоранд.
- Expiration background job, auto-score-и attempt-и нотамом, Absent rows барои наоғозкардаҳо.
- Teacher grading queue, approve/override, audit write ва student score visibility пас аз approval.
- Server-enforced window дар student operations; 07:00 boundary/retry/concurrent submit tests.
- Production deployment automation, CI workflow, PostgreSQL-backed tests, health check-и DB. `/health` танҳо liveness-и умумӣ аст.

Chat/video/certificate/mobile app/complex analytics/proctoring берун аз MVP-и аслӣ мебошанд. Question import, ҳарчанд дар ҳуҷҷати аввал берун аз MVP навишта шудааст, ҳоло воқеан UI дорад.

## 14. Санҷишҳои ин таҳлил

| Санҷиш | Натиҷа |
| --- | --- |
| Clone ва муайян кардани main HEAD | Муваффақ; 131 tracked file дар baseline |
| Сохтани веткаи ҷудогона дар GitHub ва local | Муваффақ, аз SHA-и дақиқи baseline |
| `npm ci --no-audit --no-fund` дар Front | Муваффақ, 163 package |
| `npm run build` дар Front | Муваффақ: TypeScript + Vite production build |
| Build warning | Chunk тақрибан 505 kB; import-и mammoth ҷудо/dynamic аст, оптимизатсия мумкин |
| Backend build/test | Иҷро нашуд: дар муҳити таҳлил `dotnet`/SDK дастрас нест |
| PostgreSQL migrations/runtime | Иҷро нашуд; production DB истифода нашуд |
| Browser/manual E2E | Иҷро нашуд; build муваффақ будан маънои workflow-и санҷидашударо надорад |

20 `[Fact]` дар source ҳастанд, на 20 тесте ки дар ин session гузаштанд. API tests EF InMemory истифода мебаранд: relational constraints, PostgreSQL translation, migrations ва race condition-ҳоро тасдиқ намекунанд. `ManagerWorkflow...` бо SuperAdmin login иҷро мешавад, пас ҳуқуқи воқеии Manager-ро намесанҷад. «ImportedQuestions» тест POST-ҳои оддиро месанҷад, на DOCX parser. Dashboard grades дар тест бевосита seed мешаванд; натиҷаи student submit нестанд.

## 15. Runbook барои идомаи кор

Талабот: .NET 10 SDK, PostgreSQL-и local/test, Node/npm-и мувофиқи lockfile. Аввал env-ро танзим кунед; backend ҳангоми startup бо `Database:AutoMigrate=true` migration apply мекунад. AppDbContextFactory fallback-и local дорад; барои EF command аз `Back/src/Infrastructure` роҳҳои config муайянтаранд, connection-ро бо env explicit кунед.

```bash
git switch codex/ukstady-work-2026-09-17
git status --short --branch

cd Front
npm ci
npm run build
npm run dev
```

Дар terminal-и алоҳида, аз root-и repo ва баъди танзими `ConnectionStrings__DefaultConnection`, `Jwt__SigningKey`, `Jwt__ExpirationMinutes`, `BusinessTimeZone` ва CORS:

```bash
cd Back
dotnet restore UKStady.Back.slnx
dotnet build UKStady.Back.slnx --no-restore
dotnet test UKStady.Back.slnx --no-build
dotnet run --project src/API/UKStady.API.csproj
```

Local API `http://localhost:5036`; Vite default `5173`, метавонад ба порти дигар гузарад; CORS defaults танҳо `5173/5174`. Front env `VITE_API_BASE_URL` аст. AutoMigrate=false барои test/inspection-и бидуни migration муфид аст; credentials-и production-ро ба repo нанависед. Барои deploy domain/server/env-и воқеӣ ҳанӯз дар ин таҳлил муайян нашудааст.

## 16. Тартиби тавсияшавандаи кор

1. Regression tests ва fix-и privilege/scope/token; PostgreSQL-backed verification барои query ва migration gaps.
2. Қарори дақиқ барои ClosedAnswer/SingleChoice, snapshot-и савол, lifecycle-и draft lesson, question count ва таърихи membership. Ин қарорҳо аз user ё талаботи нав гирифта шаванд; таҳлил онҳоро тасдиқшуда намешуморад.
3. Student availability/start/resume + persisted questions, сипас save/submit/scoring; ҳамзамон UI-и test room.
4. Expiration/Absent ва grading/audit; баъд result visibility/history.
5. Mobile navigation, error recovery, pagination ва QA-и end-to-end; deployment config баъди маълум шудани муҳит.

## 17. Контекст барои task-и нав

Аввал `AGENTS.md`, `PROJECT_CONTEXT.md` ва ҳамин файлро хонед; `IMPLEMENTATION_PLAN.md` roadmap-и таърихӣ аст, checkmark-ҳои он далели ҳолати runtime нестанд. `PROJECT_CONTEXT.md` талаботро нигоҳ медорад; ин файл фарқи талабот ва implementation-ро нишон медиҳад. Ихтилофро бе қарори нав пинҳонӣ ҳал накунед.

Барои тағйироти оянда: дар веткаи корӣ кор кунед; diff-и main-ро пеш аз rebase/merge бинед; application service + endpoint + TypeScript contract + UI-и вобаста + тестро якҷо пайгирӣ кунед. Existing migrations-ро барои DB-и deployed аз нав нанависед; migration-и нав созед. Ҳар feature-и анҷомёфтаро дар контекст/нақша нав кунед. Тағйироти production, merge ба main ва ислоҳи business rules қисми худкори ин таҳлил набуданд.

Ин commit танҳо таҳлил ва ишораҳои контекстиро илова мекунад; business code ва migration-ҳоро тағйир намедиҳад.
