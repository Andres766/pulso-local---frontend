import type { InsightReport, Priority, Recommendation, TopicStat } from '../api/types';

const PRIORITY: Record<Priority, { label: string; icon: string; className: string }> = {
  alta: { label: 'Prioridad alta', icon: '▲', className: 'text-critical' },
  media: { label: 'Prioridad media', icon: '●', className: 'text-warning' },
  baja: { label: 'Prioridad baja', icon: '▽', className: 'text-ink-3' },
};

export function KpiTiles({ report }: { report: InsightReport }) {
  const { sentiment, totalReviews, topics } = report.stats;
  const share = (n: number) => (totalReviews === 0 ? 0 : Math.round((n / totalReviews) * 100));
  const topComplaint = [...topics].sort((a, b) => b.complaintShare - a.complaintShare)[0];

  const tiles = [
    { label: 'Reseñas analizadas', value: totalReviews.toString(), note: `${topics.length} temas detectados` },
    { label: 'Clientes satisfechos', value: `${share(sentiment.positive)}%`, note: `${sentiment.positive} reseñas positivas` },
    { label: 'Clientes insatisfechos', value: `${share(sentiment.negative)}%`, note: `${sentiment.negative} reseñas negativas` },
    {
      label: 'Principal queja',
      value: topComplaint && topComplaint.complaintShare > 0 ? topComplaint.name : '—',
      note: topComplaint && topComplaint.complaintShare > 0 ? `${topComplaint.complaintShare}% de las reseñas` : 'Sin quejas recurrentes',
      small: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-3">{t.label}</p>
          <p className={`mt-1 font-semibold tabular-nums text-ink ${t.small ? 'text-lg leading-7' : 'text-3xl'}`}>{t.value}</p>
          <p className="mt-1 text-xs text-ink-2">{t.note}</p>
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
          <li key={r.rank} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className={`inline-flex items-center gap-1 font-semibold ${p.className}`}>
                <span aria-hidden>{p.icon}</span>
                {p.label}
              </span>
              {r.topicKey && topicName.has(r.topicKey) && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-ink-2">{topicName.get(r.topicKey)}</span>
              )}
              {r.evidenceShare !== null && r.evidenceShare > 0 && (
                <span className="text-ink-3">Respaldo: {r.evidenceShare}% de las reseñas se quejan de esto</span>
              )}
            </div>
            <h3 className="mt-2 font-semibold text-ink">
              <span className="mr-2 tabular-nums text-ink-3">{r.rank}.</span>
              {r.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{r.detail}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function TopicQuotes({ topic }: { topic: TopicStat }) {
  if (topic.sampleQuotes.length === 0) return null;
  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="text-sm font-medium text-ink">Lo que dicen sobre «{topic.name}»</p>
      <ul className="mt-2 space-y-2">
        {topic.sampleQuotes.map((q) => (
          <li key={q} className="border-l-2 border-line pl-3 text-sm italic text-ink-2">“{q}”</li>
        ))}
      </ul>
    </div>
  );
}
