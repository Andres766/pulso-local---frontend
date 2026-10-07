import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { Alert, Button, Field, Logo } from '../components/ui';

type Mode = 'login' | 'register';

export function AuthPage({ mode }: { mode: Mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Solo se redirige a rutas internas (evita open redirect con state manipulado).
  const from = (location.state as { from?: string } | null)?.from;
  const target = from && from.startsWith('/') && !from.startsWith('//') ? from : '/';
  if (user) return <Navigate to={target} replace />;

  const isRegister = mode === 'register';
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

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
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-brand p-10 text-white lg:flex dark:bg-brand-soft">
        <Logo className="text-white [&_rect]:fill-white/20" />
        <div>
          <p className="text-3xl font-semibold leading-tight">Tus clientes ya te dijeron qué mejorar.<br />Nosotros lo convertimos en un plan.</p>
          <p className="mt-4 max-w-md text-white/80">
            Carga las reseñas de tu negocio y PulsoLocal detecta los temas que más se repiten, mide el sentimiento y te
            entrega recomendaciones concretas respaldadas en cifras.
          </p>
        </div>
        <p className="text-sm text-white/70">Proyecto de Programación Orientada a la Web · UCC Pasto</p>
      </aside>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4" noValidate>
          <Logo className="lg:hidden" />
          <div>
            <h1 className="text-2xl font-semibold">{isRegister ? 'Crea tu cuenta' : 'Inicia sesión'}</h1>
            <p className="mt-1 text-sm text-ink-2">
              {isRegister ? '¿Ya tienes cuenta? ' : '¿Primera vez? '}
              <Link to={isRegister ? '/login' : '/registro'} className="font-medium text-brand hover:underline">
                {isRegister ? 'Inicia sesión' : 'Regístrate gratis'}
              </Link>
            </p>
          </div>

          {error && <Alert>{error}</Alert>}

          {isRegister && (
            <Field label="Nombre" autoComplete="name" required maxLength={80} value={form.name} onChange={set('name')} error={fieldErrors.name} />
          )}
          <Field label="Correo" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={set('email')} error={fieldErrors.email} />
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
          <Button type="submit" loading={submitting} className="w-full">
            {isRegister ? 'Crear cuenta' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
