import { Suspense, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import type { MessageKey } from '../i18n/messages';
import { ErrorBoundary } from './ErrorBoundary';
import { Icon } from './icons';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { Logo, Skeleton } from './ui';

function PageSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-6" role="status" aria-label={t('common.loading')}>
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </div>
  );
}

const NAV: { to: string; label: MessageKey; end: boolean; adminOnly?: boolean }[] = [
  { to: '/', label: 'nav.businesses', end: true },
  { to: '/cuenta', label: 'nav.account', end: false },
  { to: '/admin', label: 'nav.admin', end: false, adminOnly: true },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);

  // En una SPA el navegador no mueve el foco al cambiar de página: se lleva al contenido para que
  // teclado y lector de pantalla empiecen por la página nueva. Se compara con la ruta anterior (y no
  // con un "primer render") para que el doble efecto de StrictMode no mueva el foco al cargar.
  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);
  const initial = user?.name.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-on-brand focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        {t('nav.skip')}
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link to="/" aria-label={t('nav.home')}>
              <Logo compactOnPhone />
            </Link>
            <nav aria-label={t('nav.main')} className="hidden items-center gap-1 sm:flex">
              {NAV.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${isActive ? 'bg-brand-soft text-ink' : 'text-ink-2 hover:text-ink'}`
                  }
                >
                  {t(item.label)}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link
              to="/cuenta"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-brand-soft"
              title={t('nav.accountOf', { name: user?.name ?? '' })}
              aria-label={t('nav.accountOf', { name: user?.name ?? '' })}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#dbe7f6] text-xs font-semibold text-[#1c4f8f]" aria-hidden>
                {initial}
              </span>
              <span className="hidden text-sm font-medium text-ink sm:inline">{user?.name}</span>
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="grid h-8 w-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-brand-soft hover:text-ink"
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>
      <main id="contenido" ref={main} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-12 outline-none">
        {/* Si una página falla, la cabecera sigue disponible; el límite se reinicia al cambiar de ruta. */}
        <ErrorBoundary resetKey={location.pathname}>
          {/* Mientras llega el código de la página, la cabecera sigue visible. */}
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="border-t border-line print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-4 text-xs text-ink-3">
          <span>PulsoLocal · {t('app.tagline')}</span>
          <span>{t('app.course')}</span>
        </div>
      </footer>
    </div>
  );
}
