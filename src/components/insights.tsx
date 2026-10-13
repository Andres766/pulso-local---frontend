import type { ReactNode } from 'react';
import type { InsightReport, Priority, Recommendation, TopicStat } from '../api/types';
import { Icon, type IconName } from './icons';

const PRIORITY: Record<Priority, { label: string; icon: IconName; text: string; bar: string; chip: string }> = {
  alta: { label: 'Prioridad alta', icon: 'alert', text: 'text-critical', bar: 'bg-critical', chip: 'bg-critical-soft text-critical' },
  media: { label: 'Prioridad media', icon: 'clock', text: 'text-warning', bar: 'bg-warning', chip: 'bg-warning-soft text-warning' },
  baja: { label: 'Prioridad baja', icon: 'check', text: 'text-ink-3', bar: 'bg-line', chip: 'bg-raised text-ink-2' },
};

interface Tile {
  label: string;
  value: string;
  note: string;
  icon: IconName;
  iconClass: string;
  small?: boolean;
  extra?: ReactNode;
}

export function KpiTiles({ report, extras = {} }: { report: InsightReport; extras?: Partial<Record<'total' | 'positive' | 'negative' | 'complaint', ReactNode>> }) {
  const { sentiment, totalReviews, topics } = report.stats;
  const share = (n: number) => (totalReviews === 0 ? 0 : Math.round((n / totalReviews) * 100));
  const topComplaint = [...topics].sort((a, b) => b.complaintShare - a.complaintShare)[0];
  const hasComplaint = Boolean(topComplaint && topComplaint.complaintShare > 0);

  const tiles: (Tile & { key: keyof typeof extras })[] = [
    { key: 'total', label: 'Reseñas analizadas', value: totalReviews.toString(), note: `${topics.length} temas detectados`, icon: 'message', iconClass: 'bg-brand-soft text-brand' },
    { key: 'positive', label: 'Clientes satisfechos', value: `${share(sentiment.positive)}%`, note: `${sentiment.positive} reseñas positivas`, icon: 'smile', iconClass: 'bg-brand-soft text-pos' },
    { key: 'negative', label: 'Clientes insatisfechos', value: `${share(sentiment.negative)}%`, note: `${sentiment.negative} reseñas negativas`, icon: 'frown', iconClass: 'bg-critical-soft text-neg' },
    {
      key: 'complaint',
      label: 'Principal queja',
      value: hasComplaint ? topComplaint!.name : 'Sin quejas',
      note: hasComplaint ? `${topComplaint!.complaintShare}% de las reseñas` : 'No hay quejas recurrentes',
      icon: 'target',
      iconClass: 'bg-warning-soft text-warning',
      small: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{t.label}</p>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${t.iconClass}`}>
              <Icon name={t.icon} />
            </span>
          </div>
          <p className={`mt-2 font-display font-extrabold tabular-nums text-ink ${t.small ? 'text-lg leading-7' : 'text-3xl'}`}>{t.value}</p>
          <p className="mt-1 text-xs text-ink-2">{t.note}</p>
          {extras[t.key] && <div className="mt-2">{extras[t.key]}</div>}
        </div>
      ))}
    </div>
  );
}

export function RecommendationList({ items, topics }: { items: Recommendation[]; topics: TopicStat[] }) {
  const topicName = new Map(topics.map((t) => [t.key, t.name]));
  if (items.length === 0) return <p className="text-sm text-ink-2">No se generaron recomendaciones.</p>;

  return (
    <ol className="space-y-3">
      {items.map((r) => {
        const p = PRIORITY[r.priority];
        return (
          <li key={r.rank} className="relative overflow-hidden rounded-xl border border-line bg-raised/50 p-4 pl-5 break-inside-avoid">
            <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${p.bar}`} />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${p.chip}`}>
                <Icon name={p.icon} className="h-3 w-3" />
                {p.label}
              </span>
              {r.topicKey && topicName.has(r.topicKey) && (
                <span className="rounded-full border border-line bg-card px-2 py-0.5 text-ink-2">{topicName.get(r.topicKey)}</span>
              )}
            </div>
            <h3 className="mt-2.5 flex gap-2 font-bold text-ink">
              <span className="tabular-nums text-ink-3">{r.rank}.</span>
              {r.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{r.detail}</p>
            {r.evidenceShare !== null && r.evidenceShare > 0 && (
              <p className="mt-3 flex items-center gap-2 text-xs text-ink-3">
                <span className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                  <span className={`block h-full rounded-full ${p.bar}`} style={{ width: `${Math.min(100, r.evidenceShare * 2)}%` }} />
                </span>
                Quejas sobre este tema: {r.evidenceShare}% de las reseñas
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function TopicQuotes({ topic }: { topic: TopicStat }) {
  if (topic.sampleQuotes.length === 0) return null;
  return (
    <div className="rounded-xl border border-line bg-raised p-4">
      <p className="text-sm font-semibold text-ink">Lo que dicen sobre «{topic.name}»</p>
      <ul className="mt-2 space-y-2">
        {topic.sampleQuotes.map((q) => (
          <li key={q} className="border-l-2 border-brand/40 pl-3 text-sm italic text-ink-2">
            “{q}”
          </li>
        ))}
      </ul>
    </div>
  );
}
