import { useEffect } from 'react';

/** Título de la pestaña por página: es lo primero que anuncia un lector de pantalla al navegar. */
export function usePageTitle(title: string | null | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} · PulsoLocal` : 'PulsoLocal';
  }, [title]);
}
