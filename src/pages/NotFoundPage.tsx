import { Link } from 'react-router';
import { Logo } from '../components/ui';

/** Ruta inexistente: se informa en lugar de redirigir en silencio al inicio. */
export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-10 font-display text-7xl font-extrabold text-brand">404</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Esta página no existe</h1>
        <p className="mt-2 text-sm text-ink-2">Puede que el enlace esté mal escrito o que el negocio haya sido eliminado.</p>
        <Link to="/" className="mt-6 inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand-strong">
          Volver a mis negocios
        </Link>
      </div>
    </main>
  );
}
