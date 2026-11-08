import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { safeRedirect } from '../auth/safeRedirect';
import { SentimentStrip } from '../components/charts';
import { Icon } from '../components/icons';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { ThemeToggle } from '../components/ThemeToggle';
import { Alert, Button, Field, Logo } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

type Mode = 'login' | 'register';

/** Datos de ejemplo del fragmento (suman: 36 + 15 + 20 = 71). */
const SAMPLE = { positive: 36, neutral: 15, negative: 20, total: 71 };
const SAMPLE_ROWS = [
  { label: 'Satisfechos', value: SAMPLE.positive },
  { label: 'Neutros', value: SAMPLE.neutral },
  { label: 'Insatisfechos', value: SAMPLE.negative },
];

export function AuthPage({ mode }: { mode: Mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  usePageTitle(mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión');

  // Solo se redirige a rutas internas (evita open redirect con un state manipulado).
  const target = safeRedirect((location.state as { from?: unknown } | null)?.from);
  if (user) return <Navigate to={target} replace />;

  const isRegister = mode === 'register';
  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      if (isRegister) await register(form.name, form.email, form.password);
      else await login(form.email, form.password);
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
      } else {
        setError('Algo salió mal. Intenta de nuevo.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de presentación: un fragmento real de lo que produce PulsoLocal, con datos de ejemplo. */}
      <aside className="hidden flex-col justify-between bg-[#111214] p-12 text-white lg:flex">
        <Logo inverted />

        <div className="max-w-lg">
          <p className="text-4xl leading-tight font-bold tracking-tight">Tus clientes ya te dijeron qué mejorar.</p>
          <p className="mt-3 text-lg text-white/75">Carga sus reseñas, la IA las lee por ti y te entrega un plan con cifras reales.</p>

          <figure data-ui className="mt-10 rounded-lg bg-white p-5 text-[#111]">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-semibold">Café Galeras</p>
              <p className="num text-xs text-[#5f6368]">{SAMPLE.total} reseñas · Pasto</p>
            </div>
            <SentimentStrip sentiment={SAMPLE} className="mt-3" />
            <dl className="num mt-2 grid grid-cols-3 text-xs text-[#5f6368]">
              {SAMPLE_ROWS.map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd className="text-sm font-medium text-[#111]">{Math.round((r.value / SAMPLE.total) * 100)} %</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 border-[#e5e7eb] border-t pt-4">
              <p className="font-semibold">Reduce la espera en horas pico</p>
              <p className="mt-1 text-sm text-[#5f6368]">
                8 de cada 71 reseñas se quejan de la espera. Refuerza la barra de 7 a 10 a. m., cuando se acumulan los pedidos.
              </p>
              <p className="num mt-2.5 flex items-center gap-2 text-xs text-[#5f6368]">
                <span className="h-1 w-20 overflow-hidden rounded-full bg-[#e5e7eb]" aria-hidden>
                  <span className="block h-full w-[22%] rounded-full bg-[#e34948]" />
                </span>
                Quejas sobre este tema: 11,3 % de las reseñas
              </p>
            </div>
            <figcaption className="sr-only">Ejemplo de reporte de PulsoLocal</figcaption>
          </figure>
        </div>

        <p className="text-sm text-white/60">Programación Orientada a la Web · UCC Pasto</p>
      </aside>

      {/* Formulario */}
      <div className="flex flex-col p-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5" noValidate>
            <Logo className="lg:hidden" />
            <div>
              <h1 className="text-2xl font-bold text-ink">{isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h1>
              <p className="mt-2 text-sm text-ink-2">
                {isRegister ? '¿Ya tienes cuenta? ' : '¿Primera vez aquí? '}
                <Link
                  to={isRegister ? '/login' : '/registro'}
                  className="font-semibold text-ink underline decoration-control underline-offset-4 hover:decoration-ink"
                >
                  {isRegister ? 'Inicia sesión' : 'Crea una cuenta gratis'}
                </Link>
              </p>
            </div>

            {error && <Alert>{error}</Alert>}

            {isRegister && (
              <Field
                label="Nombre"
                autoComplete="name"
                required
                maxLength={80}
                value={form.name}
                onChange={set('name')}
                error={fieldErrors.name}
              />
            )}
            <Field
              label="Correo"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="tu@negocio.co"
              value={form.email}
              onChange={set('email')}
              error={fieldErrors.email}
            />
            <Field
              label="Contraseña"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              maxLength={72}
              value={form.password}
              onChange={set('password')}
              error={fieldErrors.password}
            />
            {isRegister && <PasswordChecklist password={form.password} email={form.email} />}
            <Button type="submit" loading={submitting} className="h-10 w-full">
              {isRegister ? 'Crear cuenta' : 'Entrar'}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-3">
              <Icon name="shield" className="h-3.5 w-3.5" /> Sesión protegida con cookie segura
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
