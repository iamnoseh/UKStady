import { BookOpen, ClipboardCheck, GraduationCap, Layers, Users } from 'lucide-react';
import type { AppView } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

const cards: Array<{
  title: string;
  value: string;
  view: AppView;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}> = [
  { title: 'Хонандагон', value: 'Student accounts', view: 'students', icon: Users, roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { title: 'Муаллимон', value: 'Teacher subjects', view: 'teachers', icon: GraduationCap, roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { title: 'Гурӯҳҳо', value: 'Branches and subjects', view: 'groups', icon: Layers, roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { title: 'Фанҳо', value: 'Subject catalog', view: 'subjects', icon: BookOpen, roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { title: 'Тестҳо', value: '20:00 - 07:00', view: 'dashboard', icon: ClipboardCheck, roles: ['Teacher', 'Student'] },
  { title: 'Журнал', value: '0 - 100 хол', view: 'dashboard', icon: GraduationCap, roles: ['SuperAdmin', 'Admin', 'Manager', 'Teacher', 'Student'] },
];

export function DashboardPage({ onViewChange }: { onViewChange: (view: AppView) => void }) {
  const { auth } = useAuth();
  const visibleCards = cards.filter((card) => auth && card.roles.includes(auth.role));

  return (
    <section className="px-4 py-6 lg:px-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-muted">Хуш омадед</p>
          <h2 className="mt-1 text-2xl font-bold">{auth?.fullName}</h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((card) => (
          <button
            key={card.title}
            onClick={() => onViewChange(card.view)}
            className="rounded-lg border border-line bg-white p-5 text-left transition hover:border-brand/40 hover:shadow-soft"
          >
            <div className="mb-5 grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-muted">{card.title}</p>
            <p className="mt-1 text-xl font-bold">{card.value}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] border-b border-line bg-panel px-4 py-3 text-xs font-bold uppercase text-muted">
          <span>Модул</span>
          <span>Ҳолат</span>
          <span>Дастрасӣ</span>
          <span>Қадам</span>
        </div>
        {visibleCards.map((card) => (
          <div key={card.title} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center border-b border-line px-4 py-4 text-sm last:border-0">
            <span className="font-semibold">{card.title}</span>
            <span className="text-muted">Фаъол</span>
            <span className="text-muted">{auth?.role}</span>
            <button onClick={() => onViewChange(card.view)} className="text-left font-semibold text-brand">
              Кушодан
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
