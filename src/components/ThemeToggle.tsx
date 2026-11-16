import { type ThemePreference, useTheme } from '../hooks/useTheme';
import { useI18n } from '../i18n/I18nContext';
import type { MessageKey } from '../i18n/messages';
import { Icon, type IconName } from './icons';

const OPTIONS: { value: ThemePreference; icon: IconName; label: MessageKey }[] = [
  { value: 'light', icon: 'sun', label: 'theme.light' },
  { value: 'dark', icon: 'moon', label: 'theme.dark' },
  { value: 'system', icon: 'monitor', label: 'theme.system' },
];

/** Radios nativos (accesibles con teclado y lectores de pantalla) con apariencia de botones. */
export function ThemeToggle() {
  const { preference, choose } = useTheme();
  const { t } = useI18n();
  return (
    <fieldset className="inline-flex rounded-md border border-line bg-raised p-0.5">
      <legend className="sr-only">{t('theme.legend')}</legend>
      {OPTIONS.map((o) => (
        <label
          key={o.value}
          title={t(o.label)}
          className={`grid h-7 w-7 cursor-pointer place-items-center rounded-lg transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
            preference === o.value ? 'bg-card text-ink ring-1 ring-line' : 'text-ink-3 hover:text-ink'
          }`}
        >
          <input
            type="radio"
            name="theme"
            value={o.value}
            checked={preference === o.value}
            onChange={() => choose(o.value)}
            className="sr-only"
          />
          <Icon name={o.icon} className="h-3.5 w-3.5" />
          <span className="sr-only">{t(o.label)}</span>
        </label>
      ))}
    </fieldset>
  );
}
