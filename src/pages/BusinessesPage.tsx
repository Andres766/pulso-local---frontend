import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/services';
import { BUSINESS_CATEGORIES, type BusinessCategory, type BusinessPulse } from '../api/types';
import { bizStyle, PulseMotif } from '../components/brand';
import { SentimentStrip } from '../components/charts';
import { Delta } from '../components/evolution';
import { Icon } from '../components/icons';
import { LiveBadge } from '../components/LiveBadge';
import { Alert, Button, Card, EmptyState, Field, Select, Skeleton } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { type I18n, useI18n } from '../i18n/I18nContext';
import { useRealtimeAnalyses } from '../realtime/useRealtime';

/** "hace 3 horas", "ayer", "hace 2 semanas" (o su versión en inglés). */
export function timeAgo(iso: string, locale: string, now = Date.now()): string {
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 14) return relative.format(days, 'day');
  return relative.format(Math.round(days / 7), 'week');
}

const share = (part: number, total: number) => (total === 0 ? 0 : Math.round((part / total) * 100));

/** El negocio que más necesita atención: el de mayor proporción de reseñas negativas. */
export function portfolioFinding(items: BusinessPulse[], { t }: Pick<I18n, 't'>): string | null {
  const analyzed = items.filter((p) => p.sentiment && p.analyzedReviews > 0);
  if (analyzed.length < 2) return null;
  const negativeShare = (p: BusinessPulse) => (p.sentiment?.negative ?? 0) / p.analyzedReviews;
  const worst = [...analyzed].sort((a, b) => negativeShare(b) - negativeShare(a))[0];
  if (!worst) return null;
  const negative = share(worst.sentiment?.negative ?? 0, worst.analyzedReviews);
  const complaint = worst.topComplaint ? t('businesses.findingComplaint', { topic: worst.topComplaint.name.toLowerCase() }) : '';
  return t('businesses.finding', { name: worst.business.name, share: negative, complaint });
}

const COLUMNS = 'md:grid-cols-[2.5rem_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)_5.5rem_1rem]';

function PulseRow({ pulse }: { pulse: BusinessPulse }) {
  const { business: b, sentiment, analyzedReviews, topComplaint } = pulse;
  const running = pulse.latestStatus === 'pending' || pulse.latestStatus === 'running';
  const { t, number, locale } = useI18n();

  return (
    <li style={bizStyle(b.category)}>
      <Link
        to={`/negocios/${b.id}`}
        className={`biz-hover group relative grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-3 gap-y-2 px-5 py-4 transition-colors ${COLUMNS}`}
      >
        {/* Franja del color del negocio: se ensancha al pasar el puntero. */}
        <span className="biz-band absolute inset-y-0 left-0 w-1 transition-[width] group-hover:w-1.5" aria-hidden />
        <span className="biz-band grid h-10 w-10 place-items-center rounded-xl text-base font-bold shadow-sm" aria-hidden>
          {b.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-ink md:truncate">{b.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-2">
            <span className="biz-soft biz-ink rounded-full px-2 py-px text-xs font-semibold">{t(`category.${b.category}`)}</span>
            {b.city}
          </span>
        </span>

        {/* En el teléfono, sentimiento y queja pasan a líneas propias debajo del nombre. */}
        <span className="col-start-2 col-end-4 min-w-0 md:col-auto">
          {sentiment ? (
            <>
              <span className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="num font-semibold text-pos">
                  {t('businesses.satisfied', { share: share(sentiment.positive, analyzedReviews) })}
                </span>
                {pulse.positiveShareDelta !== null && <Delta value={pulse.positiveShareDelta} goodWhen="up" label="" />}
              </span>
              <SentimentStrip sentiment={sentiment} className="mt-1.5 max-w-44" />
            </>
          ) : (
            <span className="text-sm text-ink-3">{running ? t('businesses.analyzing') : t('businesses.notAnalyzed')}</span>
          )}
        </span>

        <span className="col-start-2 col-end-4 min-w-0 text-sm md:col-auto">
          {topComplaint ? (
            <>
              <span className="block truncate text-ink">{topComplaint.name}</span>
              <span className="num block text-ink-3">{t('businesses.ofReviews', { share: number(topComplaint.complaintShare) })}</span>
            </>
          ) : (
            <span className="text-ink-3">{sentiment ? t('businesses.noComplaints') : '—'}</span>
          )}
        </span>

        <span className="col-start-3 row-start-1 text-right text-sm md:col-auto md:row-auto">
          <span className="num block font-medium text-ink">{pulse.reviewCount}</span>
          <span className="block whitespace-nowrap text-xs text-ink-3">
            {pulse.analyzedAt ? timeAgo(pulse.analyzedAt, locale) : t('businesses.reviewsUnit')}
          </span>
        </span>
        <Icon
          name="chevronRight"
          className="hidden h-4 w-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink md:block"
        />
      </Link>
    </li>
  );
}

export function BusinessesPage() {
  const [items, setItems] = useState<BusinessPulse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; category: BusinessCategory; city: string }>({
    name: '',
    category: 'restaurante',
    city: '',
  });
  const [saving, setSaving] = useState(false);
  const i18n = useI18n();
  const { t } = i18n;
  usePageTitle(t('businesses.title'));

  // biome-ignore lint/correctness/useExhaustiveDependencies: el error se traduce al mostrarlo; cambiar de idioma no debe recargar la lista
  const load = useCallback(
    () =>
      api.businesses
        .overview()
        .then(setItems)
        .catch((e) => setError(i18n.errorMessage(e, 'businesses.loadError'))),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Fan-out: un análisis lanzado en otra pestaña o terminado mientras se mira esta lista la actualiza sola.
  const live = useRealtimeAnalyses(items?.map((p) => p.business.id) ?? [], ({ businessId, run }) => {
    setItems((list) => list?.map((p) => (p.business.id === businessId ? { ...p, latestStatus: run.status } : p)) ?? list);
    if (run.status === 'completed' || run.status === 'failed') void load();
  });

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.businesses.create({ name: form.name, category: form.category, city: form.city || undefined });
      setForm({ ...form, name: '', city: '' });
      await load();
    } catch (err) {
      setError(i18n.errorMessage(err, 'businesses.createError'));
    } finally {
      setSaving(false);
    }
  }

  const totalReviews = items?.reduce((n, p) => n + p.reviewCount, 0) ?? 0;
  const finding = items ? portfolioFinding(items, i18n) : null;
  // Satisfechos de toda la cartera: positivas sobre analizadas, sumando los negocios (no promedio de promedios).
  const analyzedTotal = items?.reduce((n, p) => n + (p.sentiment ? p.analyzedReviews : 0), 0) ?? 0;
  const positiveTotal = items?.reduce((n, p) => n + (p.sentiment?.positive ?? 0), 0) ?? 0;
  const stats =
    items && items.length > 0
      ? [
          { label: t('businesses.statBusinesses'), value: i18n.number(items.length, 0) },
          { label: t('businesses.statReviews'), value: i18n.number(totalReviews, 0) },
          ...(analyzedTotal > 0
            ? [{ label: t('businesses.statSatisfied'), value: i18n.percent(Math.round((positiveTotal / analyzedTotal) * 100), 0) }]
            : []),
        ]
      : [];

  return (
    <div className="space-y-5">
      {/* Franja de la marca: el resumen de toda la cartera y el negocio que más necesita atención. */}
      <section className="biz-band relative overflow-hidden rounded-2xl px-6 py-7 sm:px-8" style={bizStyle()}>
        <PulseMotif className="right-0 bottom-0 h-20 w-[60%] text-white/12" />
        <div className="relative flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight">{t('businesses.title')}</h1>
            {stats.length === 0 && <p className="mt-1 text-white/80">{items === null ? t('businesses.loading') : t('businesses.none')}</p>}
            {finding && <p className="mt-3 text-lg leading-snug text-white/95">{finding}</p>}
          </div>
          {stats.length > 0 && (
            <dl className="flex flex-wrap gap-x-8 gap-y-3">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-sm text-white/75">{s.label}</dt>
                  <dd className="num text-3xl font-bold">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {error && <Alert>{error}</Alert>}

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
        {items === null ? (
          <div
            className="space-y-px overflow-hidden rounded-xl border border-line bg-card"
            role="status"
            aria-label={t('businesses.loadingList')}
          >
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-none" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon="store" title={t('businesses.emptyTitle')}>
            {t('businesses.emptyText')}
          </EmptyState>
        ) : (
          <section className="overflow-hidden rounded-xl border border-line bg-card" aria-labelledby="pulso-titulo">
            <div className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-3">
              <h2 id="pulso-titulo" className="text-base font-semibold text-ink">
                {t('businesses.pulseTitle')}
              </h2>
              <span className="flex items-center gap-3">
                <span className="hidden text-xs text-ink-3 sm:inline">{t('businesses.pulseNote')}</span>
                <LiveBadge status={live} />
              </span>
            </div>
            <div className={`hidden gap-x-3 border-line border-b px-5 pb-2 text-xs text-ink-3 md:grid ${COLUMNS}`} aria-hidden>
              <span />
              <span>{t('businesses.colBusiness')}</span>
              <span>{t('businesses.colSentiment')}</span>
              <span>{t('businesses.colComplaint')}</span>
              <span className="text-right">{t('businesses.colReviews')}</span>
              <span />
            </div>
            <ul className="divide-y divide-line">
              {items.map((p) => (
                <PulseRow key={p.business.id} pulse={p} />
              ))}
            </ul>
          </section>
        )}

        <Card title={t('businesses.newTitle')} subtitle={t('businesses.newSubtitle')} icon="store">
          <form onSubmit={onCreate} className="space-y-4">
            <Field
              label={t('common.name')}
              required
              minLength={2}
              maxLength={120}
              placeholder={t('businesses.namePlaceholder')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Select
              label={t('common.category')}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as BusinessCategory })}
            >
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`category.${c}`)}
                </option>
              ))}
            </Select>
            <Field
              label={t('common.cityOptional')}
              maxLength={80}
              placeholder={t('businesses.cityPlaceholder')}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <Button type="submit" loading={saving} icon="plus" className="w-full">
              {t('businesses.create')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
