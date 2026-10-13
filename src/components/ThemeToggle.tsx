import { useTheme, type ThemePreference } from '../hooks/useTheme';
import { Icon, type IconName } from './icons';

const OPTIONS: { value: ThemePreference; icon: IconName; label: string }[] = [
  { value: 'light', icon: 'sun', label: 'Tema claro' },
  { value: 'dark', icon: 'moon', label: 'Tema oscuro' },
  { value: 'system', icon: 'monitor', label: 'Según el sistema' },
];

export function ThemeToggle() {
  const { preference, choose } = useTheme();
  return (
    <div role="radiogroup" aria-label="Tema de la interfaz" className="inline-flex rounded-xl border border-line bg-raised p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={preference === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => choose(o.value)}
          className={`grid h-7 w-7 place-items-center rounded-lg transition-colors ${
            preference === o.value ? 'bg-card text-ink shadow-sm' : 'text-ink-3 hover:text-ink'
          }`}
        >
          <Icon name={o.icon} className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
