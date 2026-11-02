import { useEffect, useState } from 'react';
import { ApiError } from '../api/http';
import { api } from '../api/services';
import { REVIEW_SORTS, type ReviewItem, type ReviewSort, type SentimentLabel, type TopicStat } from '../api/types';
import { SENTIMENT_META } from './charts';
import { useConfirm } from './confirm';
import { Icon } from './icons';
import { useToast } from './toast';
import { Alert, Button, Spinner } from './ui';

const PAGE = 10;

interface Props {
  businessId: string;
  topics: TopicStat[];
  topicFilter: string | null;
  onTopicFilter: (key: string | null) => void;
  refreshKey: number;
  /** Se llama tras borrar una reseña, para que el dashboard actualice sus contadores. */
  onChanged?: () => void;
}

/** Vista de tabla de las reseñas: además de filtrar, es la alternativa accesible a los gráficos. */
export function ReviewsTable({ businessId, topics, topicFilter, onTopicFilter, refreshKey, onChanged }: Props) {
  const [sentiment, setSentiment] = useState<SentimentLabel | ''>('');
  const [rating, setRating] = useState<number | ''>('');
  const [sort, setSort] = useState<ReviewSort>('recent');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ total: number; items: ReviewItem[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  async function removeReview(review: ReviewItem) {
    const preview = review.content.length > 90 ? `${review.content.slice(0, 90)}…` : review.content;
    const ok = await confirm({ title: '¿Eliminar esta reseña?', message: `«${preview}»`, confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await api.reviews.remove(businessId, review.id);
      toast.success('Reseña eliminada.');
      // Si era la última de la página, se vuelve a la anterior.
      if (data && data.items.length === 1 && offset > 0) setOffset(offset - PAGE);
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar la reseña');
    }
  }

  // Debounce de la búsqueda para no disparar una petición por cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setOffset(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Si cambia el tema desde fuera (clic en el gráfico), se vuelve a la primera página.
  const [lastTopic, setLastTopic] = useState(topicFilter);
  if (lastTopic !== topicFilter) {
    setLastTopic(topicFilter);
    setOffset(0);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey es un disparador: el padre lo cambia para recargar tras importar
  useEffect(() => {
    let cancelled = false;
    setError(null);
    api.reviews
      .list(businessId, {
        sentiment: sentiment || undefined,
        topic: topicFilter ?? undefined,
        q: query || undefined,
        rating: rating || undefined,
        sort,
        limit: PAGE,
        offset,
      })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : 'Error al cargar reseñas'));
    return () => {
      cancelled = true;
    };
  }, [businessId, sentiment, topicFilter, query, rating, sort, offset, refreshKey]);

  const selectClass =
    'rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15';

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
        <select
          aria-label="Filtrar por sentimiento"
          value={sentiment}
          onChange={(e) => {
            setSentiment(e.target.value as SentimentLabel | '');
            setOffset(0);
          }}
          className={selectClass}
        >
          <option value="">Todo sentimiento</option>
          {(Object.keys(SENTIMENT_META) as SentimentLabel[]).map((s) => (
            <option key={s} value={s}>
              {SENTIMENT_META[s].plural}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por tema"
          value={topicFilter ?? ''}
          onChange={(e) => onTopicFilter(e.target.value || null)}
          className={selectClass}
        >
          <option value="">Todos los temas</option>
          {topics.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por estrellas"
          value={rating}
          onChange={(e) => {
            setRating(e.target.value ? Number(e.target.value) : '');
            setOffset(0);
          }}
          className={selectClass}
        >
          <option value="">Todas las estrellas</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {'★'.repeat(n)} ({n})
            </option>
          ))}
        </select>
        <select
          aria-label="Ordenar reseñas"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as ReviewSort);
            setOffset(0);
          }}
          className={selectClass}
        >
          {REVIEW_SORTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && <Alert>{error}</Alert>}
      {!data ? (
        <div className="py-8 text-center text-brand">
          <Spinner />
        </div>
      ) : data.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-2">No hay reseñas con estos filtros.</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.items.map((r) => (
            <li key={r.id} className="group flex gap-3 py-3">
              <div className="min-w-0 flex-1">
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
                  {r.rating && (
                    <span role="img" aria-label={`${r.rating} de 5 estrellas`}>
                      {'★'.repeat(r.rating)}
                      <span className="text-line">{'★'.repeat(5 - r.rating)}</span>
                    </span>
                  )}
                  {r.topics.map((t) => (
                    <span key={t} className="rounded-full bg-raised px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                  <span className="text-ink-3">{new Date(r.authoredAt ?? r.createdAt).toLocaleDateString('es-CO')}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void removeReview(r)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 opacity-60 transition hover:bg-critical-soft hover:text-critical focus-visible:opacity-100 group-hover:opacity-100 print:hidden"
                aria-label="Eliminar reseña"
                title="Eliminar reseña"
              >
                <Icon name="trash" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > PAGE && (
        <div className="flex items-center justify-between text-sm text-ink-2">
          <span className="tabular-nums">
            {offset + 1}–{Math.min(offset + PAGE, data.total)} de {data.total}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(offset - PAGE)}>
              Anterior
            </Button>
            <Button variant="secondary" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
