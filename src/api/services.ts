import { type HttpClient, http } from './http';
import type {
  AnalysisRun,
  Business,
  BusinessCategory,
  Dashboard,
  ImportSummary,
  MonthlySentiment,
  ReviewItem,
  ReviewSort,
  SentimentLabel,
  User,
} from './types';

/** Servicios por recurso: los componentes llaman métodos con nombre, no URLs. */

export class AuthService {
  constructor(private readonly client: HttpClient) {}
  me() {
    return this.client.get<{ user: User }>('/auth/me').then((r) => r.user);
  }
  login(email: string, password: string) {
    return this.client.post<{ user: User }>('/auth/login', { email, password }).then((r) => r.user);
  }
  register(name: string, email: string, password: string) {
    return this.client.post<{ user: User }>('/auth/register', { name, email, password }).then((r) => r.user);
  }
  logout() {
    return this.client.post<void>('/auth/logout');
  }
}

export class BusinessService {
  constructor(private readonly client: HttpClient) {}
  list() {
    return this.client.get<{ items: Business[] }>('/businesses').then((r) => r.items);
  }
  create(input: { name: string; category: BusinessCategory; city?: string }) {
    return this.client.post<Business>('/businesses', input);
  }
  update(id: string, changes: { name?: string; category?: BusinessCategory; city?: string | null }) {
    return this.client.patch<Business>(`/businesses/${encodeURIComponent(id)}`, changes);
  }
  remove(id: string) {
    return this.client.delete<void>(`/businesses/${encodeURIComponent(id)}`);
  }
  trend(id: string, months: number) {
    return this.client.get<{ runId: string | null; points: MonthlySentiment[] }>(`/businesses/${encodeURIComponent(id)}/trend`, {
      months,
    });
  }
  dashboard(id: string) {
    return this.client.get<Dashboard>(`/businesses/${encodeURIComponent(id)}/dashboard`);
  }
}

export interface ReviewQuery {
  sentiment?: SentimentLabel;
  topic?: string;
  q?: string;
  rating?: number;
  sort?: ReviewSort;
  limit: number;
  offset: number;
}

export class ReviewService {
  constructor(private readonly client: HttpClient) {}
  list(businessId: string, query: ReviewQuery) {
    return this.client.get<{ total: number; items: ReviewItem[] }>(`/businesses/${encodeURIComponent(businessId)}/reviews`, { ...query });
  }
  uploadCsv(businessId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.client.post<ImportSummary>(`/businesses/${encodeURIComponent(businessId)}/reviews/csv`, form);
  }
  paste(businessId: string, text: string) {
    return this.client.post<ImportSummary>(`/businesses/${encodeURIComponent(businessId)}/reviews/text`, { text });
  }
  exportCsv(businessId: string) {
    return this.client.download(`/businesses/${encodeURIComponent(businessId)}/reviews/export`);
  }
  remove(businessId: string, reviewId: string) {
    return this.client.delete<void>(`/businesses/${encodeURIComponent(businessId)}/reviews/${encodeURIComponent(reviewId)}`);
  }
  clear(businessId: string) {
    return this.client.delete<{ deleted: number }>(`/businesses/${encodeURIComponent(businessId)}/reviews`);
  }
}

export class AnalysisService {
  constructor(private readonly client: HttpClient) {}
  start(businessId: string) {
    return this.client.post<AnalysisRun>(`/businesses/${encodeURIComponent(businessId)}/analyses`);
  }
  get(runId: string) {
    return this.client.get<AnalysisRun>(`/analyses/${encodeURIComponent(runId)}`);
  }
}

export const api = {
  auth: new AuthService(http),
  businesses: new BusinessService(http),
  reviews: new ReviewService(http),
  analyses: new AnalysisService(http),
};
