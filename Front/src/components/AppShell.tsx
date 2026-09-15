import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Home,
  Layers,
  LogOut,
  Menu,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import logo from '../../UKStady_Logo.png';
import { Button } from './Button';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

const navigation: Array<{
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}> = [
  { label: 'Dashboard', icon: Home, roles: ['SuperAdmin', 'Admin', 'Manager', 'Teacher', 'Student'] },
  { label: 'Users', icon: Users, roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { label: 'Groups', icon: Layers, roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { label: 'Subjects', icon: BookOpen, roles: ['SuperAdmin', 'Admin', 'Manager', 'Teacher'] },
  { label: 'Tests', icon: ClipboardCheck, roles: ['Teacher', 'Student'] },
  { label: 'Gradebook', icon: GraduationCap, roles: ['SuperAdmin', 'Admin', 'Manager', 'Teacher', 'Student'] },
  { label: 'Settings', icon: Settings, roles: ['SuperAdmin', 'Admin'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { auth, signOut } = useAuth();
  const visibleNavigation = navigation.filter((item) => auth && item.roles.includes(auth.role));

  return (
    <div className="min-h-screen bg-white text-ink">
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
              className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-muted transition hover:bg-white hover:text-ink"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="lg:pl-[236px]">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase text-muted">{auth?.role}</p>
              <h1 className="text-lg font-bold">Dashboard</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{auth?.fullName}</p>
              <p className="text-xs text-muted">{auth?.phoneNumber}</p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
              <Shield className="h-5 w-5" />
            </div>
            <Button variant="secondary" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Exit
            </Button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

