import { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { getStudentJournalDay } from '../services/api';
import type { StudentJournalDayDto } from '../types/admin';

export function StudentJournalPage() {
  const { auth } = useAuth();
  const [date, setDate] = useState(() => toDateValue(new Date()));
  const [journal, setJournal] = useState<StudentJournalDayDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) {
      return;
    }

    const token = auth.accessToken;
    let isCancelled = false;
    async function loadJournal() {
      setIsLoading(true);
      setError('');
      try {
        const result = await getStudentJournalDay(token, date);
        if (!isCancelled) {
          setJournal(result);
        }
      } catch (requestError) {
        if (!isCancelled) {
          setError(requestError instanceof Error ? requestError.message : 'Журнал гирифта нашуд.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadJournal();
    return () => {
      isCancelled = true;
    };
  }, [auth, date]);

  const rows = useMemo(() => journal?.subjects ?? [], [journal?.subjects]);
  const totalScoreRows = rows.filter((row) => row.score !== null);
  const averageScore = totalScoreRows.length === 0
    ? null
    : Math.round(totalScoreRows.reduce((sum, row) => sum + (row.score ?? 0), 0) / totalScoreRows.length);

  function moveDay(days: number) {
    setDate(addDays(date, days));
  }

  return (
    <section className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted sm:text-sm">Student</p>
          <h2 className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">Журнал</h2>
          <p className="mt-1 text-sm text-muted">Натиҷаи фанҳо барои рӯзи интихобшуда.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" className="h-10 px-3" onClick={() => moveDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="inline-flex h-10 min-w-[150px] items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink">
            <CalendarDays className="h-4 w-4 text-brand" />
            {formatDateLabel(date)}
          </div>
          <Button type="button" variant="secondary" className="h-10 px-3" onClick={() => moveDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-line bg-white p-5 text-sm text-muted">
          Журнал бор шуда истодааст...
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {!isLoading && !error ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-line bg-panel px-4 py-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold text-ink">{formatDateLabel(journal?.date ?? date)}</p>
              <p className="mt-1 text-xs text-muted">{rows.length} фан</p>
            </div>
            <span className="inline-flex h-9 items-center rounded-lg bg-white px-3 text-sm font-bold text-ink ring-1 ring-line">
              Миёна: {averageScore === null ? 'н' : averageScore}
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="p-6 text-sm text-muted">
              Барои ин рӯз маълумот нест.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {rows.map((row) => (
                <article key={`${row.groupId}-${row.subjectId}`} className="flex items-center justify-between gap-4 px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-ink">{row.subjectName}</h3>
                      <p className="truncate text-xs text-muted">{row.groupName}{row.topicTitle ? ` · ${row.topicTitle}` : ''}</p>
                    </div>
                  </div>
                  <span className={`inline-flex h-10 min-w-[62px] items-center justify-center rounded-lg border px-3 font-extrabold ${getScoreClassName(row.score)}`}>
                    {row.score === null ? 'н' : Math.round(row.score)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateValue(date);
}

function formatDateLabel(dateValue: string) {
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getScoreClassName(score: number | null) {
  if (score === null) {
    return 'border-slate-200 bg-slate-50 text-slate-500';
  }

  if (score >= 90) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (score >= 76) {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }

  if (score >= 55) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-red-200 bg-red-50 text-red-600';
}
