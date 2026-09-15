import { BookOpen, ClipboardCheck, GraduationCap, Users } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

const cards = [
  { title: 'Корбарон', value: '5 нақш', icon: Users, roles: ['SuperAdmin', 'Admin', 'Manager'] },
  { title: 'Фанҳо', value: 'Subject & Topic', icon: BookOpen, roles: ['SuperAdmin', 'Admin', 'Manager', 'Teacher'] },
  { title: 'Тестҳо', value: '20:00 - 07:00', icon: ClipboardCheck, roles: ['Teacher', 'Student'] },
  { title: 'Журнал', value: '0 - 100 хол', icon: GraduationCap, roles: ['SuperAdmin', 'Admin', 'Manager', 'Teacher', 'Student'] },
] as const;

export function DashboardPage() {
  const { auth } = useAuth();
  const visibleCards = cards.filter((card) => auth && card.roles.includes(auth.role));

  return (
    <AppShell>
      <section className="px-4 py-6 lg:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-muted">Хуш омадед</p>
            <h2 className="mt-1 text-2xl font-bold">{auth?.fullName}</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleCards.map((card) => (
            <div key={card.title} className="rounded-lg border border-line bg-white p-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm font-semibold text-muted">{card.title}</p>
              <p className="mt-1 text-xl font-bold">{card.value}</p>
            </div>
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
              <span className="text-muted">Омода мешавад</span>
              <span className="text-muted">{auth?.role}</span>
              <span className="font-semibold text-brand">Дар нақша</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

