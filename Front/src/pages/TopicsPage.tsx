import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookMarked, Layers, Link2, Plus, Search } from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination, paginate } from '../components/Pagination';
import { createTopic, getTopics } from '../services/api';
import type { SubjectDto, TopicDto } from '../types/admin';
import { useAuth } from '../context/AuthContext';

export function TopicsPage({
  subject,
  onBack,
}: {
  subject: SubjectDto;
  onBack: () => void;
}) {
  const { auth } = useAuth();
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [grade, setGrade] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const topic = await createTopic(auth.accessToken, {
        subjectId: subject.id,
        title: title.trim(),
        description: description.trim() || null,
        source: source.trim() || null,
        grade: grade.trim() || null,
      });
      setTopics((current) => [topic, ...current]);
      setTitle('');
      setSource('');
      setGrade('');
      setDescription('');
      setNotice('Мавзӯъ сохта шуд.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Мавзӯъ сохта нашуд.');
    } finally {
      setIsSubmitting(false);
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
    <section className="px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <Button type="button" variant="ghost" className="mb-3 h-9 px-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Бозгашт ба фанҳо
          </Button>
          <p className="text-sm font-semibold text-muted">Фан: {subject.name}</p>
          <h2 className="mt-1 text-2xl font-bold">Мавзӯъҳо</h2>
        </div>

        <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-line bg-white px-3 xl:w-[360px]">
          <Search className="h-5 w-5 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-full flex-1 outline-none"
            placeholder="Ҷустуҷӯи мавзӯъ"
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
              <BookMarked className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">Мавзӯи нав</h3>
              <p className="text-sm text-muted">Мавзӯъ барои саволҳо ва дарси рӯз истифода мешавад.</p>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Номи мавзӯъ</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
              placeholder="Муодилаҳои квадратӣ"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold">Манбаъ</span>
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
              placeholder="Китоб, саҳифа ё ссылка"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold">Синф</span>
            <input
              value={grade}
              onChange={(event) => setGrade(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
              placeholder="Синфи 9"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold">Тавсиф</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-24 w-full resize-none rounded-lg border border-line px-3 py-3 outline-none focus:border-brand"
              placeholder="Шарҳи кӯтоҳ"
            />
          </label>

          {notice ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <Button type="submit" className="mt-5 w-full" disabled={isSubmitting || !title.trim()}>
            <Plus className="h-4 w-4" />
            {isSubmitting ? 'Сохта истодааст...' : 'Сохтани мавзӯъ'}
          </Button>
        </form>

        <div className="min-w-0">
          <div className="min-h-[420px] overflow-hidden rounded-lg border border-line bg-white">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_120px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
              <span>Мавзӯъ</span>
              <span>Манбаъ</span>
              <span>Синф</span>
              <span>Саволҳо</span>
            </div>

            {isLoading ? <p className="px-4 py-5 text-sm text-muted">Бор шуда истодааст...</p> : null}

            {!isLoading && filteredTopics.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">Ҳоло мавзӯъ нест.</p>
            ) : null}

            {pagedTopics.items.map((topic) => (
              <div key={topic.id} className="grid grid-cols-[1.4fr_1fr_1fr_120px] items-center border-b border-line px-4 py-4 text-sm last:border-0">
                <div>
                  <p className="font-semibold">{topic.title}</p>
                  <p className="text-muted">{topic.description || 'Бе тавсиф'}</p>
                </div>
                <span className="inline-flex min-w-0 items-center gap-2 text-muted">
                  <Link2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{topic.source || 'Нест'}</span>
                </span>
                <span className="inline-flex w-fit items-center gap-2 rounded-md bg-slate-50 px-2 py-1 font-semibold text-slate-700">
                  <Layers className="h-4 w-4" />
                  {topic.grade || 'Нест'}
                </span>
                <span className="text-muted">{topic.questionCount}</span>
              </div>
            ))}
          </div>
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
