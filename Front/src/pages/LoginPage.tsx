import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Phone } from 'lucide-react';
import bannerImg from '../assets/login_banner.jpg';
import logo from '../assets/UKStady_Logo.png';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { signIn } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('+992000000000');
  const [password, setPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen bg-panel lg:grid lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.2fr_0.8fr]">
      {/* ТАРАФИ ЧАП: Танҳо барои компютер (Desktop) */}
      <section className="relative hidden items-center justify-center overflow-hidden border-r border-line bg-gradient-to-br from-[#e8f1fd] via-[#f1f6fe] to-[#edf4fc] p-8 lg:flex xl:p-12">
        <div className="relative flex h-full max-h-[92vh] w-full max-w-[620px] items-center justify-center">
          <img
            src={bannerImg}
            alt="UKStady - Назорати дониш дар як ҷой"
            className="max-h-full w-auto max-w-full rounded-3xl object-contain shadow-2xl ring-1 ring-black/5 transition-transform duration-300 hover:scale-[1.01]"
          />
        </div>
      </section>

      {/* ТАРАФИ РОСТ: Корти воридшавӣ */}
      <section className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 lg:p-12">
        <div className="w-full max-w-[420px]">
          {/* Логотип дар мобил */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <img src={logo} alt="UKStady" className="h-14 w-14 rounded-2xl object-contain shadow-md ring-1 ring-black/5" />
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">UKStady</h1>
            <p className="text-xs text-muted">Системаи санҷиш ва баҳогузорӣ</p>
          </div>

          {/* Корти формаи воридшавӣ */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-line bg-white p-6 shadow-soft sm:p-8"
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-ink sm:text-2xl">Воридшавӣ</h2>
              <p className="mt-1 text-xs text-muted sm:text-sm">
                Барои идома рақами телефон ва паролро ворид намоед
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Рақами телефон
                </span>
                <div className="mt-1.5 flex h-12 items-center gap-3 rounded-xl border border-line bg-panel/60 px-3.5 transition-colors focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/15">
                  <Phone className="h-5 w-5 shrink-0 text-muted" />
                  <input
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/60"
                    placeholder="+992..."
                    autoComplete="tel"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Парол
                </span>
                <div className="mt-1.5 flex h-12 items-center gap-3 rounded-xl border border-line bg-panel/60 px-3.5 transition-colors focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/15">
                  <LockKeyhole className="h-5 w-5 shrink-0 text-muted" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/60"
                    placeholder="Пароли худро ворид кунед"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-line/60 hover:text-ink focus:outline-none"
                    title={showPassword ? 'Пинҳон кардани парол' : 'Дидани парол'}
                    aria-label={showPassword ? 'Пинҳон кардани парол' : 'Дидани парол'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              className="mt-6 h-12 w-full text-base font-semibold shadow-md transition hover:brightness-105 active:scale-[0.99]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Санҷида истодааст...' : 'Ворид шудан'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
