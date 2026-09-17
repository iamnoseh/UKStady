import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Plus, Search, UserRoundPlus, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination, paginate } from '../components/Pagination';
import { SearchableSelect } from '../components/SearchableSelect';
import {
  assignTeacherSubject,
  createUser,
  generatePassword,
  getSubjects,
  getTeacherSubjects,
  getUsers,
} from '../services/api';
import type { SubjectDto, TeacherSubjectAssignmentDto, UserDto } from '../types/admin';
import { useAuth } from '../context/AuthContext';

export function TeachersPage() {
  const { auth } = useAuth();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [assignments, setAssignments] = useState<TeacherSubjectAssignmentDto[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    if (!auth) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const [loadedUsers, loadedSubjects, loadedAssignments] = await Promise.all([
        getUsers(auth.accessToken),
        getSubjects(auth.accessToken),
        getTeacherSubjects(auth.accessToken),
      ]);
      setUsers(loadedUsers);
      setSubjects(loadedSubjects);
      setAssignments(loadedAssignments);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Маълумоти муаллимон гирифта нашуданд.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGeneratePassword() {
    if (!auth) {
      return;
    }

    setIsGenerating(true);
    setError('');
    try {
      const result = await generatePassword(auth.accessToken);
      setPassword(result.password);
      setNotice('Парол генератсия шуд. Агар розӣ бошед, муаллимро созед.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Парол генератсия нашуд.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      return;
    }

    if (!subjectId) {
      setError('Лутфан, фанни дарсиро интихоб кунед.');
      return;
    }

    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim() || !password.trim()) {
      setError('Лутфан, ҳамаи майдонҳоро пур кунед.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      const teacher = await createUser(auth.accessToken, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: null,
        phoneNumber: phoneNumber.trim(),
        password: password.trim(),
        role: 'Teacher',
      });
      const assignment = await assignTeacherSubject(auth.accessToken, {
        teacherId: teacher.id,
        subjectId,
      });

      setUsers((current) => [teacher, ...current]);
      setAssignments((current) => [assignment, ...current]);
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setPassword('');
      setSubjectId('');
      setNotice('Муаллим сохта шуд ва ба фан пайваст гардид.');
      setIsFormOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Муаллим сохта нашуд.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyPassword() {
    if (!password) {
      return;
    }

    await navigator.clipboard.writeText(password);
    setNotice('Парол нусха шуд.');
  }

  const subjectByTeacherId = useMemo(() => {
    return assignments.reduce<Record<string, string[]>>((map, assignment) => {
      map[assignment.teacherId] = [...(map[assignment.teacherId] ?? []), assignment.subjectName];
      return map;
    }, {});
  }, [assignments]);

  const teachers = useMemo(() => users.filter((user) => user.role === 'Teacher'), [users]);
  const filteredTeachers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return teachers;
    }

    return teachers.filter((teacher) =>
      `${teacher.firstName} ${teacher.lastName} ${teacher.phoneNumber} ${(subjectByTeacherId[teacher.id] ?? []).join(' ')}`
        .toLowerCase()
        .includes(value),
    );
  }, [query, subjectByTeacherId, teachers]);
  const subjectOptions = useMemo(
    () => subjects.filter((subject) => subject.isActive).map((subject) => ({ value: subject.id, label: subject.name })),
    [subjects],
  );
  const pagedTeachers = paginate(filteredTeachers, page, 8);

  useEffect(() => {
    setPage(1);
  }, [query, teachers.length]);

  return (
    <section className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted sm:text-sm">Administrator</p>
          <h2 className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">Муаллимон</h2>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-line bg-white px-3 focus-within:border-brand sm:h-11 xl:w-[320px]">
            <Search className="h-4 w-4 text-muted shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-full flex-1 text-sm outline-none placeholder:text-muted/70"
              placeholder="Ҷустуҷӯи муаллим..."
            />
          </div>
          <Button
            type="button"
            onClick={() => setIsFormOpen((prev) => !prev)}
            className="h-10 px-3.5 text-sm xl:hidden"
          >
            {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{isFormOpen ? 'Пӯшидан' : 'Муаллими нав'}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        {/* ФОРМАИ ЭҶОД (Ҳамеша дар Desktop, кушодашаванда дар Mobile) */}
        <form
          onSubmit={handleSubmit}
          className={`rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5 ${
            isFormOpen ? 'block' : 'hidden xl:block'
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
                <UserRoundPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-ink">Муаллими нав</h3>
                <p className="text-xs text-muted">Login рақами телефон мешавад.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted xl:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-muted">Ном</span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                placeholder="Саид"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-muted">Насаб</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                placeholder="Саидов"
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="text-xs font-semibold text-muted">Рақами телефон</span>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
              placeholder="+992..."
            />
          </label>

          <div className="mt-3">
            <SearchableSelect
              label="Фанни дарсӣ"
              value={subjectId}
              options={subjectOptions}
              placeholder="Ҷустуҷӯ ва интихоби фан"
              emptyText="Фан ёфт нашуд."
              onChange={setSubjectId}
            />
          </div>

          <div className="mt-3">
            <span className="text-xs font-semibold text-muted">Парол</span>
            <div className="mt-1 flex gap-2">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 font-mono text-sm outline-none focus:border-brand"
                placeholder="12345A"
              />
              <Button type="button" variant="secondary" className="h-10 px-3" onClick={handleGeneratePassword} disabled={isGenerating}>
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" className="h-10 px-3" onClick={handleCopyPassword} disabled={!password}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted">Қоида: 5 рақам ва 1 ҳарфи англисӣ.</p>
          </div>

          {notice ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

          <Button
            type="submit"
            className="mt-4 w-full h-11"
            disabled={
              isSubmitting ||
              !firstName.trim() ||
              !lastName.trim() ||
              !phoneNumber.trim() ||
              !password.trim() ||
              !subjectId
            }
          >
            <Plus className="h-4 w-4" />
            {isSubmitting ? 'Сохта истодааст...' : 'Сохтани муаллим'}
          </Button>
        </form>

        <div className="min-w-0">
          {isLoading ? (
            <div className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">
              Бор шуда истодааст...
            </div>
          ) : null}

          {!isLoading && filteredTeachers.length === 0 ? (
            <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
              Ҳоло муаллим нест.
            </div>
          ) : null}

          {!isLoading && filteredTeachers.length > 0 ? (
            <>
              {/* МОБИЛ КОРТҲОИ МУАЛЛИМОН (< md) */}
              <div className="space-y-2.5 md:hidden">
                {pagedTeachers.items.map((teacher) => (
                  <div
                    key={`mobile-${teacher.id}`}
                    className="rounded-xl border border-line bg-white p-3.5 shadow-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">
                          {teacher.firstName} {teacher.lastName}
                        </p>
                        <p className="font-mono text-xs text-muted">{teacher.phoneNumber}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          teacher.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {teacher.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2">
                      <span className="text-xs text-muted">Фанҳо:</span>
                      {(subjectByTeacherId[teacher.id] ?? []).length > 0 ? (
                        (subjectByTeacherId[teacher.id] ?? []).map((subName) => (
                          <span key={subName} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            {subName}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted">Вобаста нашудааст</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ҶАДВАЛИ ПЛАНШЕТ ВА КОМПЮТЕР (>= md) */}
              <div className="hidden min-h-[420px] overflow-hidden rounded-xl border border-line bg-white shadow-sm md:block">
                <div className="grid grid-cols-[1.2fr_1fr_120px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
                  <span>Муаллим</span>
                  <span>Телефон</span>
                  <span>Ҳолат</span>
                </div>

                {pagedTeachers.items.map((teacher) => (
                  <div
                    key={`desktop-${teacher.id}`}
                    className="grid grid-cols-[1.2fr_1fr_120px] items-center border-b border-line px-4 py-3.5 text-sm last:border-0 hover:bg-panel/30"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-semibold text-ink">{teacher.firstName} {teacher.lastName}</p>
                      <p className="truncate text-xs text-muted">{teacher.userName}</p>
                      <p className="truncate text-xs text-brand font-medium">
                        {(subjectByTeacherId[teacher.id] ?? ['Фан нест']).join(', ')}
                      </p>
                    </div>
                    <span className="truncate font-mono text-muted">{teacher.phoneNumber}</span>
                    <span
                      className={`w-fit rounded-lg px-2.5 py-1 text-xs font-bold ${
                        teacher.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {teacher.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-4">
            <Pagination
              page={pagedTeachers.page}
              pageCount={pagedTeachers.pageCount}
              total={filteredTeachers.length}
              from={pagedTeachers.from}
              to={pagedTeachers.to}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
