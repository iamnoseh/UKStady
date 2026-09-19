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
import { SearchableSelect } from '../components/SearchableSelect';
import {
  assignTeacherSubject,
  changeUserPassword,
  createUser,
  generatePassword,
  getSubjects,
  getTeacherSubjects,
  getUsers,
  hardDeleteUser,
  removeTeacherSubject,
  updateUser,
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

  // Модали таҳрир (Edit Modal State)
  const [editingTeacher, setEditingTeacher] = useState<UserDto | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubjectId, setEditSubjectId] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Модали ивази парол (Change Password Modal State)
  const [passwordTeacher, setPasswordTeacher] = useState<UserDto | null>(null);
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Модали несткунӣ (Hard Delete Modal State)
  const [deletingTeacher, setDeletingTeacher] = useState<UserDto | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

    if (password.trim().length < 6) {
      setError('Парол бояд на камтар аз 6 рамз бошад.');
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
    setNotice('Парол нусхабардорӣ шуд.');
  }

  const subjectByTeacherId = useMemo(() => {
    return assignments.reduce<Record<string, string[]>>((map, assignment) => {
      map[assignment.teacherId] = [...(map[assignment.teacherId] ?? []), assignment.subjectName];
      return map;
    }, {});
  }, [assignments]);

  const primarySubjectIdByTeacherId = useMemo(() => {
    return assignments.reduce<Record<string, string>>((map, assignment) => {
      if (!map[assignment.teacherId]) {
        map[assignment.teacherId] = assignment.subjectId;
      }
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

  // Амалҳои таҳрир (Edit Handlers)
  function handleOpenEdit(teacher: UserDto) {
    setEditingTeacher(teacher);
    setEditFirstName(teacher.firstName);
    setEditLastName(teacher.lastName);
    setEditPhoneNumber(teacher.phoneNumber);
    setEditIsActive(teacher.isActive);
    setEditSubjectId(primarySubjectIdByTeacherId[teacher.id] ?? '');
    setEditError('');
  }

  async function handleSaveEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth || !editingTeacher) return;

    if (!editFirstName.trim() || !editLastName.trim() || !editPhoneNumber.trim()) {
      setEditError('Лутфан, ҳамаи майдонҳои заруриро пур кунед.');
      return;
    }

    setIsEditSubmitting(true);
    setEditError('');
    try {
      const updated = await updateUser(auth.accessToken, editingTeacher.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phoneNumber: editPhoneNumber.trim(),
        role: editingTeacher.role,
        isActive: editIsActive,
      });

      const currentSubjectId = primarySubjectIdByTeacherId[editingTeacher.id];
      if (editSubjectId && editSubjectId !== currentSubjectId) {
        if (currentSubjectId) {
          try {
            await removeTeacherSubject(auth.accessToken, editingTeacher.id, currentSubjectId);
          } catch {
            // Идома додан агар пештар тоза шуда бошад
          }
        }
        const newAssignment = await assignTeacherSubject(auth.accessToken, {
          teacherId: editingTeacher.id,
          subjectId: editSubjectId,
        });
        setAssignments((current) => [
          newAssignment,
          ...current.filter((a) => !(a.teacherId === editingTeacher.id && a.subjectId === currentSubjectId)),
        ]);
      }

      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
      setNotice(`Маълумоти омӯзгор ${updated.firstName} ${updated.lastName} нав карда шуд.`);
      setEditingTeacher(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Хатогӣ ҳангоми сабти маълумот.');
    } finally {
      setIsEditSubmitting(false);
    }
  }

  // Амалҳои ивази парол (Change Password Handlers)
  function handleOpenPassword(teacher: UserDto) {
    setPasswordTeacher(teacher);
    setNewTeacherPassword('');
    setPasswordError('');
    setShowPassword(false);
  }

  async function handleGenerateModalPassword() {
    if (!auth) return;
    try {
      const res = await generatePassword(auth.accessToken);
      setNewTeacherPassword(res.password);
    } catch {
      const digits = Math.floor(100000 + Math.random() * 900000).toString();
      setNewTeacherPassword(digits);
    }
  }

  async function handleSavePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth || !passwordTeacher) return;

    if (newTeacherPassword.trim().length < 6) {
      setPasswordError('Парол бояд на камтар аз 6 рамз бошад.');
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordError('');
    try {
      await changeUserPassword(auth.accessToken, passwordTeacher.id, newTeacherPassword.trim());
      setNotice(`Пароли омӯзгор ${passwordTeacher.firstName} ${passwordTeacher.lastName} бомуваффақият иваз карда шуд.`);
      setPasswordTeacher(null);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Ивази парол иҷро нашуд.');
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  // Амалҳои пурра нест кардан (Hard Delete Handlers)
  function handleOpenDelete(teacher: UserDto) {
    setDeletingTeacher(teacher);
    setDeleteError('');
  }

  async function handleConfirmDelete() {
    if (!auth || !deletingTeacher) return;

    setIsDeleteSubmitting(true);
    setDeleteError('');
    try {
      await hardDeleteUser(auth.accessToken, deletingTeacher.id);
      setUsers((current) => current.filter((u) => u.id !== deletingTeacher.id));
      setAssignments((current) => current.filter((a) => a.teacherId !== deletingTeacher.id));
      setNotice(`Омӯзгор ${deletingTeacher.firstName} ${deletingTeacher.lastName} пурра аз система нест карда шуд.`);
      setDeletingTeacher(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Нест кардани омӯзгор иҷро нашуд.');
    } finally {
      setIsDeleteSubmitting(false);
    }
  }

  return (
    <section className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted sm:text-sm">Идоракунӣ</p>
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
              <div className="space-y-3 md:hidden">
                {pagedTeachers.items.map((teacher) => (
                  <div
                    key={`mobile-${teacher.id}`}
                    className="rounded-xl border border-line bg-white p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-ink">
                          {teacher.firstName} {teacher.lastName}
                        </p>
                        <p className="font-mono text-xs text-muted mt-0.5">{teacher.phoneNumber}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          teacher.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {teacher.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2.5">
                      <span className="text-xs text-muted">Фан:</span>
                      {(subjectByTeacherId[teacher.id] ?? []).length > 0 ? (
                        (subjectByTeacherId[teacher.id] ?? []).map((subName) => (
                          <span key={subName} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            {subName}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted italic">Вобаста нашудааст</span>
                      )}
                    </div>

                    {/* ТУГМАҲОИ АМАЛҲО ДАР МОБИЛ */}
                    <div className="flex items-center justify-end gap-2 border-t border-line/60 pt-3">
                      <button
                        type="button"
                        onClick={() => handleOpenPassword(teacher)}
                        className="flex items-center gap-1.5 rounded-lg border border-line bg-panel/50 px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-panel hover:text-brand"
                      >
                        <KeyRound className="h-3.5 w-3.5 text-brand" />
                        <span>Парол</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(teacher)}
                        className="flex items-center gap-1.5 rounded-lg border border-line bg-panel/50 px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:bg-panel hover:text-brand"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-slate-600" />
                        <span>Таҳрир</span>
                      </button>
                      {auth?.role === 'SuperAdmin' && (
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(teacher)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          <span>Нест кардан</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ҶАДВАЛИ ПЛАНШЕТ ВА КОМПЮТЕР (>= md) */}
              <div className="hidden min-h-[420px] overflow-hidden rounded-xl border border-line bg-white shadow-sm md:block">
                <div className="grid grid-cols-[1.3fr_1.1fr_90px_130px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
                  <span>Муаллим</span>
                  <span>Телефон</span>
                  <span>Ҳолат</span>
                  <span className="text-right">Амалҳо</span>
                </div>

                {pagedTeachers.items.map((teacher) => (
                  <div
                    key={`desktop-${teacher.id}`}
                    className="grid grid-cols-[1.3fr_1.1fr_90px_130px] items-center border-b border-line px-4 py-3.5 text-sm last:border-0 hover:bg-panel/30 transition"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate font-bold text-ink">{teacher.firstName} {teacher.lastName}</p>
                      <p className="truncate text-xs text-brand font-medium mt-0.5">
                        {(subjectByTeacherId[teacher.id] ?? ['Фан нест']).join(', ')}
                      </p>
                    </div>
                    <span className="truncate font-mono text-muted text-xs">{teacher.phoneNumber}</span>
                    <span
                      className={`w-fit rounded-lg px-2.5 py-1 text-xs font-bold ${
                        teacher.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {teacher.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                    </span>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenPassword(teacher)}
                        title="Ивази парол"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-line text-slate-600 hover:border-brand hover:bg-brand/10 hover:text-brand transition"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(teacher)}
                        title="Таҳрир"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-line text-slate-600 hover:border-brand hover:bg-brand/10 hover:text-brand transition"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {auth?.role === 'SuperAdmin' && (
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(teacher)}
                          title="Пурра нест кардан аз система"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
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

      {/* МОДАЛИ ТАҲРИРИ МУАЛЛИМ (EDIT MODAL) */}
      {editingTeacher ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-ink">Таҳрири муаллим</h3>
                  <p className="text-xs text-muted">{editingTeacher.firstName} {editingTeacher.lastName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
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

              <div>
                <SearchableSelect
                  label="Фанни дарсӣ"
                  value={editSubjectId}
                  options={subjectOptions}
                  placeholder="Фанни дарсиро интихоб кунед"
                  emptyText="Фан ёфт нашуд"
                  onChange={setEditSubjectId}
                />
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                />
                <span className="text-sm font-semibold text-ink">Ҳолати фаъол (муаллим метавонад ворид шавад)</span>
              </label>

              {editError ? <p className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{editError}</p> : null}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <Button type="button" variant="secondary" onClick={() => setEditingTeacher(null)}>
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

      {/* МОДАЛИ ИВАЗИ ПАРОЛ (CHANGE PASSWORD MODAL) */}
      {passwordTeacher ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-ink">Ивази пароли муаллим</h3>
                  <p className="text-xs text-muted">{passwordTeacher.firstName} {passwordTeacher.lastName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordTeacher(null)}
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
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
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
                <Button type="button" variant="secondary" onClick={() => setPasswordTeacher(null)}>
                  Бекор кардан
                </Button>
                <Button type="submit" disabled={isPasswordSubmitting || newTeacherPassword.trim().length < 6}>
                  {isPasswordSubmitting ? 'Иваз шуда истодааст...' : 'Иваз кардани парол'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* МОДАЛИ НЕСТ КАРДАНИ ПУРРА (HARD DELETE CONFIRM MODAL) */}
      {deletingTeacher ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Пурра нест кардани омӯзгор</h3>
                <p className="text-xs text-muted">Ин амал софт-делейт нест ва барқарор намешавад.</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-red-50/80 p-3.5 text-xs text-red-800 leading-relaxed">
              Оё шумо мутмаин ҳастед, ки мехоҳед омӯзгор{' '}
              <span className="font-bold text-red-950">
                {deletingTeacher.firstName} {deletingTeacher.lastName} ({deletingTeacher.phoneNumber})
              </span>
              -ро <strong>пурра аз система нест кунед</strong>? Ҳамаи вобастагиҳои фаннӣ ва сабтҳои ин омӯзгор аз базаи маълумот комилан пок мешаванд.
            </div>

            {deleteError ? <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{deleteError}</p> : null}

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <Button type="button" variant="secondary" onClick={() => setDeletingTeacher(null)} disabled={isDeleteSubmitting}>
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
