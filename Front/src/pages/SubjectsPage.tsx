import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BookOpen, ListTree, Plus, Search } from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination, paginate } from '../components/Pagination';
import { createSubject, getSubjects } from '../services/api';
import type { SubjectDto } from '../types/admin';
import { useAuth } from '../context/AuthContext';

export function SubjectsPage({ onOpenTopics }: { onOpenTopics: (subject: SubjectDto) => void }) {
  const { auth } = useAuth();
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setSubjects(await getSubjects(auth.accessToken));
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
    try {
      const subject = await createSubject(auth.accessToken, {
        name: name.trim(),
        description: description.trim() || null,
      });
      setSubjects((current) => [subject, ...current]);
      setName('');
      setDescription('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Фан сохта нашуд.');
    } finally {
      setIsSubmitting(false);
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
    <section className="px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-muted">Administrator</p>
          <h2 className="mt-1 text-2xl font-bold">Фанҳо</h2>
        </div>

        <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-line bg-white px-3 xl:w-[360px]">
          <Search className="h-5 w-5 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-full flex-1 outline-none"
            placeholder="Ҷустуҷӯи фан"
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">Фани нав</h3>
              <p className="text-sm text-muted">Барои мавзӯъ ва саволҳо асос мешавад.</p>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Номи фан</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
              placeholder="Математика"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold">Тавсиф</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-24 w-full resize-none rounded-lg border border-line px-3 py-3 outline-none focus:border-brand"
              placeholder="Тавсифи кӯтоҳ"
            />
          </label>

          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <Button type="submit" className="mt-5 w-full" disabled={isSubmitting || !name.trim()}>
            <Plus className="h-4 w-4" />
            {isSubmitting ? 'Сохта истодааст...' : 'Сохтани фан'}
          </Button>
        </form>

        <div className="min-w-0">
          <div className="min-h-[420px] overflow-hidden rounded-lg border border-line bg-white">
            <div className="grid grid-cols-[1.3fr_120px_120px_150px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
              <span>Фан</span>
              <span>Мавзӯъҳо</span>
              <span>Ҳолат</span>
              <span>Амал</span>
            </div>

            {isLoading ? <p className="px-4 py-5 text-sm text-muted">Бор шуда истодааст...</p> : null}

            {!isLoading && filteredSubjects.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">Ҳоло фан нест.</p>
            ) : null}

            {pagedSubjects.items.map((subject) => (
              <div key={subject.id} className="grid grid-cols-[1.3fr_120px_120px_150px] items-center border-b border-line px-4 py-4 text-sm last:border-0">
                <div>
                  <p className="font-semibold">{subject.name}</p>
                  <p className="text-muted">{subject.description || 'Бе тавсиф'}</p>
                </div>
                <span className="text-muted">{subject.topicCount}</span>
                <span className={`w-fit rounded-md px-2 py-1 text-xs font-bold ${subject.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {subject.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                </span>
                <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => onOpenTopics(subject)}>
                  <ListTree className="h-4 w-4" />
                  Мавзӯъҳо
                </Button>
              </div>
            ))}
          </div>
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
