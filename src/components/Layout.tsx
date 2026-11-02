import { Suspense } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ErrorBoundary } from './ErrorBoundary';
import { Icon } from './icons';
import { ThemeToggle } from './ThemeToggle';
import { Logo, Skeleton } from './ui';

function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando página">
      <Skeleton className="h-24" />
      <Skeleton className="h-64" />
    </div>
  );
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initial = user?.name.trim().charAt(0).toUpperCase() ?? '?';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-card/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="Ir a mis negocios">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/cuenta"
              className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-raised"
              title="Mi cuenta"
              aria-label="Mi cuenta"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand" aria-hidden>
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
              className="grid h-9 w-9 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-raised hover:text-ink"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {/* Si una página falla, la cabecera sigue disponible; el límite se reinicia al cambiar de ruta. */}
        <ErrorBoundary resetKey={location.pathname}>
          {/* Mientras llega el código de la página, la cabecera sigue visible. */}
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="border-t border-line py-5 text-center text-xs text-ink-3 print:hidden">
        PulsoLocal · Programación Orientada a la Web · UCC Pasto
      </footer>
    </div>
  );
}
