import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../api/http';
import { api } from '../api/services';
import type { AnalysisRun, Dashboard } from '../api/types';
import { SentimentBar, TopicChart } from '../components/charts';
import { AnalysisHistory, Delta, TopicEvolution } from '../components/evolution';
import { Icon } from '../components/icons';
import { ImportPanel } from '../components/ImportPanel';
import { KpiTiles, RecommendationList, TopicQuotes } from '../components/insights';
import { ReviewsTable } from '../components/ReviewsTable';
import { Alert, Button, Card, Chip, EmptyState, Skeleton, Spinner } from '../components/ui';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';
import { categoryLabel } from './BusinessesPage';

export const providerLabel = (p: string) => (p.startsWith('claude:') ? `Claude · ${p.slice(7)}` : 'Analizador léxico local');
export const formatDate = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando dashboard">
      <Skeleton className="h-24" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-96 lg:col-span-3" />
        <Skeleton className="h-96 lg:col-span-2" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { id = '' } = useParams();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
  useAnalysisPolling(running, () => void load());

  async function startAnalysis() {
    setStarting(true);
    setError(null);
    try {
      const run: AnalysisRun = await api.analyses.start(id);
      setDashboard((d) => (d ? { ...d, latestRun: run } : d));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar el análisis');
    } finally {
      setStarting(false);
    }
  }

  if (!dashboard && !error) return <DashboardSkeleton />;
  if (!dashboard) return <Alert>{error}</Alert>;

  const { business, report, latestRun, reportRun } = dashboard;
  const selectedTopic = report?.stats.topics.find((t) => t.key === topicFilter) ?? null;
  const usesLlm = reportRun?.provider.startsWith('claude:') ?? false;
  const comparison = dashboard.comparison;
  const topComplaintKey = report ? [...report.stats.topics].sort((a, b) => b.complaintShare - a.complaintShare)[0]?.key : undefined;
  const topComplaintChange = comparison?.topics.find((t) => t.key === topComplaintKey);

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-ink-2 hover:text-ink print:hidden">
        <Icon name="chevronLeft" /> Mis negocios
      </Link>

      {/* Cabecera del negocio */}
      <header className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-[#1c5cab] to-[#2a78d6] font-display text-2xl font-extrabold text-white">
            {business.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{business.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip icon="tag">{categoryLabel(business.category)}</Chip>
              {business.city && <Chip icon="pin">{business.city}</Chip>}
              <Chip icon="message">{dashboard.reviewCount} reseñas</Chip>
              {reportRun?.finishedAt && (
                <Chip icon="sparkles" tone="brand">
                  {providerLabel(reportRun.provider)} · {formatDate(reportRun.finishedAt)}
                </Chip>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button onClick={startAnalysis} icon="sparkles" loading={starting || Boolean(running)} disabled={dashboard.reviewCount === 0}>
            {running ? 'Analizando…' : report ? 'Volver a analizar' : 'Analizar con IA'}
          </Button>
        </div>
      </header>

      {error && <Alert>{error}</Alert>}
      {running && (
        <Alert tone="info">
          <span className="inline-flex items-center gap-2">
            <Spinner className="h-4 w-4" /> La IA está leyendo {running.reviewCount} reseñas: detecta temas, clasifica el sentimiento y redacta
            recomendaciones…
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

          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              title="Recomendaciones para tu negocio"
              icon="target"
              subtitle={
                usesLlm
                  ? 'Redactadas por IA a partir de las cifras reales de tus reseñas'
                  : 'Generadas con plantillas del analizador local (configura la IA para recomendaciones a la medida)'
              }
              className="lg:col-span-3"
            >
              <RecommendationList items={report.recommendations} topics={report.stats.topics} />
            </Card>
            <div className="space-y-6 lg:col-span-2">
              <Card
                title="Sentimiento general"
                icon="smile"
                subtitle={`${report.stats.totalReviews} reseñas · puntaje promedio ${report.stats.sentiment.averageScore} (de −1 a 1)`}
              >
                <SentimentBar sentiment={report.stats.sentiment} />
              </Card>
              <Card title="Temas recurrentes" icon="chart" subtitle="Menciones por tema y su sentimiento">
                <TopicChart topics={report.stats.topics} selected={topicFilter} onSelect={setTopicFilter} />
              </Card>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              title="Evolución desde el análisis anterior"
              icon="chart"
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
                  Carga las reseñas nuevas de las próximas semanas y vuelve a analizar: aquí verás si las quejas bajan o suben
                  después de aplicar las recomendaciones.
                </p>
              )}
            </Card>
            <Card title="Historial de análisis" icon="clock" className="h-fit lg:col-span-2 print:hidden">
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

      <div className="grid gap-6 lg:grid-cols-5 print:hidden">
        <Card
          title="Reseñas"
          icon="message"
          subtitle={selectedTopic ? `Filtrando por «${selectedTopic.name}»` : 'Todas las reseñas del negocio'}
          className="lg:col-span-3"
        >
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
          />
        </Card>
        <Card title="Cargar reseñas" icon="upload" subtitle="De Google Maps, Instagram, WhatsApp o tu buzón de sugerencias" className="h-fit lg:col-span-2">
          <ImportPanel businessId={business.id} onImported={() => void load()} />
        </Card>
      </div>
    </div>
  );
}
