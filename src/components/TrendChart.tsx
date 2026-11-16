import { useEffect, useState } from 'react';
import { api } from '../api/services';
import type { MonthlySentiment, SentimentLabel } from '../api/types';
import { useI18n } from '../i18n/I18nContext';
import { SENTIMENT_META } from './charts';
import { Skeleton } from './ui';

const ORDER: SentimentLabel[] = ['negative', 'neutral', 'positive']; // de abajo hacia arriba
/** "2026-08" → "ago 26" / "Aug 26": mes corto en el idioma de la interfaz y año de dos cifras. */
export function monthLabel(month: string, locale: string): string {
  const [y, mm] = month.split('-').map(Number);
  if (!y || !mm) return month;
  const name = new Date(y, mm - 1, 1).toLocaleDateString(locale, { month: 'short' }).replace('.', '');
  return `${name} ${String(y).slice(2)}`;
}

/** Escala redonda con 3-5 marcas y la superior por encima del máximo (las columnas nunca tocan el borde). */
export function scale(max: number): { top: number; ticks: number[] } {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const step = steps.find((st) => Math.ceil((max + 1) / st) <= 4) ?? Math.ceil(max / 4);
  const top = Math.ceil((max + 1) / step) * step;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, i) => i * step) };
}

/**
 * Columnas apiladas por mes (un solo eje: cantidad de reseñas). Los colores son los mismos
 * del resto del dashboard; cada columna lleva su total como etiqueta y un tooltip nativo con el
 * desglose, y la tabla equivalente queda disponible para lectores de pantalla y para imprimir.
 */
export function TrendChart({ businessId, refreshKey }: { businessId: string; refreshKey: number }) {
  const [points, setPoints] = useState<MonthlySentiment[] | null>(null);
  const { t, locale } = useI18n();

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
  if (points.length === 0) return <p className="text-sm text-ink-2">{t('trend.empty')}</p>;

  const { top, ticks } = scale(Math.max(1, ...points.map((p) => p.total)));

  return (
    <div>
      <div className="relative h-52 pl-8" aria-hidden>
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="num w-8 -translate-y-px pr-2 text-right text-[11px] leading-none text-ink-3">{t}</span>
            <span className={`h-px flex-1 ${t === 0 ? 'bg-control' : 'bg-line'}`} />
          </div>
        ))}
        <div className="relative flex h-full items-end gap-2 sm:gap-4">
          {points.map((p) => (
            <div
              key={p.month}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              title={t('trend.barTitle', {
                month: monthLabel(p.month, locale),
                positive: p.positive,
                neutral: p.neutral,
                negative: p.negative,
              })}
            >
              <span className="num mb-1 text-xs font-medium text-ink-2">{p.total > 0 ? p.total : ''}</span>
              <div className="flex w-full max-w-14 flex-col-reverse gap-[2px]" style={{ height: `${(p.total / top) * 100}%` }}>
                {ORDER.filter((s) => p[s] > 0).map((s, i, arr) => (
                  <div
                    key={s}
                    className={`${SENTIMENT_META[s].swatch} ${i === arr.length - 1 ? 'rounded-t-sm' : ''}`}
                    style={{ height: `${(p[s] / p.total) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex gap-2 pl-8 sm:gap-4" aria-hidden>
        {points.map((p) => (
          <span key={p.month} className="min-w-0 flex-1 truncate text-center text-xs text-ink-3">
            {monthLabel(p.month, locale)}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-ink-2 hover:text-ink">{t('trend.asTable')}</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <caption className="sr-only">{t('trend.caption')}</caption>
          <thead className="text-xs text-ink-3">
            <tr>
              <th scope="col" className="py-1">
                {t('trend.month')}
              </th>
              {(['positive', 'neutral', 'negative'] as const).map((s) => (
                <th key={s} scope="col" className="py-1 text-right">
                  {t(SENTIMENT_META[s].plural)}
                </th>
              ))}
              <th scope="col" className="py-1 text-right">
                {t('trend.total')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {points.map((p) => (
              <tr key={p.month}>
                <th scope="row" className="py-1 font-medium">
                  {monthLabel(p.month, locale)}
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
