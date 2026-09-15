import { useMemo, useState } from 'react';
import { AppShell, type AppView } from './components/AppShell';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { GroupsPage } from './pages/GroupsPage';
import { LoginPage } from './pages/LoginPage';
import { StudentsPage } from './pages/StudentsPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { TeachersPage } from './pages/TeachersPage';

const titles: Record<AppView, string> = {
  dashboard: 'Dashboard',
  students: 'Хонандагон',
  teachers: 'Муаллимон',
  groups: 'Гурӯҳҳо',
  subjects: 'Фанҳо',
};

function AppContent() {
  const { auth } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  const content = useMemo(() => {
    switch (activeView) {
      case 'students':
        return <StudentsPage />;
      case 'subjects':
        return <SubjectsPage />;
      case 'teachers':
        return <TeachersPage />;
      case 'groups':
        return <GroupsPage />;
      default:
        return <DashboardPage onViewChange={setActiveView} />;
    }
  }, [activeView]);

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
