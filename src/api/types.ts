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
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

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

export interface Dashboard {
  business: Business;
  reviewCount: number;
  latestRun: AnalysisRun | null;
  reportRun: AnalysisRun | null;
  report: InsightReport | null;
  history: AnalysisRun[];
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

export interface ImportSummary {
  received: number;
  imported: number;
  duplicates: number;
  rejected: { row: number; reason: string }[];
}
