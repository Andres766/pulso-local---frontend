import type { AnalysisRun, AnalysisStatus, InsightComparison, TopicTrend } from '../api/types';
import { Icon, type IconName } from './icons';

const fmt = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 });

/**
 * Variación en puntos porcentuales. `goodWhen` indica qué dirección es buena:
 * más positivas es bueno, más negativas es malo. Lleva flecha y texto: no depende solo del color.
 */
export function Delta({ value, goodWhen, unit = 'pts', label = 'vs. análisis anterior' }: { value: number; goodWhen: 'up' | 'down'; unit?: string; label?: string }) {
  if (Math.abs(value) < 0.05) {
    return <span className="text-xs text-ink-3">Sin cambios {label}</span>;
  }
  const up = value > 0;
  const good = (up && goodWhen === 'up') || (!up && goodWhen === 'down');
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${good ? 'text-good' : 'text-critical'}`}>
      <Icon name={up ? 'arrowUp' : 'arrowDown'} className="h-3.5 w-3.5" />
      {up ? '+' : '−'}
      {fmt(Math.abs(value))} {unit}
      <span className="font-normal text-ink-3">{label}</span>
    </span>
  );
}

const TREND: Record<TopicTrend, { label: string; icon: IconName; className: string; order: number }> = {
  worsened: { label: 'Empeoró', icon: 'arrowUp', className: 'bg-critical-soft text-critical', order: 0 },
  new: { label: 'Nuevo', icon: 'sparkles', className: 'bg-warning-soft text-warning', order: 1 },
  improved: { label: 'Mejoró', icon: 'arrowDown', className: 'bg-good-soft text-good', order: 2 },
  resolved: { label: 'Resuelto', icon: 'check', className: 'bg-good-soft text-good', order: 3 },
  stable: { label: 'Estable', icon: 'clock', className: 'bg-raised text-ink-2 border border-line', order: 4 },
};

/** Tabla de cambios por tema: lo que empeoró primero, porque es lo que hay que atender. */
export function TopicEvolution({ comparison }: { comparison: InsightComparison }) {
  const rows = [...comparison.topics].sort(
    (a, b) => TREND[a.trend].order - TREND[b.trend].order || Math.abs(b.complaintDelta ?? 0) - Math.abs(a.complaintDelta ?? 0),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Quejas por tema: análisis anterior frente al actual</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
            <th scope="col" className="py-2 pr-3 font-semibold">Tema</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Antes</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Ahora</th>
            <th scope="col" className="py-2 text-right font-semibold">Tendencia</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((t) => {
            const trend = TREND[t.trend];
            return (
              <tr key={t.key}>
                <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink">{t.name}</th>
                <td className="py-2.5 pr-3 text-right tabular-nums text-ink-2">{t.previousComplaintShare === null ? '—' : `${fmt(t.previousComplaintShare)}%`}</td>
                <td className="py-2.5 pr-3 text-right font-semibold tabular-nums text-ink">{fmt(t.complaintShare)}%</td>
                <td className="py-2.5 text-right">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${trend.className}`}>
                    <Icon name={trend.icon} className="h-3 w-3" />
                    {trend.label}
                    {t.complaintDelta !== null && t.trend !== 'stable' && (
                      <span className="tabular-nums">
                        {' '}
                        ({t.complaintDelta > 0 ? '+' : '−'}
                        {fmt(Math.abs(t.complaintDelta))})
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-ink-3">Porcentaje de reseñas que se quejan de cada tema. Cambios menores a 2 puntos se consideran estables.</p>
    </div>
  );
}

const STATUS: Record<AnalysisStatus, { label: string; className: string }> = {
  completed: { label: 'Completado', className: 'text-good' },
  failed: { label: 'Fallido', className: 'text-critical' },
  running: { label: 'En curso', className: 'text-brand' },
  pending: { label: 'En cola', className: 'text-brand' },
};

/** Línea de tiempo de los últimos análisis. */
export function AnalysisHistory({ runs, currentId }: { runs: AnalysisRun[]; currentId: string | null }) {
  if (runs.length === 0) return <p className="text-sm text-ink-2">Aún no hay análisis.</p>;
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {runs.map((r) => (
        <li key={r.id} className="relative">
          <span
            aria-hidden
            className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-card ${r.id === currentId ? 'bg-brand' : r.status === 'failed' ? 'bg-critical' : 'bg-line'}`}
          />
          <p className="text-sm font-medium text-ink">
            {new Date(r.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
            {r.id === currentId && <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">Actual</span>}
          </p>
          <p className="text-xs text-ink-2">
            <span className={`font-semibold ${STATUS[r.status].className}`}>{STATUS[r.status].label}</span> · {r.reviewCount} reseñas ·{' '}
            {r.provider.startsWith('claude:') ? 'Claude' : 'Léxico local'}
          </p>
          {r.error && <p className="mt-0.5 text-xs text-critical">{r.error}</p>}
        </li>
      ))}
    </ol>
  );
}
