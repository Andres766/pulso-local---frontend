import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { Icon, type IconName } from '../components/icons';
import { ThemeToggle } from '../components/ThemeToggle';
import { Alert, Button, Field, Logo } from '../components/ui';

type Mode = 'login' | 'register';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'upload', title: 'Carga tus reseñas', text: 'Desde un CSV o pegándolas: Google Maps, Instagram, WhatsApp…' },
  { icon: 'sparkles', title: 'La IA las lee por ti', text: 'Detecta los temas que más se repiten y el sentimiento de cada cliente.' },
  { icon: 'target', title: 'Recibe un plan concreto', text: 'Recomendaciones priorizadas y respaldadas con cifras reales.' },
];

export function AuthPage({ mode }: { mode: Mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Solo se redirige a rutas internas (evita open redirect con un state manipulado).
  const from = (location.state as { from?: string } | null)?.from;
  const target = from && from.startsWith('/') && !from.startsWith('//') ? from : '/';
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
      {/* Panel de presentación */}
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-[#123e75] via-[#1c5cab] to-[#2a78d6] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 left-10 h-80 w-80 rounded-full bg-[#86b6ef]/20 blur-3xl" />

        <Logo inverted />

        <div className="relative max-w-lg">
          <h1 className="text-4xl font-extrabold leading-tight">Tus clientes ya te dijeron qué mejorar.</h1>
          <p className="mt-3 text-lg text-white/80">PulsoLocal lo convierte en un plan de acción.</p>

          <ul className="mt-10 space-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icon name={f.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="text-sm text-white/75">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>

          {/* Ejemplo de lo que produce la herramienta */}
          <div className="mt-10 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
              <Icon name="sparkles" className="h-3.5 w-3.5" /> Ejemplo de recomendación
            </p>
            <p className="mt-2 font-semibold">Reduce la espera en horas pico</p>
            <p className="mt-1 text-sm text-white/80">El 25% de tus reseñas se queja del tiempo de espera. Refuerza el turno de 12 a 2 p. m.</p>
          </div>
        </div>

        <p className="relative text-sm text-white/60">Programación Orientada a la Web · UCC Pasto</p>
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
              <h1 className="text-3xl font-extrabold text-ink">{isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h1>
              <p className="mt-2 text-sm text-ink-2">
                {isRegister ? '¿Ya tienes cuenta? ' : '¿Primera vez aquí? '}
                <Link to={isRegister ? '/login' : '/registro'} className="font-semibold text-brand hover:underline">
                  {isRegister ? 'Inicia sesión' : 'Crea una cuenta gratis'}
                </Link>
              </p>
            </div>

            {error && <Alert>{error}</Alert>}

            {isRegister && (
              <Field label="Nombre" autoComplete="name" required maxLength={80} value={form.name} onChange={set('name')} error={fieldErrors.name} />
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
              hint={isRegister ? 'Mínimo 10 caracteres, con letras y números.' : undefined}
            />
            <Button type="submit" loading={submitting} className="w-full py-2.5">
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
