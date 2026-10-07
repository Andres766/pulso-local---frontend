import { useEffect, useRef } from 'react';
import { api } from '../api/services';
import type { AnalysisRun } from '../api/types';

/**
 * Consulta el estado de un análisis en curso cada `intervalMs` hasta que termine.
 * Se detiene al desmontar el componente (sin fugas de timers).
 */
export function useAnalysisPolling(run: AnalysisRun | null, onFinished: (run: AnalysisRun) => void, intervalMs = 1500) {
  const callback = useRef(onFinished);
  callback.current = onFinished;

  const active = run && (run.status === 'pending' || run.status === 'running') ? run.id : null;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const current = await api.analyses.get(active);
        if (cancelled) return;
        if (current.status === 'completed' || current.status === 'failed') {
          callback.current(current);
          return;
        }
      } catch {
        // error transitorio de red: se reintenta en el siguiente ciclo
      }
      if (!cancelled) timer = setTimeout(tick, intervalMs);
    };

    timer = setTimeout(tick, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, intervalMs]);
}
