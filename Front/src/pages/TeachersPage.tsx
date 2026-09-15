import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Plus, Search, UserRoundPlus } from 'lucide-react';
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
      setError(error instanceof Error ? error.message : 'Маълумоти муаллимон гирифта нашуд.');
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
    <section className="px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-muted">Administrator</p>
          <h2 className="mt-1 text-2xl font-bold">Муаллимон</h2>
        </div>

        <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-line bg-white px-3 xl:w-[360px]">
          <Search className="h-5 w-5 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-full flex-1 outline-none"
            placeholder="Ҷустуҷӯи муаллим"
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
              <UserRoundPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">Муаллими нав</h3>
              <p className="text-sm text-muted">Login рақами телефон мешавад.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Ном</span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                placeholder="Саид"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Насаб</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                placeholder="Саидов"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-semibold">Рақами телефон</span>
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
              placeholder="+992..."
            />
          </label>

          <div className="mt-4">
            <SearchableSelect
              label="Фанни дарсӣ"
              value={subjectId}
              options={subjectOptions}
              placeholder="Ҷустуҷӯ ва интихоби фан"
              emptyText="Фан ёфт нашуд."
              onChange={setSubjectId}
            />
          </div>

          <div className="mt-4">
            <span className="text-sm font-semibold">Парол</span>
            <div className="mt-2 flex gap-2">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-lg border border-line px-3 font-mono outline-none focus:border-brand"
                placeholder="12345A"
              />
              <Button type="button" variant="secondary" onClick={handleGeneratePassword} disabled={isGenerating}>
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" onClick={handleCopyPassword} disabled={!password}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted">Қоида: 5 рақам ва 1 ҳарфи англисӣ.</p>
          </div>

          {notice ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <Button
            type="submit"
            className="mt-5 w-full"
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
          <div className="min-h-[420px] overflow-hidden rounded-lg border border-line bg-white">
            <div className="grid grid-cols-[1.2fr_1fr_120px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
              <span>Муаллим</span>
              <span>Телефон</span>
              <span>Ҳолат</span>
            </div>

            {isLoading ? <p className="px-4 py-5 text-sm text-muted">Бор шуда истодааст...</p> : null}

            {!isLoading && filteredTeachers.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">Ҳоло муаллим нест.</p>
            ) : null}

            {pagedTeachers.items.map((teacher) => (
              <div key={teacher.id} className="grid grid-cols-[1.2fr_1fr_120px] items-center border-b border-line px-4 py-4 text-sm last:border-0">
                <div>
                  <p className="font-semibold">{teacher.firstName} {teacher.lastName}</p>
                  <p className="text-muted">{teacher.userName}</p>
                  <p className="text-muted">{(subjectByTeacherId[teacher.id] ?? ['Фан нест']).join(', ')}</p>
                </div>
                <span className="font-mono text-muted">{teacher.phoneNumber}</span>
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-bold ${teacher.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {teacher.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                </span>
              </div>
            ))}
          </div>
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
