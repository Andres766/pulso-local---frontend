import { type ReactNode, useState } from 'react';
import type { InsightReport, SentimentLabel, TopicStat } from '../api/types';

/**
 * Gráficos del dashboard hechos con HTML/CSS (sin librería): barras finas, extremos redondeados,
 * separación de 2px entre segmentos, leyenda siempre visible y etiquetas directas.
 * El color nunca es la única pista: cada segmento tiene texto y tooltip.
 */

export const SENTIMENT_META: Record<SentimentLabel, { label: string; plural: string; swatch: string }> = {
  positive: { label: 'Positiva', plural: 'Positivas', swatch: 'bg-pos' },
  neutral: { label: 'Neutra', plural: 'Neutras', swatch: 'bg-neu' },
  negative: { label: 'Negativa', plural: 'Negativas', swatch: 'bg-neg' },
};
const ORDER: SentimentLabel[] = ['positive', 'neutral', 'negative'];

const pct = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 1000) / 10);

// ---- Tooltip compartido -------------------------------------------------------------

interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

function useTooltip() {
  const [tip, setTip] = useState<TipState | null>(null);
  const bind = (content: ReactNode) => ({
    onMouseMove: (e: React.MouseEvent) => setTip({ x: e.clientX, y: e.clientY, content }),
    onMouseLeave: () => setTip(null),
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ x: r.left + r.width / 2, y: r.top, content });
    },
    onBlur: () => setTip(null),
  });
  const node = tip && (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-md border border-line bg-card px-3 py-2 text-xs text-ink shadow-md"
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.content}
    </div>
  );
  return { bind, node };
}

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-ink-2" aria-label="Leyenda">
      {ORDER.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${SENTIMENT_META[s].swatch}`} aria-hidden />
          {SENTIMENT_META[s].plural}
        </li>
      ))}
    </ul>
  );
}

/** Barra 100 % mínima (6px) para listas: el mismo código de color que el resto del dashboard. */
export function SentimentStrip({
  sentiment,
  className = '',
}: {
  sentiment: Pick<InsightReport['stats']['sentiment'], SentimentLabel>;
  className?: string;
}) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  const parts = ORDER.filter((s) => sentiment[s] > 0);
  return (
    <span
      role="img"
      aria-label={parts.map((s) => `${SENTIMENT_META[s].plural} ${pct(sentiment[s], total)} %`).join(', ')}
      className={`flex h-1.5 gap-[2px] overflow-hidden rounded-full ${className}`}
    >
      {parts.map((s) => (
        <span key={s} className={SENTIMENT_META[s].swatch} style={{ width: `${pct(sentiment[s], total)}%` }} />
      ))}
    </span>
  );
}

// ---- Distribución de sentimiento (barra 100% apilada) --------------------------------

export function SentimentBar({ sentiment }: { sentiment: InsightReport['stats']['sentiment'] }) {
  const { bind, node } = useTooltip();
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  const segments = ORDER.map((s) => ({ s, count: sentiment[s], share: pct(sentiment[s], total) })).filter((x) => x.count > 0);

  return (
    <div>
      <div
        className="flex h-5 w-full gap-[2px]"
        role="img"
        aria-label={segments.map((x) => `${SENTIMENT_META[x.s].plural} ${x.share}%`).join(', ')}
      >
        {segments.map((x, i) => (
          <div
            key={x.s}
            {...bind(
              <>
                <strong>{SENTIMENT_META[x.s].plural}</strong>: {x.count} reseñas ({x.share}%)
              </>,
            )}
            className={`${SENTIMENT_META[x.s].swatch} h-full outline-offset-1 ${i === 0 ? 'rounded-l' : ''} ${i === segments.length - 1 ? 'rounded-r' : ''}`}
            style={{ width: `${x.share}%` }}
          />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        {ORDER.map((s) => (
          <div key={s}>
            <dt className="flex items-center gap-1.5 text-ink-2">
              <span className={`h-2.5 w-2.5 rounded-sm ${SENTIMENT_META[s].swatch}`} aria-hidden />
              {SENTIMENT_META[s].plural}
            </dt>
            <dd className="font-semibold tabular-nums text-ink">
              {pct(sentiment[s], total)}% <span className="font-normal text-ink-3">({sentiment[s]})</span>
            </dd>
          </div>
        ))}
      </dl>
      {node}
    </div>
  );
}

// ---- Temas recurrentes (barras horizontales apiladas por sentimiento) ----------------

export function TopicChart({
  topics,
  selected,
  onSelect,
}: {
  topics: TopicStat[];
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  const { bind, node } = useTooltip();
  const max = Math.max(1, ...topics.map((t) => t.mentions));

  return (
    <div className="space-y-3">
      <ul className="-mx-2 space-y-1">
        {topics.map((t) => {
          const isSelected = selected === t.key;
          return (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => onSelect(isSelected ? null : t.key)}
                aria-pressed={isSelected}
                className={`group w-full rounded-md px-2 py-1.5 text-left transition-colors ${isSelected ? 'bg-brand-soft ring-1 ring-control' : 'hover:bg-raised'}`}
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink" title={t.description}>
                    {t.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-2">
                    {t.mentions} menciones ·{' '}
                    <span className={t.complaintShare > 0 ? 'font-semibold text-ink' : ''}>{t.complaintShare}% quejas</span>
                  </span>
                </div>
                <div className="flex h-2.5 gap-[2px]" style={{ width: `${(t.mentions / max) * 100}%` }}>
                  {ORDER.filter((s) => t[s] > 0).map((s, i, arr) => (
                    <span
                      key={s}
                      {...bind(
                        <>
                          <strong>{t.name}</strong>
                          <br />
                          {SENTIMENT_META[s].plural}: {t[s]} de {t.mentions} ({pct(t[s], t.mentions)}%)
                        </>,
                      )}
                      className={`${SENTIMENT_META[s].swatch} h-full ${i === 0 ? 'rounded-l' : ''} ${i === arr.length - 1 ? 'rounded-r' : ''}`}
                      style={{ width: `${(t[s] / t.mentions) * 100}%` }}
                    />
                  ))}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-ink-3 print:hidden">Haz clic en un tema para filtrar las reseñas.</p>
      {node}
    </div>
  );
}
