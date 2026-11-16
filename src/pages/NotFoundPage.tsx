import { Link } from 'react-router';
import { Logo } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n } from '../i18n/I18nContext';

/** Ruta inexistente: se informa en lugar de redirigir en silencio al inicio. */
export function NotFoundPage() {
  const { t } = useI18n();
  usePageTitle(t('notFound.pageTitle'));
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-10 text-6xl font-bold text-ink-3">404</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">{t('notFound.title')}</h1>
        <p className="mt-2 text-sm text-ink-2">{t('notFound.text')}</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-strong">
          {t('notFound.back')}
        </Link>
      </div>
    </main>
  );
}
