import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../api/http';
import { api } from '../api/services';
import type { AnalysisRun, Dashboard } from '../api/types';
import { SentimentBar, TopicChart } from '../components/charts';
import { ImportPanel } from '../components/ImportPanel';
import { KpiTiles, RecommendationList, TopicQuotes } from '../components/insights';
import { ReviewsTable } from '../components/ReviewsTable';
import { Alert, Button, Card, FullPageSpinner, Spinner } from '../components/ui';
import { useAnalysisPolling } from '../hooks/useAnalysisPolling';

const providerLabel = (p: string) => (p.startsWith('claude:') ? `Claude (${p.slice(7)})` : 'Analizador léxico local');
const formatDate = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

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

  if (!dashboard && !error) return <FullPageSpinner />;
  if (!dashboard) return <Alert>{error}</Alert>;

  const { business, report, latestRun, reportRun } = dashboard;
  const selectedTopic = report?.stats.topics.find((t) => t.key === topicFilter) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-ink-2 hover:text-ink">← Mis negocios</Link>
          <h1 className="mt-1 text-2xl font-semibold">{business.name}</h1>
          <p className="text-sm text-ink-2">
            {dashboard.reviewCount} reseñas cargadas
            {reportRun?.finishedAt && ` · último análisis ${formatDate(reportRun.finishedAt)} con ${providerLabel(reportRun.provider)}`}
          </p>
        </div>
        <Button onClick={startAnalysis} loading={starting || Boolean(running)} disabled={dashboard.reviewCount === 0}>
          {running ? 'Analizando…' : report ? 'Volver a analizar' : 'Analizar con IA'}
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}
      {running && (
        <Alert tone="info">
          <span className="inline-flex items-center gap-2">
            <Spinner className="h-4 w-4" /> La IA está leyendo {running.reviewCount} reseñas: detectando temas, clasificando sentimiento y redactando recomendaciones…
          </span>
        </Alert>
      )}
      {latestRun?.status === 'failed' && <Alert>El último análisis falló: {latestRun.error}</Alert>}

      {report ? (
        <>
          <KpiTiles report={report} />

          <div className="grid gap-6 lg:grid-cols-5">
            <Card
              title="Recomendaciones para tu negocio"
              subtitle={
                reportRun?.provider.startsWith('claude:')
                  ? 'Redactadas por IA a partir de las cifras reales de tus reseñas'
                  : 'Generadas con plantillas del analizador local (configura la IA para recomendaciones a la medida)'
              }
              className="lg:col-span-3"
            >
              <RecommendationList items={report.recommendations} topics={report.stats.topics} />
            </Card>
            <div className="space-y-6 lg:col-span-2">
              <Card title="Sentimiento general" subtitle={`${report.stats.totalReviews} reseñas · puntaje promedio ${report.stats.sentiment.averageScore} (escala −1 a 1)`}>
                <SentimentBar sentiment={report.stats.sentiment} />
              </Card>
              <Card title="Temas recurrentes" subtitle="Menciones por tema y su sentimiento">
                <TopicChart topics={report.stats.topics} selected={topicFilter} onSelect={setTopicFilter} />
              </Card>
            </div>
          </div>
        </>
      ) : (
        dashboard.reviewCount > 0 &&
        !running && (
          <Card>
            <p className="text-sm text-ink-2">Ya tienes reseñas cargadas. Pulsa <strong>Analizar con IA</strong> para generar tu primer reporte.</p>
          </Card>
        )
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Reseñas" subtitle={selectedTopic ? `Filtrando por «${selectedTopic.name}»` : 'Todas las reseñas del negocio'} className="lg:col-span-3">
          {selectedTopic && <div className="mb-4"><TopicQuotes topic={selectedTopic} /></div>}
          <ReviewsTable
            businessId={business.id}
            topics={report?.stats.topics ?? []}
            topicFilter={topicFilter}
            onTopicFilter={setTopicFilter}
            refreshKey={refreshKey}
          />
        </Card>
        <Card title="Cargar reseñas" subtitle="Desde Google Maps, Instagram, WhatsApp o tu buzón de sugerencias" className="h-fit lg:col-span-2">
          <ImportPanel businessId={business.id} onImported={() => void load()} />
        </Card>
      </div>
    </div>
  );
}
