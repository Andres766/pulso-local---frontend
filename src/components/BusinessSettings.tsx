import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api/services';
import { BUSINESS_CATEGORIES, type Business, type BusinessCategory } from '../api/types';
import { useI18n } from '../i18n/I18nContext';
import { useConfirm } from './confirm';
import { useToast } from './toast';
import { Alert, Button, Card, Field, Select } from './ui';

/** Edición de los datos del negocio y zona de peligro para eliminarlo. */
export function BusinessSettings({
  business,
  onSaved,
  onClose,
}: {
  business: Business;
  onSaved: (b: Business) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: business.name, category: business.category, city: business.city ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();
  const navigate = useNavigate();
  const i18n = useI18n();
  const { t } = i18n;

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.businesses.update(business.id, {
        name: form.name,
        category: form.category,
        city: form.city.trim() || null,
      });
      onSaved(updated);
      toast.success(t('settings.saved'));
      onClose();
    } catch (err) {
      setError(i18n.errorMessage(err, 'settings.saveError'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: t('settings.confirmTitle', { name: business.name }),
      message: t('settings.confirmText'),
      confirmLabel: t('settings.delete'),
      danger: true,
      requireText: business.name,
    });
    if (!ok) return;
    try {
      await api.businesses.remove(business.id);
      toast.success(t('settings.deleted', { name: business.name }));
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(i18n.errorMessage(err, 'settings.deleteError'));
    }
  }

  return (
    <Card title={t('settings.title')} className="print:hidden">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
        <Field
          label={t('common.name')}
          required
          minLength={2}
          maxLength={120}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Select
          label={t('common.category')}
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as BusinessCategory })}
        >
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`category.${c}`)}
            </option>
          ))}
        </Select>
        <Field label={t('common.city')} maxLength={80} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        {error && (
          <div className="sm:col-span-3">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 sm:col-span-3">
          <Button type="button" variant="danger" icon="alert" onClick={remove}>
            {t('settings.delete')}
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={saving} icon="check">
              {t('common.save')}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
