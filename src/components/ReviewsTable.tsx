import { useEffect, useState } from 'react';
import { api } from '../api/services';
import { REVIEW_SORTS, type ReviewItem, type ReviewSort, type SentimentLabel, type TopicStat } from '../api/types';
import { useI18n } from '../i18n/I18nContext';
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
  const i18n = useI18n();
  const { t } = i18n;

  async function removeReview(review: ReviewItem) {
    const preview = review.content.length > 90 ? `${review.content.slice(0, 90)}…` : review.content;
    const ok = await confirm({
      title: t('reviews.confirmDelete'),
      message: `«${preview}»`,
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.reviews.remove(businessId, review.id);
      toast.success(t('reviews.deleted'));
      // Si era la última de la página, se vuelve a la anterior.
      if (data && data.items.length === 1 && offset > 0) setOffset(offset - PAGE);
      onChanged?.();
    } catch (err) {
      toast.error(i18n.errorMessage(err, 'reviews.deleteError'));
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
      .catch((e) => !cancelled && setError(i18n.errorMessage(e, 'reviews.loadError')));
    return () => {
      cancelled = true;
    };
  }, [businessId, sentiment, topicFilter, query, rating, sort, offset, refreshKey]);

  const selectClass =
    'rounded-md border border-line bg-card px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={100}
          placeholder={t('reviews.search')}
          aria-label={t('reviews.searchLabel')}
          className={`${selectClass} min-w-48 flex-1`}
        />
        <select
          aria-label={t('reviews.bySentiment')}
          value={sentiment}
          onChange={(e) => {
            setSentiment(e.target.value as SentimentLabel | '');
            setOffset(0);
          }}
          className={selectClass}
        >
          <option value="">{t('reviews.anySentiment')}</option>
          {(Object.keys(SENTIMENT_META) as SentimentLabel[]).map((s) => (
            <option key={s} value={s}>
              {t(SENTIMENT_META[s].plural)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('reviews.byTopic')}
          value={topicFilter ?? ''}
          onChange={(e) => onTopicFilter(e.target.value || null)}
          className={selectClass}
        >
          <option value="">{t('reviews.anyTopic')}</option>
          {topics.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('reviews.byRating')}
          value={rating}
          onChange={(e) => {
            setRating(e.target.value ? Number(e.target.value) : '');
            setOffset(0);
          }}
          className={selectClass}
        >
          <option value="">{t('reviews.anyRating')}</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {i18n.plural('reviews.stars', n)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('reviews.sortLabel')}
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as ReviewSort);
            setOffset(0);
          }}
          className={selectClass}
        >
          {REVIEW_SORTS.map((o) => (
            <option key={o} value={o}>
              {t(`sort.${o}`)}
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
        <p className="py-6 text-center text-sm text-ink-2">{t('reviews.empty')}</p>
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
                      {t(SENTIMENT_META[r.sentiment].label)}
                    </span>
                  ) : (
                    <span className="text-ink-3">{t('reviews.notAnalyzed')}</span>
                  )}
                  {r.rating && (
                    <span role="img" aria-label={t('reviews.ratingLabel', { count: r.rating })}>
                      {/* Las estrellas son la forma propia del dato (calificación 1-5), no decoración. */}
                      {'★'.repeat(r.rating) /* taste-skill-ignore */}
                      <span className="text-line">{'★'.repeat(5 - r.rating) /* taste-skill-ignore */}</span>
                    </span>
                  )}
                  {r.topics.map((t) => (
                    <span key={t} className="whitespace-nowrap rounded bg-raised px-1.5 py-0.5">
                      {t}
                    </span>
                  ))}
                  <span className="text-ink-3">{i18n.date(r.authoredAt ?? r.createdAt)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void removeReview(r)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 opacity-60 transition hover:bg-critical-soft hover:text-critical focus-visible:opacity-100 group-hover:opacity-100 print:hidden"
                aria-label={t('reviews.delete')}
                title={t('reviews.delete')}
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
            {t('reviews.range', { from: offset + 1, to: Math.min(offset + PAGE, data.total), total: data.total })}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(offset - PAGE)}>
              {t('common.previous')}
            </Button>
            <Button variant="secondary" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
