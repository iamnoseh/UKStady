import { useState } from 'react';
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Home,
  Layers,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { hasPermission, type Permission } from '../auth/permissions';
import logo from '../assets/UKStady_Logo.png';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';

export type AppView = 'dashboard' | 'students' | 'teachers' | 'groups' | 'journal' | 'subjects' | 'topics' | 'questions';

const navigation: Array<{
  label: string;
  view: AppView;
  icon: React.ComponentType<{ className?: string }>;
  permission: Permission;
}> = [
  { label: 'Dashboard', view: 'dashboard', icon: Home, permission: 'dashboard.view' },
  { label: 'Хонандагон', view: 'students', icon: Users, permission: 'students.manage' },
  { label: 'Муаллимон', view: 'teachers', icon: GraduationCap, permission: 'teachers.manage' },
  { label: 'Гурӯҳҳо', view: 'groups', icon: Layers, permission: 'groups.view' },
  { label: '\u0416\u0443\u0440\u043d\u0430\u043b', view: 'journal', icon: ClipboardList, permission: 'journal.view' },
  { label: 'Фанҳо', view: 'subjects', icon: BookOpen, permission: 'subjects.view' },
  { label: 'Тестҳо', view: 'dashboard', icon: ClipboardCheck, permission: 'tests.view' },
];

export function AppShell({
  children,
  activeView,
  onViewChange,
  title,
}: {
  children: React.ReactNode;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  title: string;
}) {
  const { auth, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const visibleNavigation = navigation.filter((item) => auth && hasPermission(auth.role, item.permission));

  const handleNavClick = (view: AppView) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-ink">
      {/* ДЕСКТОП САЙДБАР (Desktop Sidebar) */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[236px] border-r border-line bg-panel/80 backdrop-blur lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <img src={logo} alt="UKStady" className="h-9 w-9 rounded-lg object-contain" />
          <div>
            <p className="text-sm font-bold tracking-wide">UKStady</p>
            <p className="text-xs text-muted">Assessment</p>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-5">
          {visibleNavigation.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.view)}
              className={`flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition ${
                activeView === item.view ? 'bg-white text-ink shadow-sm' : 'text-muted hover:bg-white hover:text-ink'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* МОБИЛ ДРОВЕР / МЕНЮИ ЛАҒЖАНДА (Mobile Sliding Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Заминаи торик (Backdrop) */}
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Панели меню (Sliding Panel) */}
          <aside className="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-line bg-white shadow-2xl">
            {/* Сатри болоии меню бо тугмаи пӯшидан */}
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="UKStady" className="h-8 w-8 rounded-lg object-contain" />
                <div>
                  <p className="text-sm font-bold tracking-wide text-ink">UKStady</p>
                  <p className="text-[11px] text-muted">Assessment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition hover:bg-panel hover:text-ink active:scale-95"
                aria-label="Пӯшидани меню"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Рӯйхати бахшҳои меню */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
              {visibleNavigation.map((item) => {
                const isActive = activeView === item.view;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavClick(item.view)}
                    className={`flex h-12 w-full items-center gap-3.5 rounded-xl px-3.5 text-left text-sm font-semibold transition active:scale-[0.98] ${
                      isActive
                        ? 'bg-brand/10 font-bold text-brand shadow-sm'
                        : 'text-ink/80 hover:bg-panel hover:text-ink'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-brand' : 'text-muted'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Қисми поёнии меню: маълумоти корбар ва тугмаи Exit */}
            <div className="border-t border-line bg-panel/50 p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{auth?.fullName}</p>
                  <p className="truncate font-mono text-xs text-muted">{auth?.phoneNumber}</p>
                  <span className="mt-0.5 inline-block text-[10px] font-bold uppercase tracking-wider text-brand">
                    {auth?.role}
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signOut();
                }}
                className="h-11 w-full justify-center gap-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Баромад аз система
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* МУҲТАВОИ АСОСӢ (Main Content Area) */}
      <main className="pb-20 lg:pl-[236px] lg:pb-6">
        {/* САРИ САҲИФА (Header) */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-white/95 px-3 backdrop-blur sm:h-16 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-line text-ink transition hover:bg-panel active:scale-95 lg:hidden"
              aria-label="Кушодани меню"
              title="Меню"
            >
              <Menu className="h-5 w-5 text-muted" />
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted sm:text-xs">{auth?.role}</p>
              <h1 className="truncate text-base font-bold text-ink sm:text-lg">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{auth?.fullName}</p>
              <p className="text-xs text-muted">{auth?.phoneNumber}</p>
            </div>
            <div className="hidden h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand sm:grid">
              <Shield className="h-5 w-5" />
            </div>
            <Button
              variant="secondary"
              onClick={signOut}
              className="h-9 px-2.5 text-xs font-semibold sm:h-10 sm:px-4 sm:text-sm"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Баромад</span>
            </Button>
          </div>
        </header>

        {children}
      </main>

      {/* МОБИЛ BOTTOM NAVIGATION (Fixed Bottom Bar on small screens) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[62px] items-center justify-around border-t border-line bg-white/95 px-1 pb-1 backdrop-blur shadow-soft lg:hidden">
        {visibleNavigation.slice(0, 4).map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.view)}
              className={`flex flex-1 flex-col items-center justify-center py-0.5 transition active:scale-95 ${
                isActive ? 'font-bold text-brand' : 'text-muted hover:text-ink'
              }`}
            >
              <div
                className={`grid h-7 w-10 place-items-center rounded-xl transition ${
                  isActive ? 'bg-brand/15 text-brand' : 'text-muted'
                }`}
              >
                <item.icon className="h-5 w-5" />
              </div>
              <span className="mt-0.5 text-[10px] leading-none truncate max-w-[68px]">{item.label}</span>
            </button>
          );
        })}

        {/* Агар бахшҳо аз 4 зиёд бошанд, тугмаи "Боз" ё "Меню" нишон дода мешавад */}
        {visibleNavigation.length > 4 ? (
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-1 flex-col items-center justify-center py-0.5 text-muted transition hover:text-ink active:scale-95"
          >
            <div className="grid h-7 w-10 place-items-center rounded-xl text-muted">
              <Menu className="h-5 w-5" />
            </div>
            <span className="mt-0.5 text-[10px] leading-none truncate">Ҳама</span>
          </button>
        ) : null}
      </nav>
    </div>
  );
}
