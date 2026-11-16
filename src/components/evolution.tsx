import { describeProvider } from '../api/providers';
import type { AnalysisRun, AnalysisStatus, InsightComparison, TopicTrend } from '../api/types';
import { useI18n } from '../i18n/I18nContext';
import type { MessageKey } from '../i18n/messages';
import { Icon, type IconName } from './icons';

/**
 * Variación en puntos porcentuales. `goodWhen` indica qué dirección es buena:
 * más positivas es bueno, más negativas es malo. Lleva flecha y texto: no depende solo del color.
 */
export function Delta({
  value,
  goodWhen,
  unit,
  label,
}: {
  value: number;
  goodWhen: 'up' | 'down';
  unit?: string;
  /** Texto tras la cifra; por defecto "vs. análisis anterior". Una cadena vacía lo omite. */
  label?: string;
}) {
  const { t, number } = useI18n();
  const suffix = label ?? t('delta.vsPrevious');
  if (Math.abs(value) < 0.05) {
    return <span className="text-xs text-ink-3">{t('delta.unchanged', { label: suffix }).trim()}</span>;
  }
  const up = value > 0;
  const good = (up && goodWhen === 'up') || (!up && goodWhen === 'down');
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1 text-xs font-semibold ${good ? 'text-good' : 'text-critical'}`}>
      <Icon name={up ? 'arrowUp' : 'arrowDown'} className="h-3.5 w-3.5" />
      <span className="num whitespace-nowrap">
        {up ? '+' : '−'}
        {number(Math.abs(value))} {unit ?? t('delta.unit')}
      </span>
      {suffix && <span className="font-normal text-ink-3">{suffix}</span>}
    </span>
  );
}

const TREND: Record<TopicTrend, { label: MessageKey; icon: IconName; className: string; order: number }> = {
  worsened: { label: 'trendLabel.worsened', icon: 'arrowUp', className: 'bg-critical-soft text-critical', order: 0 },
  new: { label: 'trendLabel.new', icon: 'sparkles', className: 'bg-warning-soft text-warning', order: 1 },
  improved: { label: 'trendLabel.improved', icon: 'arrowDown', className: 'bg-good-soft text-good', order: 2 },
  resolved: { label: 'trendLabel.resolved', icon: 'check', className: 'bg-good-soft text-good', order: 3 },
  stable: { label: 'trendLabel.stable', icon: 'clock', className: 'bg-brand-soft text-ink-2', order: 4 },
};

/** Tabla de cambios por tema: lo que empeoró primero, porque es lo que hay que atender. */
export function TopicEvolution({ comparison }: { comparison: InsightComparison }) {
  const i18n = useI18n();
  const rows = [...comparison.topics].sort(
    (a, b) => TREND[a.trend].order - TREND[b.trend].order || Math.abs(b.complaintDelta ?? 0) - Math.abs(a.complaintDelta ?? 0),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{i18n.t('evolution.caption')}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-3">
            <th scope="col" className="py-2 pr-3 font-normal">
              {i18n.t('evolution.topic')}
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-normal">
              {i18n.t('evolution.before')}
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-normal">
              {i18n.t('evolution.now')}
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              {i18n.t('evolution.trend')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((t) => {
            const trend = TREND[t.trend];
            return (
              <tr key={t.key}>
                <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink">
                  {t.name}
                </th>
                <td className="py-2.5 pr-3 text-right tabular-nums text-ink-2">
                  {t.previousComplaintShare === null ? '—' : i18n.percent(t.previousComplaintShare)}
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-ink">{i18n.percent(t.complaintShare)}</td>
                <td className="py-2.5 text-right">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${trend.className}`}
                  >
                    <Icon name={trend.icon} className="h-3 w-3" />
                    {i18n.t(trend.label)}
                    {t.complaintDelta !== null && t.trend !== 'stable' && (
                      <span className="tabular-nums">
                        {' '}
                        ({t.complaintDelta > 0 ? '+' : '−'}
                        {i18n.number(Math.abs(t.complaintDelta))})
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-ink-3">{i18n.t('evolution.note')}</p>
    </div>
  );
}

const STATUS: Record<AnalysisStatus, { label: MessageKey; className: string }> = {
  completed: { label: 'status.completed', className: 'text-good' },
  failed: { label: 'status.failed', className: 'text-critical' },
  running: { label: 'status.running', className: 'text-ink' },
  pending: { label: 'status.pending', className: 'text-ink' },
};

/** Nombre del motor que hizo el análisis, en el idioma de la interfaz para el léxico local. */
function useProviderName() {
  const { t } = useI18n();
  return (id: string) => {
    const p = describeProvider(id);
    return p.isLlm ? p.name : t('provider.lexicon');
  };
}

/** Línea de tiempo de los últimos análisis. */
export function AnalysisHistory({ runs, currentId }: { runs: AnalysisRun[]; currentId: string | null }) {
  const { t, plural, number, dateTime } = useI18n();
  const providerName = useProviderName();
  /** 11215 → "11,2 mil" / "11.2k": cifra legible para el dueño del negocio. */
  const formatTokens = (n: number) => (n >= 1000 ? t('history.thousand', { n: number(n / 1000) }) : String(n));
  if (runs.length === 0) return <p className="text-sm text-ink-2">{t('history.none')}</p>;
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {runs.map((r) => (
        <li key={r.id} className="relative">
          <span
            aria-hidden
            className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-card ${r.id === currentId ? 'bg-pos' : r.status === 'failed' ? 'bg-critical' : 'bg-line'}`}
          />
          <p className="text-sm font-medium text-ink">
            {dateTime(r.createdAt)}
            {r.id === currentId && (
              <span className="ml-2 rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-ink">{t('history.current')}</span>
            )}
          </p>
          <p className="text-xs text-ink-2">
            <span className={`font-semibold ${STATUS[r.status].className}`}>
              {t(r.status === 'pending' && r.attempts > 0 ? 'status.retrying' : STATUS[r.status].label)}
            </span>{' '}
            · {t('history.reviews', { count: r.reviewCount })} · {providerName(r.provider)}
            {r.attempts > 1 && ` · ${t('history.attempts', { count: r.attempts })}`}
          </p>
          {r.usage?.calls > 0 && (
            <p className="text-xs text-ink-3">
              {plural('history.calls', r.usage.calls)} ·{' '}
              {t('history.tokens', { tokens: formatTokens(r.usage.inputTokens + r.usage.outputTokens) })}
            </p>
          )}
          {r.error && <p className="mt-0.5 text-xs text-critical">{r.error}</p>}
        </li>
      ))}
    </ol>
  );
}
