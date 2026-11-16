import type { ReactNode } from 'react';
import type { InsightReport, Priority, Recommendation, TopicStat } from '../api/types';
import { useI18n } from '../i18n/I18nContext';
import type { MessageKey } from '../i18n/messages';
import { Icon, type IconName } from './icons';

const PRIORITY: Record<Priority, { label: MessageKey; icon: IconName; text: string; bar: string; chip: string }> = {
  alta: {
    label: 'priority.alta',
    icon: 'alert',
    text: 'text-critical',
    bar: 'bg-critical',
    chip: 'bg-critical-soft text-critical',
  },
  media: {
    label: 'priority.media',
    icon: 'clock',
    text: 'text-warning',
    bar: 'bg-warning',
    chip: 'bg-warning-soft text-warning',
  },
  baja: {
    label: 'priority.baja',
    icon: 'check',
    text: 'text-ink-3',
    bar: 'bg-line',
    chip: 'bg-brand-soft text-ink-2',
  },
};

interface Tile {
  label: string;
  value: ReactNode;
  note: string;
  small?: boolean;
  extra?: ReactNode;
  /** Color del valor y de la marca superior: los datos de sentimiento llevan su color de siempre. */
  tone: string;
  accent: string;
}

/** Cuatro cifras en UN contenedor dividido por líneas finas: son tipografía, no tarjetas. */
export function KpiTiles({
  report,
  extras = {},
}: {
  report: InsightReport;
  extras?: Partial<Record<'total' | 'positive' | 'negative' | 'complaint', ReactNode>>;
}) {
  const { t, number } = useI18n();
  const { sentiment, totalReviews, topics } = report.stats;
  const share = (n: number) => (totalReviews === 0 ? 0 : Math.round((n / totalReviews) * 100));
  const topComplaint = [...topics].sort((a, b) => b.complaintShare - a.complaintShare)[0];
  const hasComplaint = Boolean(topComplaint && topComplaint.complaintShare > 0);
  const unit = (n: number) => (
    <>
      {n}
      <span className="ml-0.5 text-base font-normal text-ink-3">%</span>
    </>
  );

  const tiles: (Tile & { key: keyof typeof extras })[] = [
    {
      key: 'total',
      label: t('kpi.total'),
      value: totalReviews,
      note: t('kpi.topics', { count: topics.length }),
      tone: 'text-ink',
      accent: 'biz-band',
    },
    {
      key: 'positive',
      label: t('kpi.satisfied'),
      value: unit(share(sentiment.positive)),
      note: t('kpi.positiveReviews', { count: sentiment.positive }),
      tone: 'text-pos',
      accent: 'bg-pos',
    },
    {
      key: 'negative',
      label: t('kpi.dissatisfied'),
      value: unit(share(sentiment.negative)),
      note: t('kpi.negativeReviews', { count: sentiment.negative }),
      tone: 'text-neg',
      accent: 'bg-neg',
    },
    {
      key: 'complaint',
      label: t('kpi.complaint'),
      value: hasComplaint ? topComplaint!.name : t('kpi.noComplaint'),
      note: hasComplaint ? t('kpi.ofReviews', { share: number(topComplaint!.complaintShare) }) : t('kpi.noComplaintNote'),
      small: true,
      tone: 'biz-ink',
      accent: 'bg-warning',
    },
  ];

  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-card lg:grid-cols-4">
      {tiles.map((t, i) => (
        <div
          key={t.label}
          className={`border-line p-5 ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}
        >
          <span className={`mb-3 block h-1 w-10 rounded-full ${t.accent}`} aria-hidden />
          <p className="text-sm font-medium text-ink-2">{t.label}</p>
          <p
            className={`num mt-1.5 ${t.tone} ${t.small ? 'text-xl leading-tight font-semibold sm:leading-9' : 'text-3xl font-medium leading-9'}`}
          >
            {t.value}
          </p>
          <p className="mt-1 text-xs text-ink-3">{t.note}</p>
          {extras[t.key] && <div className="mt-2">{extras[t.key]}</div>}
        </div>
      ))}
    </div>
  );
}

export function RecommendationList({ items, topics }: { items: Recommendation[]; topics: TopicStat[] }) {
  const { t, number } = useI18n();
  const topicName = new Map(topics.map((topic) => [topic.key, topic.name]));
  if (items.length === 0) return <p className="text-sm text-ink-2">{t('recs.none')}</p>;

  return (
    <ol className="-my-4 divide-y divide-line">
      {items.map((r) => {
        const p = PRIORITY[r.priority];
        return (
          <li key={r.rank} className="relative grid grid-cols-[1.5rem_1fr] gap-x-2 py-4 pl-3 break-inside-avoid">
            <span className={`absolute top-4 bottom-4 left-0 w-[3px] rounded-full ${p.bar}`} aria-hidden />
            <span className="num pt-px text-sm font-medium text-ink-3">{r.rank}.</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
                <h3 className="font-semibold text-ink">{r.title}</h3>
                <span
                  className={`inline-flex flex-none items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${p.chip}`}
                >
                  <Icon name={p.icon} className="h-3 w-3" />
                  {t(p.label)}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{r.detail}</p>
              {(r.topicKey && topicName.has(r.topicKey)) || (r.evidenceShare !== null && r.evidenceShare > 0) ? (
                <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                  {r.topicKey && topicName.has(r.topicKey) && <span className="font-medium text-ink-2">{topicName.get(r.topicKey)}</span>}
                  {r.evidenceShare !== null && r.evidenceShare > 0 && (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1 w-20 overflow-hidden rounded-full bg-line" aria-hidden>
                        <span className="block h-full rounded-full bg-neg" style={{ width: `${Math.min(100, r.evidenceShare * 2)}%` }} />
                      </span>
                      <span className="num">{t('recs.evidence', { share: number(r.evidenceShare) })}</span>
                    </span>
                  )}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function TopicQuotes({ topic }: { topic: TopicStat }) {
  const { t } = useI18n();
  if (topic.sampleQuotes.length === 0) return null;
  return (
    <div className="rounded-md border border-line bg-raised p-4">
      <p className="text-sm font-semibold text-ink">{t('topics.quotesTitle', { topic: topic.name })}</p>
      <ul className="mt-2 space-y-2">
        {topic.sampleQuotes.map((q) => (
          <li key={q} className="border-l-2 border-control pl-3 text-sm text-ink-2">
            “{q}”
          </li>
        ))}
      </ul>
    </div>
  );
}
