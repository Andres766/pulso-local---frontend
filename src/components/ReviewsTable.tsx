import { useEffect, useState } from 'react';
import { ApiError } from '../api/http';
import { api } from '../api/services';
import type { ReviewItem, SentimentLabel, TopicStat } from '../api/types';
import { SENTIMENT_META } from './charts';
import { Alert, Button, Spinner } from './ui';

const PAGE = 10;

interface Props {
  businessId: string;
  topics: TopicStat[];
  topicFilter: string | null;
  onTopicFilter: (key: string | null) => void;
  refreshKey: number;
}

/** Vista de tabla de las reseñas: además de filtrar, es la alternativa accesible a los gráficos. */
export function ReviewsTable({ businessId, topics, topicFilter, onTopicFilter, refreshKey }: Props) {
  const [sentiment, setSentiment] = useState<SentimentLabel | ''>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ total: number; items: ReviewItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce de la búsqueda para no disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setOffset(0), [sentiment, query, topicFilter]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.reviews
      .list(businessId, { sentiment: sentiment || undefined, topic: topicFilter ?? undefined, q: query || undefined, limit: PAGE, offset })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : 'Error al cargar reseñas'));
    return () => {
      cancelled = true;
    };
  }, [businessId, sentiment, topicFilter, query, offset, refreshKey]);

  const selectClass = 'rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
          placeholder="Buscar en las reseñas…"
          aria-label="Buscar en las reseñas"
          className={`${selectClass} min-w-48 flex-1`}
        />
        <select aria-label="Filtrar por sentimiento" value={sentiment} onChange={(e) => setSentiment(e.target.value as SentimentLabel | '')} className={selectClass}>
          <option value="">Todo sentimiento</option>
          {(Object.keys(SENTIMENT_META) as SentimentLabel[]).map((s) => (
            <option key={s} value={s}>{SENTIMENT_META[s].plural}</option>
          ))}
        </select>
        <select aria-label="Filtrar por tema" value={topicFilter ?? ''} onChange={(e) => onTopicFilter(e.target.value || null)} className={selectClass}>
          <option value="">Todos los temas</option>
          {topics.map((t) => (
            <option key={t.key} value={t.key}>{t.name}</option>
          ))}
        </select>
      </div>

      {error && <Alert>{error}</Alert>}
      {!data ? (
        <div className="py-8 text-center text-brand"><Spinner /></div>
      ) : data.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-2">No hay reseñas con estos filtros.</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.items.map((r) => (
            <li key={r.id} className="py-3">
              <p className="text-sm text-ink">{r.content}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                {r.sentiment ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${SENTIMENT_META[r.sentiment].swatch}`} aria-hidden />
                    {SENTIMENT_META[r.sentiment].label}
                  </span>
                ) : (
                  <span className="text-ink-3">Sin analizar</span>
                )}
                {r.rating && <span aria-label={`${r.rating} de 5 estrellas`}>{'★'.repeat(r.rating)}<span className="text-line">{'★'.repeat(5 - r.rating)}</span></span>}
                {r.topics.map((t) => (
                  <span key={t} className="rounded-full bg-surface px-2 py-0.5">{t}</span>
                ))}
                <span className="text-ink-3">{new Date(r.authoredAt ?? r.createdAt).toLocaleDateString('es-CO')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > PAGE && (
        <div className="flex items-center justify-between text-sm text-ink-2">
          <span className="tabular-nums">{offset + 1}–{Math.min(offset + PAGE, data.total)} de {data.total}</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(offset - PAGE)}>Anterior</Button>
            <Button variant="secondary" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>Siguiente</Button>
          </div>
        </div>
      )}
    </div>
  );
}
