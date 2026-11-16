import { useI18n } from '../i18n/I18nContext';
import type { RealtimeStatus } from '../realtime/RealtimeClient';

/** Estado del canal en tiempo real: "En vivo" (WebSocket) o "Actualización periódica" (polling). */
export function LiveBadge({ status, inverted = false }: { status: RealtimeStatus; inverted?: boolean }) {
  const { t } = useI18n();
  if (status === 'idle') return null;
  const live = status === 'live';
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${inverted ? 'rounded-full bg-white/15 px-2 py-0.5 font-medium text-white' : 'text-ink-3'}`}
      title={t(live ? 'live.onHint' : 'live.offHint')}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? (inverted ? 'animate-pulse bg-[#4ade80]' : 'bg-good') : inverted ? 'bg-white/50' : 'bg-control'}`}
        aria-hidden
      />
      {t(live ? 'live.on' : status === 'connecting' ? 'live.connecting' : 'live.off')}
    </span>
  );
}
