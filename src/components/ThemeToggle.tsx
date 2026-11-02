import { type ThemePreference, useTheme } from '../hooks/useTheme';
import { Icon, type IconName } from './icons';

const OPTIONS: { value: ThemePreference; icon: IconName; label: string }[] = [
  { value: 'light', icon: 'sun', label: 'Tema claro' },
  { value: 'dark', icon: 'moon', label: 'Tema oscuro' },
  { value: 'system', icon: 'monitor', label: 'Según el sistema' },
];

/** Radios nativos (accesibles con teclado y lectores de pantalla) con apariencia de botones. */
export function ThemeToggle() {
  const { preference, choose } = useTheme();
  return (
    <fieldset className="inline-flex rounded-xl border border-line bg-raised p-0.5">
      <legend className="sr-only">Tema de la interfaz</legend>
      {OPTIONS.map((o) => (
        <label
          key={o.value}
          title={o.label}
          className={`grid h-7 w-7 cursor-pointer place-items-center rounded-lg transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
            preference === o.value ? 'bg-card text-ink shadow-sm' : 'text-ink-3 hover:text-ink'
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
          <span className="sr-only">{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
