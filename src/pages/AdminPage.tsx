import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { api } from '../api/services';
import type { AdminDashboard, AdminUser } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { bizStyle, PulseMotif } from '../components/brand';
import { Icon } from '../components/icons';
import { useToast } from '../components/toast';
import { Alert, Button, Card, Skeleton } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n } from '../i18n/I18nContext';

/** Columnas del consumo diario de IA: llamadas por día, con los fallidos marcados en rojo. */
function UsageChart({ usage }: { usage: AdminDashboard['usage'] }) {
  const { t, number, locale } = useI18n();
  const max = Math.max(1, ...usage.map((d) => d.llmCalls));
  const dayLabel = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'numeric' });
  const empty = usage.every((d) => d.llmCalls === 0);

  return (
    <div>
      <div className="relative flex h-40 items-end gap-1.5 border-control border-b pb-px" role="img" aria-label={t('admin.usageSubtitle')}>
        {empty && <p className="absolute inset-0 grid place-items-center text-center text-sm text-ink-3">{t('admin.usageEmpty')}</p>}
        {usage.map((d) => (
          <div
            key={d.day}
            className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            title={t('admin.usageDay', {
              day: dayLabel(d.day),
              analyses: d.analyses,
              calls: d.llmCalls,
              tokens: number(d.tokens, 0),
            })}
          >
            {d.llmCalls > 0 && <span className="num mb-1 text-[11px] text-ink-3">{d.llmCalls}</span>}
            <div className="flex w-full max-w-8 flex-col-reverse" style={{ height: `${(d.llmCalls / max) * 85}%` }}>
              <div className="biz-band h-full rounded-t-sm opacity-90 transition-opacity group-hover:opacity-100" />
            </div>
            {d.failed > 0 && (
              <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-neg" title={t('admin.usageFailed', { count: d.failed })} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5" aria-hidden>
        {usage.map((d, i) => (
          <span key={d.day} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[11px] text-ink-3">
            {/* Una fecha cada 3 días: en el celular no caben las 14. */}
            {i % 3 === 0 ? dayLabel(d.day) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function AdminSkeleton() {
  const { t } = useI18n();
  return (
    <div className="space-y-5" role="status" aria-label={t('common.loading')}>
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-64 lg:col-span-3" />
        <Skeleton className="h-64 lg:col-span-2" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

/**
 * Panel de administración (solo rol "admin"). Muestra cifras agregadas de la plataforma, el consumo
 * de IA, los análisis fallidos (con reintento) y los usuarios (con desbloqueo). Nunca muestra
 * reseñas ni resultados de otros usuarios: la API tampoco los entrega.
 */
export function AdminPage() {
  const { user } = useAuth();
  const i18n = useI18n();
  const { t, number } = i18n;
  const toast = useToast();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  usePageTitle(t('admin.title'));
  const isAdmin = user?.role === 'admin';

  // biome-ignore lint/correctness/useExhaustiveDependencies: el error se traduce al mostrarlo; cambiar de idioma no debe recargar
  const load = useCallback(async () => {
    try {
      const [dashboard, list] = await Promise.all([api.admin.dashboard(), api.admin.users()]);
      setData(dashboard);
      setUsers(list);
    } catch (err) {
      setError(i18n.errorMessage(err, 'admin.loadError'));
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  // Un usuario normal no ve el enlace; si escribe la URL, vuelve a su inicio (la API igual respondería 403).
  if (!isAdmin) return <Navigate to="/" replace />;

  async function retry(runId: string, businessName: string) {
    setBusy(runId);
    try {
      await api.admin.retry(runId);
      toast.success(t('admin.retried', { name: businessName }));
      await load();
    } catch (err) {
      toast.error(i18n.errorMessage(err, 'admin.retryError'));
    } finally {
      setBusy(null);
    }
  }

  async function unlock(target: AdminUser) {
    setBusy(target.id);
    try {
      await api.admin.unlock(target.id);
      toast.success(t('admin.unlocked', { email: target.email }));
      await load();
    } catch (err) {
      toast.error(i18n.errorMessage(err, 'admin.unlockError'));
    } finally {
      setBusy(null);
    }
  }

  if (error) return <Alert>{error}</Alert>;
  if (!data || !users) return <AdminSkeleton />;

  const { overview } = data;
  const stats = [
    { label: t('admin.statUsers'), value: overview.users },
    { label: t('admin.statBusinesses'), value: overview.businesses },
    { label: t('admin.statReviews'), value: overview.reviews },
    { label: t('admin.statAnalyses'), value: overview.analyses.completed },
  ];
  const health = [
    { label: t('admin.inProgress'), value: overview.analyses.inProgress, tone: 'bg-pos' },
    { label: t('admin.completed'), value: overview.analyses.completed, tone: 'bg-good' },
    { label: t('admin.failedCount'), value: overview.analyses.failed, tone: 'bg-neg' },
    { label: t('admin.locked'), value: overview.lockedUsers, tone: 'bg-warning' },
  ];
  const tokens = overview.llm.inputTokens + overview.llm.outputTokens;

  return (
    <div className="space-y-5" style={bizStyle('servicios')}>
      <section className="biz-band relative overflow-hidden rounded-2xl px-6 py-7 sm:px-8">
        <PulseMotif className="right-0 bottom-0 h-20 w-[60%] text-white/12" />
        <div className="relative flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
              <Icon name="shield" className="h-3.5 w-3.5" /> {t('admin.roleAdmin')}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{t('admin.title')}</h1>
            <p className="mt-1 text-white/85">{t('admin.subtitle')}</p>
          </div>
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-sm text-white/75">{s.label}</dt>
                <dd className="num text-3xl font-bold">{number(s.value, 0)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <p className="flex items-start gap-2 text-sm text-ink-2">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
        {t('admin.privacy')}
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Card
          title={t('admin.usageTitle')}
          subtitle={t('admin.usageSubtitle')}
          icon="sparkles"
          className="lg:col-span-3"
          action={
            <span className="num hidden text-right text-xs text-ink-3 sm:block">
              {t('admin.usageTotal', { calls: number(overview.llm.calls, 0), tokens: number(tokens, 0) })}
            </span>
          }
        >
          <UsageChart usage={data.usage} />
        </Card>

        <Card title={t('admin.healthTitle')} icon="chart" className="lg:col-span-2">
          <dl className="grid grid-cols-2 gap-3">
            {health.map((h) => (
              <div key={h.label} className="rounded-lg border border-line p-3">
                <span className={`mb-2 block h-1 w-8 rounded-full ${h.tone}`} aria-hidden />
                <dt className="text-xs text-ink-2">{h.label}</dt>
                <dd className="num text-2xl font-semibold text-ink">{number(h.value, 0)}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card title={t('admin.failedTitle')} subtitle={t('admin.failedSubtitle')} icon="alert">
        {data.failed.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-good">
            <Icon name="check" className="h-4 w-4" /> {t('admin.failedNone')}
          </p>
        ) : (
          <ul className="-my-3 divide-y divide-line">
            {data.failed.map((f) => (
              <li key={f.runId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{f.businessName}</p>
                  <p className="text-xs text-ink-3">
                    {[f.ownerEmail, f.provider, t('admin.attempts', { count: f.attempts }), f.finishedAt && i18n.dateTime(f.finishedAt)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {f.error && <p className="mt-0.5 text-sm text-critical">{f.error}</p>}
                </div>
                <Button variant="secondary" icon="refresh" loading={busy === f.runId} onClick={() => void retry(f.runId, f.businessName)}>
                  {t('admin.retry')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title={t('admin.usersTitle')} subtitle={t('admin.usersSubtitle')} icon="users">
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-line border-b text-left text-xs text-ink-3">
                <th scope="col" className="px-5 pb-2 font-normal">
                  {t('admin.colUser')}
                </th>
                <th scope="col" className="pb-2 font-normal">
                  {t('admin.colRole')}
                </th>
                <th scope="col" className="pb-2 text-right font-normal">
                  {t('admin.colBusinesses')}
                </th>
                <th scope="col" className="pb-2 text-right font-normal">
                  {t('admin.colReviews')}
                </th>
                <th scope="col" className="px-5 pb-2 text-right font-normal">
                  {t('admin.colStatus')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id}>
                  <th scope="row" className="px-5 py-3 text-left font-normal">
                    <span className="block font-medium text-ink">{u.name}</span>
                    <span className="block text-xs text-ink-3">{u.email}</span>
                  </th>
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        u.role === 'admin' ? 'biz-soft biz-ink' : 'bg-raised text-ink-2'
                      }`}
                    >
                      {u.role === 'admin' && <Icon name="shield" className="h-3 w-3" />}
                      {u.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser')}
                    </span>
                  </td>
                  <td className="num py-3 text-right text-ink">{number(u.businesses, 0)}</td>
                  <td className="num py-3 text-right text-ink">{number(u.reviews, 0)}</td>
                  <td className="px-5 py-3 text-right">
                    {u.lockedUntil ? (
                      <span className="inline-flex flex-wrap items-center justify-end gap-2">
                        <span className="text-xs text-warning">
                          {t('admin.lockedUntil', {
                            time: new Date(u.lockedUntil).toLocaleTimeString(i18n.locale, { timeStyle: 'short' }),
                          })}
                        </span>
                        <Button variant="secondary" icon="unlock" loading={busy === u.id} onClick={() => void unlock(u)}>
                          {t('admin.unlock')}
                        </Button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-good">
                        <span className="h-1.5 w-1.5 rounded-full bg-good" aria-hidden /> {t('admin.active')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ink-3">{t('admin.howToGrant')}</p>
      </Card>
    </div>
  );
}
