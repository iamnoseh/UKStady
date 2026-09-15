import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Building2, Check, Layers, Plus, Search, X } from 'lucide-react';
import { Button } from '../components/Button';
import { createGroup, getGroups, getSubjects } from '../services/api';
import type { GroupDto, SubjectDto } from '../types/admin';
import { useAuth } from '../context/AuthContext';

const badgeColors = [
  'bg-violet-50 text-violet-700 border-violet-100',
  'bg-sky-50 text-sky-700 border-sky-100',
  'bg-emerald-50 text-emerald-700 border-emerald-100',
  'bg-amber-50 text-amber-700 border-amber-100',
  'bg-rose-50 text-rose-700 border-rose-100',
  'bg-cyan-50 text-cyan-700 border-cyan-100',
];

export function GroupsPage() {
  const { auth } = useAuth();
  const [groups, setGroups] = useState<GroupDto[]>([]);
  const [subjects, setSubjects] = useState<SubjectDto[]>([]);
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
      const [loadedGroups, loadedSubjects] = await Promise.all([
        getGroups(auth.accessToken),
        getSubjects(auth.accessToken),
      ]);
      setGroups(loadedGroups);
      setSubjects(loadedSubjects);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Гурӯҳҳо гирифта нашуданд.');
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSubject(subjectId: string) {
    setSelectedSubjectIds((current) =>
      current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !name.trim() || !branch.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      const group = await createGroup(auth.accessToken, {
        name: name.trim(),
        branch: branch.trim(),
        description: description.trim() || null,
        subjectIds: selectedSubjectIds,
      });
      setGroups((current) => [group, ...current]);
      setName('');
      setBranch('');
      setDescription('');
      setSelectedSubjectIds([]);
      setIsCreateOpen(false);
      setNotice('Гурӯҳ сохта шуд.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Гурӯҳ сохта нашуд.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredGroups = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return groups;
    }

    return groups.filter((group) =>
      `${group.name} ${group.branch} ${group.description ?? ''} ${group.subjects.map((subject) => subject.name).join(' ')}`
        .toLowerCase()
        .includes(value),
    );
  }, [groups, query]);

  return (
    <section className="px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm font-semibold text-muted">Administrator</p>
          <h2 className="mt-1 text-2xl font-bold">Гурӯҳҳо</h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-line bg-white px-3 xl:w-[360px]">
            <Search className="h-5 w-5 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-full flex-1 outline-none"
              placeholder="Ҷустуҷӯи гурӯҳ"
            />
          </div>
          <Button type="button" onClick={() => setIsCreateOpen((current) => !current)}>
            {isCreateOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isCreateOpen ? 'Пӯшидан' : 'Сохтани гурӯҳ'}
          </Button>
        </div>
      </div>

      {isCreateOpen ? (
        <form onSubmit={handleSubmit} className="mb-5 rounded-lg border border-line bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">Гурӯҳи нав</h3>
              <p className="text-sm text-muted">Филиал ва фанҳои гурӯҳро интихоб кунед.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold">Номи гурӯҳ</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                placeholder="Гурӯҳи A"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Филиал</span>
              <input
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                placeholder="Марказӣ"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Тавсиф</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                placeholder="Тавсифи кӯтоҳ"
              />
            </label>
          </div>

          <div className="mt-4">
            <span className="text-sm font-semibold">Фанҳо</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {subjects.filter((subject) => subject.isActive).map((subject, index) => {
                const isSelected = selectedSubjectIds.includes(subject.id);
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => toggleSubject(subject.id)}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                      isSelected ? badgeColors[index % badgeColors.length] : 'border-line bg-white text-muted hover:bg-panel'
                    }`}
                  >
                    {isSelected ? <Check className="h-4 w-4" /> : null}
                    {subject.name}
                  </button>
                );
              })}
              {subjects.length === 0 ? <span className="text-sm text-muted">Аввал фан созед.</span> : null}
            </div>
          </div>

          {notice ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <Button type="submit" className="mt-5" disabled={isSubmitting || !name.trim() || !branch.trim()}>
            <Plus className="h-4 w-4" />
            {isSubmitting ? 'Сохта истодааст...' : 'Сохтани гурӯҳ'}
          </Button>
        </form>
      ) : null}

      {!isCreateOpen && notice ? (
        <p className="mb-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
      ) : null}
      {!isCreateOpen && error ? (
        <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {isLoading ? <p className="rounded-lg border border-line bg-white px-4 py-5 text-sm text-muted">Бор шуда истодааст...</p> : null}

      {!isLoading && filteredGroups.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-5 text-sm text-muted">Ҳоло гурӯҳ нест.</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredGroups.map((group, groupIndex) => {
          const isActive = group.isActive;
          return (
            <article
              key={group.id}
              className={`rounded-xl border p-5 transition-all shadow-sm ${
                isActive
                  ? 'border-emerald-300 bg-emerald-50/80 hover:border-emerald-400 hover:bg-emerald-50'
                  : 'border-red-300 bg-red-50/80 hover:border-red-400 hover:bg-red-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-ink">{group.name}</h3>
                <span
                  className={`rounded-md border px-2.5 py-1 text-xs font-bold ${
                    isActive
                      ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                      : 'border-red-300 bg-red-100 text-red-800'
                  }`}
                >
                  {isActive ? 'Фаъол' : 'Хомӯш'}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-xs">
                  <Building2 className="h-4 w-4 text-slate-500" />
                  {group.branch}
                </span>
                <span className="rounded-lg border border-indigo-100 bg-white/90 px-3 py-1.5 text-sm font-semibold text-indigo-700 shadow-xs">
                  {group.studentCount} хонанда
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {group.subjects.length > 0 ? (
                  group.subjects.map((subject, subjectIndex) => (
                    <span
                      key={subject.id}
                      className={`rounded-lg border bg-white/90 px-3 py-1.5 text-sm font-semibold ${badgeColors[(groupIndex + subjectIndex) % badgeColors.length]}`}
                    >
                      {subject.name}
                    </span>
                  ))
                ) : (
                  <span className="rounded-lg border border-line bg-white/80 px-3 py-1.5 text-sm font-semibold text-muted">
                    Фан нест
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
