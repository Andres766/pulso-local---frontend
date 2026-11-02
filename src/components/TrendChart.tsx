import { useEffect, useState } from 'react';
import { api } from '../api/services';
import type { MonthlySentiment, SentimentLabel } from '../api/types';
import { SENTIMENT_META } from './charts';
import { Skeleton } from './ui';

const ORDER: SentimentLabel[] = ['negative', 'neutral', 'positive']; // de abajo hacia arriba
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "2026-08" → "ago 26" (formato corto y estable, sin depender de la configuración regional). */
const monthLabel = (m: string) => {
  const [y, mm] = m.split('-');
  return `${MONTHS[Number(mm) - 1] ?? mm} ${String(y).slice(2)}`;
};

/**
 * Columnas apiladas por mes (un solo eje: cantidad de reseñas). Los colores son los mismos
 * del resto del dashboard; cada columna lleva su total como etiqueta y un tooltip nativo con el
 * desglose, y la tabla equivalente queda disponible para lectores de pantalla y para imprimir.
 */
export function TrendChart({ businessId, refreshKey }: { businessId: string; refreshKey: number }) {
  const [points, setPoints] = useState<MonthlySentiment[] | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey es un disparador: se recarga tras cada análisis
  useEffect(() => {
    let cancelled = false;
    api.businesses
      .trend(businessId, 12)
      .then((r) => !cancelled && setPoints(r.points))
      .catch(() => !cancelled && setPoints([]));
    return () => {
      cancelled = true;
    };
  }, [businessId, refreshKey]);

  if (points === null) return <Skeleton className="h-56" />;
  if (points.length === 0) return <p className="text-sm text-ink-2">Aún no hay suficientes datos con fecha para mostrar una tendencia.</p>;

  const max = Math.max(1, ...points.map((p) => p.total));

  return (
    <div>
      <div className="flex h-52 items-end gap-2 border-b border-line pb-px sm:gap-3" aria-hidden>
        {points.map((p) => (
          <div
            key={p.month}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            title={`${monthLabel(p.month)}: ${p.positive} positivas, ${p.neutral} neutras, ${p.negative} negativas`}
          >
            <span className="mb-1 text-xs font-semibold tabular-nums text-ink-2">{p.total > 0 ? p.total : ''}</span>
            <div className="flex w-full max-w-12 flex-col-reverse gap-[2px]" style={{ height: `${(p.total / max) * 85}%` }}>
              {ORDER.filter((s) => p[s] > 0).map((s, i, arr) => (
                <div
                  key={s}
                  className={`${SENTIMENT_META[s].swatch} ${i === arr.length - 1 ? 'rounded-t' : ''}`}
                  style={{ height: `${(p[s] / p.total) * 100}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2 sm:gap-3" aria-hidden>
        {points.map((p) => (
          <span key={p.month} className="min-w-0 flex-1 truncate text-center text-[11px] text-ink-3">
            {monthLabel(p.month)}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">Ver como tabla</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <caption className="sr-only">Reseñas por mes y sentimiento</caption>
          <thead className="text-xs uppercase text-ink-3">
            <tr>
              <th scope="col" className="py-1">
                Mes
              </th>
              {(['positive', 'neutral', 'negative'] as const).map((s) => (
                <th key={s} scope="col" className="py-1 text-right">
                  {SENTIMENT_META[s].plural}
                </th>
              ))}
              <th scope="col" className="py-1 text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {points.map((p) => (
              <tr key={p.month}>
                <th scope="row" className="py-1 font-medium">
                  {monthLabel(p.month)}
                </th>
                <td className="py-1 text-right">{p.positive}</td>
                <td className="py-1 text-right">{p.neutral}</td>
                <td className="py-1 text-right">{p.negative}</td>
                <td className="py-1 text-right font-semibold">{p.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
