/** Contratos de la API (espejo de las respuestas del backend). */

export type SentimentLabel = 'positive' | 'neutral' | 'negative';
export type AnalysisStatus = 'pending' | 'running' | 'completed' | 'failed';
export type Priority = 'alta' | 'media' | 'baja';

export const BUSINESS_CATEGORIES = [
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'cafeteria', label: 'Cafetería' },
  { value: 'tienda', label: 'Tienda' },
  { value: 'belleza', label: 'Belleza' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'salud', label: 'Salud' },
  { value: 'otro', label: 'Otro' },
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]['value'];

export const categoryLabel = (c: BusinessCategory) => BUSINESS_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Business {
  id: string;
  name: string;
  category: BusinessCategory;
  city: string | null;
  createdAt: string;
}

export interface AnalysisRun {
  id: string;
  status: AnalysisStatus;
  provider: string;
  reviewCount: number;
  error: string | null;
  /** Intentos usados (la cola reintenta hasta 3 veces ante errores transitorios de la IA). */
  attempts: number;
  /** Consumo del modelo de lenguaje sumado en todos los intentos. */
  usage: { calls: number; inputTokens: number; outputTokens: number };
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export const MAX_ANALYSIS_ATTEMPTS = 3;

export interface TopicStat {
  key: string;
  name: string;
  description: string;
  mentions: number;
  share: number;
  positive: number;
  neutral: number;
  negative: number;
  complaintShare: number;
  sampleQuotes: string[];
}

export interface Recommendation {
  rank: number;
  title: string;
  detail: string;
  priority: Priority;
  topicKey: string | null;
  evidenceShare: number | null;
}

export interface InsightReport {
  stats: {
    totalReviews: number;
    sentiment: { positive: number; neutral: number; negative: number; averageScore: number };
    topics: TopicStat[];
  };
  recommendations: Recommendation[];
}

export type TopicTrend = 'new' | 'resolved' | 'improved' | 'worsened' | 'stable';

export interface TopicChange {
  key: string;
  name: string;
  complaintShare: number;
  previousComplaintShare: number | null;
  complaintDelta: number | null;
  trend: TopicTrend;
}

/** Variación respecto al análisis anterior (puntos porcentuales). */
export interface InsightComparison {
  previousTotalReviews: number;
  positiveShareDelta: number;
  negativeShareDelta: number;
  averageScoreDelta: number;
  topics: TopicChange[];
}

export interface Dashboard {
  business: Business;
  reviewCount: number;
  latestRun: AnalysisRun | null;
  reportRun: AnalysisRun | null;
  report: InsightReport | null;
  history: AnalysisRun[];
  previousRun: AnalysisRun | null;
  comparison: InsightComparison | null;
}

/** Reseñas de un mes según su sentimiento (último análisis). */
export interface MonthlySentiment {
  month: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  averageScore: number | null;
}

export interface ReviewItem {
  id: string;
  content: string;
  rating: number | null;
  source: 'csv' | 'manual';
  authoredAt: string | null;
  createdAt: string;
  sentiment: SentimentLabel | null;
  sentimentScore: number | null;
  topics: string[];
}

export const REVIEW_SORTS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguas' },
  { value: 'most_negative', label: 'Más negativas primero' },
  { value: 'most_positive', label: 'Más positivas primero' },
  { value: 'rating_asc', label: 'Menos estrellas primero' },
  { value: 'rating_desc', label: 'Más estrellas primero' },
] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number]['value'];

export interface ImportSummary {
  received: number;
  imported: number;
  duplicates: number;
  rejected: { row: number; reason: string }[];
}
