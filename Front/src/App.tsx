import { useMemo, useState } from 'react';
import { hasPermission, type Permission } from './auth/permissions';
import { AppShell, type AppView } from './components/AppShell';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { GroupsPage } from './pages/GroupsPage';
import { LoginPage } from './pages/LoginPage';
import { QuestionsPage } from './pages/QuestionsPage';
import { StudentsPage } from './pages/StudentsPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { TeachersPage } from './pages/TeachersPage';
import { TopicsPage } from './pages/TopicsPage';
import type { SubjectDto, TopicDto } from './types/admin';

const titles: Record<AppView, string> = {
  dashboard: 'Dashboard',
  students: '\u0425\u043e\u043d\u0430\u043d\u0434\u0430\u0433\u043e\u043d',
  teachers: '\u041c\u0443\u0430\u043b\u043b\u0438\u043c\u043e\u043d',
  groups: '\u0413\u0443\u0440\u04ef\u04b3\u04b3\u043e',
  journal: '\u0416\u0443\u0440\u043d\u0430\u043b',
  subjects: '\u0424\u0430\u043d\u04b3\u043e',
  topics: '\u041c\u0430\u0432\u0437\u04ef\u044a\u04b3\u043e',
  questions: '\u0421\u0430\u0432\u043e\u043b\u04b3\u043e',
};
const viewPermissions: Record<AppView, Permission> = {
  dashboard: 'dashboard.view',
  students: 'students.manage',
  teachers: 'teachers.manage',
  groups: 'groups.view',
  journal: 'journal.view',
  subjects: 'subjects.view',
  topics: 'subjects.view',
  questions: 'subjects.view',
};

function AppContent() {
  const { auth } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedSubject, setSelectedSubject] = useState<SubjectDto | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicDto | null>(null);

  const permittedView = auth && hasPermission(auth.role, viewPermissions[activeView])
    ? activeView
    : 'dashboard';

  const content = useMemo(() => {
    switch (permittedView) {
      case 'students':
        return <StudentsPage />;
      case 'subjects':
        return <SubjectsPage onOpenTopics={(subject) => {
          setSelectedSubject(subject);
          setActiveView('topics');
        }} />;
      case 'topics':
        return selectedSubject ? (
          <TopicsPage
            subject={selectedSubject}
            onOpenQuestions={(topic) => {
              setSelectedTopic(topic);
              setActiveView('questions');
            }}
            onBack={() => {
              setSelectedSubject(null);
              setSelectedTopic(null);
              setActiveView('subjects');
            }}
          />
        ) : (
          <SubjectsPage onOpenTopics={(subject) => {
            setSelectedSubject(subject);
            setActiveView('topics');
          }} />
        );
      case 'questions':
        return selectedSubject && selectedTopic ? (
          <QuestionsPage
            subject={selectedSubject}
            topic={selectedTopic}
            onBack={() => {
              setSelectedTopic(null);
              setActiveView('topics');
            }}
          />
        ) : (
          <SubjectsPage onOpenTopics={(subject) => {
            setSelectedSubject(subject);
            setSelectedTopic(null);
            setActiveView('topics');
          }} />
        );
      case 'teachers':
        return <TeachersPage />;
      case 'groups':
        if (auth?.role === 'Student') {
          return <StudentPlaceholderPage title="\u0413\u0443\u0440\u04ef\u04b3\u04b3\u043e" description="\u0414\u0430\u0440 \u049b\u0430\u0434\u0430\u043c\u0438 \u0431\u0430\u044a\u0434\u04e3 \u0433\u0443\u0440\u04ef\u04b3\u04b3\u043e\u0438 \u0448\u0443\u043c\u043e \u0434\u0430\u0440 \u04b3\u0430\u043c\u0438\u043d \u04b7\u043e \u043d\u0438\u0448\u043e\u043d \u0434\u043e\u0434\u0430 \u043c\u0435\u0448\u0430\u0432\u0430\u043d\u0434." />;
        }

        return <GroupsPage />;
      case 'journal':
        return <StudentPlaceholderPage title="\u0416\u0443\u0440\u043d\u0430\u043b" description="\u0414\u0430\u0440 \u049b\u0430\u0434\u0430\u043c\u0438 \u0431\u0430\u044a\u0434\u04e3 \u043d\u0430\u0442\u0438\u04b7\u0430\u04b3\u043e \u0432\u0430 \u0436\u0443\u0440\u043d\u0430\u043b\u0438 \u0448\u0430\u0445\u0441\u0438\u0438 \u0448\u0443\u043c\u043e \u0434\u0430\u0440 \u04b3\u0430\u043c\u0438\u043d \u04b7\u043e \u043c\u0435\u043e\u044f\u043d\u0434." />;
      default:
        return <DashboardPage onViewChange={setActiveView} />;
    }
  }, [auth?.role, permittedView, selectedSubject, selectedTopic]);

  if (!auth) {
    return <LoginPage />;
  }

  return (
    <AppShell activeView={permittedView} onViewChange={setActiveView} title={titles[permittedView]}>
      {content}
    </AppShell>
  );
}

function StudentPlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="px-4 py-6 lg:px-6">
      <div className="rounded-xl border border-line bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted">Student</p>
        <h2 className="mt-1 text-2xl font-bold text-ink">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
    </section>
  );
}
export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
