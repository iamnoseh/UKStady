import { FormEvent, useState } from 'react';
import { LockKeyhole, Phone, ShieldCheck } from 'lucide-react';
import logo from '../../UKStady_Logo.png';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { signIn } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('+992000000000');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signIn({ phoneNumber, password });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Воридшавӣ иҷро нашуд.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-panel lg:grid-cols-[1fr_460px]">
      <section className="hidden border-r border-line bg-white p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="UKStady" className="h-11 w-11 rounded-xl object-contain" />
          <div>
            <p className="text-base font-bold">UKStady</p>
            <p className="text-sm text-muted">Daily Knowledge Assessment</p>
          </div>
        </div>

        <div className="max-w-xl">
          <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-4xl font-bold leading-tight">Назорати дониш дар як ҷой.</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted">
            Муаллим, донишҷӯ ва маъмурият бо як интерфейси тоза ва фаҳмо кор мекунанд.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {['20:00 - 07:00', '100 хол', 'RBAC'].map((item) => (
            <div key={item} className="rounded-lg border border-line bg-panel px-4 py-3 text-sm font-semibold">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[380px] rounded-xl border border-line bg-white p-6 shadow-soft">
          <div className="mb-7 lg:hidden">
            <img src={logo} alt="UKStady" className="mb-3 h-11 w-11 rounded-xl object-contain" />
          </div>

          <h2 className="text-2xl font-bold">Воридшавӣ</h2>
          <p className="mt-2 text-sm text-muted">Бо рақами телефон ва пароли худ ворид шавед.</p>

          <label className="mt-7 block">
            <span className="text-sm font-semibold">Рақами телефон</span>
            <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-line bg-white px-3 focus-within:border-brand">
              <Phone className="h-5 w-5 text-muted" />
              <input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                className="h-full flex-1 outline-none"
                placeholder="+992..."
                autoComplete="tel"
              />
            </span>
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold">Парол</span>
            <span className="mt-2 flex h-12 items-center gap-3 rounded-lg border border-line bg-white px-3 focus-within:border-brand">
              <LockKeyhole className="h-5 w-5 text-muted" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-full flex-1 outline-none"
                placeholder="12345A"
                type="password"
                autoComplete="current-password"
              />
            </span>
          </label>

          {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <Button type="submit" className="mt-6 w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Санҷида истодааст...' : 'Ворид шудан'}
          </Button>
        </form>
      </section>
    </main>
  );
}

