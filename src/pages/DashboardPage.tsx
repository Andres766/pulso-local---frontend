import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../api/http';
import { describeProvider } from '../api/providers';
import { api } from '../api/services';
import {
  type AnalysisRun,
  categoryLabel,
  type Dashboard,
  type InsightComparison,
  type InsightReport,
  MAX_ANALYSIS_ATTEMPTS,
} from '../api/types';
import { BusinessSettings } from '../components/BusinessSettings';
import { Legend, SentimentBar, TopicChart } from '../components/charts';
import { AnalysisHistory, Delta, TopicEvolution } from '../components/evolution';
import { ImportPanel } from '../components/ImportPanel';
import { Icon } from '../components/icons';
import { KpiTiles, RecommendationList, TopicQuotes } from '../components/insights';
import { ReviewsTable } from '../components/ReviewsTable';
import { TrendChart } from '../components/TrendChart';
import { useToast } from '../components/toast';
import { Alert, Button, Card, EmptyState, Skeleton, Spinner } from '../components/ui';
import { printReport, saveBlob } from '../hooks/exporting';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import { usePageTitle } from '../hooks/usePageTitle';

export const formatDate = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando dashboard">
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

const pts = (n: number) => `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })} ${Math.abs(n) === 1 ? 'punto' : 'puntos'}`;

/** El hallazgo del último análisis en una frase: la queja que más pesa y cómo cambió. */
function Finding({ report, comparison }: { report: InsightReport; comparison: InsightComparison | null }) {
  const top = [...report.stats.topics].sort((a, b) => b.complaintShare - a.complaintShare)[0];
  if (!top || top.complaintShare === 0) {
    return <p className="text-base text-ink">Ningún tema acumula quejas en este análisis.</p>;
  }
  const delta = comparison?.topics.find((t) => t.key === top.key)?.complaintDelta ?? null;
  let change = '';
  if (delta !== null) {
    if (Math.abs(delta) < 0.05) change = ', igual que en el análisis anterior';
    else change = `, ${pts(Math.abs(delta))} ${delta < 0 ? 'menos' : 'más'} que en el análisis anterior`;
  }
  return (
    <p className="max-w-3xl text-base text-ink">
      La queja que más se repite es <strong className="font-semibold">{top.name.toLowerCase()}</strong>:{' '}
      <span className="num">{top.complaintShare.toLocaleString('es-CO')} %</span> de las reseñas{change}.
    </p>
  );
}

export function DashboardPage() {
  const { id = '' } = useParams();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState(false);
  usePageTitle(dashboard?.business.name ?? 'Dashboard');

  const load = useCallback(async () => {
    try {
      setDashboard(await api.businesses.dashboard(id));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el dashboard');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const running = dashboard?.latestRun && ['pending', 'running'].includes(dashboard.latestRun.status) ? dashboard.latestRun : null;
  const toast = useToast();
  useAnalysisPolling(running, {
    onProgress: (current) => setDashboard((d) => (d ? { ...d, latestRun: current } : d)),
    onFinished: (finished) => {
      if (finished.status === 'completed') toast.success('Análisis completado: el reporte ya está actualizado.');
      else toast.error('El análisis no se pudo completar.');
      void load();
    },
  });
  const retrying = running?.status === 'pending' && running.attempts > 0;

  async function startAnalysis() {
    setStarting(true);
    setError(null);
    try {
      const run: AnalysisRun = await api.analyses.start(id);
      setDashboard((d) => (d ? { ...d, latestRun: run } : d));
      toast.info('Análisis en cola: te avisamos cuando termine.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar el análisis');
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
      toast.success('CSV descargado.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  }

  if (!dashboard && !error) return <DashboardSkeleton />;
  if (!dashboard) return <Alert>{error}</Alert>;

  const { business, report, latestRun, reportRun } = dashboard;
  const selectedTopic = report?.stats.topics.find((t) => t.key === topicFilter) ?? null;
  const usesLlm = reportRun ? describeProvider(reportRun.provider).isLlm : false;
  const comparison = dashboard.comparison;
  const topComplaintKey = report ? [...report.stats.topics].sort((a, b) => b.complaintShare - a.complaintShare)[0]?.key : undefined;
  const topComplaintChange = comparison?.topics.find((t) => t.key === topComplaintKey);

  const importCard = (
    <Card
      title="Cargar reseñas"
      subtitle="De Google Maps, Instagram, WhatsApp o tu buzón de sugerencias"
      className="lg:col-span-2 print:hidden"
    >
      <ImportPanel businessId={business.id} onImported={() => void load()} />
    </Card>
  );
  const reviewsCard = (
    <Card title="Reseñas" subtitle={selectedTopic ? `Filtrando por «${selectedTopic.name}»` : 'Todas las reseñas del negocio'}>
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
        <p className="text-sm font-semibold text-ink">Reporte de PulsoLocal</p>
        <p className="text-sm text-ink-2">Generado el {new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}</p>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink print:hidden">
            <Icon name="chevronLeft" className="h-4 w-4" /> Mis negocios
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-ink">{business.name}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {[
              categoryLabel(business.category),
              business.city,
              `${dashboard.reviewCount} reseñas`,
              reportRun?.finishedAt &&
                `analizado con ${usesLlm ? describeProvider(reportRun.provider).name : 'el léxico local'} el ${formatDate(reportRun.finishedAt)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button variant="ghost" icon="tag" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
            Editar
          </Button>
          <Button variant="secondary" icon="download" onClick={exportCsv} loading={exporting} disabled={dashboard.reviewCount === 0}>
            CSV
          </Button>
          <Button variant="secondary" icon="printer" onClick={printReport} disabled={!report}>
            Reporte PDF
          </Button>
          <Button onClick={startAnalysis} icon="sparkles" loading={starting || Boolean(running)} disabled={dashboard.reviewCount === 0}>
            {running ? 'Analizando…' : report ? 'Volver a analizar' : 'Analizar con IA'}
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
              ? `El servicio de IA estaba ocupado: se reintentará en unos segundos (intento ${running.attempts + 1} de ${MAX_ANALYSIS_ATTEMPTS}). ${running.error ?? ''}`
              : `La IA está leyendo ${running.reviewCount} reseñas: detecta temas, clasifica el sentimiento y redacta recomendaciones…`}
          </span>
        </Alert>
      )}
      {latestRun?.status === 'failed' && <Alert>El último análisis falló: {latestRun.error}</Alert>}

      {report ? (
        <>
          <KpiTiles
            report={report}
            extras={
              comparison
                ? {
                    total: <span className="text-xs text-ink-3">Antes: {comparison.previousTotalReviews} reseñas</span>,
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
            <Card
              title="Recomendaciones para tu negocio"
              subtitle={
                usesLlm
                  ? 'Redactadas por IA a partir de las cifras reales de tus reseñas'
                  : 'Generadas con plantillas del analizador local (configura la IA para recomendaciones a la medida)'
              }
              className="lg:col-span-3"
            >
              <RecommendationList items={report.recommendations} topics={report.stats.topics} />
            </Card>
            <div className="space-y-4 lg:col-span-2">
              <Card
                title="Sentimiento general"
                subtitle={`${report.stats.totalReviews} reseñas · puntaje promedio ${report.stats.sentiment.averageScore} (de −1 a 1)`}
              >
                <SentimentBar sentiment={report.stats.sentiment} />
              </Card>
              <Card title="Temas recurrentes" subtitle="Menciones por tema y su sentimiento">
                <TopicChart topics={report.stats.topics} selected={topicFilter} onSelect={setTopicFilter} />
              </Card>
            </div>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-5">
            <Card
              title="Sentimiento por mes"
              subtitle="Reseñas según el mes en que se escribieron"
              action={<Legend />}
              className="lg:col-span-3"
            >
              <TrendChart businessId={business.id} refreshKey={refreshKey} />
            </Card>
            {importCard}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-5">
            <Card
              title="Evolución desde el análisis anterior"
              subtitle={
                dashboard.previousRun
                  ? `Comparado con el análisis del ${formatDate(dashboard.previousRun.createdAt)}`
                  : 'Aparece cuando tengas al menos dos análisis'
              }
              className="lg:col-span-3"
            >
              {comparison ? (
                <TopicEvolution comparison={comparison} />
              ) : (
                <p className="text-sm text-ink-2">
                  Carga las reseñas nuevas de las próximas semanas y vuelve a analizar: aquí verás si las quejas bajan o suben después de
                  aplicar las recomendaciones.
                </p>
              )}
            </Card>
            <Card title="Historial de análisis" className="lg:col-span-2 print:hidden">
              <AnalysisHistory runs={dashboard.history} currentId={reportRun?.id ?? null} />
            </Card>
          </div>
        </>
      ) : (
        !running && (
          <EmptyState icon="sparkles" title={dashboard.reviewCount > 0 ? 'Listo para tu primer análisis' : 'Empieza cargando reseñas'}>
            {dashboard.reviewCount > 0
              ? 'Ya tienes reseñas cargadas. Pulsa «Analizar con IA» para generar tu reporte.'
              : 'Sube un CSV o pega las reseñas de tus clientes en el panel de abajo.'}
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
