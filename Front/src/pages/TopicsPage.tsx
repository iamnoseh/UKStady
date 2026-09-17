import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookMarked, Edit3, Layers, Link2, ListChecks, Plus, Search, Trash2, X, XCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination, paginate } from '../components/Pagination';
import { createTopic, deleteTopic, getTopics, updateTopic } from '../services/api';
import type { SubjectDto, TopicDto } from '../types/admin';
import { useAuth } from '../context/AuthContext';

export function TopicsPage({
  subject,
  onOpenQuestions,
  onBack,
}: {
  subject: SubjectDto;
  onOpenQuestions: (topic: TopicDto) => void;
  onBack: () => void;
}) {
  const { auth } = useAuth();
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [grade, setGrade] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [editingTopic, setEditingTopic] = useState<TopicDto | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    void loadTopics();
  }, [subject.id]);

  async function loadTopics() {
    if (!auth) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const allTopics = await getTopics(auth.accessToken);
      setTopics(allTopics.filter((topic) => topic.subjectId === subject.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Мавзӯъҳо гирифта нашуданд.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !title.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      if (editingTopic) {
        const topic = await updateTopic(auth.accessToken, editingTopic.id, {
          title: title.trim(),
          description: description.trim() || null,
          source: source.trim() || null,
          grade: grade.trim() || null,
          isActive,
        });
        setTopics((current) => current.map((item) => item.id === topic.id ? topic : item));
        setNotice('Мавзӯъ таҳрир шуд.');
      } else {
        const topic = await createTopic(auth.accessToken, {
          subjectId: subject.id,
          title: title.trim(),
          description: description.trim() || null,
          source: source.trim() || null,
          grade: grade.trim() || null,
        });
        setTopics((current) => [topic, ...current]);
        setNotice('Мавзӯъ сохта шуд.');
      }
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : editingTopic ? 'Мавзӯъ таҳрир нашуд.' : 'Мавзӯъ сохта нашуд.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(topic: TopicDto) {
    setEditingTopic(topic);
    setTitle(topic.title);
    setSource(topic.source ?? '');
    setGrade(topic.grade ?? '');
    setDescription(topic.description ?? '');
    setIsActive(topic.isActive);
    setNotice('');
    setError('');
    setIsFormOpen(true);
  }

  function resetForm() {
    setEditingTopic(null);
    setTitle('');
    setSource('');
    setGrade('');
    setDescription('');
    setIsActive(true);
    setIsFormOpen(false);
  }

  async function handleDelete(topic: TopicDto) {
    if (!auth || !window.confirm(`Мавзӯъ "${topic.title}" ғайрифаъол карда шавад?`)) {
      return;
    }

    setError('');
    setNotice('');
    try {
      await deleteTopic(auth.accessToken, topic.id);
      setTopics((current) => current.map((item) => item.id === topic.id ? { ...item, isActive: false } : item));
      if (editingTopic?.id === topic.id) {
        resetForm();
      }
      setNotice('Мавзӯъ ғайрифаъол карда шуд.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Мавзӯъ нест карда нашуд.');
    }
  }

  const filteredTopics = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return topics;
    }

    return topics.filter((topic) =>
      `${topic.title} ${topic.description ?? ''} ${topic.source ?? ''} ${topic.grade ?? ''}`.toLowerCase().includes(value),
    );
  }, [query, topics]);
  const pagedTopics = paginate(filteredTopics, page, 8);

  useEffect(() => {
    setPage(1);
  }, [query, topics.length, subject.id]);

  return (
    <section className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-5 sm:flex-row sm:items-end">
        <div>
          <Button type="button" variant="ghost" className="mb-2 h-8 px-2 text-xs" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Бозгашт ба фанҳо
          </Button>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted sm:text-sm">Фан: {subject.name}</p>
          <h2 className="mt-0.5 text-xl font-bold text-ink sm:text-2xl">Мавзӯъҳо</h2>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-line bg-white px-3 focus-within:border-brand sm:h-11 xl:w-[320px]">
            <Search className="h-4 w-4 text-muted shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-full flex-1 text-sm outline-none placeholder:text-muted/70"
              placeholder="Ҷустуҷӯи мавзӯъ..."
            />
          </div>
          <Button
            type="button"
            onClick={() => {
              if (isFormOpen && editingTopic) {
                resetForm();
              } else {
                setIsFormOpen((prev) => !prev);
              }
            }}
            className="h-10 px-3.5 text-sm xl:hidden"
          >
            {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{isFormOpen ? 'Пӯшидан' : 'Мавзӯи нав'}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
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
                {editingTopic ? <Edit3 className="h-5 w-5" /> : <BookMarked className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-bold text-ink">{editingTopic ? 'Таҳрири мавзӯъ' : 'Мавзӯи нав'}</h3>
                <p className="text-xs text-muted">
                  {editingTopic ? 'Мавзӯъ ва ҳолати онро нав кунед.' : 'Барои саволҳо ва дарси рӯз истифода мешавад.'}
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
            <span className="text-xs font-semibold text-muted">Номи мавзӯъ</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
              placeholder="Муодилаҳои квадратӣ"
            />
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-muted">Синф</span>
              <input
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                placeholder="Синфи 9"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-muted">Манбаъ</span>
              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-brand"
                placeholder="Китоб ё саҳифа"
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="text-xs font-semibold text-muted">Тавсиф</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 min-h-20 w-full resize-none rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-brand"
              placeholder="Шарҳи кӯтоҳ"
            />
          </label>

          {editingTopic ? (
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

          <Button type="submit" className="mt-4 w-full h-11" disabled={isSubmitting || !title.trim()}>
            {editingTopic ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isSubmitting ? 'Нигоҳ дошта истодааст...' : editingTopic ? 'Нигоҳ доштан' : 'Сохтани мавзӯъ'}
          </Button>
          {editingTopic ? (
            <Button type="button" variant="secondary" className="mt-2 w-full h-10" onClick={resetForm}>
              <XCircle className="h-4 w-4" />
              Бекор кардан
            </Button>
          ) : null}
        </form>

        <div className="min-w-0">
          {isLoading ? (
            <div className="rounded-xl border border-line bg-white p-6 text-center text-sm text-muted">
              Бор шуда истодааст...
            </div>
          ) : null}

          {!isLoading && filteredTopics.length === 0 ? (
            <div className="rounded-xl border border-line bg-white p-8 text-center text-sm text-muted">
              Ҳоло мавзӯъ нест.
            </div>
          ) : null}

          {!isLoading && filteredTopics.length > 0 ? (
            <>
              {/* МОБИЛ КОРТҲОИ МАВЗӮЪҲО (< md) */}
              <div className="space-y-2.5 md:hidden">
                {pagedTopics.items.map((topic) => (
                  <div
                    key={`mobile-${topic.id}`}
                    className="rounded-xl border border-line bg-white p-3.5 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-ink sm:text-base">{topic.title}</h3>
                        {topic.description ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{topic.description}</p>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          topic.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {topic.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {topic.grade ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          <Layers className="h-3 w-3" />
                          {topic.grade}
                        </span>
                      ) : null}
                      {topic.source ? (
                        <span className="inline-flex max-w-[160px] truncate items-center gap-1 rounded-md bg-panel px-2 py-0.5 font-medium text-muted">
                          <Link2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{topic.source}</span>
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700">
                        <ListChecks className="h-3 w-3" />
                        {topic.questionCount} савол
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 border-t border-line/60 pt-2.5">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 px-3 text-xs font-semibold"
                        onClick={() => onOpenQuestions(topic)}
                      >
                        <ListChecks className="h-3.5 w-3.5" />
                        Саволҳо
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 w-9 p-0"
                        onClick={() => startEdit(topic)}
                        title="Таҳрир"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 w-9 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => void handleDelete(topic)}
                        title="Ғайрифаъол кардан"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ҶАДВАЛИ ПЛАНШЕТ ВА КОМПЮТЕР (>= md) */}
              <div className="hidden min-h-[420px] overflow-hidden rounded-xl border border-line bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <div className="min-w-[720px]">
                    <div className="grid grid-cols-[1.2fr_1fr_100px_110px_110px_220px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
                      <span>Мавзӯъ</span>
                      <span>Манбаъ</span>
                      <span>Синф</span>
                      <span>Ҳолат</span>
                      <span>Саволҳо</span>
                      <span>Амал</span>
                    </div>

                    {pagedTopics.items.map((topic) => (
                      <div
                        key={`desktop-${topic.id}`}
                        className="grid grid-cols-[1.2fr_1fr_100px_110px_110px_220px] items-center border-b border-line px-4 py-3.5 text-sm last:border-0 hover:bg-panel/30"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate font-semibold text-ink">{topic.title}</p>
                          <p className="truncate text-xs text-muted">{topic.description || 'Бе тавсиф'}</p>
                        </div>
                        <span className="truncate text-xs text-muted pr-2">{topic.source || 'Нест'}</span>
                        <span className="text-xs text-slate-700 font-medium">{topic.grade || 'Нест'}</span>
                        <span
                          className={`w-fit rounded-lg px-2.5 py-1 text-xs font-bold ${
                            topic.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {topic.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                        </span>
                        <span className="text-xs font-bold text-indigo-700">{topic.questionCount} савол</span>
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-8 px-2.5 text-xs font-semibold"
                            onClick={() => onOpenQuestions(topic)}
                          >
                            <ListChecks className="h-3.5 w-3.5" />
                            Саволҳо
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-8 w-8 p-0"
                            onClick={() => startEdit(topic)}
                            title="Таҳрир"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                            onClick={() => void handleDelete(topic)}
                            title="Ғайрифаъол кардан"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
              page={pagedTopics.page}
              pageCount={pagedTopics.pageCount}
              total={filteredTopics.length}
              from={pagedTopics.from}
              to={pagedTopics.to}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
