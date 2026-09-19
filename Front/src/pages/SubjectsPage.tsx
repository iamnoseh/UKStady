import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BookOpen, Edit3, ListTree, Plus, Search, Trash2, X, XCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination, paginate } from '../components/Pagination';
import { createSubject, deleteSubject, getCurrentTeacherSubjects, getSubjects, updateSubject } from '../services/api';
import type { SubjectDto } from '../types/admin';
import { useAuth } from '../context/AuthContext';

export function SubjectsPage({ onOpenTopics }: { onOpenTopics: (subject: SubjectDto) => void }) {
  const { auth } = useAuth();
  const isTeacher = auth?.role === 'Teacher';
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [editingSubject, setEditingSubject] = useState<SubjectDto | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    void loadSubjects();
  }, []);

  async function loadSubjects() {
    if (!auth) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      setSubjects(await (isTeacher
        ? getCurrentTeacherSubjects(auth.accessToken)
        : getSubjects(auth.accessToken)));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Фанҳо гирифта нашуданд.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !name.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      if (editingSubject) {
        const subject = await updateSubject(auth.accessToken, editingSubject.id, {
          name: name.trim(),
          description: description.trim() || null,
          isActive,
        });
        setSubjects((current) => current.map((item) => item.id === subject.id ? subject : item));
        setNotice('Фан таҳрир шуд.');
      } else {
        const subject = await createSubject(auth.accessToken, {
          name: name.trim(),
          description: description.trim() || null,
        });
        setSubjects((current) => [subject, ...current]);
        setNotice('Фан сохта шуд.');
      }
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : editingSubject ? 'Фан таҳрир нашуд.' : 'Фан сохта нашуд.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(subject: SubjectDto) {
    setEditingSubject(subject);
    setName(subject.name);
    setDescription(subject.description ?? '');
    setIsActive(subject.isActive);
    setNotice('');
    setError('');
    setIsFormOpen(true);
  }

  function resetForm() {
    setEditingSubject(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setIsFormOpen(false);
  }

  async function handleDelete(subject: SubjectDto) {
    if (!auth || !window.confirm(`Фан "${subject.name}" ғайрифаъол карда шавад?`)) {
      return;
    }

    setError('');
    setNotice('');
    try {
      await deleteSubject(auth.accessToken, subject.id);
      setSubjects((current) => current.map((item) => item.id === subject.id ? { ...item, isActive: false } : item));
      if (editingSubject?.id === subject.id) {
        resetForm();
      }
      setNotice('Фан ғайрифаъол карда шуд.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Фан нест карда нашуд.');
    }
  }

  const filteredSubjects = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return subjects;
    }

    return subjects.filter((subject) => subject.name.toLowerCase().includes(value));
  }, [query, subjects]);
  const pagedSubjects = paginate(filteredSubjects, page, 8);

  useEffect(() => {
    setPage(1);
  }, [query, subjects.length]);

  return (
    <section className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted sm:text-sm">
            {isTeacher ? 'Муаллим' : 'Administrator'}
          </p>
          <h2 className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">
            {isTeacher ? 'Фанҳои ман' : 'Фанҳо'}
          </h2>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-line bg-white px-3 focus-within:border-brand sm:h-11 xl:w-[320px]">
            <Search className="h-4 w-4 text-muted shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-full flex-1 text-sm outline-none placeholder:text-muted/70"
              placeholder="Ҷустуҷӯи фан..."
            />
          </div>
          {!isTeacher ? (
            <Button
              type="button"
              onClick={() => {
                if (isFormOpen && editingSubject) {
                  resetForm();
                } else {
                  setIsFormOpen((prev) => !prev);
                }
              }}
              className="h-10 px-3.5 text-sm xl:hidden"
            >
              {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              <span>{isFormOpen ? 'Пӯшидан' : 'Фани нав'}</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className={isTeacher ? 'grid gap-5' : 'grid gap-5 xl:grid-cols-[380px_1fr]'}>
        {!isTeacher ? (
          <form
            onSubmit={handleSubmit}
            className={`rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5 ${
              isFormOpen ? 'block' : 'hidden xl:block'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
                  {editingSubject ? <Edit3 className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-ink">{editingSubject ? 'Таҳрири фан' : 'Фани нав'}</h3>
                  <p className="text-xs text-muted">
                    {editingSubject ? 'Маълумоти фанро нав кунед.' : 'Барои мавзӯъҳо асос мешавад.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted xl:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-muted">Номи фан</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                placeholder="Математика"
              />
            </label>

            <label className="mt-3 block">
              <span className="text-xs font-semibold text-muted">Тавсиф</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-1 min-h-20 w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
                placeholder="Тавсифи кӯтоҳ"
              />
            </label>

            {editingSubject ? (
              <div className="mt-3">
                <span className="text-xs font-semibold text-muted">Ҳолат</span>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`h-9 rounded-lg border text-xs font-bold transition ${
                      isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-line bg-white text-muted hover:bg-panel'
                    }`}
                  >
                    Фаъол
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`h-9 rounded-lg border text-xs font-bold transition ${
                      !isActive ? 'border-red-200 bg-red-50 text-red-700' : 'border-line bg-white text-muted hover:bg-panel'
                    }`}
                  >
                    Ғайрифаъол
                  </button>
                </div>
              </div>
            ) : null}

            {notice ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p> : null}
            {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

            <Button type="submit" className="mt-4 w-full h-11" disabled={isSubmitting || !name.trim()}>
              {editingSubject ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isSubmitting ? 'Нигоҳ дошта истодааст...' : editingSubject ? 'Нигоҳ доштан' : 'Сохтани фан'}
            </Button>
            {editingSubject ? (
              <Button type="button" variant="secondary" className="mt-2 w-full h-10" onClick={resetForm}>
                <XCircle className="h-4 w-4" />
                Бекор кардан
              </Button>
            ) : null}
          </form>
        ) : null}

        <div className="min-w-0">
          {isLoading ? (
            <div className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">
              Бор шуда истодааст...
            </div>
          ) : null}

          {!isLoading && filteredSubjects.length === 0 ? (
            <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
              Ҳоло фан нест.
            </div>
          ) : null}

          {!isLoading && filteredSubjects.length > 0 ? (
            <>
              {/* МОБИЛ КОРТҲОИ ФАНҲО (< md) */}
              <div className="space-y-2.5 md:hidden">
                {pagedSubjects.items.map((subject) => (
                  <div
                    key={`mobile-${subject.id}`}
                    className="rounded-xl border border-line bg-white p-3.5 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-ink sm:text-base">{subject.name}</h3>
                        {subject.description ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{subject.description}</p>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          subject.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {subject.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="rounded-md bg-panel px-2 py-0.5 font-semibold text-muted">
                          {subject.topicCount} мавзӯъ
                        </span>
                        <span className="rounded-md bg-brand/10 px-2 py-0.5 font-bold text-brand">
                          {subject.questionCount} савол
                        </span>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-3 text-xs font-semibold"
                          onClick={() => onOpenTopics(subject)}
                        >
                          <ListTree className="h-4 w-4" />
                          {isTeacher ? 'Саволҳо' : 'Мавзӯъҳо'}
                        </Button>
                        {!isTeacher ? (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(subject)}
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-slate-700 transition hover:border-brand/40 hover:bg-panel hover:text-brand"
                              title="Таҳрир"
                              aria-label="Таҳрир"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            {auth?.role === 'SuperAdmin' && (
                              <button
                                type="button"
                                onClick={() => void handleDelete(subject)}
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                title="Ғайрифаъол кардан"
                                aria-label="Ғайрифаъол кардан"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ҶАДВАЛИ ПЛАНШЕТ ВА КОМПЮТЕР (>= md) */}
              <div className="hidden min-h-[420px] overflow-hidden rounded-xl border border-line bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <div className="min-w-[680px]">
                    <div className="grid grid-cols-[1.3fr_110px_110px_120px_240px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
                      <span>Фан</span>
                      <span>Мавзӯъҳо</span>
                      <span>Саволҳо</span>
                      <span>Ҳолат</span>
                      <span>Амал</span>
                    </div>

                    {pagedSubjects.items.map((subject) => (
                      <div
                        key={`desktop-${subject.id}`}
                        className="grid grid-cols-[1.3fr_110px_110px_120px_240px] items-center border-b border-line px-4 py-3.5 text-sm last:border-0 hover:bg-panel/30"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-semibold text-ink">{subject.name}</p>
                          <p className="truncate text-xs text-muted">{subject.description || 'Бе тавсиф'}</p>
                        </div>
                        <span className="text-xs text-muted">{subject.topicCount}</span>
                        <span className="font-semibold text-ink text-xs">{subject.questionCount}</span>
                        <span
                          className={`w-fit rounded-lg px-2.5 py-1 text-xs font-bold ${
                            subject.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {subject.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-8 px-2.5 text-xs font-semibold"
                            onClick={() => onOpenTopics(subject)}
                          >
                            <ListTree className="h-4 w-4" />
                            {isTeacher ? 'Саволҳо' : 'Мавзӯъҳо'}
                          </Button>
                          {!isTeacher ? (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(subject)}
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-white text-slate-700 transition hover:border-brand/40 hover:bg-panel hover:text-brand"
                                title="Таҳрир"
                                aria-label="Таҳрир"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              {auth?.role === 'SuperAdmin' && (
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(subject)}
                                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                  title="Ғайрифаъол кардан"
                                  aria-label="Ғайрифаъол кардан"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div className="mt-4">
            <Pagination
              page={pagedSubjects.page}
              pageCount={pagedSubjects.pageCount}
              total={filteredSubjects.length}
              from={pagedSubjects.from}
              to={pagedSubjects.to}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
