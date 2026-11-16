import { useEffect, useRef, useState } from 'react';
import { api } from '../api/services';
import { type AnalysisMessage, RealtimeClient, type RealtimeStatus } from './RealtimeClient';

/** Conexión única de la pestaña. */
export const realtime = new RealtimeClient(() => api.realtime.ticket());

// Al volver la red, no se espera al siguiente reintento programado.
if (typeof window !== 'undefined') window.addEventListener('online', () => realtime.retryNow());

/**
 * Escucha en tiempo real los análisis de los negocios indicados y devuelve el estado del canal.
 * Mientras no esté "live", quien lo usa debe recurrir a su respaldo (polling).
 */
export function useRealtimeAnalyses(businessIds: readonly string[], onMessage: (message: AnalysisMessage) => void): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>(realtime.currentStatus);
  const handler = useRef(onMessage);
  handler.current = onMessage;
  const key = [...businessIds].sort().join(',');

  useEffect(() => realtime.onStatus(setStatus), []);

  useEffect(() => {
    if (!key) return;
    const unsubscribes = key.split(',').map((id) => realtime.subscribe(id, (message) => handler.current(message)));
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [key]);

  return status;
}
