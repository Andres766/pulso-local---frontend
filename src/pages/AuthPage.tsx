import { type ChangeEvent, type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../api/http';
import { useAuth } from '../auth/AuthContext';
import { safeRedirect } from '../auth/safeRedirect';
import { SentimentStrip } from '../components/charts';
import { Icon } from '../components/icons';
import { LanguageToggle } from '../components/LanguageToggle';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { ThemeToggle } from '../components/ThemeToggle';
import { Alert, Button, Field, Logo } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n } from '../i18n/I18nContext';

type Mode = 'login' | 'register';

/** Datos de ejemplo del fragmento (suman: 36 + 15 + 20 = 71). */
const SAMPLE = { positive: 36, neutral: 15, negative: 20, total: 71 };
const SAMPLE_ROWS = [
  { label: 'sentiment.satisfied', value: SAMPLE.positive },
  { label: 'sentiment.neutralPeople', value: SAMPLE.neutral },
  { label: 'sentiment.dissatisfied', value: SAMPLE.negative },
] as const;

export function AuthPage({ mode }: { mode: Mode }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const i18n = useI18n();
  const { t } = i18n;
  usePageTitle(mode === 'register' ? t('auth.titleRegister') : t('auth.titleLogin'));

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
      setError(i18n.errorMessage(err, 'common.genericError'));
      if (err instanceof ApiError) setFieldErrors(Object.fromEntries(err.details.map((d) => [d.field, d.message])));
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
          <p className="text-4xl leading-tight font-bold tracking-tight">{t('auth.headline')}</p>
          <p className="mt-3 text-lg text-white/75">{t('auth.lead')}</p>

          <figure data-ui className="mt-10 rounded-lg bg-white p-5 text-[#111]">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-semibold">Café Galeras</p>
              <p className="num text-xs text-[#5f6368]">{t('auth.sampleMeta', { count: SAMPLE.total })}</p>
            </div>
            <SentimentStrip sentiment={SAMPLE} className="mt-3" />
            <dl className="num mt-2 grid grid-cols-3 text-xs text-[#5f6368]">
              {SAMPLE_ROWS.map((r) => (
                <div key={r.label}>
                  <dt>{t(r.label)}</dt>
                  <dd className="text-sm font-medium text-[#111]">{i18n.percent(Math.round((r.value / SAMPLE.total) * 100))}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 border-[#e5e7eb] border-t pt-4">
              <p className="font-semibold">{t('auth.sampleTitle')}</p>
              <p className="mt-1 text-sm text-[#5f6368]">{t('auth.sampleText')}</p>
              <p className="num mt-2.5 flex items-center gap-2 text-xs text-[#5f6368]">
                <span className="h-1 w-20 overflow-hidden rounded-full bg-[#e5e7eb]" aria-hidden>
                  <span className="block h-full w-[22%] rounded-full bg-[#e34948]" />
                </span>
                {t('recs.evidence', { share: i18n.number(11.3) })}
              </p>
            </div>
            <figcaption className="sr-only">{t('auth.sampleCaption')}</figcaption>
          </figure>
        </div>

        <p className="text-sm text-white/60">{t('app.course')}</p>
      </aside>

      {/* Formulario */}
      <div className="flex flex-col p-6">
        <div className="flex justify-end gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5" noValidate>
            <Logo className="lg:hidden" />
            <div>
              <h1 className="text-2xl font-bold text-ink">{isRegister ? t('auth.createAccount') : t('auth.welcome')}</h1>
              <p className="mt-2 text-sm text-ink-2">
                {isRegister ? t('auth.haveAccount') : t('auth.firstTime')}
                <Link
                  to={isRegister ? '/login' : '/registro'}
                  className="font-semibold text-ink underline decoration-control underline-offset-4 hover:decoration-ink"
                >
                  {isRegister ? t('auth.signIn') : t('auth.createFree')}
                </Link>
              </p>
            </div>

            {error && <Alert>{error}</Alert>}

            {isRegister && (
              <Field
                label={t('common.name')}
                autoComplete="name"
                required
                maxLength={80}
                value={form.name}
                onChange={set('name')}
                error={fieldErrors.name}
              />
            )}
            <Field
              label={t('common.email')}
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder={t('auth.emailPlaceholder')}
              value={form.email}
              onChange={set('email')}
              error={fieldErrors.email}
            />
            <Field
              label={t('common.password')}
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
              {isRegister ? t('auth.submitRegister') : t('auth.submitLogin')}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-3">
              <Icon name="shield" className="h-3.5 w-3.5" /> {t('auth.secure')}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
