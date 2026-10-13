import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { Icon, type IconName } from './icons';

/** Primitivas de UI reutilizables. Todo el texto lo escapa React (no se usa dangerouslySetInnerHTML). */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand shadow-sm hover:bg-brand-strong',
  secondary: 'bg-card text-ink border border-line hover:bg-raised',
  ghost: 'text-ink-2 hover:text-ink hover:bg-raised',
  danger: 'text-critical border border-line bg-card hover:bg-critical-soft',
};

export function Button({
  variant = 'primary',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; icon?: IconName }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export function Card({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {icon && (
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <Icon name={icon} />
              </span>
            )}
            <div>
              {title && <h2 className="text-base font-bold text-ink">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const inputClass =
  'w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-3 transition-colors focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15';

export function Field({ label, error, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input {...rest} aria-invalid={Boolean(error)} className={`${inputClass} ${error ? 'border-critical' : ''}`} />
      {hint && !error && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs text-critical">{error}</span>}
    </label>
  );
}

export function Select({ label, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <select {...rest} className={inputClass}>
        {children}
      </select>
    </label>
  );
}

export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info' | 'success'; children: ReactNode }) {
  const styles = {
    error: 'bg-critical-soft text-critical',
    info: 'bg-brand-soft text-brand',
    success: 'bg-good-soft text-good',
  }[tone];
  const icon: IconName = { error: 'alert', info: 'sparkles', success: 'check' }[tone] as IconName;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 rounded-xl px-3.5 py-3 text-sm ${styles}`}>
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Etiqueta compacta (categoría, ciudad, proveedor de IA…). */
export function Chip({ icon, children, tone = 'neutral' }: { icon?: IconName; children: ReactNode; tone?: 'neutral' | 'brand' }) {
  const styles = tone === 'brand' ? 'bg-brand-soft text-brand' : 'bg-raised text-ink-2 border border-line';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {icon && <Icon name={icon} className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <span aria-hidden className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

/** Bloque de carga con la forma del contenido (mejor percepción que un spinner suelto). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-line/70 ${className}`} />;
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center text-brand" role="status" aria-label="Cargando">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-4 font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-ink-2">{children}</div>}
    </div>
  );
}

export function Logo({ className = '', inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display text-[17px] font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-ink'} ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill={inverted ? 'rgb(255 255 255 / 0.16)' : '#1c5cab'} />
        <path d="M5 17h6l3-7 4 13 3-6h6" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      PulsoLocal
    </span>
  );
}
