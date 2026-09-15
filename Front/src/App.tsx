import { useMemo, useState } from 'react';
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
  students: 'Хонандагон',
  teachers: 'Муаллимон',
  groups: 'Гурӯҳҳо',
  subjects: 'Фанҳо',
  topics: 'Мавзӯъҳо',
  questions: 'Саволҳо',
};

function AppContent() {
  const { auth } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedSubject, setSelectedSubject] = useState<SubjectDto | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicDto | null>(null);

  const content = useMemo(() => {
    switch (activeView) {
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
        return <GroupsPage />;
      default:
        return <DashboardPage onViewChange={setActiveView} />;
    }
  }, [activeView, selectedSubject, selectedTopic]);

  if (!auth) {
    return <LoginPage />;
  }

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView} title={titles[activeView]}>
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
