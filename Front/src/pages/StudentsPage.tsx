import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Search,
  Trash2,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination, paginate } from '../components/Pagination';
import {
  changeUserPassword,
  createUser,
  generatePassword,
  getUsers,
  hardDeleteUser,
  updateUser,
} from '../services/api';
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
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Модали таҳрир (Edit Student State)
  const [editingStudent, setEditingStudent] = useState<UserDto | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Модали ивази парол (Change Password State)
  const [passwordStudent, setPasswordStudent] = useState<UserDto | null>(null);
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Модали несткунии пурра (Hard Delete State)
  const [deletingStudent, setDeletingStudent] = useState<UserDto | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
      setNotice('Парол тавлид шуд.');
    } catch {
      const fallback = Math.floor(100000 + Math.random() * 900000).toString();
      setPassword(fallback);
      setNotice('Парол тавлид шуд.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !firstName.trim() || !lastName.trim() || !phoneNumber.trim() || !password.trim()) {
      setError('Лутфан, ҳамаи майдонҳоро пур кунед.');
      return;
    }

    if (password.trim().length < 6) {
      setError('Парол бояд на камтар аз 6 рамз бошад.');
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
      setIsFormOpen(false);
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
    setNotice('Парол нусхабардорӣ шуд.');
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

  // Амалҳои таҳрир (Edit Student)
  function handleOpenEdit(student: UserDto) {
    setEditingStudent(student);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
    setEditPhoneNumber(student.phoneNumber);
    setEditIsActive(student.isActive);
    setEditError('');
  }

  async function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth || !editingStudent) return;

    if (!editFirstName.trim() || !editLastName.trim() || !editPhoneNumber.trim()) {
      setEditError('Лутфан, ҳамаи майдонҳоро пур кунед.');
      return;
    }

    setIsEditSubmitting(true);
    setEditError('');
    try {
      const updated = await updateUser(auth.accessToken, editingStudent.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phoneNumber: editPhoneNumber.trim(),
        role: editingStudent.role,
        isActive: editIsActive,
      });

      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
      setNotice(`Маълумоти хонанда ${updated.firstName} ${updated.lastName} нав карда шуд.`);
      setEditingStudent(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Хатогӣ ҳангоми сабти тағйирот.');
    } finally {
      setIsEditSubmitting(false);
    }
  }

  // Амалҳои ивази парол (Change Password)
  function handleOpenPassword(student: UserDto) {
    setPasswordStudent(student);
    setNewStudentPassword('');
    setPasswordError('');
    setShowPassword(false);
  }

  async function handleGenerateModalPassword() {
    if (!auth) return;
    try {
      const res = await generatePassword(auth.accessToken);
      setNewStudentPassword(res.password);
    } catch {
      const digits = Math.floor(100000 + Math.random() * 900000).toString();
      setNewStudentPassword(digits);
    }
  }

  async function handleSavePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth || !passwordStudent) return;

    if (newStudentPassword.trim().length < 6) {
      setPasswordError('Парол бояд на камтар аз 6 рамз бошад.');
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordError('');
    try {
      await changeUserPassword(auth.accessToken, passwordStudent.id, newStudentPassword.trim());
      setNotice(`Пароли хонанда ${passwordStudent.firstName} ${passwordStudent.lastName} бомуваффақият иваз карда шуд.`);
      setPasswordStudent(null);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Ивази парол иҷро нашуд.');
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  // Амалҳои несткунии пурра (Hard Delete)
  function handleOpenDelete(student: UserDto) {
    setDeletingStudent(student);
    setDeleteError('');
  }

  async function handleConfirmDelete() {
    if (!auth || !deletingStudent) return;

    setIsDeleteSubmitting(true);
    setDeleteError('');
    try {
      await hardDeleteUser(auth.accessToken, deletingStudent.id);
      setUsers((current) => current.filter((u) => u.id !== deletingStudent.id));
      setNotice(`Хонанда ${deletingStudent.firstName} ${deletingStudent.lastName} пурра аз система нест карда шуд.`);
      setDeletingStudent(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Нест кардани хонанда иҷро нашуд.');
    } finally {
      setIsDeleteSubmitting(false);
    }
  }

  return (
    <section className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted sm:text-sm">Идоракунӣ</p>
          <h2 className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">Хонандагон</h2>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-line bg-white px-3 focus-within:border-brand sm:h-11 xl:w-[320px]">
            <Search className="h-4 w-4 text-muted shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-full flex-1 text-sm outline-none placeholder:text-muted/70"
              placeholder="Ҷустуҷӯи хонанда..."
            />
          </div>
          <Button
            type="button"
            onClick={() => setIsFormOpen((prev) => !prev)}
            className="h-10 px-3.5 text-sm xl:hidden"
          >
            {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{isFormOpen ? 'Пӯшидан' : 'Хонандаи нав'}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        {/* ФОРМАИ ЭҶОД (Ҳамеша дар Desktop, кушодашаванда дар Mobile) */}
        <form
          onSubmit={handleSubmit}
          className={`rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5 h-fit ${
            isFormOpen ? 'block' : 'hidden xl:block'
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
                <UserRoundPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-ink">Хонандаи нав</h3>
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
                placeholder="Али"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-muted">Насаб</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                placeholder="Алиев"
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
            <span className="text-xs font-semibold text-muted">Парол</span>
            <div className="mt-1 flex gap-2">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-lg border border-line px-3 font-mono text-sm outline-none focus:border-brand"
                placeholder="123456"
              />
              <Button type="button" variant="secondary" className="h-10 px-3" onClick={handleGeneratePassword} disabled={isGenerating} title="Тавлиди парол">
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" className="h-10 px-3" onClick={handleCopyPassword} disabled={!password} title="Нусхабардорӣ">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted">Қоида: дилхоҳ пароли на камтар аз 6 рамз (рақамҳо, ҳарфҳо ва ғ.).</p>
          </div>

          {notice ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p> : null}

          <Button
            type="submit"
            className="mt-4 w-full h-11"
            disabled={isSubmitting || !firstName.trim() || !lastName.trim() || !phoneNumber.trim() || !password.trim()}
          >
            <Plus className="h-4 w-4" />
            {isSubmitting ? 'Сохта истодааст...' : 'Сохтани хонанда'}
          </Button>
        </form>

        <div className="min-w-0">
          {isLoading ? (
            <div className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">
              Бор шуда истодааст...
            </div>
          ) : null}

          {!isLoading && filteredStudents.length === 0 ? (
            <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
              Ҳоло хонанда нест.
            </div>
          ) : null}

          {!isLoading && filteredStudents.length > 0 ? (
            <>
              {/* МОБИЛ КОРТҲОИ ХОНАНДАГОН (< md) */}
              <div className="space-y-3 md:hidden">
                {pagedStudents.items.map((student) => (
                  <div
                    key={`mobile-${student.id}`}
                    className="rounded-xl border border-line bg-white p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-ink">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="font-mono text-xs text-muted mt-0.5">{student.phoneNumber}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          student.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {student.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                      </span>
                    </div>

                    {/* ТУГМАҲОИ АМАЛҲО ДАР МОБИЛ */}
                    <div className="flex items-center justify-end gap-2 border-t border-line/60 pt-3">
                      <button
                        type="button"
                        onClick={() => handleOpenPassword(student)}
                        className="flex items-center gap-1.5 rounded-lg border border-line bg-panel/50 px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-panel hover:text-brand"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-brand" />
                        <span>Парол</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(student)}
                        className="flex items-center gap-1.5 rounded-lg border border-line bg-panel/50 px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-panel hover:text-brand"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                        <span>Таҳрир</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(student)}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        <span>Нест кардан</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ҶАДВАЛИ ПЛАНШЕТ ВА КОМПЮТЕР (>= md) */}
              <div className="hidden min-h-[420px] overflow-hidden rounded-xl border border-line bg-white shadow-sm md:block">
                <div className="grid grid-cols-[1.3fr_1.1fr_90px_130px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
                  <span>Хонанда</span>
                  <span>Телефон</span>
                  <span>Ҳолат</span>
                  <span className="text-right">Амалҳо</span>
                </div>

                {pagedStudents.items.map((student) => (
                  <div
                    key={`desktop-${student.id}`}
                    className="grid grid-cols-[1.3fr_1.1fr_90px_130px] items-center border-b border-line px-4 py-3.5 text-sm last:border-0 hover:bg-panel/30 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-bold text-ink">{student.firstName} {student.lastName}</p>
                      <p className="truncate text-xs text-muted">{student.userName}</p>
                    </div>
                    <span className="truncate font-mono text-muted text-xs">{student.phoneNumber}</span>
                    <span
                      className={`w-fit rounded-lg px-2.5 py-1 text-xs font-bold ${
                        student.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {student.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                    </span>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenPassword(student)}
                        title="Ивази парол"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-line text-slate-600 hover:border-brand hover:bg-brand/10 hover:text-brand transition"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(student)}
                        title="Таҳрир"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-line text-slate-600 hover:border-brand hover:bg-brand/10 hover:text-brand transition"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(student)}
                        title="Пурра нест кардан аз система"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

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

      {/* МОДАЛИ ТАҲРИРИ ХОНАНДА (EDIT MODAL) */}
      {editingStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-ink">Таҳрири хонанда</h3>
                  <p className="text-xs text-muted">{editingStudent.firstName} {editingStudent.lastName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-panel hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Ном</span>
                  <input
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted">Насаб</span>
                  <input
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-muted">Рақами телефон</span>
                <input
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                  required
                />
              </label>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                />
                <span className="text-sm font-semibold text-ink">Ҳолати фаъол (хонанда метавонад ворид шавад)</span>
              </label>

              {editError ? <p className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{editError}</p> : null}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <Button type="button" variant="secondary" onClick={() => setEditingStudent(null)}>
                  Бекор кардан
                </Button>
                <Button type="submit" disabled={isEditSubmitting}>
                  {isEditSubmitting ? 'Сабт истодааст...' : 'Сабти тағйирот'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* МОДАЛИ ИВАЗИ ПАРОЛИ ХОНАНДА (CHANGE PASSWORD MODAL) */}
      {passwordStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-ink">Ивази пароли хонанда</h3>
                  <p className="text-xs text-muted">{passwordStudent.firstName} {passwordStudent.lastName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordStudent(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-panel hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="mt-4 space-y-3.5">
              <label className="block">
                <span className="text-xs font-semibold text-muted">Пароли нав</span>
                <div className="mt-1 relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    placeholder="Ҳадди ақал 6 рамз"
                    className="h-10 w-full rounded-lg border border-line pl-3 pr-10 font-mono text-sm outline-none focus:border-brand"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 text-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted">
                  Дилхоҳ пароли на камтар аз 6 рамз (рақамҳо, ҳарфҳо ё дилхоҳ аломат) қабул карда мешавад.
                </p>
              </label>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleGenerateModalPassword}
                  className="flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Тавлиди худкори парол</span>
                </button>
              </div>

              {passwordError ? <p className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{passwordError}</p> : null}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <Button type="button" variant="secondary" onClick={() => setPasswordStudent(null)}>
                  Бекор кардан
                </Button>
                <Button type="submit" disabled={isPasswordSubmitting || newStudentPassword.trim().length < 6}>
                  {isPasswordSubmitting ? 'Иваз шуда истодааст...' : 'Иваз кардани парол'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* МОДАЛИ НЕСТ КАРДАНИ ПУРРА (HARD DELETE CONFIRM MODAL) */}
      {deletingStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Пурра нест кардани хонанда</h3>
                <p className="text-xs text-muted">Ин амал софт-делейт нест ва барқарор намешавад.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-red-50/80 p-3.5 text-xs text-red-800 leading-relaxed">
              Оё шумо мутмаин ҳастед, ки мехоҳед хонанда{' '}
              <span className="font-bold text-red-950">
                {deletingStudent.firstName} {deletingStudent.lastName} ({deletingStudent.phoneNumber})
              </span>
              -ро <strong>пурра аз система нест кунед</strong>? Ҳамаи сабтҳои ин хонанда (баҳоҳо, кӯшишҳои тестҳо, аъзогии гурӯҳҳо) аз базаи маълумот пок мешаванд.
            </div>

            {deleteError ? <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{deleteError}</p> : null}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={() => setDeletingStudent(null)} disabled={isDeleteSubmitting}>
                Бекор кардан
              </Button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleteSubmitting}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeleteSubmitting ? 'Нест истодааст...' : 'Бале, пурра нест шавад'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
