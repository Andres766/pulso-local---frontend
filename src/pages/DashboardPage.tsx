import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { describeProvider } from '../api/providers';
import { api } from '../api/services';
import { type AnalysisRun, type Dashboard, type InsightComparison, type InsightReport, MAX_ANALYSIS_ATTEMPTS } from '../api/types';
import { BusinessSettings } from '../components/BusinessSettings';
import { Legend, SentimentBar, TopicChart } from '../components/charts';
import { AnalysisHistory, Delta, TopicEvolution } from '../components/evolution';
import { ImportPanel } from '../components/ImportPanel';
import { Icon } from '../components/icons';
import { KpiTiles, RecommendationList, TopicQuotes } from '../components/insights';
import { LiveBadge } from '../components/LiveBadge';
import { ReviewsTable } from '../components/ReviewsTable';
import { TrendChart } from '../components/TrendChart';
import { useToast } from '../components/toast';
import { Alert, Button, Card, EmptyState, Skeleton, Spinner } from '../components/ui';
import { printReport, saveBlob } from '../hooks/exporting';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n } from '../i18n/I18nContext';
import { useRealtimeAnalyses } from '../realtime/useRealtime';

function DashboardSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-6" role="status" aria-label={t('dashboard.loading')}>
      <Skeleton className="h-24" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-96 lg:col-span-3" />
        <Skeleton className="h-96 lg:col-span-2" />
      </div>
    </div>
  );
}

/** El hallazgo del último análisis en una frase: la queja que más pesa y cómo cambió. */
function Finding({ report, comparison }: { report: InsightReport; comparison: InsightComparison | null }) {
  const { t, plural, number } = useI18n();
  const top = [...report.stats.topics].sort((a, b) => b.complaintShare - a.complaintShare)[0];
  if (!top || top.complaintShare === 0) {
    return <p className="text-base text-ink">{t('dashboard.findingNone')}</p>;
  }
  const delta = comparison?.topics.find((topic) => topic.key === top.key)?.complaintDelta ?? null;
  let change = '';
  if (delta !== null) {
    const points = plural('dashboard.point', Math.abs(delta) === 1 ? 1 : 2, { n: number(Math.abs(delta)) });
    if (Math.abs(delta) < 0.05) change = t('dashboard.findingSame');
    else change = t(delta < 0 ? 'dashboard.findingLess' : 'dashboard.findingMore', { points });
  }
  return (
    <p className="max-w-3xl text-base text-ink">
      {t('dashboard.findingLead')}
      <strong className="font-semibold">{top.name.toLowerCase()}</strong>:{' '}
      <span className="num">{t('dashboard.findingShare', { share: number(top.complaintShare) })}</span>
      {t('dashboard.findingRest', { change })}
    </p>
  );
}

export function DashboardPage() {
  const { id = '' } = useParams();
  const i18n = useI18n();
  const { t } = i18n;
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState(false);
  usePageTitle(dashboard?.business.name ?? t('dashboard.title'));

  // biome-ignore lint/correctness/useExhaustiveDependencies: el mensaje de error se traduce al mostrarlo; recargar por cambio de idioma no aporta
  const load = useCallback(async () => {
    try {
      setDashboard(await api.businesses.dashboard(id));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(i18n.errorMessage(err, 'dashboard.loadError'));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const running = dashboard?.latestRun && ['pending', 'running'].includes(dashboard.latestRun.status) ? dashboard.latestRun : null;
  const toast = useToast();

  // Un mismo final puede llegar por WebSocket y por el polling de respaldo: se avisa una sola vez.
  const finishedRuns = useRef(new Set<string>());
  const finish = (run: AnalysisRun) => {
    if (finishedRuns.current.has(run.id)) return;
    finishedRuns.current.add(run.id);
    if (run.status === 'completed') toast.success(t('dashboard.completed'));
    else toast.error(t('dashboard.failedToast'));
    void load();
  };
  const showRun = (run: AnalysisRun) =>
    setDashboard((d) => {
      if (!d) return d;
      // Un evento viejo (desordenado) no pisa al análisis más reciente.
      if (d.latestRun && d.latestRun.id !== run.id && run.createdAt < d.latestRun.createdAt) return d;
      return { ...d, latestRun: run };
    });

  // Tiempo real: cada cambio de estado llega por WebSocket, también si el análisis se lanzó en otra pestaña.
  const live = useRealtimeAnalyses(id ? [id] : [], ({ run }) => {
    showRun(run);
    if (run.status === 'completed' || run.status === 'failed') finish(run);
  });

  // Al quedar en vivo se revisa una vez el análisis en curso, por si terminó mientras se conectaba.
  const runningId = running?.id;
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo debe correr cuando el canal pasa a "live"
  useEffect(() => {
    if (live !== 'live' || !runningId) return;
    void api.analyses
      .get(runningId)
      .then((run) => {
        showRun(run);
        if (run.status === 'completed' || run.status === 'failed') finish(run);
      })
      .catch(() => undefined);
  }, [live]);

  // Respaldo: sin WebSocket (red que lo bloquea, servidor reiniciándose) se consulta el estado cada 1,5 s.
  useAnalysisPolling(live === 'live' ? null : running, { onProgress: showRun, onFinished: finish });
  const retrying = running?.status === 'pending' && running.attempts > 0;

  async function startAnalysis() {
    setStarting(true);
    setError(null);
    try {
      const run: AnalysisRun = await api.analyses.start(id);
      setDashboard((d) => (d ? { ...d, latestRun: run } : d));
      toast.info(t('dashboard.queued'));
    } catch (err) {
      setError(i18n.errorMessage(err, 'dashboard.startError'));
    } finally {
      setStarting(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const { blob, filename } = await api.reviews.exportCsv(id);
      saveBlob(blob, filename ?? 'resenas.csv');
      toast.success(t('dashboard.csvDone'));
    } catch (err) {
      toast.error(i18n.errorMessage(err, 'dashboard.exportError'));
    } finally {
      setExporting(false);
    }
  }

  if (!dashboard && !error) return <DashboardSkeleton />;
  if (!dashboard) return <Alert>{error}</Alert>;

  const { business, report, latestRun, reportRun } = dashboard;
  const selectedTopic = report?.stats.topics.find((topic) => topic.key === topicFilter) ?? null;
  const usesLlm = reportRun ? describeProvider(reportRun.provider).isLlm : false;
  const comparison = dashboard.comparison;
  const topComplaintKey = report ? [...report.stats.topics].sort((a, b) => b.complaintShare - a.complaintShare)[0]?.key : undefined;
  const topComplaintChange = comparison?.topics.find((topic) => topic.key === topComplaintKey);
  const provider = reportRun && (usesLlm ? describeProvider(reportRun.provider).name : t('provider.lexiconLong'));

  const importCard = (
    <Card title={t('import.title')} subtitle={t('import.subtitle')} className="lg:col-span-2 print:hidden">
      <ImportPanel businessId={business.id} onImported={() => void load()} />
    </Card>
  );
  const reviewsCard = (
    <Card title={t('reviews.title')} subtitle={selectedTopic ? t('reviews.filteringBy', { topic: selectedTopic.name }) : t('reviews.all')}>
      {selectedTopic && (
        <div className="mb-4">
          <TopicQuotes topic={selectedTopic} />
        </div>
      )}
      <ReviewsTable
        businessId={business.id}
        topics={report?.stats.topics ?? []}
        topicFilter={topicFilter}
        onTopicFilter={setTopicFilter}
        refreshKey={refreshKey}
        onChanged={() => void load()}
      />
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Encabezado que solo aparece en el reporte impreso / PDF */}
      <div className="hidden border-line border-b pb-4 print:block">
        <p className="text-sm font-semibold text-ink">{t('dashboard.printTitle')}</p>
        <p className="text-sm text-ink-2">{t('dashboard.printDate', { date: i18n.dateTime(new Date(), 'long') })}</p>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink print:hidden">
            <Icon name="chevronLeft" className="h-4 w-4" /> {t('dashboard.back')}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-ink">{business.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <span>
              {[
                t(`category.${business.category}`),
                business.city,
                t('dashboard.reviewsCount', { count: dashboard.reviewCount }),
                reportRun?.finishedAt &&
                  t('dashboard.analyzedWith', { provider: provider ?? '', date: i18n.dateTime(reportRun.finishedAt) }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <LiveBadge status={live} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="ghost" icon="tag" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
            {t('dashboard.edit')}
          </Button>
          <Button variant="secondary" icon="download" onClick={exportCsv} loading={exporting} disabled={dashboard.reviewCount === 0}>
            {t('dashboard.csv')}
          </Button>
          <Button variant="secondary" icon="printer" onClick={printReport} disabled={!report}>
            {t('dashboard.pdf')}
          </Button>
          <Button onClick={startAnalysis} icon="sparkles" loading={starting || Boolean(running)} disabled={dashboard.reviewCount === 0}>
            {running ? t('dashboard.analyzing') : report ? t('dashboard.reanalyze') : t('dashboard.analyze')}
          </Button>
        </div>
      </header>

      {report && <Finding report={report} comparison={comparison} />}

      {editing && (
        <BusinessSettings
          business={business}
          onSaved={(updated) => setDashboard((d) => (d ? { ...d, business: updated } : d))}
          onClose={() => setEditing(false)}
        />
      )}

      {error && <Alert>{error}</Alert>}
      {running && (
        <Alert tone="info">
          <span className="inline-flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            {retrying
              ? t('dashboard.retrying', { attempt: running.attempts + 1, max: MAX_ANALYSIS_ATTEMPTS, reason: running.error ?? '' })
              : t('dashboard.running', { count: running.reviewCount })}
          </span>
        </Alert>
      )}
      {latestRun?.status === 'failed' && <Alert>{t('dashboard.lastFailed', { error: latestRun.error ?? '' })}</Alert>}

      {report ? (
        <>
          <KpiTiles
            report={report}
            extras={
              comparison
                ? {
                    total: <span className="text-xs text-ink-3">{t('kpi.before', { count: comparison.previousTotalReviews })}</span>,
                    positive: <Delta value={comparison.positiveShareDelta} goodWhen="up" />,
                    negative: <Delta value={comparison.negativeShareDelta} goodWhen="down" />,
                    complaint:
                      topComplaintChange?.complaintDelta != null ? (
                        <Delta value={topComplaintChange.complaintDelta} goodWhen="down" />
                      ) : undefined,
                  }
                : undefined
            }
          />

          <div className="grid gap-4 lg:grid-cols-5">
            <Card title={t('recs.title')} subtitle={usesLlm ? t('recs.byAi') : t('recs.byTemplates')} className="lg:col-span-3">
              <RecommendationList items={report.recommendations} topics={report.stats.topics} />
            </Card>
            <div className="space-y-4 lg:col-span-2">
              <Card
                title={t('sentimentCard.title')}
                subtitle={t('sentimentCard.subtitle', {
                  count: report.stats.totalReviews,
                  score: i18n.number(report.stats.sentiment.averageScore, 2),
                })}
              >
                <SentimentBar sentiment={report.stats.sentiment} />
              </Card>
              <Card title={t('topics.title')} subtitle={t('topics.subtitle')}>
                <TopicChart topics={report.stats.topics} selected={topicFilter} onSelect={setTopicFilter} />
              </Card>
            </div>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-5">
            <Card title={t('trend.title')} subtitle={t('trend.subtitle')} action={<Legend />} className="lg:col-span-3">
              <TrendChart businessId={business.id} refreshKey={refreshKey} />
            </Card>
            {importCard}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-5">
            <Card
              title={t('evolution.title')}
              subtitle={
                dashboard.previousRun
                  ? t('evolution.comparedWith', { date: i18n.dateTime(dashboard.previousRun.createdAt) })
                  : t('evolution.needsTwo')
              }
              className="lg:col-span-3"
            >
              {comparison ? <TopicEvolution comparison={comparison} /> : <p className="text-sm text-ink-2">{t('evolution.emptyText')}</p>}
            </Card>
            <Card title={t('history.title')} className="lg:col-span-2 print:hidden">
              <AnalysisHistory runs={dashboard.history} currentId={reportRun?.id ?? null} />
            </Card>
          </div>
        </>
      ) : (
        !running && (
          <EmptyState icon="sparkles" title={dashboard.reviewCount > 0 ? t('dashboard.readyTitle') : t('dashboard.startTitle')}>
            {dashboard.reviewCount > 0 ? t('dashboard.readyText') : t('dashboard.startText')}
          </EmptyState>
        )
      )}

      {report ? (
        <div className="print:hidden">{reviewsCard}</div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-5 print:hidden">
          <div className="lg:col-span-3">{reviewsCard}</div>
          {importCard}
        </div>
      )}
    </div>
  );
}
