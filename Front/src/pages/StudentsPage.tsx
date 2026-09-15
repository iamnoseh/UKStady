import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Plus, Search, UserRoundPlus } from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination, paginate } from '../components/Pagination';
import { createUser, generatePassword, getUsers } from '../services/api';
import type { UserDto } from '../types/admin';
import { useAuth } from '../context/AuthContext';

export function StudentsPage() {
  const { auth } = useAuth();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    if (!auth) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      setUsers(await getUsers(auth.accessToken));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Хонандагон гирифта нашуданд.');
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
      setNotice('Парол генератсия шуд. Агар розӣ бошед, хонандаро созед.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Парол генератсия нашуд.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !firstName.trim() || !lastName.trim() || !phoneNumber.trim() || !password.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      const user = await createUser(auth.accessToken, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: null,
        phoneNumber: phoneNumber.trim(),
        password: password.trim(),
        role: 'Student',
      });
      setUsers((current) => [user, ...current]);
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setPassword('');
      setNotice('Хонанда сохта шуд.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Хонанда сохта нашуд.');
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

  const students = useMemo(() => users.filter((user) => user.role === 'Student'), [users]);
  const filteredStudents = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return students;
    }

    return students.filter((student) =>
      `${student.firstName} ${student.lastName} ${student.phoneNumber}`.toLowerCase().includes(value),
    );
  }, [query, students]);
  const pagedStudents = paginate(filteredStudents, page, 8);

  useEffect(() => {
    setPage(1);
  }, [query, students.length]);

  return (
    <section className="px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-muted">Administrator</p>
          <h2 className="mt-1 text-2xl font-bold">Хонандагон</h2>
        </div>

        <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-line bg-white px-3 xl:w-[360px]">
          <Search className="h-5 w-5 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-full flex-1 outline-none"
            placeholder="Ҷустуҷӯи хонанда"
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
              <h3 className="font-bold">Хонандаи нав</h3>
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
                placeholder="Али"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Насаб</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                placeholder="Алиев"
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
            disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !phoneNumber.trim() || !password.trim()}
          >
            <Plus className="h-4 w-4" />
            {isSubmitting ? 'Сохта истодааст...' : 'Сохтани хонанда'}
          </Button>
        </form>

        <div className="min-w-0">
          <div className="min-h-[420px] overflow-hidden rounded-lg border border-line bg-white">
            <div className="grid grid-cols-[1.2fr_1fr_120px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
              <span>Хонанда</span>
              <span>Телефон</span>
              <span>Ҳолат</span>
            </div>

            {isLoading ? <p className="px-4 py-5 text-sm text-muted">Бор шуда истодааст...</p> : null}

            {!isLoading && filteredStudents.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">Ҳоло хонанда нест.</p>
            ) : null}

            {pagedStudents.items.map((student) => (
              <div key={student.id} className="grid grid-cols-[1.2fr_1fr_120px] items-center border-b border-line px-4 py-4 text-sm last:border-0">
                <div>
                  <p className="font-semibold">{student.firstName} {student.lastName}</p>
                  <p className="text-muted">{student.userName}</p>
                </div>
                <span className="font-mono text-muted">{student.phoneNumber}</span>
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-bold ${student.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {student.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Pagination
              page={pagedStudents.page}
              pageCount={pagedStudents.pageCount}
              total={filteredStudents.length}
              from={pagedStudents.from}
              to={pagedStudents.to}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
