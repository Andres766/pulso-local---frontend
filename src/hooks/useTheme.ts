import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'pulso-theme';

/** Preferencia guardada en este navegador (si el almacenamiento está bloqueado, se usa "system"). */
function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Aplica el tema resuelto como data-theme en <html>; el CSS no vuelve a mirar el sistema. */
export function applyTheme(preference: ThemePreference = readPreference()): void {
  const dark = preference === 'dark' || (preference === 'system' && systemPrefersDark());
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);

  useEffect(() => {
    applyTheme(preference);
    if (preference !== 'system') return;
    // En modo "sistema" se sigue el cambio del SO en vivo.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const choose = useCallback((next: ThemePreference) => {
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // almacenamiento no disponible: la preferencia dura solo esta sesión
    }
    setPreference(next);
  }, []);

  return { preference, choose };
}
