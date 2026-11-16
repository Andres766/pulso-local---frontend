import { useI18n } from '../i18n/I18nContext';
import type { MessageKey } from '../i18n/messages';
import { Icon } from './icons';

export interface PasswordCheck {
  id: 'length' | 'mix' | 'email' | 'max';
  ok: boolean;
}

/**
 * Las mismas reglas que valida el backend (RegisterUser.assertStrongPassword): aquí solo guían al
 * usuario mientras escribe; la validación que cuenta es la del servidor.
 */
export function passwordChecks(password: string, email = ''): PasswordCheck[] {
  const localPart = email.split('@')[0]?.trim().toLowerCase() ?? '';
  return [
    { id: 'length', ok: password.length >= 10 },
    { id: 'mix', ok: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) && /\d/.test(password) },
    { id: 'email', ok: password.length > 0 && !(localPart && password.toLowerCase().includes(localPart)) },
    // bcrypt solo usa los primeros 72 bytes: el servidor rechaza contraseñas más largas.
    { id: 'max', ok: new TextEncoder().encode(password).length <= 72 },
  ];
}

export function PasswordChecklist({ password, email }: { password: string; email?: string }) {
  const checks = passwordChecks(password, email);
  const { t } = useI18n();
  return (
    <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2" aria-label={t('password.requirements')}>
      {checks.map((c) => (
        <li key={c.id} className={`flex items-center gap-1.5 ${c.ok ? 'text-good' : 'text-ink-3'}`}>
          <Icon name={c.ok ? 'check' : 'clock'} className="h-3.5 w-3.5 shrink-0" />
          {t(`password.${c.id}` as MessageKey)}
          <span className="sr-only">{t(c.ok ? 'password.met' : 'password.pending')}</span>
        </li>
      ))}
    </ul>
  );
}
