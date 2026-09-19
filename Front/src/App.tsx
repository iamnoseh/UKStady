import { useMemo, useState } from 'react';
import { hasPermission, type Permission } from './auth/permissions';
import { AppShell, type AppView } from './components/AppShell';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminsPage } from './pages/AdminsPage';
import { DashboardPage } from './pages/DashboardPage';
import { GroupsPage } from './pages/GroupsPage';
import { LoginPage } from './pages/LoginPage';
import { QuestionsPage } from './pages/QuestionsPage';
import { StudentJournalPage } from './pages/StudentJournalPage';
import { StudentsPage } from './pages/StudentsPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { TeachersPage } from './pages/TeachersPage';
import { TopicsPage } from './pages/TopicsPage';
import type { SubjectDto, TopicDto } from './types/admin';

const titles: Record<AppView, string> = {
  dashboard: 'Dashboard',
  admins: 'Админҳо',
  students: 'Хонандагон',
  teachers: 'Муаллимон',
  groups: 'Гурӯҳҳо',
  tests: 'Тестҳо',
  journal: 'Журнал',
  subjects: 'Фанҳо',
  topics: 'Мавзӯъҳо',
  questions: 'Саволҳо',
};

const viewPermissions: Record<AppView, Permission> = {
  dashboard: 'dashboard.view',
  admins: 'admins.manage',
  students: 'students.manage',
  teachers: 'teachers.manage',
  groups: 'groups.view',
  tests: 'tests.view',
  journal: 'journal.view',
  subjects: 'subjects.view',
  topics: 'subjects.view',
  questions: 'subjects.view',
};

function AppContent() {
  const { auth } = useAuth();
  const defaultView: AppView = auth?.role === 'Student' ? 'tests' : 'dashboard';
  const [activeView, setActiveView] = useState<AppView>(defaultView);
  const [selectedSubject, setSelectedSubject] = useState<SubjectDto | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicDto | null>(null);

  const permittedView = auth && hasPermission(auth.role, viewPermissions[activeView])
    ? activeView
    : defaultView;

  const content = useMemo(() => {
    switch (permittedView) {
      case 'admins':
        return <AdminsPage />;
      case 'students':
        return <StudentsPage />;
      case 'subjects':
        return (
          <SubjectsPage
            onOpenTopics={(subject) => {
              setSelectedSubject(subject);
              setActiveView('topics');
            }}
          />
        );
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
          <SubjectsPage
            onOpenTopics={(subject) => {
              setSelectedSubject(subject);
              setActiveView('topics');
            }}
          />
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
          <SubjectsPage
            onOpenTopics={(subject) => {
              setSelectedSubject(subject);
              setActiveView('topics');
            }}
          />
        );
      case 'teachers':
        return <TeachersPage />;
      case 'groups':
        return <GroupsPage />;
      case 'tests':
        return <DashboardPage onViewChange={setActiveView} />;
      case 'journal':
        return <StudentJournalPage />;
      default:
        return <DashboardPage onViewChange={setActiveView} />;
    }
  }, [permittedView, selectedSubject, selectedTopic]);

  if (!auth) {
    return <LoginPage />;
  }

  return (
    <AppShell activeView={permittedView} onViewChange={setActiveView} title={titles[permittedView]}>
      {content}
    </AppShell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
