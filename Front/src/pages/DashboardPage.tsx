import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock, Clock3, Lock, PlayCircle, Search, XCircle } from 'lucide-react';
import { Button } from '../components/Button';
import type { AppView } from '../components/AppShell';
import { Pagination, paginate } from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardDailyResults,
  getGroups,
  getStudentDashboard,
  getTeacherDashboardDailyResults,
  getTeacherDashboardGroups,
  checkStudentTestAnswer,
  saveStudentTestAnswer,
  startStudentTest,
  submitStudentTest,
} from '../services/api';
import type {
  DashboardDailyResultsDto,
  DashboardDailyResultsSort,
  StudentDashboardDto,
  StudentDashboardSubjectDto,
  StudentTestSessionDto,
  StudentTestSubmitResultDto,
} from '../types/admin';

type DashboardGroupOption = { id: string; name: string; isActive?: boolean };

const sortOptions: Array<{ value: DashboardDailyResultsSort; label: string }> = [
  { value: 'scoreAsc', label: 'Хол: аз кам ба зиёд' },
  { value: 'scoreDesc', label: 'Хол: аз зиёд ба кам' },
];

export function DashboardPage({ onViewChange: _onViewChange }: { onViewChange: (view: AppView) => void }) {
  const { auth } = useAuth();
  const isTeacher = auth?.role === 'Teacher';
  const isStudent = auth?.role === 'Student';
  const [groups, setGroups] = useState<DashboardGroupOption[]>([]);
  const [dailyResults, setDailyResults] = useState<DashboardDailyResultsDto | null>(null);
  const [studentDashboard, setStudentDashboard] = useState<StudentDashboardDto | null>(null);
  const [studentTestSession, setStudentTestSession] = useState<StudentTestSessionDto | null>(null);
  const [studentTestResult, setStudentTestResult] = useState<StudentTestSubmitResultDto | null>(null);
  const [date, setDate] = useState(() => getYesterdayDateValue());
  const [groupId, setGroupId] = useState('');
  const [sort, setSort] = useState<DashboardDailyResultsSort>('scoreAsc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isLoadingStudentDashboard, setIsLoadingStudentDashboard] = useState(false);
  const [resultsError, setResultsError] = useState('');
  const [studentTestError, setStudentTestError] = useState('');
  const [isStartingStudentTest, setIsStartingStudentTest] = useState(false);
  const [isSubmittingStudentTest, setIsSubmittingStudentTest] = useState(false);
  const canSeeDailyResults = auth?.role === 'SuperAdmin' || auth?.role === 'Admin' || auth?.role === 'Manager' || isTeacher;

  useEffect(() => {
    if (!auth || !isStudent) {
      return;
    }

    async function loadStudentDashboard() {
      if (!auth) {
        return;
      }

      setIsLoadingStudentDashboard(true);
      setResultsError('');
      try {
        setStudentDashboard(await getStudentDashboard(auth.accessToken));
      } catch (error) {
        setResultsError(error instanceof Error ? error.message : 'Маълумоти dashboard гирифта нашуд.');
      } finally {
        setIsLoadingStudentDashboard(false);
      }
    }

    void loadStudentDashboard();
  }, [auth, isStudent]);

  useEffect(() => {
    if (!auth || !canSeeDailyResults) {
      return;
    }

    async function loadFilters() {
      if (!auth) {
        return;
      }

      try {
        setGroups(await (isTeacher
          ? getTeacherDashboardGroups(auth.accessToken)
          : getGroups(auth.accessToken)));
      } catch (error) {
        setResultsError(error instanceof Error ? error.message : 'Филтрҳо гирифта нашуданд.');
      }
    }

    void loadFilters();
  }, [auth, canSeeDailyResults, isTeacher]);

  useEffect(() => {
    if (!auth || !canSeeDailyResults) {
      return;
    }

    async function loadResults() {
      if (!auth) {
        return;
      }

      setIsLoadingResults(true);
      setResultsError('');
      try {
        setDailyResults(await (isTeacher
          ? getTeacherDashboardDailyResults(auth.accessToken, { date, groupId, sort })
          : getDashboardDailyResults(auth.accessToken, { date, groupId, sort })));
      } catch (error) {
        setResultsError(error instanceof Error ? error.message : 'Натиҷаҳо гирифта нашуданд.');
      } finally {
        setIsLoadingResults(false);
      }
    }

    void loadResults();
  }, [auth, canSeeDailyResults, date, groupId, isTeacher, sort]);

  const groupOptions = useMemo(() => {
    return groups
      .filter((group) => group.isActive !== false)
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [groups]);

  const filteredResults = useMemo(() => {
    const value = search.trim().toLowerCase();
    const results = dailyResults?.results ?? [];
    if (!value) {
      return results;
    }

    return results.filter((result) =>
      [
        result.studentName,
        result.phoneNumber,
        result.groupName,
        result.branch,
        result.subjectName,
        result.topicTitle ?? '',
        result.lessonTitle ?? '',
      ].join(' ').toLowerCase().includes(value),
    );
  }, [dailyResults?.results, search]);

  useEffect(() => {
    setPage(1);
  }, [date, groupId, search, sort, dailyResults?.totalResults]);

  const pagedResults = paginate(filteredResults, page, 12);
  const maxDate = getYesterdayDateValue();

  if (isStudent) {
    if (studentTestSession) {
      return (
        <StudentTestRoomV2
          session={studentTestSession}
          result={studentTestResult}
          error={studentTestError}
          isSubmitting={isSubmittingStudentTest}
          onAnswer={async (questionId, questionOptionId, answerText) => {
            if (!auth) {
              return;
            }

            setStudentTestError('');
            const savedAnswer = await saveStudentTestAnswer(auth.accessToken, studentTestSession.attemptId, {
              questionId,
              questionOptionId,
              answerText,
            });
            setStudentTestSession((current) => current ? {
              ...current,
              questions: current.questions.map((question) => question.questionId === savedAnswer.questionId
                ? {
                    ...question,
                  selectedOptionId: savedAnswer.questionOptionId,
                  answerText: savedAnswer.answerText,
                  isChecked: savedAnswer.isChecked ?? question.isChecked,
                  isCorrect: savedAnswer.isCorrect ?? question.isCorrect,
                }
                : question),
            } : current);
          }}
          onCheck={async (questionId) => {
            if (!auth) {
              return;
            }

            setStudentTestError('');
            const checkedAnswer = await checkStudentTestAnswer(auth.accessToken, studentTestSession.attemptId, questionId);
            setStudentTestSession((current) => current ? {
              ...current,
              questions: current.questions.map((question) => question.questionId === checkedAnswer.questionId
                ? {
                    ...question,
                    selectedOptionId: checkedAnswer.questionOptionId,
                    answerText: checkedAnswer.answerText,
                    isChecked: checkedAnswer.isChecked ?? true,
                    isCorrect: checkedAnswer.isCorrect ?? false,
                  }
                : question),
            } : current);
          }}
          onSubmit={async () => {
            if (!auth) {
              return;
            }

            setIsSubmittingStudentTest(true);
            setStudentTestError('');
            try {
              setStudentTestResult(await submitStudentTest(auth.accessToken, studentTestSession.attemptId));
            } catch (error) {
              setStudentTestError(error instanceof Error ? error.message : 'Тест супорида нашуд.');
            } finally {
              setIsSubmittingStudentTest(false);
            }
          }}
          onBack={() => {
            setStudentTestSession(null);
            setStudentTestResult(null);
            setStudentTestError('');
            if (auth) {
              void getStudentDashboard(auth.accessToken).then(setStudentDashboard).catch(() => undefined);
            }
          }}
        />
      );
    }

    return (
      <StudentDashboardView
        fullName={auth?.fullName ?? ''}
        dashboard={studentDashboard}
        isLoading={isLoadingStudentDashboard}
        error={resultsError}
        isStarting={isStartingStudentTest}
        onStart={async (subject) => {
          if (!auth || !subject.dailyLessonId) {
            return;
          }

          setIsStartingStudentTest(true);
          setResultsError('');
          try {
            const session = await startStudentTest(auth.accessToken, subject.dailyLessonId, subject.groupId);
            setStudentTestResult(null);
            setStudentTestError('');
            setStudentTestSession(session);
          } catch (error) {
            setResultsError(error instanceof Error ? error.message : 'Тест оғоз нашуд.');
          } finally {
            setIsStartingStudentTest(false);
          }
        }}
      />
    );
  }

  if (!canSeeDailyResults) {
    return (
      <section className="px-4 py-6 lg:px-6">
        <div className="rounded-lg border border-line bg-white p-6">
          <p className="text-sm font-semibold text-muted">Хуш омадед</p>
          <h2 className="mt-1 text-2xl font-bold">{auth?.fullName}</h2>
        </div>
      </section>
    );
  }

  return (
    <section className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted sm:text-sm">
            {isTeacher ? `Муаллим: ${auth?.fullName}` : `Нақш: ${auth?.role}`}
          </p>
          <h2 className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">
            {isTeacher ? 'Натиҷаҳои гурӯҳҳои ман' : 'Дашбоарди донишҷӯён'}
          </h2>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-line bg-white p-3.5 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_220px_220px_230px] xl:items-end">
          <label className="block sm:col-span-2 xl:col-span-1">
            <span className="text-xs font-semibold text-muted sm:text-sm">Поиск</span>
            <div className="mt-1.5 flex h-10 items-center gap-2.5 rounded-lg border border-line bg-white px-3 focus-within:border-brand sm:h-11">
              <Search className="h-4 w-4 text-muted shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-full min-w-0 flex-1 text-sm outline-none placeholder:text-muted/70"
                placeholder="Хонанда, телефон, фан, гурӯҳ..."
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted sm:text-sm">Сана</span>
            <div className="mt-1.5 grid grid-cols-[38px_1fr_38px] gap-1.5 sm:grid-cols-[40px_1fr_40px] sm:gap-2">
              <Button type="button" variant="secondary" className="h-10 px-2 sm:h-11 sm:px-3" onClick={() => setDate(addDays(date, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <input
                type="date"
                value={date}
                max={maxDate}
                onChange={(event) => setDate(event.target.value || maxDate)}
                className="h-10 min-w-0 rounded-lg border border-line px-2 text-xs outline-none focus:border-brand sm:h-11 sm:px-3 sm:text-sm"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-10 px-2 sm:h-11 sm:px-3"
                disabled={date >= maxDate}
                onClick={() => setDate(addDays(date, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted sm:text-sm">Гурӯҳ</span>
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-line bg-white px-3 text-xs outline-none focus:border-brand sm:h-11 sm:text-sm"
            >
              <option value="">Ҳама гурӯҳҳо</option>
              {groupOptions.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2 xl:col-span-1">
            <span className="text-xs font-semibold text-muted sm:text-sm">Сортировка</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as DashboardDailyResultsSort)}
              className="mt-1.5 h-10 w-full rounded-lg border border-line bg-white px-3 text-xs outline-none focus:border-brand sm:h-11 sm:text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoadingResults ? (
        <div className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">
          Натиҷаҳо бор шуда истодаанд...
        </div>
      ) : null}

      {!isLoadingResults && resultsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {resultsError}
        </div>
      ) : null}

      {!isLoadingResults && !resultsError && pagedResults.items.length === 0 ? (
        <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
          Барои ин филтр донишҷӯ ёфт нашуд.
        </div>
      ) : null}

      {!isLoadingResults && !resultsError && pagedResults.items.length > 0 ? (
        <>
          {/* МОБИЛ КОРТҲО (Mobile Cards View < md) */}
          <div className="space-y-3 md:hidden">
            {pagedResults.items.map((result) => (
              <div
                key={`mobile-${result.dailyLessonId ?? 'no-lesson'}-${result.studentId}-${result.groupId}-${result.subjectId}`}
                className="rounded-xl border border-line bg-white p-3.5 shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{result.studentName}</p>
                    <p className="truncate font-mono text-xs text-muted">{result.phoneNumber}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${getScoreClassName(result.score)}`}>
                    {result.score === null ? 'н' : `${result.score} хол`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2 text-xs text-muted">
                  <span className="rounded-md bg-panel px-2 py-0.5 font-medium text-ink">
                    {result.groupName} ({result.branch})
                  </span>
                  <span className="rounded-md bg-indigo-50 font-medium text-indigo-700 px-2 py-0.5">
                    {result.subjectName}
                  </span>
                  {result.topicTitle ? (
                    <span className="max-w-[160px] truncate rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                      {result.topicTitle}
                    </span>
                  ) : null}
                  <span className="ml-auto text-[11px] font-semibold text-muted">
                    {formatAttendanceStatus(result.attendanceStatus)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* ҶАДВАЛИ ПЛАНШЕТ ВА КОМПЮТЕР (Desktop Table >= md) */}
          <div className="hidden overflow-hidden rounded-xl border border-line bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[1.2fr_110px_120px_1fr_1fr_130px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
                  <span>Хонанда</span>
                  <span>Хол</span>
                  <span>Ҳолат</span>
                  <span>Гурӯҳ / филиал</span>
                  <span>Фан / мавзӯъ</span>
                  <span>Дарс</span>
                </div>

                {pagedResults.items.map((result) => (
                  <div
                    key={`desktop-${result.dailyLessonId ?? 'no-lesson'}-${result.studentId}-${result.groupId}-${result.subjectId}`}
                    className="grid grid-cols-[1.2fr_110px_120px_1fr_1fr_130px] items-center border-b border-line px-4 py-3.5 text-sm last:border-0 hover:bg-panel/30"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-ink truncate">{result.studentName}</p>
                      <p className="truncate font-mono text-xs text-muted">{result.phoneNumber}</p>
                    </div>
                    <span className={`w-fit rounded-lg px-2.5 py-1 text-xs font-bold ${getScoreClassName(result.score)}`}>
                      {result.score === null ? 'н' : `${result.score} хол`}
                    </span>
                    <span className="text-xs text-muted">{formatAttendanceStatus(result.attendanceStatus)}</span>
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-ink truncate">{result.groupName}</p>
                      <p className="truncate text-xs text-muted">{result.branch}</p>
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-ink truncate">{result.subjectName}</p>
                      <p className="truncate text-xs text-muted">{result.topicTitle ?? 'Мавзӯъ нест'}</p>
                    </div>
                    <span className="truncate text-xs text-muted">{result.lessonTitle ?? 'Дарс нест'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-4">
        <Pagination
          page={pagedResults.page}
          pageCount={pagedResults.pageCount}
          total={filteredResults.length}
          from={pagedResults.from}
          to={pagedResults.to}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
}

function StudentDashboardView({
  fullName,
  dashboard,
  isLoading,
  error,
  isStarting,
  onStart,
}: {
  fullName: string;
  dashboard: StudentDashboardDto | null;
  isLoading: boolean;
  error: string;
  isStarting: boolean;
  onStart: (subject: StudentDashboardSubjectDto) => Promise<void>;
}) {
  const subjects = dashboard?.subjects ?? [];

  return (
    <section className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted sm:text-sm">Student</p>
          <h2 className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">Салом, {fullName}</h2>
          <p className="mt-1 text-sm text-muted">Фанҳо ва тестҳои дастрас барои имрӯз.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-line bg-white p-6 text-sm text-muted">
          Dashboard бор шуда истодааст...
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && subjects.length === 0 ? (
        <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
          Ҳоло барои шумо фан пайваст нашудааст.
        </div>
      ) : null}

      {!isLoading && !error && subjects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <StudentSubjectCard
              key={`${subject.groupId}-${subject.subjectId}`}
              subject={subject}
              isStarting={isStarting}
              onStart={onStart}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StudentSubjectCard({
  subject,
  isStarting,
  onStart,
}: {
  subject: StudentDashboardSubjectDto;
  isStarting: boolean;
  onStart: (subject: StudentDashboardSubjectDto) => Promise<void>;
}) {
  const Icon = subject.canStart ? PlayCircle : subject.status === 'Completed' ? CheckCircle2 : Lock;

  return (
    <article className="rounded-xl border border-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-lg bg-brand/10 text-brand">
            <BookOpen className="h-5 w-5" />
          </div>
          <h3 className="truncate text-lg font-bold text-ink">{subject.subjectName}</h3>
        </div>
        <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${getStudentTestStatusClassName(subject.status)}`}>
          {getStudentTestStatusLabel(subject.status)}
        </span>
      </div>

      <div className="mt-4 space-y-2 rounded-lg border border-line bg-panel/40 p-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Мавзӯъ</span>
          <span className="min-w-0 truncate font-semibold text-ink">{subject.topicTitle ?? 'Ҳанӯз нест'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Саволҳо</span>
          <span className="font-semibold text-ink">{subject.questionCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-muted">
            <Clock3 className="h-4 w-4" />
            Вақт
          </span>
          <span className="text-right text-xs font-semibold text-ink">
            {formatStudentTestWindow(subject.opensAtUtc, subject.closesAtUtc)}
          </span>
        </div>
      </div>

      <p className="mt-3 min-h-10 text-sm text-muted">{subject.statusText}</p>

      <Button
        type="button"
        className="mt-4 w-full justify-center"
        disabled={!subject.canStart || isStarting}
        onClick={() => {
          void onStart(subject);
        }}
      >
        <Icon className="h-4 w-4" />
        {subject.canStart ? (subject.status === 'InProgress' ? 'Идома додани тест' : 'Супоридани тест') : 'Тест баста аст'}
      </Button>
    </article>
  );
}

const QUESTION_TIME_LIMIT = 30;

function StudentTestRoomV2({
  session,
  result,
  error,
  isSubmitting,
  onAnswer,
  onCheck,
  onSubmit,
  onBack,
}: {
  session: StudentTestSessionDto;
  result: StudentTestSubmitResultDto | null;
  error: string;
  isSubmitting: boolean;
  onAnswer: (questionId: string, questionOptionId: string | null, answerText: string | null) => Promise<void>;
  onCheck: (questionId: string) => Promise<void>;
  onSubmit: () => Promise<void>;
  onBack: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savingQuestionId, setSavingQuestionId] = useState('');
  const [checkingQuestionId, setCheckingQuestionId] = useState('');
  const [answerError, setAnswerError] = useState('');
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(session.questions.map((question) => [question.questionId, question.answerText ?? ''])),
  );
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [isExpiring, setIsExpiring] = useState(false);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = session.questions[currentIndex] ?? session.questions[0];
  const answeredCount = session.questions.filter((question) =>
    question.type === 'SingleChoice' ? Boolean(question.selectedOptionId) : Boolean(question.answerText?.trim()),
  ).length;
  const checkedCount = session.questions.filter((question) => question.isChecked).length;
  const canSubmit = checkedCount === session.questions.length && !result;
  const progressPercent = session.questions.length === 0 ? 0 : Math.round(((currentIndex + 1) / session.questions.length) * 100);

  // Synchronize timer when question changes or checked status updates
  useEffect(() => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (currentQuestion?.isChecked) {
      setTimeLeft(0);
    } else {
      setTimeLeft(QUESTION_TIME_LIMIT);
    }
  }, [currentIndex, currentQuestion?.questionId, currentQuestion?.isChecked]);

  // Countdown timer for active, unchecked question
  useEffect(() => {
    if (result || isSubmitting || !currentQuestion || currentQuestion.isChecked || isExpiring) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, currentQuestion?.questionId, currentQuestion?.isChecked, result, isSubmitting, isExpiring]);

  // Handle expiration when 30 seconds run out without solving
  useEffect(() => {
    if (timeLeft === 0 && currentQuestion && !currentQuestion.isChecked && !result && !isExpiring && !checkingQuestionId) {
      void handleQuestionExpired();
    }
  }, [timeLeft, currentQuestion?.questionId, currentQuestion?.isChecked, result, isExpiring, checkingQuestionId]);

  async function handleQuestionExpired() {
    if (!currentQuestion || currentQuestion.isChecked || isExpiring) {
      return;
    }

    setIsExpiring(true);
    setAnswerError('');
    try {
      if (currentQuestion.selectedOptionId) {
        await onAnswer(currentQuestion.questionId, null, null);
      }
      await onCheck(currentQuestion.questionId);
    } catch (err) {
      console.error('Failed to expire question:', err);
    } finally {
      setIsExpiring(false);
      if (currentIndex < session.questions.length - 1) {
        goToQuestion(currentIndex + 1);
      } else {
        void onSubmit();
      }
    }
  }

  async function saveAnswer(questionId: string, questionOptionId: string | null, answerText: string | null) {
    setSavingQuestionId(questionId);
    setAnswerError('');
    try {
      await onAnswer(questionId, questionOptionId, answerText);
    } catch (error) {
      setAnswerError(error instanceof Error ? error.message : 'Ҷавоб сабт нашуд.');
    } finally {
      setSavingQuestionId('');
    }
  }

  function goToQuestion(index: number) {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    setCurrentIndex(Math.min(Math.max(index, 0), session.questions.length - 1));
    setAnswerError('');
  }

  async function checkCurrentQuestion() {
    if (!currentQuestion || currentQuestion.isChecked || isExpiring) {
      return;
    }

    const answerText = draftAnswers[currentQuestion.questionId] ?? '';
    if (currentQuestion.type !== 'SingleChoice' && answerText.trim() !== currentQuestion.answerText?.trim()) {
      await saveAnswer(currentQuestion.questionId, null, answerText);
    }

    setCheckingQuestionId(currentQuestion.questionId);
    setAnswerError('');
    try {
      await onCheck(currentQuestion.questionId);
      // Auto-advance after 1.2s so student sees feedback
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
      advanceTimeoutRef.current = setTimeout(() => {
        if (currentIndex < session.questions.length - 1) {
          goToQuestion(currentIndex + 1);
        } else {
          void onSubmit();
        }
      }, 1200);
    } catch (error) {
      setAnswerError(error instanceof Error ? error.message : 'Савол санҷида нашуд.');
    } finally {
      setCheckingQuestionId('');
    }
  }

  return (
    <section className="min-h-[calc(100vh-88px)] bg-[#f5f7fb] px-3 py-4 sm:px-4 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_310px]">
        <div className="min-w-0 space-y-3">
          <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-muted">Савол {currentIndex + 1} аз {session.questions.length}</p>
                <div className="mt-3 h-1.5 w-44 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
              <span className="rounded-lg bg-brand/10 px-4 py-2 text-sm font-extrabold text-brand">
                {checkedCount}/{session.questions.length} санҷида шуд
              </span>
            </div>
          </div>

          {error || answerError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error || answerError}
            </div>
          ) : null}

          {currentQuestion ? (
            <article className="rounded-lg border border-line bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-brand">Савол {currentIndex + 1}</p>
                  <span className="rounded-md bg-panel px-2 py-1 text-xs font-bold text-muted">
                    {currentQuestion.type === 'SingleChoice' ? 'Интихобӣ' : 'Пӯшида'}
                  </span>
                </div>

                {/* 30-Second Countdown Timer Badge */}
                <div
                  className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 shadow-sm transition-all duration-300 ${
                    currentQuestion.isChecked
                      ? 'border-slate-200 bg-slate-100 text-slate-500'
                      : isExpiring
                        ? 'border-red-400 bg-red-100 text-red-700 animate-pulse ring-2 ring-red-300'
                        : timeLeft <= 5
                          ? 'border-red-400 bg-red-50 text-red-600 animate-pulse ring-2 ring-red-300'
                          : timeLeft <= 10
                            ? 'border-amber-400 bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                            : 'border-brand/30 bg-brand/5 text-brand'
                  }`}
                >
                  {currentQuestion.isChecked ? (
                    <Lock className="h-4 w-4 shrink-0" />
                  ) : (
                    <Clock className={`h-4 w-4 shrink-0 ${timeLeft <= 5 ? 'animate-bounce' : ''}`} />
                  )}
                  <span className="font-mono text-base font-extrabold tracking-wider">
                    {currentQuestion.isChecked ? 'Маҳкам' : `00:${timeLeft < 10 ? `0${timeLeft}` : timeLeft}`}
                  </span>
                  {!currentQuestion.isChecked ? (
                    <span className={`text-xs font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-muted'}`}>
                      {timeLeft <= 5 ? 'Шитобед!' : 'сония'}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Countdown Progress Bar */}
              {!currentQuestion.isChecked && (
                <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear ${
                      timeLeft <= 5
                        ? 'bg-red-500'
                        : timeLeft <= 10
                          ? 'bg-amber-500'
                          : 'bg-brand'
                    }`}
                    style={{ width: `${(timeLeft / QUESTION_TIME_LIMIT) * 100}%` }}
                  />
                </div>
              )}

              <h2 className="text-xl font-extrabold leading-8 text-ink sm:text-2xl">
                {currentQuestion.text}
              </h2>

              {currentQuestion.type === 'SingleChoice' ? (
                <div className="mt-8 grid gap-3">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const selected = currentQuestion.selectedOptionId === option.id;
                    const locked = Boolean(result) || currentQuestion.isChecked || savingQuestionId === currentQuestion.questionId || isExpiring;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          void saveAnswer(currentQuestion.questionId, option.id, null);
                        }}
                        className={`flex min-h-16 items-center gap-4 rounded-lg border px-4 text-left text-base font-bold transition ${
                          selected
                            ? 'border-brand bg-brand/10 text-ink ring-1 ring-brand'
                            : 'border-line bg-white text-ink hover:border-brand/60 hover:bg-brand/5'
                        } disabled:cursor-not-allowed disabled:opacity-70`}
                      >
                        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                          selected ? 'border-brand bg-brand text-white' : 'border-slate-400 bg-white'
                        }`}>
                          {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
                        </span>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-panel text-sm font-extrabold text-ink">
                          {['А', 'Б', 'В', 'Г'][optionIndex] ?? optionIndex + 1}
                        </span>
                        <span>{option.text}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-8">
                  <textarea
                    value={draftAnswers[currentQuestion.questionId] ?? ''}
                    disabled={Boolean(result) || currentQuestion.isChecked || isExpiring}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDraftAnswers((current) => ({
                        ...current,
                        [currentQuestion.questionId]: value,
                      }));
                    }}
                    className="min-h-40 w-full rounded-lg border border-line bg-white p-4 text-base font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10 disabled:bg-panel"
                    placeholder="Ҷавоби худро нависед..."
                  />
                  <div className="mt-4 hidden justify-end">
                    <Button
                      type="button"
                      disabled={Boolean(result) || savingQuestionId === currentQuestion.questionId || isExpiring || !(draftAnswers[currentQuestion.questionId] ?? '').trim()}
                      onClick={() => {
                        void checkCurrentQuestion();
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {savingQuestionId === currentQuestion.questionId ? 'Равон шуда истодааст...' : 'Равон кардан'}
                    </Button>
                  </div>
                </div>
              )}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-h-6 text-sm font-semibold">
                  {currentQuestion.isChecked ? (
                    <div className="flex items-center gap-2">
                      {currentQuestion.isCorrect ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Ҷавоб дуруст аст (+1 хол)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 font-bold text-red-600">
                          <XCircle className="h-4 w-4 text-red-500" />
                          {currentQuestion.selectedOptionId || (draftAnswers[currentQuestion.questionId] ?? '').trim()
                            ? 'Ҷавоб хато аст (0 хол)'
                            : 'Вақт тамом шуд! Савол маҳкам шуд (0 хол)'}
                        </span>
                      )}
                    </div>
                  ) : isExpiring ? (
                    <span className="font-bold text-red-600">Вақт тамом шуд! Савол маҳкам шуда истодааст...</span>
                  ) : (
                    <span className="text-muted">Ҳар як савол 30 сония вақт дорад. Пас аз интихоб «Санҷиш»-ро зер кунед.</span>
                  )}
                </div>
                <Button
                  type="button"
                  disabled={
                    Boolean(result) ||
                    currentQuestion.isChecked ||
                    checkingQuestionId === currentQuestion.questionId ||
                    savingQuestionId === currentQuestion.questionId ||
                    isExpiring ||
                    (currentQuestion.type === 'SingleChoice'
                      ? !currentQuestion.selectedOptionId
                      : !(draftAnswers[currentQuestion.questionId] ?? '').trim())
                  }
                  onClick={() => {
                    void checkCurrentQuestion();
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {checkingQuestionId === currentQuestion.questionId ? 'Санҷида истодааст...' : 'Санҷиш'}
                </Button>
              </div>
            </article>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={currentIndex === 0 || isExpiring}
              onClick={() => goToQuestion(currentIndex - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Саволи пешина
            </Button>
            <Button
              type="button"
              disabled={currentIndex >= session.questions.length - 1 || !currentQuestion?.isChecked || isExpiring}
              onClick={() => goToQuestion(currentIndex + 1)}
            >
              Саволи баъдӣ
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <aside className="rounded-lg border border-line bg-white p-5 shadow-soft xl:sticky xl:top-4 xl:h-fit">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-xl font-extrabold text-ink">Саволҳо</h3>
            <span className="font-bold text-muted">{answeredCount}/{session.questions.length}</span>
          </div>
          <p className="text-sm font-bold text-brand">Рӯйхати саволҳо</p>
          <p className="mt-1 text-sm text-muted">{currentIndex + 1}/{session.questions.length}</p>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {session.questions.map((question, index) => {
              const active = index === currentIndex;
              const isFuture = index > currentIndex && !question.isChecked;
              return (
                <button
                  key={question.questionId}
                  type="button"
                  disabled={isFuture || isExpiring || Boolean(result)}
                  onClick={() => goToQuestion(index)}
                  className={`h-12 rounded-lg border text-base font-bold transition ${
                    active
                      ? 'border-brand bg-brand text-white shadow-sm ring-2 ring-brand/20'
                      : question.isChecked && question.isCorrect
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : question.isChecked && question.isCorrect === false
                          ? 'border-red-200 bg-red-50 text-red-600'
                          : isFuture
                            ? 'border-line bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'border-line bg-white text-slate-600 hover:border-brand/50'
                  }`}
                  title={
                    isFuture
                      ? 'Саволи оянда (дастрас нест)'
                      : question.isChecked
                        ? question.isCorrect ? 'Дуруст (+1)' : 'Хато (0)'
                        : 'Саволи ҷорӣ'
                  }
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm font-bold text-muted">
            <p>Ҷавобшуда: {answeredCount}</p>
            <p>Санҷида: {checkedCount}</p>
          </div>

          <Button
            type="button"
            className="mt-6 w-full justify-center"
            disabled={!canSubmit || isSubmitting}
            onClick={() => {
              void onSubmit();
            }}
          >
            {isSubmitting ? 'Анҷом дода мешавад...' : 'Анҷом додан'}
          </Button>
        </aside>
      </div>

      {result ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-bold uppercase tracking-wide text-muted">Натиҷаи тест</p>
            <h3 className="mt-2 text-4xl font-extrabold text-ink">{result.score} хол</h3>
            <p className="mt-2 text-sm text-muted">
              Ҷавобҳои дуруст: <span className="font-bold text-ink">{result.correctAnswers}</span> аз <span className="font-bold text-ink">{result.totalQuestions}</span>
            </p>
            <div className="mt-5 rounded-xl border border-line bg-panel p-3 text-sm text-muted">
              Натиҷа ба журнали шумо сабт шуд.
            </div>
            <Button type="button" className="mt-5 w-full justify-center" onClick={onBack}>
              Бозгашт ба саҳифаи асосӣ
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StudentTestRoom({
  session,
  result,
  error,
  isSubmitting,
  onAnswer,
  onSubmit,
  onBack,
}: {
  session: StudentTestSessionDto;
  result: StudentTestSubmitResultDto | null;
  error: string;
  isSubmitting: boolean;
  onAnswer: (questionId: string, questionOptionId: string | null, answerText: string | null) => Promise<void>;
  onSubmit: () => Promise<void>;
  onBack: () => void;
}) {
  const [savingQuestionId, setSavingQuestionId] = useState('');
  const [answerError, setAnswerError] = useState('');
  const answeredCount = session.questions.filter((question) =>
    question.type === 'SingleChoice' ? Boolean(question.selectedOptionId) : Boolean(question.answerText?.trim()),
  ).length;
  const canSubmit = answeredCount === session.questions.length && !result;

  async function saveAnswer(questionId: string, questionOptionId: string | null, answerText: string | null) {
    setSavingQuestionId(questionId);
    setAnswerError('');
    try {
      await onAnswer(questionId, questionOptionId, answerText);
    } catch (error) {
      setAnswerError(error instanceof Error ? error.message : 'Ҷавоб сабт нашуд.');
    } finally {
      setSavingQuestionId('');
    }
  }

  return (
    <section className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Тест</p>
          <h2 className="mt-1 text-2xl font-bold text-ink">{session.subjectName}</h2>
          <p className="mt-1 text-sm text-muted">{session.groupName} · {session.topicTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
            {answeredCount} / {session.questions.length} ҷавоб
          </span>
          <Button type="button" variant="secondary" onClick={onBack}>Ба саҳифаи асосӣ</Button>
        </div>
      </div>

      {error || answerError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error || answerError}
        </div>
      ) : null}

      {result ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-700">Тест супорида шуд</p>
          <h3 className="mt-1 text-3xl font-bold text-emerald-900">{result.score} хол</h3>
          <p className="mt-1 text-sm text-emerald-700">
            Ҷавобҳои дуруст: {result.correctAnswers} аз {result.totalQuestions}
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {session.questions.map((question) => (
          <article key={question.questionId} className="rounded-xl border border-line bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Савол {question.sortOrder}</p>
                <h3 className="mt-2 text-base font-semibold leading-7 text-ink">{question.text}</h3>
              </div>
              {savingQuestionId === question.questionId ? (
                <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">Сабт...</span>
              ) : null}
            </div>

            {question.type === 'SingleChoice' ? (
              <div className="mt-4 grid gap-2">
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={Boolean(result)}
                    onClick={() => {
                      void saveAnswer(question.questionId, option.id, null);
                    }}
                    className={`rounded-lg border px-3 py-3 text-left text-sm font-semibold transition ${
                      question.selectedOptionId === option.id
                        ? 'border-brand bg-brand/10 text-brand'
                        : 'border-line bg-white text-ink hover:border-brand/50'
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                defaultValue={question.answerText ?? ''}
                disabled={Boolean(result)}
                onBlur={(event) => {
                  void saveAnswer(question.questionId, null, event.target.value);
                }}
                className="mt-4 min-h-28 w-full rounded-lg border border-line p-3 text-sm outline-none focus:border-brand disabled:bg-panel"
                placeholder="Ҷавоби худро ворид кунед..."
              />
            )}
          </article>
        ))}
      </div>

      <div className="sticky bottom-0 mt-5 border-t border-line bg-white/95 py-3 backdrop-blur">
        <div className="flex flex-col justify-end gap-2 sm:flex-row sm:items-center">
          <p className="text-sm text-muted sm:mr-auto">Натиҷа танҳо баъди пахши тугмаи супоридан нишон дода мешавад.</p>
          <Button
            type="button"
            disabled={!canSubmit || isSubmitting}
            onClick={() => {
              void onSubmit();
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? 'Супорида мешавад...' : 'Супоридани тест'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function getYesterdayDateValue() {
  return addDays(toDateValue(new Date()), -1);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateValue(date);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStudentTestStatusLabel(status: string) {
  switch (status) {
    case 'Available':
      return 'Кушода';
    case 'InProgress':
      return 'Идома';
    case 'Completed':
      return 'Супорида шуд';
    case 'Expired':
      return 'Гузашта';
    case 'NotOpenYet':
      return 'Ҳоло не';
    case 'Closed':
      return 'Гузашт';
    case 'NotReady':
    case 'MissingTopic':
      return 'Омода нест';
    default:
      return 'Нест';
  }
}

function getStudentTestStatusClassName(status: string) {
  switch (status) {
    case 'Available':
      return 'bg-emerald-50 text-emerald-700';
    case 'InProgress':
      return 'bg-indigo-50 text-indigo-700';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-700';
    case 'Expired':
      return 'bg-red-50 text-red-700';
    case 'NotOpenYet':
      return 'bg-sky-50 text-sky-700';
    case 'Closed':
      return 'bg-slate-100 text-slate-600';
    case 'NotReady':
    case 'MissingTopic':
      return 'bg-amber-50 text-amber-700';
    default:
      return 'bg-slate-50 text-slate-600';
  }
}

function formatStudentTestWindow(opensAtUtc: string | null, closesAtUtc: string | null) {
  if (!opensAtUtc || !closesAtUtc) {
    return 'Нест';
  }

  const opensAt = new Date(opensAtUtc);
  const closesAt = new Date(closesAtUtc);
  return `${formatTime(opensAt)} - ${formatTime(closesAt)}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getScoreClassName(score: number | null) {
  if (score === null) {
    return 'bg-slate-50 text-slate-600';
  }

  if (score < 50) {
    return 'bg-red-50 text-red-700';
  }

  if (score < 80) {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-emerald-50 text-emerald-700';
}

function formatAttendanceStatus(status: string) {
  if (status === 'Present') {
    return 'Иштирок';
  }

  if (status === 'Absent') {
    return 'Ғоиб';
  }

  return 'н';
}
