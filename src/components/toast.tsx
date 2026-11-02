import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from './icons';

type Tone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastApi {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DURATION_MS = 4500;
const MAX_VISIBLE = 3;

const STYLE: Record<Tone, { icon: IconName; className: string }> = {
  success: { icon: 'check', className: 'border-good/30 text-good' },
  error: { icon: 'alert', className: 'border-critical/30 text-critical' },
  info: { icon: 'sparkles', className: 'border-brand/30 text-brand' },
};

/**
 * Notificaciones breves. La región usa aria-live (polite para avisos, assertive para errores)
 * para que los lectores de pantalla las anuncien sin mover el foco del usuario.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: Tone, message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, tone, message }].slice(-MAX_VISIBLE));
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6 print:hidden">
        {(['polite', 'assertive'] as const).map((politeness) => (
          <div key={politeness} aria-live={politeness} className="flex flex-col items-center gap-2 sm:items-end">
            {toasts
              .filter((t) => (t.tone === 'error') === (politeness === 'assertive'))
              .map((t) => (
                <div
                  key={t.id}
                  role={t.tone === 'error' ? 'alert' : 'status'}
                  className={`pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm shadow-lg ${STYLE[t.tone].className}`}
                >
                  <Icon name={STYLE[t.tone].icon} className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="text-ink">{t.message}</span>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    className="ml-2 text-ink-3 hover:text-ink"
                    aria-label="Cerrar notificación"
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
