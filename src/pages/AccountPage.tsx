import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api/services';
import { useAuth } from '../auth/AuthContext';
import { useConfirm } from '../components/confirm';
import { Icon } from '../components/icons';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { useToast } from '../components/toast';
import { Alert, Button, Card, Field } from '../components/ui';
import { usePageTitle } from '../hooks/usePageTitle';
import { useI18n } from '../i18n/I18nContext';

export function AccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const i18n = useI18n();
  const { t } = i18n;
  usePageTitle(t('account.title'));

  const [pwd, setPwd] = useState({ current: '', next: '', repeat: '' });
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);

  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwdError(null);
    if (pwd.next !== pwd.repeat) return setPwdError(t('account.mismatch'));
    setSavingPwd(true);
    try {
      await api.auth.changePassword(pwd.current, pwd.next);
      setPwd({ current: '', next: '', repeat: '' });
      toast.success(t('account.pwdDone'));
    } catch (err) {
      setPwdError(i18n.errorMessage(err, 'account.pwdError'));
    } finally {
      setSavingPwd(false);
    }
  }

  async function deleteAccount(e: FormEvent) {
    e.preventDefault();
    setDeleteError(null);
    const ok = await confirm({
      title: t('account.confirmTitle'),
      message: t('account.confirmText'),
      confirmLabel: t('account.deleteSubmit'),
      danger: true,
      requireText: t('account.deleteWord'),
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.auth.deleteAccount(deletePassword);
      await logout();
      toast.success(t('account.deleted'));
      navigate('/login', { replace: true });
    } catch (err) {
      setDeleteError(i18n.errorMessage(err, 'account.deleteError'));
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('account.title')}</h1>
        <p className="mt-1 text-ink-2">
          {user?.name} · {user?.email}
        </p>
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand hover:underline"
          >
            <Icon name="shield" className="h-4 w-4" /> {t('nav.admin')}
          </Link>
        )}
      </div>

      <Card title={t('account.pwdTitle')} subtitle={t('account.pwdSubtitle')}>
        <form onSubmit={changePassword} className="space-y-4">
          <Field
            label={t('account.current')}
            type="password"
            autoComplete="current-password"
            required
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('account.new')}
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={72}
              value={pwd.next}
              onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
            />
            <Field
              label={t('account.repeat')}
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
            {t('account.pwdSubmit')}
          </Button>
        </form>
      </Card>

      <section className="rounded-lg border border-critical/40 bg-card p-5 sm:p-6">
        <h2 className="text-base font-bold text-critical">{t('account.deleteTitle')}</h2>
        <p className="mt-1 text-sm text-ink-2">{t('account.deleteText')}</p>
        <form onSubmit={deleteAccount} className="mt-4 space-y-4">
          <Field
            label={t('common.password')}
            type="password"
            autoComplete="current-password"
            required
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
          {deleteError && <Alert>{deleteError}</Alert>}
          <Button type="submit" variant="danger" icon="trash" loading={deleting} disabled={!deletePassword}>
            {t('account.deleteSubmit')}
          </Button>
        </form>
      </section>
    </div>
  );
}
