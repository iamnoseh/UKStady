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
  Shield,
  Trash2,
  UserCheck,
  UserCog,
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

export function AdminsPage() {
  const { auth } = useAuth();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Модали таҳрир (Edit Modal State)
  const [editingAdmin, setEditingAdmin] = useState<UserDto | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Модали ивази пароли админ (Admin Change Password Modal)
  const [passwordAdmin, setPasswordAdmin] = useState<UserDto | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Модали ивази пароли худи SuperAdmin (SuperAdmin Own Password Modal)
  const [isSuperAdminPasswordModalOpen, setIsSuperAdminPasswordModalOpen] = useState(false);
  const [superAdminNewPassword, setSuperAdminNewPassword] = useState('');
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState(false);
  const [isSuperAdminPasswordSubmitting, setIsSuperAdminPasswordSubmitting] = useState(false);
  const [superAdminPasswordError, setSuperAdminPasswordError] = useState('');

  // Модали несткунӣ (Hard Delete Modal State)
  const [deletingAdmin, setDeletingAdmin] = useState<UserDto | null>(null);
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
      const loadedUsers = await getUsers(auth.accessToken);
      setUsers(loadedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Маълумоти корбарон гирифта нашуданд.');
    } finally {
      setIsLoading(false);
    }
  }

  const admins = useMemo(() => {
    return users.filter((user) => user.role === 'Admin');
  }, [users]);

  const filteredAdmins = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return admins;
    }

    return admins.filter((admin) =>
      `${admin.firstName} ${admin.lastName} ${admin.phoneNumber} ${admin.userName ?? ''}`
        .toLowerCase()
        .includes(value),
    );
  }, [admins, query]);

  const pagedAdmins = paginate(filteredAdmins, page, 8);

  async function handleGeneratePassword() {
    if (!auth) return;
    setIsGenerating(true);
    try {
      const res = await generatePassword(auth.accessToken);
      setPassword(res.password);
    } catch {
      const digits = Math.floor(100000 + Math.random() * 900000).toString();
      setPassword(digits);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCreateAdmin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth) return;

    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
      setError('Ҳамаи майдонҳои ном, насаб ва рақами телефон ҳатмӣ мебошанд.');
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
      await createUser(auth.accessToken, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: null,
        phoneNumber: phoneNumber.trim(),
        password: password.trim(),
        role: 'Admin',
        userName: userName.trim() || undefined,
      });

      await loadData();
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setUserName('');
      setPassword('');
      setIsFormOpen(false);
      setNotice('Админи нав бомуваффақият эҷод карда шуд.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Админ эҷод нашуд.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenEditModal(admin: UserDto) {
    setEditingAdmin(admin);
    setEditFirstName(admin.firstName);
    setEditLastName(admin.lastName);
    setEditPhoneNumber(admin.phoneNumber);
    setEditIsActive(admin.isActive);
    setEditError('');
  }

  function handleCloseEditModal() {
    setEditingAdmin(null);
    setEditError('');
  }

  async function handleSaveEditAdmin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth || !editingAdmin) return;

    if (!editFirstName.trim() || !editLastName.trim() || !editPhoneNumber.trim()) {
      setEditError('Ҳамаи майдонҳои ном, насаб ва телефон ҳатмӣ мебошанд.');
      return;
    }

    setIsEditSubmitting(true);
    setEditError('');

    try {
      await updateUser(auth.accessToken, editingAdmin.id, {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        phoneNumber: editPhoneNumber.trim(),
        role: 'Admin',
        isActive: editIsActive,
        userName: editingAdmin.userName,
      });

      await loadData();
      setNotice(`Маълумоти админ «${editFirstName} ${editLastName}» бомуваффақият тағйир дода шуд.`);
      handleCloseEditModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Маълумот сабт нашуд.');
    } finally {
      setIsEditSubmitting(false);
    }
  }

  function handleOpenPasswordModal(admin: UserDto) {
    setPasswordAdmin(admin);
    setNewAdminPassword('');
    setPasswordError('');
    setShowPassword(false);
  }

  function handleClosePasswordModal() {
    setPasswordAdmin(null);
    setNewAdminPassword('');
    setPasswordError('');
  }

  async function handleGenerateAdminModalPassword() {
    if (!auth) return;
    try {
      const res = await generatePassword(auth.accessToken);
      setNewAdminPassword(res.password);
    } catch {
      const digits = Math.floor(100000 + Math.random() * 900000).toString();
      setNewAdminPassword(digits);
    }
  }

  async function handleSaveAdminPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth || !passwordAdmin) return;

    if (newAdminPassword.trim().length < 6) {
      setPasswordError('Парол бояд на камтар аз 6 рамз бошад.');
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordError('');

    try {
      await changeUserPassword(auth.accessToken, passwordAdmin.id, newAdminPassword.trim());
      setNotice(`Пароли админ ${passwordAdmin.firstName} ${passwordAdmin.lastName} иваз карда шуд.`);
      handleClosePasswordModal();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Парол иваз нашуд.');
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  // Ивази пароли худи SuperAdmin
  function handleOpenSuperAdminPasswordModal() {
    setIsSuperAdminPasswordModalOpen(true);
    setSuperAdminNewPassword('');
    setSuperAdminPasswordError('');
    setShowSuperAdminPassword(false);
  }

  function handleCloseSuperAdminPasswordModal() {
    setIsSuperAdminPasswordModalOpen(false);
    setSuperAdminNewPassword('');
    setSuperAdminPasswordError('');
  }

  async function handleGenerateSuperAdminPassword() {
    if (!auth) return;
    try {
      const res = await generatePassword(auth.accessToken);
      setSuperAdminNewPassword(res.password);
    } catch {
      const digits = Math.floor(100000 + Math.random() * 900000).toString();
      setSuperAdminNewPassword(digits);
    }
  }

  async function handleSaveSuperAdminPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!auth) return;

    if (superAdminNewPassword.trim().length < 6) {
      setSuperAdminPasswordError('Пароли SuperAdmin бояд на камтар аз 6 рамз бошад.');
      return;
    }

    setIsSuperAdminPasswordSubmitting(true);
    setSuperAdminPasswordError('');

    try {
      await changeUserPassword(auth.accessToken, auth.userId, superAdminNewPassword.trim());
      setNotice('Пароли SuperAdmin бомуваффақият иваз карда шуд.');
      handleCloseSuperAdminPasswordModal();
    } catch (err) {
      setSuperAdminPasswordError(err instanceof Error ? err.message : 'Парол иваз нашуд.');
    } finally {
      setIsSuperAdminPasswordSubmitting(false);
    }
  }

  function handleOpenDeleteModal(admin: UserDto) {
    setDeletingAdmin(admin);
    setDeleteError('');
  }

  function handleCloseDeleteModal() {
    setDeletingAdmin(null);
    setDeleteError('');
  }

  async function handleConfirmDelete() {
    if (!auth || !deletingAdmin) return;

    setIsDeleteSubmitting(true);
    setDeleteError('');

    try {
      await hardDeleteUser(auth.accessToken, deletingAdmin.id);
      await loadData();
      setNotice(`Админ «${deletingAdmin.firstName} ${deletingAdmin.lastName}» пурра аз система нест карда шуд.`);
      handleCloseDeleteModal();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Админ нест нашуд.');
    } finally {
      setIsDeleteSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* ПАНЕЛИ МАХСУСИ SUPERADMIN: Корти рамзи худӣ */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink sm:text-lg">Ҳисоби SuperAdmin</h2>
              <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
                Сардори система
              </span>
            </div>
            <p className="text-xs text-muted sm:text-sm">
              Шумо метавонед админҳоро идора кунед ва рамзи худро ҳар вақт навсозӣ намоед.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
          <button
            type="button"
            onClick={handleOpenSuperAdminPasswordModal}
            className="flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 sm:px-4 text-xs sm:text-sm font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-300 active:scale-95"
          >
            <KeyRound className="h-4 w-4 shrink-0 text-indigo-600" />
            <span className="truncate">Ивази парол</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFormOpen((prev) => !prev)}
            className="flex h-10 sm:h-11 items-center justify-center gap-2 rounded-xl bg-brand px-3 sm:px-4 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-brand/90 active:scale-95"
          >
            <UserRoundPlus className="h-4 w-4 shrink-0" />
            <span className="truncate">{isFormOpen ? 'Пӯшидан' : 'Админи нав'}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <button type="button" onClick={() => setNotice('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="text-red-700 hover:text-red-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ФОРМАИ ЭҶОДИ АДМИНИ НАВ */}
      {isFormOpen && (
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-line bg-panel px-5 py-4">
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-brand" />
              <h3 className="text-base font-bold text-ink">Эҷоди Админи нав</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="text-muted hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreateAdmin} className="space-y-4 p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  Ном <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Масалан: Ҷамшед"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  Насаб <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Масалан: Каримов"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  Рақами телефон <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="+992900000000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  Логин / Username (ихтиёрӣ)
                </label>
                <input
                  type="text"
                  placeholder="Масалан: admin_jamshed"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-muted">
                    Парол (ҳадди ақал 6 рамз) <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    disabled={isGenerating}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    {isGenerating ? 'Тавлид...' : 'Тавлиди худкор (6 рамз)'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Дилхоҳ пароли 6-рамза"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-lg border border-line px-3 pr-10 text-sm focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="border-line bg-white text-muted hover:bg-panel hover:text-ink"
              >
                Бекор кардан
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-brand text-white hover:bg-brand/90">
                {isSubmitting ? 'Сабт истодааст...' : 'Сабти Админ'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ҶАДВАЛИ АДМИНҲО */}
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-line bg-panel px-4 py-4 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            <h3 className="font-bold text-ink">Рӯйхати Админҳо ({admins.length})</h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Ҷустуҷӯи админ..."
              className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted">Боргирии маълумот...</div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            {query ? 'Бо ин дархост админ ёфт нашуд.' : 'Ҳоло дар система админ сохта нашудааст.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-panel/50 text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-5 py-3">Ному насаб</th>
                  <th className="px-5 py-3">Телефон</th>
                  <th className="px-5 py-3">Логин (Username)</th>
                  <th className="px-5 py-3">Ҳолат</th>
                  <th className="px-5 py-3 text-right">Амалҳо</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pagedAdmins.items.map((admin) => (
                  <tr key={admin.id} className="hover:bg-panel/30">
                    <td className="px-5 py-3.5 font-bold text-ink">
                      {admin.firstName} {admin.lastName}
                    </td>
                    <td className="px-5 py-3.5 text-muted">{admin.phoneNumber}</td>
                    <td className="px-5 py-3.5 text-muted">{admin.userName ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          admin.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {admin.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPasswordModal(admin)}
                          title="Ивази парол"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-panel hover:text-indigo-600"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(admin)}
                          title="Таҳрир"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition hover:bg-panel hover:text-brand"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(admin)}
                          title="Нест кардан (Hard Delete)"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagedAdmins.page}
          pageCount={pagedAdmins.pageCount}
          total={filteredAdmins.length}
          from={pagedAdmins.from}
          to={pagedAdmins.to}
          onPageChange={setPage}
        />
      </div>

      {/* МОДАЛИ ТАҲРИРИ АДМИН */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-line bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-bold text-ink">Таҳрири Админ</h3>
              <button type="button" onClick={handleCloseEditModal} className="text-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">{editError}</div>
            )}

            <form onSubmit={handleSaveEditAdmin} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Ном</label>
                <input
                  type="text"
                  required
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Насаб</label>
                <input
                  type="text"
                  required
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">Телефон</label>
                <input
                  type="text"
                  required
                  value={editPhoneNumber}
                  onChange={(e) => setEditPhoneNumber(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActiveAdmin"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
                />
                <label htmlFor="editIsActiveAdmin" className="text-sm font-semibold text-ink">
                  Ҳисоб фаъол аст
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="border-line bg-white text-muted hover:bg-panel hover:text-ink"
                >
                  Бекор кардан
                </Button>
                <Button type="submit" disabled={isEditSubmitting} className="bg-brand text-white hover:bg-brand/90">
                  {isEditSubmitting ? 'Сабт...' : 'Сабт кардан'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛИ ИВАЗИ ПАРОЛИ АДМИН */}
      {passwordAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-line bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-ink">Ивази пароли Админ</h3>
              </div>
              <button type="button" onClick={handleClosePasswordModal} className="text-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-line/60 bg-panel px-5 py-2.5 text-xs text-muted">
              Админ: <span className="font-bold text-ink">{passwordAdmin.firstName} {passwordAdmin.lastName}</span> ({passwordAdmin.phoneNumber})
            </div>

            {passwordError && (
              <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">{passwordError}</div>
            )}

            <form onSubmit={handleSaveAdminPassword} className="space-y-4 p-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-muted">Пароли нав (ҳадди ақал 6 рамз)</label>
                  <button
                    type="button"
                    onClick={handleGenerateAdminModalPassword}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Тавлиди худкор
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Дилхоҳ пароли 6-символа"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="h-10 w-full rounded-lg border border-line px-3 pr-10 text-sm focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleClosePasswordModal}
                  className="border-line bg-white text-muted hover:bg-panel hover:text-ink"
                >
                  Бекор кардан
                </Button>
                <Button type="submit" disabled={isPasswordSubmitting} className="bg-brand text-white hover:bg-brand/90">
                  {isPasswordSubmitting ? 'Сабт...' : 'Иваз кардани парол'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛИ ИВАЗИ ПАРОЛИ ХУДИ SUPERADMIN */}
      {isSuperAdminPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-line bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-ink">Ивази рамзи SuperAdmin</h3>
              </div>
              <button type="button" onClick={handleCloseSuperAdminPasswordModal} className="text-muted hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-line/60 bg-indigo-50/50 px-5 py-2.5 text-xs text-indigo-900">
              Шумо рамзи воридшавии ҳисоби асосии худро иваз карда истодаед.
            </div>

            {superAdminPasswordError && (
              <div className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">{superAdminPasswordError}</div>
            )}

            <form onSubmit={handleSaveSuperAdminPassword} className="space-y-4 p-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-muted">Рамзи нав (ҳадди ақал 6 рамз)</label>
                  <button
                    type="button"
                    onClick={handleGenerateSuperAdminPassword}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Тавлиди худкор
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showSuperAdminPassword ? 'text' : 'password'}
                    required
                    placeholder="Дилхоҳ пароли 6-символа"
                    value={superAdminNewPassword}
                    onChange={(e) => setSuperAdminNewPassword(e.target.value)}
                    className="h-10 w-full rounded-lg border border-line px-3 pr-10 text-sm focus:border-brand focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSuperAdminPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showSuperAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleCloseSuperAdminPasswordModal}
                  className="border-line bg-white text-muted hover:bg-panel hover:text-ink"
                >
                  Бекор кардан
                </Button>
                <Button
                  type="submit"
                  disabled={isSuperAdminPasswordSubmitting}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {isSuperAdminPasswordSubmitting ? 'Сабт...' : 'Ивази рамзи SuperAdmin'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛИ НЕСТКУНИИ КОМИЛ (Hard Delete Admin) */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Несткунии Админ (Hard Delete)</h3>
                <p className="mt-1 text-xs text-muted">
                  Оё мутмаин ҳастед, ки мехоҳед админ{' '}
                  <span className="font-bold text-ink">
                    «{deletingAdmin.firstName} {deletingAdmin.lastName}»
                  </span>
                  -ро пурра нест кунед? Ин амал баргардонида намешавад.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">{deleteError}</div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                onClick={handleCloseDeleteModal}
                className="border-line bg-white text-muted hover:bg-panel hover:text-ink"
              >
                Бекор кардан
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleteSubmitting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {isDeleteSubmitting ? 'Нест истодааст...' : 'Ҳа, пурра нест шавад'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
