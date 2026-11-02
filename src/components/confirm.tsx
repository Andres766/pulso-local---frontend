import { createContext, type ReactNode, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { Button, Field } from './ui';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  /** Acciones irreversibles: el botón se muestra en rojo. */
  danger?: boolean;
  /** Si se indica, el usuario debe escribir este texto para habilitar la confirmación. */
  requireText?: string;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * Diálogo de confirmación sobre el elemento nativo <dialog> abierto con showModal(): el navegador
 * aporta el atrapado del foco, el cierre con Esc, el fondo inerte y la semántica de modal.
 * useConfirm() devuelve una promesa, así el llamador escribe `if (await confirm(...))`.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState('');
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const confirm = useCallback<Confirm>((next) => {
    setTyped('');
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    if (options && !dialog.current?.open) dialog.current?.showModal();
  }, [options]);

  const close = (ok: boolean) => {
    dialog.current?.close();
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  const blocked = Boolean(options?.requireText) && typed.trim() !== options?.requireText;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onCancel={(e) => {
          e.preventDefault(); // Esc: se cierra por la misma vía que "Cancelar"
          close(false);
        }}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-line bg-card p-0 text-ink shadow-2xl backdrop:bg-black/40"
      >
        {options && (
          <form
            method="dialog"
            className="space-y-4 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!blocked) close(true);
            }}
          >
            <h2 id={titleId} className="text-lg font-bold">
              {options.title}
            </h2>
            <div className="text-sm text-ink-2">{options.message}</div>
            {options.requireText && (
              <Field
                label={`Escribe «${options.requireText}» para confirmar`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoFocus
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant={options.danger ? 'danger' : 'primary'} disabled={blocked}>
                {options.confirmLabel ?? 'Confirmar'}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
