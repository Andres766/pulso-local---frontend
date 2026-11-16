import { type ReactNode, useState } from 'react';
import type { InsightReport, SentimentLabel, TopicStat } from '../api/types';
import { useI18n } from '../i18n/I18nContext';
import type { MessageKey } from '../i18n/messages';

/**
 * Gráficos del dashboard hechos con HTML/CSS (sin librería): barras finas, extremos redondeados,
 * separación de 2px entre segmentos, leyenda siempre visible y etiquetas directas.
 * El color nunca es la única pista: cada segmento tiene texto y tooltip.
 */

/** Color de cada sentimiento y las claves de sus etiquetas (el texto sale de i18n). */
export const SENTIMENT_META: Record<SentimentLabel, { label: MessageKey; plural: MessageKey; swatch: string }> = {
  positive: { label: 'sentiment.positive', plural: 'sentiment.positive.plural', swatch: 'bg-pos' },
  neutral: { label: 'sentiment.neutral', plural: 'sentiment.neutral.plural', swatch: 'bg-neu' },
  negative: { label: 'sentiment.negative', plural: 'sentiment.negative.plural', swatch: 'bg-neg' },
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
  const { t } = useI18n();
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-ink-2" aria-label={t('legend.label')}>
      {ORDER.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-sm ${SENTIMENT_META[s].swatch}`} aria-hidden />
          {t(SENTIMENT_META[s].plural)}
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
  const { t, percent } = useI18n();
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  const parts = ORDER.filter((s) => sentiment[s] > 0);
  return (
    <span
      role="img"
      aria-label={parts.map((s) => `${t(SENTIMENT_META[s].plural)} ${percent(pct(sentiment[s], total))}`).join(', ')}
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
  const { t, number, percent } = useI18n();
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  const segments = ORDER.map((s) => ({ s, count: sentiment[s], share: pct(sentiment[s], total) })).filter((x) => x.count > 0);

  return (
    <div>
      <div
        className="flex h-5 w-full gap-[2px]"
        role="img"
        aria-label={segments.map((x) => `${t(SENTIMENT_META[x.s].plural)} ${percent(x.share)}`).join(', ')}
      >
        {segments.map((x, i) => (
          <div
            key={x.s}
            {...bind(
              <>
                <strong>{t(SENTIMENT_META[x.s].plural)}</strong>: {t('sentimentBar.tooltip', { count: x.count, share: number(x.share) })}
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
              {t(SENTIMENT_META[s].plural)}
            </dt>
            <dd className="font-semibold tabular-nums text-ink">
              {percent(pct(sentiment[s], total))} <span className="font-normal text-ink-3">({sentiment[s]})</span>
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
  const i18n = useI18n();
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
                    {i18n.t('topics.mentions', { count: t.mentions })} ·{' '}
                    <span className={t.complaintShare > 0 ? 'font-semibold text-ink' : ''}>
                      {i18n.t('topics.complaints', { share: i18n.number(t.complaintShare) })}
                    </span>
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
                          {i18n.t('topics.tooltip', {
                            label: i18n.t(SENTIMENT_META[s].plural),
                            count: t[s],
                            total: t.mentions,
                            share: i18n.number(pct(t[s], t.mentions)),
                          })}
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
      <p className="text-xs text-ink-3 print:hidden">{i18n.t('topics.hint')}</p>
      {node}
    </div>
  );
}
