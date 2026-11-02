import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '../api/http';
import { api } from '../api/services';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../components/confirm';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { useToast } from '../components/toast';
import { Alert, Button, Card, Field } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';

const DELETE_WORD = 'ELIMINAR';

export function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  usePageTitle('Mi cuenta');

  const [pwd, setPwd] = useState({ current: '', next: '', repeat: '' });
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwdError(null);
    if (pwd.next !== pwd.repeat) return setPwdError('Las contraseñas nuevas no coinciden');
    setSavingPwd(true);
    try {
      await api.auth.changePassword(pwd.current, pwd.next);
      setPwd({ current: '', next: '', repeat: '' });
      toast.success('Contraseña actualizada. Las demás sesiones se cerraron.');
    } catch (err) {
      setPwdError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setSavingPwd(false);
    }
  }

  async function deleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleteError(null);
    const ok = await confirm({
      title: '¿Eliminar tu cuenta?',
      message: 'Se borrarán para siempre tu cuenta, tus negocios, sus reseñas y todos los análisis. No se puede deshacer.',
      confirmLabel: 'Eliminar mi cuenta',
      danger: true,
      requireText: DELETE_WORD,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.auth.deleteAccount(deletePassword);
      await logout();
      toast.success('Tu cuenta y todos tus datos fueron eliminados.');
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'No se pudo eliminar la cuenta');
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand">Configuración</p>
        <h1 className="mt-1 text-3xl font-extrabold text-ink">Mi cuenta</h1>
        <p className="mt-1 text-ink-2">
          {user?.name} · {user?.email}
        </p>
      </div>

      <Card title="Cambiar contraseña" icon="shield" subtitle="Al cambiarla se cierran las sesiones abiertas en otros dispositivos.">
        <form onSubmit={changePassword} className="space-y-4">
          <Field
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            required
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={72}
              value={pwd.next}
              onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
            />
            <Field
              label="Repite la nueva contraseña"
              type="password"
              autoComplete="new-password"
              required
              value={pwd.repeat}
              onChange={(e) => setPwd({ ...pwd, repeat: e.target.value })}
            />
          </div>
          <PasswordChecklist password={pwd.next} email={user?.email} />
          {pwdError && <Alert>{pwdError}</Alert>}
          <Button type="submit" loading={savingPwd} icon="check">
            Cambiar contraseña
          </Button>
        </form>
      </Card>

      <section className="rounded-2xl border border-critical/40 bg-card p-5 shadow-card sm:p-6">
        <h2 className="text-base font-bold text-critical">Eliminar cuenta</h2>
        <p className="mt-1 text-sm text-ink-2">
          Derecho de supresión (Ley 1581 de 2012): borra tu cuenta y todos tus datos de forma permanente. Confirma con tu contraseña.
        </p>
        <form onSubmit={deleteAccount} className="mt-4 space-y-4">
          <Field
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          {deleteError && <Alert>{deleteError}</Alert>}
          <Button type="submit" variant="danger" icon="trash" loading={deleting} disabled={!deletePassword}>
            Eliminar mi cuenta
          </Button>
        </form>
      </section>
    </div>
  );
}
