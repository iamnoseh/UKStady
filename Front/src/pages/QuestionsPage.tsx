import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CircleDot,
  Edit3,
  FileText,
  Keyboard,
  ListChecks,
  Plus,
  Search,
  Trash2,
  Upload,
  Wand2,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination, paginate } from '../components/Pagination';
import { createQuestion, deleteQuestion, getQuestionsByTopic, updateQuestion } from '../services/api';
import type { QuestionDto, QuestionType, SubjectDto, TopicDto } from '../types/admin';
import { useAuth } from '../context/AuthContext';

interface DraftOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface ImportQuestionDraft {
  id: string;
  text: string;
  type: QuestionType;
  points: number;
  options: DraftOption[];
  error: string | null;
}

const createDraftOption = (index: number): DraftOption => ({
  id: `${Date.now()}-${index}-${Math.random()}`,
  text: '',
  isCorrect: index === 0,
});

const questionTypeLabels: Record<QuestionType, string> = {
  ClosedAnswer: 'Пӯшида',
  SingleChoice: 'Кушода',
};

export function QuestionsPage({
  subject,
  topic,
  onBack,
}: {
  subject: SubjectDto;
  topic: TopicDto;
  onBack: () => void;
}) {
  const { auth } = useAuth();
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [text, setText] = useState('');
  const [type, setType] = useState<QuestionType>('ClosedAnswer');
  const [points, setPoints] = useState(1);
  const [options, setOptions] = useState<DraftOption[]>([createDraftOption(0)]);
  const [isActive, setIsActive] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<QuestionDto | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportPage, setIsImportPage] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importDrafts, setImportDrafts] = useState<ImportQuestionDraft[]>([]);
  const [isAnalyzingImport, setIsAnalyzingImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    void loadQuestions();
  }, [topic.id]);

  async function loadQuestions() {
    if (!auth) {
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      setQuestions(await getQuestionsByTopic(auth.accessToken, topic.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Саволҳо гирифта нашуданд.');
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setEditingQuestion(null);
    setText('');
    setType('ClosedAnswer');
    setPoints(1);
    setOptions([createDraftOption(0)]);
    setIsActive(true);
  }

  function startEdit(question: QuestionDto) {
    setEditingQuestion(question);
    setText(question.text);
    setType(question.type);
    setPoints(question.points);
    const sortedOptions = question.options
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
        }));
    setOptions(question.type === 'ClosedAnswer' ? [sortedOptions[0] ?? createDraftOption(0)] : sortedOptions);
    setIsActive(question.isActive);
    setNotice('');
    setError('');
  }

  function setQuestionType(nextType: QuestionType) {
    setType(nextType);
    if (nextType === 'ClosedAnswer') {
      setOptions((current) => [{ ...(current.find((option) => option.isCorrect) ?? current[0] ?? createDraftOption(0)), isCorrect: true }]);
      return;
    }

    if (nextType === 'SingleChoice') {
      setOptions((current) => {
        const normalized = [...current];
        while (normalized.length < 4) {
          normalized.push(createDraftOption(normalized.length));
        }

        const fourOptions = normalized.slice(0, 4);
        const firstCorrectIndex = fourOptions.findIndex((option) => option.isCorrect);
        return fourOptions.map((option, index) => ({ ...option, isCorrect: index === Math.max(firstCorrectIndex, 0) }));
      });
    }
  }

  function updateOptionText(id: string, value: string) {
    setOptions((current) => current.map((option) => option.id === id ? { ...option, text: value } : option));
  }

  function toggleCorrect(id: string) {
    setOptions((current) => current.map((option) => ({ ...option, isCorrect: option.id === id })));
  }

  function validateForm() {
    const cleanOptions = options.map((option) => ({ ...option, text: option.text.trim() }));
    if (!text.trim()) {
      return 'Матни саволро ворид кунед.';
    }

    if (points <= 0) {
      return 'Хол бояд аз 0 калон бошад.';
    }

    if (type === 'ClosedAnswer') {
      if (cleanOptions.length !== 1 || !cleanOptions[0]?.text) {
        return 'Барои саволи пӯшида ҷавоби дурустро ворид кунед.';
      }

      return null;
    }

    const correctCount = cleanOptions.filter((option) => option.isCorrect).length;
    if (cleanOptions.length !== 4 || cleanOptions.some((option) => !option.text)) {
      return 'Барои саволи кушода 4 варианти пуркардашуда лозим аст.';
    }

    if (correctCount !== 1) {
      return 'Барои саволи кушода танҳо як варианти дурустро интихоб кунед.';
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) {
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const body = {
      topicId: topic.id,
      text: text.trim(),
      type,
      points,
      options: (type === 'ClosedAnswer' ? options.slice(0, 1) : options).map((option, index) => ({
        text: option.text.trim(),
        isCorrect: type === 'ClosedAnswer' ? true : option.isCorrect,
        sortOrder: index + 1,
      })),
    };

    setIsSubmitting(true);
    setError('');
    setNotice('');
    try {
      if (editingQuestion) {
        const question = await updateQuestion(auth.accessToken, editingQuestion.id, {
          ...body,
          isActive,
        });
        setQuestions((current) => current.map((item) => item.id === question.id ? question : item));
        setNotice('Савол таҳрир шуд.');
      } else {
        const question = await createQuestion(auth.accessToken, body);
        setQuestions((current) => [question, ...current]);
        setNotice('Савол сохта шуд.');
      }
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : editingQuestion ? 'Савол таҳрир нашуд.' : 'Савол сохта нашуд.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(question: QuestionDto) {
    if (!auth || !window.confirm('Савол ғайрифаъол карда шавад?')) {
      return;
    }

    setError('');
    setNotice('');
    try {
      await deleteQuestion(auth.accessToken, question.id);
      setQuestions((current) => current.map((item) => item.id === question.id ? { ...item, isActive: false } : item));
      if (editingQuestion?.id === question.id) {
        resetForm();
      }
      setNotice('Савол ғайрифаъол карда шуд.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Савол нест карда нашуд.');
    }
  }

  async function handleAnalyzeImport() {
    if (!importFile) {
      setError('Аввал файли DOCX-ро интихоб кунед.');
      return;
    }

    setIsAnalyzingImport(true);
    setError('');
    setNotice('');
    try {
      const rawText = await extractImportText(importFile);
      const parsedDrafts = parseImportedQuestions(rawText);
      setImportDrafts(parsedDrafts);
      setNotice(`${parsedDrafts.length} савол барои таҳрир омода шуд.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Файл анализ нашуд.');
    } finally {
      setIsAnalyzingImport(false);
    }
  }

  function updateImportDraft(id: string, patch: Partial<Pick<ImportQuestionDraft, 'text' | 'points'>>) {
    setImportDrafts((current) => current.map((draft) => (
      draft.id === id ? validateImportDraft({ ...draft, ...patch }) : draft
    )));
  }

  function updateImportOption(draftId: string, optionId: string, patch: Partial<Pick<DraftOption, 'text' | 'isCorrect'>>) {
    setImportDrafts((current) => current.map((draft) => {
      if (draft.id !== draftId) {
        return draft;
      }

      const nextOptions = draft.options.map((option) => {
        if (option.id !== optionId) {
          return option;
        }

        return { ...option, ...patch };
      });
      const normalizedOptions = draft.type === 'SingleChoice' && patch.isCorrect
        ? nextOptions.map((option) => ({ ...option, isCorrect: option.id === optionId }))
        : nextOptions;

      return validateImportDraft({ ...draft, options: normalizedOptions });
    }));
  }

  async function handleConfirmImport() {
    if (!auth) {
      return;
    }

    const validDrafts = importDrafts.map(validateImportDraft).filter((draft) => !draft.error);
    if (validDrafts.length === 0) {
      setError('Барои сабт саволи дуруст ёфт нашуд.');
      return;
    }

    setIsImporting(true);
    setError('');
    setNotice('');
    try {
      const createdQuestions = await Promise.all(
        validDrafts.map((draft) => createQuestion(auth.accessToken, {
          topicId: topic.id,
          text: draft.text.trim(),
          type: draft.type,
          points: draft.points,
          options: draft.options.map((option, index) => ({
            text: option.text.trim(),
            isCorrect: draft.type === 'ClosedAnswer' ? true : option.isCorrect,
            sortOrder: index + 1,
          })),
        })),
      );
      setQuestions((current) => [...createdQuestions, ...current]);
      setImportDrafts([]);
      setImportFile(null);
      setIsImportPage(false);
      setNotice(`${createdQuestions.length} савол импорт шуд.`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Саволҳо импорт нашуданд.');
    } finally {
      setIsImporting(false);
    }
  }

  function cancelImport() {
    setImportFile(null);
    setImportDrafts([]);
    setError('');
    setNotice('');
    setIsImportPage(false);
  }

  const filteredQuestions = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return questions;
    }

    return questions.filter((question) =>
      `${question.text} ${question.options.map((option) => option.text).join(' ')}`.toLowerCase().includes(value),
    );
  }, [query, questions]);
  const pagedQuestions = paginate(filteredQuestions, page, 6);

  useEffect(() => {
    setPage(1);
  }, [query, questions.length, topic.id]);

  if (isImportPage) {
    return (
      <section className="px-4 py-6 lg:px-6">
        <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <Button type="button" variant="ghost" className="mb-3 h-9 px-2" onClick={() => setIsImportPage(false)}>
              <ArrowLeft className="h-4 w-4" />
              Бозгашт ба саволҳо
            </Button>
            <p className="text-sm font-semibold text-muted">{subject.name} / {topic.title}</p>
            <h2 className="mt-1 text-2xl font-bold">Импорти саволҳо</h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-ink transition hover:bg-panel">
              <FileText className="h-4 w-4" />
              {importFile ? importFile.name : 'Интихоби файл'}
              <input
                type="file"
                accept=".docx,.doc,.txt"
                className="hidden"
                onChange={(event) => {
                  setImportFile(event.target.files?.[0] ?? null);
                  setImportDrafts([]);
                }}
              />
            </label>
            <Button type="button" onClick={() => void handleAnalyzeImport()} disabled={!importFile || isAnalyzingImport}>
              <Wand2 className="h-4 w-4" />
              {isAnalyzingImport ? 'Анализ...' : 'Анализ'}
            </Button>
            {importDrafts.length > 0 ? (
              <Button type="button" onClick={() => void handleConfirmImport()} disabled={isImporting || importDrafts.every((draft) => draft.error)}>
                <Check className="h-4 w-4" />
                {isImporting ? 'Сабт...' : `Тасдиқ (${importDrafts.filter((draft) => !draft.error).length})`}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={cancelImport} disabled={isAnalyzingImport || isImporting}>
              <XCircle className="h-4 w-4" />
              Бекор кардан
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">Import Docx</h3>
              <p className="text-sm text-muted">Формат: савол дар `&lt;/&lt;Матни савол&gt;/&gt;`, ҷавоби дуруст бо `---`.</p>
            </div>
          </div>

          {notice ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          {importDrafts.length > 0 ? (
            <div className="mt-5 space-y-3">
              {importDrafts.map((draft, index) => (
                <div key={draft.id} className={`rounded-lg border p-4 ${draft.error ? 'border-red-200 bg-red-50/40' : 'border-line bg-panel/30'}`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-bold">Савол {index + 1} · {questionTypeLabels[draft.type]}</span>
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${draft.error ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {draft.error ?? 'Омода'}
                    </span>
                  </div>

                  <textarea
                    value={draft.text}
                    onChange={(event) => updateImportDraft(draft.id, { text: event.target.value })}
                    className="min-h-20 w-full resize-none rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand"
                  />

                  <div className="mt-3 grid gap-3 md:grid-cols-[100px_1fr]">
                    <label className="block">
                      <span className="text-xs font-bold uppercase text-muted">Хол</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.points}
                        onChange={(event) => updateImportDraft(draft.id, { points: Number(event.target.value) })}
                        className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 outline-none focus:border-brand"
                      />
                    </label>
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase text-muted">Ҷавобҳо</span>
                      {draft.options.map((option) => (
                        <div key={option.id} className="grid grid-cols-[40px_1fr] gap-2">
                          <button
                            type="button"
                            onClick={() => updateImportOption(draft.id, option.id, { isCorrect: true })}
                            className={`grid h-10 w-10 place-items-center rounded-lg border transition ${
                              option.isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-line bg-white text-muted hover:bg-panel'
                            }`}
                            title="Ҷавоби дуруст"
                            aria-label="Ҷавоби дуруст"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <input
                            value={option.text}
                            onChange={(event) => updateImportOption(draft.id, option.id, { text: event.target.value })}
                            className="h-10 min-w-0 rounded-lg border border-line bg-white px-3 outline-none focus:border-brand"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-line bg-panel/40 px-4 py-8 text-center text-sm text-muted">
              Файли DOCX-ро интихоб карда, аввал анализ кунед.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-6 lg:px-6">
      <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <Button type="button" variant="ghost" className="mb-3 h-9 px-2" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Бозгашт ба мавзӯъҳо
          </Button>
          <p className="text-sm font-semibold text-muted">{subject.name} / {topic.title}</p>
          <h2 className="mt-1 text-2xl font-bold">Саволҳо</h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsImportPage(true)}
          >
            <Upload className="h-4 w-4" />
            Import Docx
          </Button>
          <div className="flex h-11 w-full items-center gap-3 rounded-lg border border-line bg-white px-3 xl:w-[360px]">
            <Search className="h-5 w-5 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-full flex-1 outline-none"
              placeholder="Ҷустуҷӯи савол"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[520px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
              {editingQuestion ? <Edit3 className="h-5 w-5" /> : <ListChecks className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-bold">{editingQuestion ? 'Таҳрири савол' : 'Саволи нав'}</h3>
              <p className="text-sm text-muted">Навъи савол ва ҷавобҳои дурустро муайян кунед.</p>
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Матни савол</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="mt-2 min-h-28 w-full resize-none rounded-lg border border-line px-3 py-3 outline-none focus:border-brand"
              placeholder="Саволро ворид кунед"
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_120px]">
            <div>
              <span className="text-sm font-semibold">Навъи савол</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(['ClosedAnswer', 'SingleChoice'] as QuestionType[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuestionType(item)}
                    className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-bold transition ${
                      type === item ? 'border-brand/30 bg-brand/10 text-brand' : 'border-line bg-white text-muted hover:bg-panel'
                    }`}
                  >
                    {item === 'ClosedAnswer' ? <Keyboard className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
                    {questionTypeLabels[item]}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-semibold">Хол</span>
              <input
                type="number"
                min={1}
                value={points}
                onChange={(event) => setPoints(Number(event.target.value))}
                className="mt-2 h-10 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
              />
            </label>
          </div>

          {type === 'ClosedAnswer' ? (
            <label className="mt-4 block">
              <span className="text-sm font-semibold">Ҷавоби дуруст</span>
              <input
                value={options[0]?.text ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setOptions((current) => [{ ...(current[0] ?? createDraftOption(0)), text: value, isCorrect: true }]);
                }}
                className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                placeholder="Ҷавоби дастиро ворид кунед"
              />
            </label>
          ) : (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">4 вариант</span>
              </div>

              <div className="mt-2 space-y-2">
                {options.slice(0, 4).map((option, index) => (
                  <div key={option.id} className="grid grid-cols-[40px_1fr] items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCorrect(option.id)}
                      className={`grid h-10 w-10 place-items-center rounded-lg border transition ${
                        option.isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-line text-muted hover:bg-panel'
                      }`}
                      title="Ҷавоби дуруст"
                      aria-label="Ҷавоби дуруст"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <input
                      value={option.text}
                      onChange={(event) => updateOptionText(option.id, event.target.value)}
                      className="h-10 min-w-0 rounded-lg border border-line px-3 outline-none focus:border-brand"
                      placeholder={`Варианти ${index + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {editingQuestion ? (
            <div className="mt-4">
              <span className="text-sm font-semibold">Ҳолат</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  className={`h-10 rounded-lg border text-sm font-bold transition ${
                    isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-line bg-white text-muted hover:bg-panel'
                  }`}
                >
                  Фаъол
                </button>
                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  className={`h-10 rounded-lg border text-sm font-bold transition ${
                    !isActive ? 'border-red-200 bg-red-50 text-red-700' : 'border-line bg-white text-muted hover:bg-panel'
                  }`}
                >
                  Ғайрифаъол
                </button>
              </div>
            </div>
          ) : null}

          {notice ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <Button type="submit" className="mt-5 w-full" disabled={isSubmitting || !text.trim()}>
            {editingQuestion ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isSubmitting ? 'Нигоҳ дошта истодааст...' : editingQuestion ? 'Нигоҳ доштан' : 'Сохтани савол'}
          </Button>
          {editingQuestion ? (
            <Button type="button" variant="secondary" className="mt-3 w-full" onClick={resetForm}>
              <XCircle className="h-4 w-4" />
              Бекор кардан
            </Button>
          ) : null}
        </form>

        <div className="min-w-0">
          <div className="min-h-[520px] overflow-hidden rounded-lg border border-line bg-white">
            <div className="grid grid-cols-[1.4fr_140px_100px_120px_140px] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
              <span>Савол</span>
              <span>Навъ</span>
              <span>Хол</span>
              <span>Ҳолат</span>
              <span>Амал</span>
            </div>

            {isLoading ? <p className="px-4 py-5 text-sm text-muted">Бор шуда истодааст...</p> : null}

            {!isLoading && filteredQuestions.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">Ҳоло савол нест.</p>
            ) : null}

            {pagedQuestions.items.map((question) => {
              const correctCount = question.options.filter((option) => option.isCorrect).length;
              const detailText = question.type === 'ClosedAnswer'
                ? 'Ҷавоби дастӣ'
                : `${question.options.length} вариант · ${correctCount} ҷавоби дуруст`;
              return (
                <div key={question.id} className="grid grid-cols-[1.4fr_140px_100px_120px_140px] items-center border-b border-line px-4 py-4 text-sm last:border-0">
                  <div className="min-w-0">
                    <p className="font-semibold">{question.text}</p>
                    <p className="truncate text-muted">{detailText}</p>
                  </div>
                  <span className="text-muted">{questionTypeLabels[question.type]}</span>
                  <span className="font-semibold">{question.points}</span>
                  <span className={`w-fit rounded-md px-2 py-1 text-xs font-bold ${question.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {question.isActive ? 'Фаъол' : 'Ғайрифаъол'}
                  </span>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => startEdit(question)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="secondary" className="h-9 px-3 text-red-600 hover:bg-red-50" onClick={() => void handleDelete(question)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Pagination
              page={pagedQuestions.page}
              pageCount={pagedQuestions.pageCount}
              total={filteredQuestions.length}
              from={pagedQuestions.from}
              to={pagedQuestions.to}
              onPageChange={setPage}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

async function extractImportText(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'docx') {
    const mammothModule = await import('mammoth');
    const mammoth = mammothModule.default ?? mammothModule;
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }

  if (extension === 'txt' || extension === 'doc') {
    return await file.text();
  }

  throw new Error('Танҳо файлҳои .docx, .doc ё .txt қабул мешаванд.');
}

function parseImportedQuestions(rawText: string): ImportQuestionDraft[] {
  const normalizedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const markerRegex = /<\/<([\s\S]*?)>\/>/g;
  const matches = [...normalizedText.matchAll(markerRegex)];

  if (matches.length === 0) {
    throw new Error('Дар файл савол бо формати </<Матни савол>/> ёфт нашуд.');
  }

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const blockStart = (match.index ?? 0) + match[0].length;
    const blockEnd = nextMatch?.index ?? normalizedText.length;
    const parsedOptions = parseImportOptions(normalizedText.slice(blockStart, blockEnd));
    const type: QuestionType = parsedOptions.length === 1 ? 'ClosedAnswer' : 'SingleChoice';
    const options = type === 'ClosedAnswer'
      ? parsedOptions.slice(0, 1).map((option) => ({ ...option, isCorrect: true }))
      : parsedOptions.slice(0, 4);

    return validateImportDraft({
      id: createImportId(index),
      text: cleanImportText(match[1]),
      type,
      points: 1,
      options,
      error: null,
    });
  });
}

function parseImportOptions(blockText: string): DraftOption[] {
  const lines = blockText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const lineOptions = lines
    .map((line, optionIndex) => parseImportOption(line, optionIndex))
    .filter((option): option is DraftOption => Boolean(option));
  const inlineOptions = parseInlineImportOptions(blockText);

  return inlineOptions.length > lineOptions.length ? inlineOptions : lineOptions;
}

function parseInlineImportOptions(blockText: string): DraftOption[] {
  const compactText = blockText.replace(/\s+/g, ' ').trim();
  const optionMarkerRegex = /(?:^|\s)((?:-{2,3}|—)\s*)?([A-DАБВГСД])\s*[\).:\-]\s*/giu;
  const matches = [...compactText.matchAll(optionMarkerRegex)];

  if (matches.length === 0) {
    return [];
  }

  return matches
    .map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = matches[index + 1]?.index ?? compactText.length;
      let value = compactText.slice(start, end).trim();
      let isCorrect = Boolean(match[1]);

      if (/^(?:-{2,3}|—)\s*/u.test(value)) {
        isCorrect = true;
        value = value.replace(/^(?:-{2,3}|—)\s*/u, '');
      }

      value = cleanImportText(value);
      return value ? { id: createImportId(index), text: value, isCorrect } : null;
    })
    .filter((option): option is DraftOption => Boolean(option));
}

function parseImportOption(line: string, index: number): DraftOption | null {
  let value = line.trim();
  if (!value) {
    return null;
  }

  let isCorrect = false;
  if (/^(?:-{2,3}|—)\s*/u.test(value)) {
    isCorrect = true;
    value = value.replace(/^(?:-{2,3}|—)\s*/u, '');
  }

  value = value.replace(/^[A-DАБВГСД]\s*[\).:\-]\s*/iu, '');

  if (/^(?:-{2,3}|—)\s*/u.test(value)) {
    isCorrect = true;
    value = value.replace(/^(?:-{2,3}|—)\s*/u, '');
  }

  value = cleanImportText(value);
  return value ? { id: createImportId(index), text: value, isCorrect } : null;
}

function validateImportDraft(draft: ImportQuestionDraft): ImportQuestionDraft {
  const cleanOptions = draft.options.map((option) => ({ ...option, text: option.text.trim() }));
  let error: string | null = null;

  if (!draft.text.trim()) {
    error = 'Матни савол нест';
  } else if (draft.points <= 0) {
    error = 'Хол нодуруст аст';
  } else if (draft.type === 'ClosedAnswer') {
    if (cleanOptions.length !== 1 || !cleanOptions[0]?.text) {
      error = 'Барои пӯшида 1 ҷавоб лозим';
    }
  } else if (cleanOptions.length !== 4 || cleanOptions.some((option) => !option.text)) {
    error = 'Барои кушода 4 вариант лозим';
  } else if (cleanOptions.filter((option) => option.isCorrect).length !== 1) {
    error = 'Ҷавоби дуруст бо --- ишора шавад';
  }

  return { ...draft, options: cleanOptions, error };
}

function cleanImportText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function createImportId(index: number) {
  return `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
}
