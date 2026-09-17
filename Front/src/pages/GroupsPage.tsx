import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Edit3,
  GraduationCap,
  Layers,
  Save,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Pagination, paginate } from '../components/Pagination';
import { SearchableMultiSelect } from '../components/SearchableMultiSelect';
import { SearchableSelect } from '../components/SearchableSelect';
import {
  addStudentToGroup,
  createTodayGroupLesson,
  createGroup,
  getGroupJournal,
  getGroups,
  getSubjects,
  getTeacherAssignments,
  getTeacherSubjects,
  getTopics,
  getUsers,
  setTeacherAssignment,
  removeStudentFromGroup,
  updateGroupJournalScore,
  updateGroupLessonTopic,
  updateGroup,
} from '../services/api';
import type {
  GroupDto,
  GroupJournalDto,
  GroupJournalLessonDto,
  GroupJournalLessonScoreDto,
  GroupSubjectDto,
  GroupSubjectJournalDto,
  SubjectDto,
  TeacherAssignmentDto,
  TeacherSubjectAssignmentDto,
  TopicDto,
  UserDto,
} from '../types/admin';
import { useAuth } from '../context/AuthContext';

type GroupTab = 'students' | 'journals' | 'teachers' | 'edit' | 'other';
type JournalView = 'subject' | 'weeklyReport';

type WeeklyReportRow = {
  studentId: string;
  fullName: string;
  phoneNumber: string;
  subjectScores: Record<string, number>;
  averageScore: number;
  grade: number;
};

const subjectBadgeColors = [
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
  const [topics, setTopics] = useState<TopicDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignmentDto[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubjectAssignmentDto[]>([]);
  const [journal, setJournal] = useState<GroupJournalDto | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GroupTab>('students');
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [editName, setEditName] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubjectIds, setEditSubjectIds] = useState<string[]>([]);
  const [subjectToAddId, setSubjectToAddId] = useState('');
  const [query, setQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [page, setPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStudentSubmitting, setIsStudentSubmitting] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isJournalLoading, setIsJournalLoading] = useState(false);
  const [journalBusySubjectId, setJournalBusySubjectId] = useState('');
  const [journalBusyLessonId, setJournalBusyLessonId] = useState('');
  const [activeJournalSubjectId, setActiveJournalSubjectId] = useState('');
  const [journalView, setJournalView] = useState<JournalView>('subject');
  const [topicModalLesson, setTopicModalLesson] = useState<{
    lesson: GroupJournalLessonDto;
    subject: GroupSubjectJournalDto;
  } | null>(null);
  const [scoreModal, setScoreModal] = useState<{
    lesson: GroupJournalLessonDto;
    studentId: string;
    studentName: string;
    score: GroupJournalLessonScoreDto;
  } | null>(null);
  const [topicModalTopicId, setTopicModalTopicId] = useState('');
  const [scoreModalValue, setScoreModalValue] = useState('');
  const [scoreModalReason, setScoreModalReason] = useState('');
  const [isScoreSubmitting, setIsScoreSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [teacherModalSubject, setTeacherModalSubject] = useState<GroupSubjectDto | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isTeacherAssignmentSubmitting, setIsTeacherAssignmentSubmitting] = useState(false);
  const canManageGroups = auth?.role === 'SuperAdmin' || auth?.role === 'Admin' || auth?.role === 'Manager';
  const canManageJournal = auth?.role !== 'Student';

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
      if (canManageGroups) {
        const [
          loadedGroups,
          loadedSubjects,
          loadedUsers,
          loadedTopics,
          loadedTeacherAssignments,
          loadedTeacherSubjects,
        ] = await Promise.all([
          getGroups(auth.accessToken),
          getSubjects(auth.accessToken),
          getUsers(auth.accessToken),
          getTopics(auth.accessToken),
          getTeacherAssignments(auth.accessToken),
          getTeacherSubjects(auth.accessToken),
        ]);
        setGroups(loadedGroups);
        setSubjects(loadedSubjects);
        setUsers(loadedUsers);
        setTopics(loadedTopics);
        setTeacherAssignments(loadedTeacherAssignments);
        setTeacherSubjects(loadedTeacherSubjects);
        return;
      }

      const [loadedGroups, loadedTopics] = auth.role === 'Student'
        ? [await getGroups(auth.accessToken), []]
        : await Promise.all([
            getGroups(auth.accessToken),
            getTopics(auth.accessToken),
          ]);
      setGroups(loadedGroups);
      setTopics(loadedTopics);
      setSubjects([]);
      setUsers([]);
      setTeacherAssignments([]);
      setTeacherSubjects([]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Groups could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }
  function openGroup(groupId: string) {
    const group = groups.find((candidate) => candidate.id === groupId);
    setSelectedGroupId(groupId);
    setActiveTab(canManageGroups ? 'students' : 'journals');
    setNotice('');
    setError('');
    setSelectedStudentIds([]);
    setStudentQuery('');
    setSubjectToAddId('');
    setJournal(null);
    setJournalView('subject');

    if (group) {
      syncEditFields(group);
    }
  }

  function closeGroup() {
    setSelectedGroupId(null);
    setActiveTab(canManageGroups ? 'students' : 'journals');
    setSelectedStudentIds([]);
    setJournal(null);
    setJournalView('subject');
  }

  function openTeacherModal(subject: GroupSubjectDto) {
    if (!selectedGroupId) {
      return;
    }

    const currentAssignment = teacherAssignments.find(
      (assignment) => assignment.groupId === selectedGroupId && assignment.subjectId === subject.id,
    );

    setTeacherModalSubject(subject);
    setSelectedTeacherId(currentAssignment?.teacherId ?? '');
    setError('');
    setNotice('');
  }

  function closeTeacherModal() {
    setTeacherModalSubject(null);
    setSelectedTeacherId('');
  }

  async function handleSaveTeacherAssignment() {
    if (!auth || !selectedGroupId || !teacherModalSubject || !selectedTeacherId) {
      return;
    }

    const currentAssignments = teacherAssignments.filter(
      (assignment) => assignment.groupId === selectedGroupId && assignment.subjectId === teacherModalSubject.id,
    );

    setIsTeacherAssignmentSubmitting(true);
    setError('');
    setNotice('');
    try {
      await setTeacherAssignment(
        auth.accessToken,
        selectedGroupId,
        teacherModalSubject.id,
        selectedTeacherId,
      );

      setTeacherAssignments(await getTeacherAssignments(auth.accessToken));
      setNotice(currentAssignments.length > 0 ? 'Муаллими фан иваз карда шуд.' : 'Муаллим ба фан ҳамроҳ карда шуд.');
      closeTeacherModal();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Муаллим ба фан таъин карда нашуд.');
    } finally {
      setIsTeacherAssignmentSubmitting(false);
    }
  }

  async function loadJournal(groupId = selectedGroupId) {
    if (!auth || !groupId) {
      return;
    }

    setIsJournalLoading(true);
    setError('');
    try {
      setJournal(await getGroupJournal(auth.accessToken, groupId));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Журнал гирифта нашуд.');
    } finally {
      setIsJournalLoading(false);
    }
  }

  function addEditSubject(subjectId: string) {
    if (!subjectId) {
      return;
    }

    setEditSubjectIds((current) => current.includes(subjectId) ? current : [...current, subjectId]);
    setSubjectToAddId('');
  }

  function removeEditSubject(subjectId: string) {
    setEditSubjectIds((current) => current.filter((id) => id !== subjectId));
  }

  function syncEditFields(group: GroupDto) {
    setEditName(group.name);
    setEditBranch(group.branch);
    setEditDescription(group.description ?? '');
    setEditIsActive(group.isActive);
    setEditSubjectIds(group.subjects.map((subject) => subject.id));
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

  async function handleAddStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !selectedGroupId || selectedStudentIds.length === 0) {
      return;
    }

    setIsStudentSubmitting(true);
    setError('');
    setNotice('');
    try {
      await Promise.all(
        selectedStudentIds.map((studentId) => addStudentToGroup(auth.accessToken, selectedGroupId, studentId)),
      );
      await loadData();
      setSelectedStudentIds([]);
      setNotice('Хонандагон ба гурӯҳ дохил шуданд.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Хонанда дохил нашуд.');
    } finally {
      setIsStudentSubmitting(false);
    }
  }

  async function handleRemoveStudent(studentId: string) {
    if (!auth || !selectedGroupId) {
      return;
    }

    setIsStudentSubmitting(true);
    setError('');
    setNotice('');
    try {
      await removeStudentFromGroup(auth.accessToken, selectedGroupId, studentId);
      await loadData();
      setNotice('Хонанда аз гурӯҳ хориҷ шуд.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Хонанда хориҷ нашуд.');
    } finally {
      setIsStudentSubmitting(false);
    }
  }

  async function handleUpdateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !selectedGroup || !editName.trim() || !editBranch.trim()) {
      return;
    }

    setIsEditSubmitting(true);
    setError('');
    setNotice('');
    try {
      const updatedGroup = await updateGroup(auth.accessToken, selectedGroup.id, {
        name: editName.trim(),
        branch: editBranch.trim(),
        description: editDescription.trim() || null,
        isActive: editIsActive,
        subjectIds: editSubjectIds,
      });
      setGroups((current) => current.map((group) => (group.id === updatedGroup.id ? updatedGroup : group)));
      syncEditFields(updatedGroup);
      setNotice('Гурӯҳ таҳрир шуд.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Гурӯҳ таҳрир нашуд.');
    } finally {
      setIsEditSubmitting(false);
    }
  }

  async function handleCreateTodayLesson(subjectId: string) {
    if (!auth || !selectedGroupId) {
      return;
    }

    setJournalBusySubjectId(subjectId);
    setError('');
    setNotice('');
    try {
      const result = await createTodayGroupLesson(auth.accessToken, selectedGroupId, subjectId);
      await loadJournal(selectedGroupId);
      setNotice(result.created ? 'Дарси имрӯз сохта шуд.' : 'Дарси имрӯз аллакай вуҷуд дорад.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Дарси имрӯз сохта нашуд.');
    } finally {
      setJournalBusySubjectId('');
    }
  }

  async function handleUpdateLessonTopic(lessonId: string, topicId: string) {
    if (!auth || !selectedGroupId || !topicId) {
      return;
    }

    setJournalBusyLessonId(lessonId);
    setError('');
    setNotice('');
    try {
      await updateGroupLessonTopic(auth.accessToken, selectedGroupId, lessonId, topicId);
      await loadJournal(selectedGroupId);
      setNotice('Мавзӯи дарс интихоб шуд.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Мавзӯи дарс нав нашуд.');
    } finally {
      setJournalBusyLessonId('');
    }
  }

  function openTopicModal(subject: GroupSubjectJournalDto, lesson: GroupJournalLessonDto) {
    setTopicModalLesson({ subject, lesson });
    setTopicModalTopicId(lesson.topicId ?? '');
    setError('');
  }

  function closeTopicModal() {
    setTopicModalLesson(null);
    setTopicModalTopicId('');
  }

  function openScoreModal(lesson: GroupJournalLessonDto, studentId: string, studentName: string, score: GroupJournalLessonScoreDto) {
    if (!score.canEdit || score.score === null) {
      return;
    }

    setScoreModal({ lesson, studentId, studentName, score });
    setScoreModalValue(String(score.score));
    setScoreModalReason('');
    setError('');
  }

  function closeScoreModal() {
    setScoreModal(null);
    setScoreModalValue('');
    setScoreModalReason('');
  }

  async function handleSaveLessonTopic() {
    if (!topicModalLesson || !topicModalTopicId) {
      return;
    }

    await handleUpdateLessonTopic(topicModalLesson.lesson.id, topicModalTopicId);
    closeTopicModal();
  }

  async function handleSaveScore() {
    if (!auth || !selectedGroupId || !scoreModal) {
      return;
    }

    const score = Number(scoreModalValue.replace(',', '.'));
    if (Number.isNaN(score) || score < 0 || score > 100) {
      setError('Бал бояд аз 0 то 100 бошад.');
      return;
    }

    setIsScoreSubmitting(true);
    setError('');
    setNotice('');
    try {
      await updateGroupJournalScore(
        auth.accessToken,
        selectedGroupId,
        scoreModal.lesson.id,
        scoreModal.studentId,
        {
          score,
          reason: scoreModalReason.trim() || null,
        },
      );
      await loadJournal(selectedGroupId);
      setNotice('Бали хонанда тағйир дода шуд.');
      closeScoreModal();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Бал тағйир дода нашуд.');
    } finally {
      setIsScoreSubmitting(false);
    }
  }

  const filteredGroups = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return groups;
    }

    return groups.filter((group) =>
      `${group.name} ${group.branch} ${group.description ?? ''}`.toLowerCase().includes(value),
    );
  }, [groups, query]);
  const pagedGroups = paginate(filteredGroups, page, 9);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const students = useMemo(() => users.filter((user) => user.role === 'Student'), [users]);
  const assignedStudentIds = useMemo(
    () => new Set(selectedGroup?.students.map((student) => student.id) ?? []),
    [selectedGroup],
  );
  const availableStudents = useMemo(
    () => students.filter((student) => !assignedStudentIds.has(student.id)),
    [assignedStudentIds, students],
  );
  const availableStudentOptions = useMemo(
    () => availableStudents.map((student) => ({
      value: student.id,
      label: `${student.firstName} ${student.lastName}`,
      meta: student.phoneNumber,
    })),
    [availableStudents],
  );
  const subjectOptions = useMemo(
    () => subjects.filter((subject) => subject.isActive).map((subject) => ({ value: subject.id, label: subject.name })),
    [subjects],
  );
  const createSubjectOptions = useMemo(
    () => subjects.filter((subject) => subject.isActive).map((subject) => ({ value: subject.id, label: subject.name })),
    [subjects],
  );
  const topicOptionsBySubject = useMemo(() => {
    return topics
      .filter((topic) => topic.isActive)
      .reduce<Record<string, { value: string; label: string; meta: string }[]>>((result, topic) => {
        result[topic.subjectId] ??= [];
        result[topic.subjectId].push({
          value: topic.id,
          label: topic.title,
          meta: `${topic.questionCount} савол`,
        });
        return result;
      }, {});
  }, [topics]);
  const activeSubjectJournal = useMemo(() => {
    if (!journal) {
      return null;
    }

    return journal.subjects.find((subject) => subject.subjectId === activeJournalSubjectId)
      ?? journal.subjects[0]
      ?? null;
  }, [activeJournalSubjectId, journal]);
  const weeklyReport = useMemo(() => {
    if (!journal || journal.subjects.length === 0) {
      return { rows: [] as WeeklyReportRow[], subjects: [] as GroupSubjectJournalDto[], weekStart: '', weekEnd: '' };
    }

    const weekEnd = parseDateValue(journal.today);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const studentMap = new Map<string, WeeklyReportRow>();
    journal.subjects.forEach((subject) => {
      subject.students.forEach((student) => {
        if (!studentMap.has(student.studentId)) {
          studentMap.set(student.studentId, {
            studentId: student.studentId,
            fullName: student.fullName,
            phoneNumber: student.phoneNumber,
            subjectScores: {},
            averageScore: 0,
            grade: 1,
          });
        }
      });
    });

    const lessonById = new Map<string, GroupJournalLessonDto>();
    journal.subjects.forEach((subject) => {
      subject.lessons.forEach((lesson) => {
        lessonById.set(lesson.id, lesson);
      });
    });

    journal.subjects.forEach((subject) => {
      subject.students.forEach((student) => {
        const weeklyScores = student.lessonScores
          .filter((lessonScore) => {
            const lesson = lessonById.get(lessonScore.lessonId);
            if (!lesson || lessonScore.score === null || lessonScore.score === undefined) {
              return false;
            }

            const lessonDate = parseDateValue(lesson.lessonDate);
            return lessonDate >= weekStart && lessonDate <= weekEnd;
          })
          .map((lessonScore) => lessonScore.score as number);

        const subjectAverage = weeklyScores.length === 0
          ? 0
          : roundScore(weeklyScores.reduce((sum, score) => sum + score, 0) / weeklyScores.length);
        const row = studentMap.get(student.studentId);
        if (row) {
          row.subjectScores[subject.subjectId] = subjectAverage;
        }
      });
    });

    const rows = Array.from(studentMap.values())
      .map((row) => {
        const total = journal.subjects.reduce(
          (sum, subject) => sum + (row.subjectScores[subject.subjectId] ?? 0),
          0,
        );
        const averageScore = journal.subjects.length === 0
          ? 0
          : roundScore(total / journal.subjects.length);

        return {
          ...row,
          averageScore,
          grade: getGradeByAverage(averageScore),
        };
      })
      .sort((left, right) =>
        right.averageScore - left.averageScore ||
        left.fullName.localeCompare(right.fullName),
      );

    return {
      rows,
      subjects: journal.subjects,
      weekStart: toDateValue(weekStart),
      weekEnd: toDateValue(weekEnd),
    };
  }, [journal]);
  const filteredAssignedStudents = useMemo(() => {
    const value = studentQuery.trim().toLowerCase();
    const assigned = selectedGroup?.students ?? [];
    if (!value) {
      return assigned;
    }

    return assigned.filter((student) =>
      `${student.firstName} ${student.lastName} ${student.phoneNumber}`.toLowerCase().includes(value),
    );
  }, [selectedGroup, studentQuery]);
  const pagedAssignedStudents = paginate(filteredAssignedStudents, studentPage, 8);
  const selectedGroupTeacherAssignments = useMemo(() => {
    if (!selectedGroupId) {
      return [];
    }

    return teacherAssignments.filter((assignment) => assignment.groupId === selectedGroupId);
  }, [selectedGroupId, teacherAssignments]);
  const teacherOptionsForModal = useMemo(() => {
    if (!teacherModalSubject) {
      return [];
    }

    const eligibleTeacherIds = new Set(
      teacherSubjects
        .filter((assignment) => assignment.subjectId === teacherModalSubject.id)
        .map((assignment) => assignment.teacherId),
    );

    return users
      .filter((user) => user.role === 'Teacher' && user.isActive && eligibleTeacherIds.has(user.id))
      .sort((left, right) => `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`))
      .map((teacher) => ({
        value: teacher.id,
        label: `${teacher.firstName} ${teacher.lastName}`,
        meta: teacher.phoneNumber,
      }));
  }, [teacherModalSubject, teacherSubjects, users]);

  useEffect(() => {
    setPage(1);
  }, [query, groups.length]);

  useEffect(() => {
    setStudentPage(1);
  }, [studentQuery, selectedGroupId, filteredAssignedStudents.length]);

  useEffect(() => {
    if (!canManageGroups && selectedGroupId && activeTab !== 'journals') {
      setActiveTab('journals');
      return;
    }

    if (activeTab === 'journals' && selectedGroupId) {
      void loadJournal(selectedGroupId);
    }
  }, [activeTab, selectedGroupId, canManageGroups]);

  useEffect(() => {
    if (!journal?.subjects.length) {
      setActiveJournalSubjectId('');
      return;
    }

    if (!journal.subjects.some((subject) => subject.subjectId === activeJournalSubjectId)) {
      setActiveJournalSubjectId(journal.subjects[0].subjectId);
    }
  }, [activeJournalSubjectId, journal]);

  if (selectedGroup) {
    return (
      <section className="px-4 py-6 lg:px-6">
        <div className="mb-5 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={closeGroup}
              className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted transition hover:border-brand hover:text-brand"
              aria-label="Бозгашт"
              title="Бозгашт"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-muted">Гурӯҳ</p>
              <h2 className="mt-1 text-2xl font-bold">{selectedGroup.name}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  <Building2 className="h-4 w-4" />
                  {selectedGroup.branch}
                </span>
                <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                  {selectedGroup.studentCount} хонанда
                </span>
                <span className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${
                  selectedGroup.isActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                  {selectedGroup.isActive ? 'Фаъол' : 'Анҷомёфта'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-nowrap gap-2 overflow-x-auto no-scrollbar border-b border-line pb-1">
          {canManageGroups ? (
            <TabButton active={activeTab === 'students'} onClick={() => setActiveTab('students')} icon={Users} label={"\u0425\u043e\u043d\u0430\u043d\u0434\u0430\u0433\u043e\u043d"} />
          ) : null}
          <TabButton active={activeTab === 'journals'} onClick={() => setActiveTab('journals')} icon={ClipboardList} label={"\u0416\u0443\u0440\u043d\u0430\u043b\u04b3\u043e"} />
          {canManageGroups ? (
            <TabButton active={activeTab === 'teachers'} onClick={() => setActiveTab('teachers')} icon={GraduationCap} label={"\u041c\u0443\u0430\u043b\u043b\u0438\u043c\u043e\u043d"} />
          ) : null}
          {canManageGroups ? (
            <TabButton active={activeTab === 'edit'} onClick={() => setActiveTab('edit')} icon={Edit3} label={"\u0422\u0430\u04b3\u0440\u0438\u0440 \u043a\u0430\u0440\u0434\u0430\u043d"} />
          ) : null}
          {canManageGroups ? (
            <TabButton active={activeTab === 'other'} onClick={() => setActiveTab('other')} icon={SlidersHorizontal} label={"\u0414\u0438\u0433\u0430\u0440 \u049b\u0438\u0441\u043c\u04b3\u043e"} />
          ) : null}
        </div>
        {notice ? <p className="mb-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
        {error ? <p className="mb-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {canManageGroups && activeTab === 'students' ? (
          <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
            <form onSubmit={handleAddStudent} className="rounded-lg border border-line bg-white p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Дохил кардани хонанда</h3>
                  <p className="text-sm text-muted">Хонандаро интихоб карда ба гурӯҳ илова кунед.</p>
                </div>
              </div>

              <SearchableMultiSelect
                label="Хонандагон"
                values={selectedStudentIds}
                options={availableStudentOptions}
                placeholder="Ҷустуҷӯ ва интихоби хонандагон"
                emptyText="Хонандаи дастрас нест."
                onChange={setSelectedStudentIds}
              />

              <Button type="submit" className="mt-5 w-full" disabled={isStudentSubmitting || selectedStudentIds.length === 0}>
                <Plus className="h-4 w-4" />
                {isStudentSubmitting ? 'Дохил шуда истодааст...' : `Дохил кардан (${selectedStudentIds.length})`}
              </Button>
            </form>

            <div className="min-w-0">
              <div className="min-h-[420px] overflow-hidden rounded-lg border border-line bg-white">
                <div className="flex flex-col justify-between gap-3 border-b border-line bg-panel px-4 py-3 sm:flex-row sm:items-center">
                  <div className="text-xs font-bold uppercase text-muted">Хонандагони гурӯҳ</div>
                  <div className="flex h-10 items-center gap-3 rounded-lg border border-line bg-white px-3 sm:w-[320px]">
                    <Search className="h-4 w-4 text-muted" />
                    <input
                      value={studentQuery}
                      onChange={(event) => setStudentQuery(event.target.value)}
                      className="h-full flex-1 outline-none"
                      placeholder="Ҷустуҷӯи хонанда"
                    />
                  </div>
                </div>

                {filteredAssignedStudents.length === 0 ? (
                  <p className="px-4 py-5 text-sm text-muted">Ҳоло хонанда нест.</p>
                ) : null}

                {pagedAssignedStudents.items.map((student) => (
                  <div key={student.id} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-sm last:border-0">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{student.firstName} {student.lastName}</p>
                      <p className="font-mono text-xs text-muted">{student.phoneNumber}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveStudent(student.id)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-white text-red-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      disabled={isStudentSubmitting}
                      aria-label="Хориҷ кардан"
                      title="Хориҷ кардан"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Pagination
                  page={pagedAssignedStudents.page}
                  pageCount={pagedAssignedStudents.pageCount}
                  total={filteredAssignedStudents.length}
                  from={pagedAssignedStudents.from}
                  to={pagedAssignedStudents.to}
                  onPageChange={setStudentPage}
                />
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'journals' ? (
          <div className="space-y-5">
            {isJournalLoading ? (
              <p className="rounded-lg border border-line bg-white px-4 py-5 text-sm text-muted">Журнал бор шуда истодааст...</p>
            ) : null}

            {!isJournalLoading && journal?.subjects.length === 0 ? (
              <p className="rounded-lg border border-line bg-white px-4 py-5 text-sm text-muted">Ба ин гурӯҳ ҳоло фан илова нашудааст.</p>
            ) : null}

            {journal?.subjects.length ? (
              <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar pb-1">
                {journal.subjects.map((subjectJournal) => (
                  <button
                    key={subjectJournal.subjectId}
                    type="button"
                    onClick={() => {
                      setActiveJournalSubjectId(subjectJournal.subjectId);
                      setJournalView('subject');
                    }}
                    className={`inline-flex h-10 shrink-0 whitespace-nowrap items-center gap-2 rounded-lg border px-4 text-sm font-bold transition ${
                      journalView === 'subject' && activeSubjectJournal?.subjectId === subjectJournal.subjectId
                        ? 'border-brand/30 bg-brand text-white shadow-sm'
                        : 'border-line bg-white text-muted hover:border-brand/30 hover:text-brand'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    {subjectJournal.subjectName}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setJournalView('weeklyReport')}
                  className={`inline-flex h-10 shrink-0 whitespace-nowrap items-center gap-2 rounded-lg border px-4 text-sm font-bold transition ${
                    journalView === 'weeklyReport'
                      ? 'border-emerald-300 bg-emerald-600 text-white shadow-sm'
                      : 'border-line bg-white text-muted hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Ҳисоботи ҳафтаина
                </button>
              </div>
            ) : null}

            {journalView === 'weeklyReport' && journal ? (
              <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-2 border-b border-line bg-panel px-4 py-4 lg:flex-row lg:items-center">
                  <div>
                    <h3 className="text-lg font-bold">Ҳисоботи ҳафтаина</h3>
                    <p className="mt-1 text-sm text-muted">
                      {formatShortDate(weeklyReport.weekStart)} - {formatShortDate(weeklyReport.weekEnd)} · рейтинг аз рӯи холи миёна
                    </p>
                  </div>
                  <span className="w-fit rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                    {weeklyReport.rows.length} хонанда
                  </span>
                </div>

                <div className="max-h-[620px] overflow-auto">
                  <table className="w-max min-w-full border-separate border-spacing-0 text-[11px] sm:text-sm">
                    <thead className="sticky top-0 z-30 bg-white">
                      <tr>
                        <th className="sticky left-0 z-40 w-[180px] sm:w-[260px] border-b border-r border-line bg-white px-3 sm:px-4 py-3 text-left text-xs font-bold uppercase text-muted">
                          Ному насаб
                        </th>
                        {weeklyReport.subjects.map((subject) => (
                          <th key={subject.subjectId} className="w-[150px] border-b border-r border-line bg-white px-3 py-3 text-center text-xs font-bold uppercase text-muted">
                            {subject.subjectName}
                          </th>
                        ))}
                        <th className="w-[130px] border-b border-r border-line bg-white px-3 py-3 text-center text-xs font-bold uppercase text-muted">
                          Холи миёна
                        </th>
                        <th className="w-[90px] border-b border-line bg-white px-3 py-3 text-center text-xs font-bold uppercase text-muted">
                          Баҳо
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyReport.rows.length === 0 ? (
                        <tr>
                          <td className="sticky left-0 z-20 border-b border-r border-line bg-white px-4 py-5 text-muted" colSpan={weeklyReport.subjects.length + 3}>
                            Барои ҳисоботи ҳафтаина хонанда ёфт нашуд.
                          </td>
                        </tr>
                      ) : null}

                      {weeklyReport.rows.map((student, index) => (
                        <tr key={student.studentId} className={index % 2 === 0 ? 'bg-emerald-50/35' : 'bg-white'}>
                          <td className="sticky left-0 z-20 w-[180px] sm:w-[260px] border-b border-r border-line bg-inherit px-3 sm:px-4 py-3 sm:py-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{student.fullName}</p>
                                <p className="font-mono text-xs text-muted">{student.phoneNumber}</p>
                              </div>
                            </div>
                          </td>
                          {weeklyReport.subjects.map((subject) => (
                            <td key={`${student.studentId}-${subject.subjectId}`} className="w-[150px] border-b border-r border-line px-3 py-4 text-center">
                              <span className="inline-flex h-9 min-w-[78px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 font-bold text-ink">
                                {formatScore(student.subjectScores[subject.subjectId] ?? 0)}
                              </span>
                            </td>
                          ))}
                          <td className="w-[130px] border-b border-r border-line px-3 py-4 text-center">
                            <span className={`inline-flex h-9 min-w-[84px] items-center justify-center rounded-lg border px-3 font-bold ${getAverageScoreClassName(student.averageScore)}`}>
                              {formatScore(student.averageScore)}
                            </span>
                          </td>
                          <td className="w-[90px] border-b border-line px-3 py-4 text-center">
                            <span className={`inline-flex h-9 w-10 items-center justify-center rounded-lg border font-bold ${getGradeClassName(student.grade)}`}>
                              {student.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {journalView === 'subject' && activeSubjectJournal ? (
              <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-line bg-panel px-4 py-4 xl:flex-row xl:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm font-bold text-ink ring-1 ring-line">
                      <BookOpen className="h-4 w-4 text-brand" />
                      {activeSubjectJournal.subjectName}
                    </span>
                    <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-muted ring-1 ring-line">
                      <BarChart3 className="h-4 w-4" />
                      Average: {formatScore(activeSubjectJournal.averageScore)}
                    </span>
                    <span className="inline-flex h-9 items-center rounded-lg bg-white px-3 text-sm font-semibold text-muted ring-1 ring-line">
                      {activeSubjectJournal.lessons.length} / 50 дарс
                    </span>
                  </div>

                  {canManageJournal ? (
                  <Button
                    type="button"
                    className="h-11"
                    onClick={() => void handleCreateTodayLesson(activeSubjectJournal.subjectId)}
                    disabled={Boolean(activeSubjectJournal.todayLessonId) || journalBusySubjectId === activeSubjectJournal.subjectId}
                  >
                    <CalendarDays className="h-4 w-4" />
                    {activeSubjectJournal.todayLessonId
                      ? 'Дарси имрӯз ҳаст'
                      : journalBusySubjectId === activeSubjectJournal.subjectId
                        ? 'Сохта истодааст...'
                        : 'Сохтани дарси имрӯз'}
                  </Button>
                  ) : null}
                </div>

                <div className="max-h-[620px] overflow-auto">
                  <table className="w-max min-w-full border-separate border-spacing-0 text-[11px] sm:text-sm">
                    <thead className="sticky top-0 z-30 bg-white">
                      <tr>
                        <th className="sticky left-0 z-40 h-16 w-[118px] sm:h-20 sm:w-[230px] border-b border-r border-line bg-white px-1.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold uppercase text-muted">
                          Хонанда
                        </th>
                        <th className="static sm:sticky sm:left-[230px] z-40 h-16 w-[62px] sm:h-20 sm:w-[120px] border-b border-r border-line bg-white px-1.5 sm:px-4 text-center text-[10px] sm:text-xs font-bold uppercase text-muted">
                          Average
                        </th>
                        {activeSubjectJournal.lessons.map((lesson, index) => (
                          <th key={lesson.id} className="h-16 w-[92px] sm:h-20 sm:w-[154px] border-b border-r border-line bg-white px-1.5 sm:px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (canManageJournal) {
                                  openTopicModal(activeSubjectJournal, lesson);
                                }
                              }}
                              disabled={!canManageJournal}
                              className={`mx-auto flex min-h-12 sm:min-h-14 w-full flex-col items-center justify-center rounded-lg border px-1 sm:px-2 text-[10px] sm:text-xs font-bold transition ${
                                lesson.id === activeSubjectJournal.todayLessonId
                                  ? 'border-sky-200 bg-sky-50 text-sky-700 shadow-sm'
                                  : 'border-transparent text-muted hover:border-brand/20 hover:bg-panel hover:text-brand'
                              }`}
                              title="Мавзӯи дарс"
                            >
                              <span className="inline-flex items-center gap-1">
                                <BookOpen className="h-3.5 w-3.5" />
                                Урок {index + 1}
                              </span>
                              <span className="mt-1 text-ink">{formatLessonDate(lesson.lessonDate)}</span>
                              <span className="font-semibold text-muted">{lesson.topicTitle ?? 'Мавзӯъ нест'}</span>
                            </button>
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <th className="sticky left-0 z-40 w-[118px] sm:w-[230px] border-b border-r border-line bg-panel px-1.5 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-bold uppercase text-muted">
                          Ном ва фамилия
                        </th>
                        <th className="static sm:sticky sm:left-[230px] z-40 w-[62px] sm:w-[120px] border-b border-r border-line bg-panel px-1.5 sm:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-bold uppercase text-muted">
                          Average
                        </th>
                        {activeSubjectJournal.lessons.map((lesson) => (
                          <th key={`${lesson.id}-score`} className="w-[92px] sm:w-[154px] border-b border-r border-line bg-panel px-1.5 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-bold uppercase text-muted">
                            Оценка
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeSubjectJournal.students.length === 0 ? (
                        <tr>
                          <td className="sticky left-0 z-20 border-b border-r border-line bg-white px-4 py-5 text-muted" colSpan={2}>
                            Дар гурӯҳ ҳоло хонанда нест.
                          </td>
                        </tr>
                      ) : null}

                      {activeSubjectJournal.students.map((student, index) => (
                        <tr key={`${activeSubjectJournal.subjectId}-${student.studentId}`} className={index % 2 === 0 ? 'bg-sky-50/40' : 'bg-white'}>
                          <td className="sticky left-0 z-20 w-[118px] sm:w-[230px] border-b border-r border-line bg-inherit px-1.5 sm:px-4 py-2 sm:py-4">
                            <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
                              <span className="grid h-4 w-4 sm:h-5 sm:w-5 shrink-0 place-items-center rounded-full bg-brand/10 text-[9px] sm:text-[11px] font-bold text-brand">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{student.fullName}</p>
                                <p className="font-mono text-[10px] sm:text-xs text-muted">{student.phoneNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="static sm:sticky sm:left-[230px] z-20 w-[62px] sm:w-[120px] border-b border-r border-line bg-inherit px-1.5 sm:px-3 py-2 sm:py-4 text-center">
                            <span className={`inline-flex h-7 sm:h-9 w-[48px] sm:w-[86px] items-center justify-center rounded-lg border font-bold ${getAverageScoreClassName(student.averageScore)}`}>
                              {formatScore(student.averageScore)}
                            </span>
                          </td>
                          {activeSubjectJournal.lessons.map((lesson) => {
                            const score = student.lessonScores.find((item) => item.lessonId === lesson.id);
                            const scoreContent = formatScore(score?.score ?? null);
                            const scoreClassName = getJournalScoreClassName(score);
                            return (
                              <td key={`${student.studentId}-${lesson.id}`} className="w-[92px] sm:w-[154px] border-b border-r border-line px-1.5 sm:px-3 py-2 sm:py-4 text-center">
                                {score?.canEdit && score.score !== null ? (
                                  <button
                                    type="button"
                                    onClick={() => openScoreModal(lesson, student.studentId, student.fullName, score)}
                                    className={`inline-flex h-7 sm:h-9 w-[54px] sm:w-[110px] items-center justify-center rounded-lg border font-bold transition hover:ring-2 hover:ring-brand/20 ${scoreClassName}`}
                                    title="Тағйир додани бал"
                                  >
                                    {scoreContent}
                                  </button>
                                ) : (
                                  <span className={`inline-flex h-7 sm:h-9 w-[54px] sm:w-[110px] items-center justify-center rounded-lg border font-bold ${scoreClassName}`}>
                                    {scoreContent}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {canManageGroups && activeTab === 'teachers' ? (
          <div className="overflow-hidden rounded-lg border border-line bg-white">
            <div className="border-b border-line bg-panel px-4 py-4">
              <h3 className="font-bold">Муаллимони фанҳои гурӯҳ</h3>
              <p className="mt-1 text-sm text-muted">Барои ҳар фани гурӯҳ муаллими мувофиқро таъин кунед.</p>
            </div>

            {/* Mobile card view */}
            <div className="space-y-3 p-4 md:hidden">
              {selectedGroup.subjects.length === 0 ? (
                <p className="py-4 text-sm text-muted">Ба ин гурӯҳ ҳоло фан илова нашудааст.</p>
              ) : null}

              {selectedGroup.subjects.map((subject) => {
                const assignments = selectedGroupTeacherAssignments.filter(
                  (assignment) => assignment.subjectId === subject.id,
                );
                const assignedTeacherNames = assignments.map((assignment) => assignment.teacherName).join(', ');
                const isAssigned = assignments.length > 0;

                return (
                  <div key={subject.id} className="rounded-xl border border-line bg-panel/30 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen className="h-4 w-4 text-brand shrink-0" />
                        <span className="font-bold text-ink truncate">{subject.name}</span>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold ${
                        isAssigned ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {isAssigned ? 'Таъин шудааст' : 'Нотаъин'}
                      </span>
                    </div>
                    <div className="text-xs text-muted">
                      Муаллим: <span className={isAssigned ? 'font-semibold text-ink' : 'italic text-muted'}>{assignedTeacherNames || 'Муаллим таъин нашудааст'}</span>
                    </div>
                    <Button type="button" variant="secondary" className="w-full h-9 text-xs" onClick={() => openTeacherModal(subject)}>
                      <GraduationCap className="h-4 w-4" />
                      {isAssigned ? 'Иваз кардани муаллим' : 'Ҳамроҳ кардани муаллим'}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[1.2fr_1.3fr_140px_210px] border-b border-line bg-panel/60 px-4 py-3 text-xs font-bold uppercase text-muted">
                  <span>Фан</span>
                  <span>Муаллим</span>
                  <span>Ҳолат</span>
                  <span>Амал</span>
                </div>

                {selectedGroup.subjects.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted">Ба ин гурӯҳ ҳоло фан илова нашудааст.</p>
                ) : null}

                {selectedGroup.subjects.map((subject) => {
                  const assignments = selectedGroupTeacherAssignments.filter(
                    (assignment) => assignment.subjectId === subject.id,
                  );
                  const assignedTeacherNames = assignments.map((assignment) => assignment.teacherName).join(', ');
                  const isAssigned = assignments.length > 0;

                  return (
                    <div
                      key={subject.id}
                      className="grid grid-cols-[1.2fr_1.3fr_140px_210px] items-center border-b border-line px-4 py-4 text-sm last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <span className="font-semibold">{subject.name}</span>
                      </div>
                      <span className={isAssigned ? 'font-semibold text-ink' : 'text-muted'}>
                        {assignedTeacherNames || 'Муаллим таъин нашудааст'}
                      </span>
                      <span className={`w-fit rounded-md px-2 py-1 text-xs font-bold ${
                        isAssigned ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {isAssigned ? 'Таъин шудааст' : 'Нотаъин'}
                      </span>
                      <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => openTeacherModal(subject)}>
                        <GraduationCap className="h-4 w-4" />
                        {isAssigned ? 'Иваз кардани муаллим' : 'Ҳамроҳ кардани муаллим'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {canManageGroups && activeTab === 'edit' ? (
          <form onSubmit={handleUpdateGroup} className="rounded-lg border border-line bg-white p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
                <Edit3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold">Таҳрир кардани гурӯҳ</h3>
                <p className="text-sm text-muted">Ном, филиал ва тавсифи гурӯҳро тағйир диҳед.</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="block">
                <span className="text-sm font-semibold">Номи гурӯҳ</span>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                  placeholder="Гурӯҳи A"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">Филиал</span>
                <input
                  value={editBranch}
                  onChange={(event) => setEditBranch(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                  placeholder="Марказӣ"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold">Тавсиф</span>
                <input
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                  placeholder="Тавсифи кӯтоҳ"
                />
              </label>
            </div>

            <Button type="submit" className="mt-5" disabled={isEditSubmitting || !editName.trim() || !editBranch.trim()}>
              <Check className="h-4 w-4" />
              {isEditSubmitting ? 'Нигоҳ дошта истодааст...' : 'Нигоҳ доштан'}
            </Button>
          </form>
        ) : null}

        {canManageGroups && activeTab === 'other' ? (
          <form onSubmit={handleUpdateGroup} className="rounded-lg border border-line bg-white p-5">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold">Дигар қисмҳо</h3>
                  <p className="text-sm text-muted">Фанҳои гурӯҳ ва ҳолати фаъолиятро идора кунед.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
              <div className="rounded-lg border border-line p-4">
                <p className="text-sm font-semibold">Статуси гурӯҳ</p>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-panel p-1">
                  <button
                    type="button"
                    onClick={() => setEditIsActive(true)}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-md text-sm font-bold transition ${
                      editIsActive
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-muted hover:bg-white hover:text-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Фаъол
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(false)}
                    className={`inline-flex h-11 items-center justify-center gap-2 rounded-md text-sm font-bold transition ${
                      !editIsActive
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-muted hover:bg-white hover:text-red-700'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Анҷом бахшидан
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-line p-4">
                <SearchableSelect
                  label="Илова кардани фан"
                  value={subjectToAddId}
                  options={subjectOptions.filter((option) => !editSubjectIds.includes(option.value))}
                  placeholder="Ҷустуҷӯ ва интихоби фан"
                  emptyText="Фани дастрас нест."
                  onChange={addEditSubject}
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  {editSubjectIds.length > 0 ? (
                    editSubjectIds.map((subjectId, index) => {
                      const subject = subjects.find((candidate) => candidate.id === subjectId);
                      return (
                        <span
                          key={subjectId}
                          className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${subjectBadgeColors[index % subjectBadgeColors.length]}`}
                        >
                          {subject?.name ?? 'Фан'}
                          <button
                            type="button"
                            onClick={() => removeEditSubject(subjectId)}
                            className="grid h-5 w-5 place-items-center rounded-full hover:bg-black/5"
                            aria-label="Гирифтани фан"
                            title="Гирифтани фан"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-sm text-muted">Ба ин гурӯҳ ҳоло фан илова нашудааст.</span>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit" className="mt-5" disabled={isEditSubmitting || !editName.trim() || !editBranch.trim()}>
              <Check className="h-4 w-4" />
              {isEditSubmitting ? 'Нигоҳ дошта истодааст...' : 'Нигоҳ доштан'}
            </Button>
          </form>
        ) : null}

        {topicModalLesson ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full max-w-md rounded-t-2xl sm:rounded-xl border border-line bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted">{topicModalLesson.subject.subjectName}</p>
                  <h3 className="mt-1 text-lg font-bold">Мавзӯи дарс</h3>
                  <p className="mt-1 text-sm text-muted">{formatLessonDate(topicModalLesson.lesson.lessonDate)}</p>
                </div>
                <button
                  type="button"
                  onClick={closeTopicModal}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-panel hover:text-ink"
                  aria-label="Пӯшидан"
                  title="Пӯшидан"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <SearchableSelect
                label="Мавзӯъ"
                value={topicModalTopicId}
                options={topicOptionsBySubject[topicModalLesson.subject.subjectId] ?? []}
                placeholder="Ҷустуҷӯ ва интихоби мавзӯъ"
                emptyText="Барои ин фан мавзӯъ нест."
                onChange={setTopicModalTopicId}
              />

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeTopicModal}>
                  <XCircle className="h-4 w-4" />
                  Бекор кардан
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSaveLessonTopic()}
                  disabled={!topicModalTopicId || journalBusyLessonId === topicModalLesson.lesson.id}
                >
                  <Save className="h-4 w-4" />
                  {journalBusyLessonId === topicModalLesson.lesson.id ? 'Сабт шуда истодааст...' : 'Сабт кардан'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {scoreModal ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full max-w-md rounded-t-2xl sm:rounded-xl border border-line bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted">{scoreModal.studentName}</p>
                  <h3 className="mt-1 text-lg font-bold">Тағйир додани бал</h3>
                  <p className="mt-1 text-sm text-muted">{formatLessonDate(scoreModal.lesson.lessonDate)}</p>
                </div>
                <button
                  type="button"
                  onClick={closeScoreModal}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-panel hover:text-ink"
                  aria-label="Пӯшидан"
                  title="Пӯшидан"
                  disabled={isScoreSubmitting}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <label className="block">
                <span className="text-sm font-semibold">Бали нав</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={scoreModalValue}
                  onChange={(event) => setScoreModalValue(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-line px-3 outline-none focus:border-brand"
                  placeholder="0-100"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-semibold">Шарҳ</span>
                <textarea
                  value={scoreModalReason}
                  onChange={(event) => setScoreModalReason(event.target.value)}
                  className="mt-2 min-h-24 w-full resize-none rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
                  placeholder="Масалан: бонус барои кори иловагӣ"
                />
              </label>

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeScoreModal} disabled={isScoreSubmitting}>
                  <XCircle className="h-4 w-4" />
                  Бекор кардан
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSaveScore()}
                  disabled={isScoreSubmitting || !scoreModalValue.trim()}
                >
                  <Save className="h-4 w-4" />
                  {isScoreSubmitting ? 'Сабт шуда истодааст...' : 'Сабт кардан'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {teacherModalSubject ? (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-0 sm:p-4">
            <div className="w-full max-w-md rounded-t-2xl sm:rounded-xl border border-line bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted">{teacherModalSubject.name}</p>
                  <h3 className="mt-1 text-lg font-bold">Интихоби муаллим</h3>
                </div>
                <button
                  type="button"
                  onClick={closeTeacherModal}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-ink"
                  aria-label="Пӯшидан"
                  title="Пӯшидан"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <SearchableSelect
                label="Муаллим"
                value={selectedTeacherId}
                options={teacherOptionsForModal}
                placeholder="Ҷустуҷӯ ва интихоби муаллим"
                emptyText="Барои ин фан муаллими дастрас нест. Аввал муаллимро ба фан пайваст кунед."
                onChange={setSelectedTeacherId}
              />

              <div className="mt-5 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={closeTeacherModal} disabled={isTeacherAssignmentSubmitting}>
                  Бекор кардан
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSaveTeacherAssignment()}
                  disabled={!selectedTeacherId || isTeacherAssignmentSubmitting}
                >
                  <Save className="h-4 w-4" />
                  {isTeacherAssignmentSubmitting ? 'Сабт шуда истодааст...' : 'Сабт кардан'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

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
          {canManageGroups ? (
            <Button type="button" onClick={() => setIsCreateOpen((current) => !current)}>
            {isCreateOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isCreateOpen ? 'Пӯшидан' : 'Сохтани гурӯҳ'}
            </Button>
          ) : null}
        </div>
      </div>

      {canManageGroups && isCreateOpen ? (
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
            <SearchableMultiSelect
              label="Фанҳо"
              values={selectedSubjectIds}
              options={createSubjectOptions}
              placeholder="Ҷустуҷӯ ва интихоби фанҳо"
              emptyText="Аввал фан созед."
              onChange={setSelectedSubjectIds}
            />
          </div>

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

      <div className="grid min-h-[420px] content-start gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pagedGroups.items.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => openGroup(group.id)}
            className="rounded-xl border border-line bg-white p-4 sm:p-5 text-left transition hover:border-brand/50 hover:bg-panel/50 hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-ink">{group.name}</h3>
                <p className="mt-1 text-sm text-muted">{group.description || 'Бе тавсиф'}</p>
              </div>
              <span className={`rounded-md border px-2 py-1 text-xs font-bold ${
                group.isActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}>
                {group.isActive ? 'Фаъол' : 'Анҷомёфта'}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                <Building2 className="h-4 w-4" />
                {group.branch}
              </span>
              <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                {group.studentCount} хонанда
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Pagination
          page={pagedGroups.page}
          pageCount={pagedGroups.pageCount}
          total={filteredGroups.length}
          from={pagedGroups.from}
          to={pagedGroups.to}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function getGradeByAverage(value: number) {
  if (value <= 35) {
    return 1;
  }

  if (value <= 55) {
    return 2;
  }

  if (value <= 75) {
    return 3;
  }

  if (value <= 89) {
    return 4;
  }

  return 5;
}

function getGradeClassName(grade: number) {
  if (grade <= 2) {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (grade === 3) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (grade === 4) {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function getAverageScoreClassName(score: number | null) {
  if (score !== null && score >= 90) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border-slate-200 bg-white text-ink';
}

function getJournalScoreClassName(score?: GroupJournalLessonScoreDto) {
  if (!score || score.score === null || score.score === undefined) {
    return 'border-slate-200 bg-slate-50 text-muted';
  }

  if (score.isAdjusted) {
    return 'border-orange-200 bg-orange-50 text-orange-700';
  }

  return 'border-slate-200 bg-white text-ink';
}

function parseDateValue(value: string) {
  return new Date(`${value}T00:00:00`);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatShortDate(value: string) {
  if (!value) {
    return '';
  }

  return formatLessonDate(value);
}

function formatScore(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return 'н';
  }

  return `${roundScore(value)}`;
}

function formatLessonDate(value: string) {
  const date = parseDateValue(value);
  const day = date.getDate();
  const month = date.toLocaleString('ru-RU', { month: 'short' }).replace('.', '');
  const weekDay = date.toLocaleString('ru-RU', { weekday: 'short' });
  return `${day} ${month}. · ${weekDay}`;
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 shrink-0 whitespace-nowrap items-center gap-2 border-b-2 px-3 text-sm font-semibold transition ${
        active
          ? 'border-brand text-brand'
          : 'border-transparent text-muted hover:border-line hover:text-ink'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
