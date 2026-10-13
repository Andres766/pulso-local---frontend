import { Link, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Icon } from './icons';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './ui';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
            <div className="hidden items-center gap-2 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand" aria-hidden>
                {initial}
              </span>
              <span className="text-sm font-medium text-ink">{user?.name}</span>
            </div>
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
        <Outlet />
      </main>
      <footer className="border-t border-line py-5 text-center text-xs text-ink-3 print:hidden">
        PulsoLocal · Programación Orientada a la Web · UCC Pasto
      </footer>
    </div>
  );
}
