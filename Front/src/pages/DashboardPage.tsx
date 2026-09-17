import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '../components/Button';
import type { AppView } from '../components/AppShell';
import { Pagination, paginate } from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardDailyResults,
  getGroups,
  getTeacherDashboardDailyResults,
  getTeacherDashboardGroups,
} from '../services/api';
import type { DashboardDailyResultsDto, DashboardDailyResultsSort } from '../types/admin';

type DashboardGroupOption = { id: string; name: string; isActive?: boolean };

const sortOptions: Array<{ value: DashboardDailyResultsSort; label: string }> = [
  { value: 'scoreAsc', label: 'Хол: аз кам ба зиёд' },
  { value: 'scoreDesc', label: 'Хол: аз зиёд ба кам' },
];

export function DashboardPage({ onViewChange: _onViewChange }: { onViewChange: (view: AppView) => void }) {
  const { auth } = useAuth();
  const isTeacher = auth?.role === 'Teacher';
  const [groups, setGroups] = useState<DashboardGroupOption[]>([]);
  const [dailyResults, setDailyResults] = useState<DashboardDailyResultsDto | null>(null);
  const [date, setDate] = useState(() => getYesterdayDateValue());
  const [groupId, setGroupId] = useState('');
  const [sort, setSort] = useState<DashboardDailyResultsSort>('scoreAsc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState('');
  const canSeeDailyResults = auth?.role === 'SuperAdmin' || auth?.role === 'Admin' || auth?.role === 'Manager' || isTeacher;

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
    <section className="px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-muted">{isTeacher ? `Муаллим: ${auth?.fullName}` : `Нақш: ${auth?.role}`}</p>
          <h2 className="mt-1 text-2xl font-bold">{isTeacher ? 'Натиҷаҳои гурӯҳҳои ман' : 'Дашбоарди донишҷӯён'}</h2>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-line bg-white p-4">
        <div className="grid gap-3 xl:grid-cols-[1.2fr_220px_220px_230px] xl:items-end">
          <label className="block">
            <span className="text-sm font-semibold">Поиск</span>
            <div className="mt-2 flex h-11 items-center gap-3 rounded-lg border border-line bg-white px-3 focus-within:border-brand">
              <Search className="h-5 w-5 text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-full min-w-0 flex-1 outline-none"
                placeholder="Хонанда, телефон, фан, гурӯҳ..."
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Сана</span>
            <div className="mt-2 grid grid-cols-[40px_1fr_40px] gap-2">
              <Button type="button" variant="secondary" className="h-11 px-3" onClick={() => setDate(addDays(date, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <input
                type="date"
                value={date}
                max={maxDate}
                onChange={(event) => setDate(event.target.value || maxDate)}
                className="h-11 min-w-0 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-11 px-3"
                disabled={date >= maxDate}
                onClick={() => setDate(addDays(date, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Гурӯҳ</span>
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-brand"
            >
              <option value="">Ҳама</option>
              {groupOptions.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Сортировка</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as DashboardDailyResultsSort)}
              className="mt-2 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-brand"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="grid grid-cols-[1.2fr_110px_120px_1fr_1fr_130px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
          <span>Хонанда</span>
          <span>Хол</span>
          <span>Ҳолат</span>
          <span>Гурӯҳ / филиал</span>
          <span>Фан / мавзӯъ</span>
          <span>Дарс</span>
        </div>

        {isLoadingResults ? <p className="px-4 py-5 text-sm text-muted">Натиҷаҳо бор шуда истодаанд...</p> : null}
        {!isLoadingResults && resultsError ? <p className="px-4 py-5 text-sm text-red-600">{resultsError}</p> : null}
        {!isLoadingResults && !resultsError && pagedResults.items.length === 0 ? (
          <p className="px-4 py-5 text-sm text-muted">Барои ин филтр донишҷӯ ёфт нашуд.</p>
        ) : null}

        {pagedResults.items.map((result) => (
          <div key={`${result.dailyLessonId ?? 'no-lesson'}-${result.studentId}-${result.groupId}-${result.subjectId}`} className="grid grid-cols-[1.2fr_110px_120px_1fr_1fr_130px] items-center border-b border-line px-4 py-4 text-sm last:border-0">
            <div className="min-w-0">
              <p className="font-semibold">{result.studentName}</p>
              <p className="truncate text-muted">{result.phoneNumber}</p>
            </div>
            <span className={`w-fit rounded-md px-2 py-1 text-xs font-bold ${getScoreClassName(result.score)}`}>
              {result.score === null ? 'Бе хол' : `${result.score} хол`}
            </span>
            <span className="text-muted">{formatAttendanceStatus(result.attendanceStatus)}</span>
            <div className="min-w-0">
              <p className="font-semibold">{result.groupName}</p>
              <p className="truncate text-muted">{result.branch}</p>
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{result.subjectName}</p>
              <p className="truncate text-muted">{result.topicTitle ?? 'Мавзӯъ нест'}</p>
            </div>
            <span className="truncate text-muted">{result.lessonTitle ?? 'Дарс нест'}</span>
          </div>
        ))}
      </div>

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

  return 'Бе хол';
}
