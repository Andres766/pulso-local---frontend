import { Icon } from './icons';

export interface PasswordCheck {
  id: string;
  label: string;
  ok: boolean;
}

/**
 * Las mismas reglas que valida el backend (RegisterUser.assertStrongPassword): aquí solo guían al
 * usuario mientras escribe; la validación que cuenta es la del servidor.
 */
export function passwordChecks(password: string, email = ''): PasswordCheck[] {
  const localPart = email.split('@')[0]?.trim().toLowerCase() ?? '';
  return [
    { id: 'length', label: 'Al menos 10 caracteres', ok: password.length >= 10 },
    { id: 'mix', label: 'Letras y números', ok: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) && /\d/.test(password) },
    { id: 'email', label: 'No contiene tu correo', ok: password.length > 0 && !(localPart && password.toLowerCase().includes(localPart)) },
    // bcrypt solo usa los primeros 72 bytes: el servidor rechaza contraseñas más largas.
    { id: 'max', label: 'Máximo 72 bytes', ok: new TextEncoder().encode(password).length <= 72 },
  ];
}

export function PasswordChecklist({ password, email }: { password: string; email?: string }) {
  const checks = passwordChecks(password, email);
  return (
    <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2" aria-label="Requisitos de la contraseña">
      {checks.map((c) => (
        <li key={c.id} className={`flex items-center gap-1.5 ${c.ok ? 'text-good' : 'text-ink-3'}`}>
          <Icon name={c.ok ? 'check' : 'clock'} className="h-3.5 w-3.5 shrink-0" />
          {c.label}
          <span className="sr-only">{c.ok ? '(cumplido)' : '(pendiente)'}</span>
        </li>
      ))}
    </ul>
  );
}
