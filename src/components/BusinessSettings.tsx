import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '../api/http';
import { api } from '../api/services';
import { BUSINESS_CATEGORIES, type Business, type BusinessCategory } from '../api/types';
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
      toast.success('Datos del negocio actualizados.');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `¿Eliminar «${business.name}»?`,
      message: 'Se borrarán para siempre todas sus reseñas, análisis y recomendaciones. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar negocio',
      danger: true,
      requireText: business.name,
    });
    if (!ok) return;
    try {
      await api.businesses.remove(business.id);
      toast.success(`«${business.name}» fue eliminado.`);
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar');
    }
  }

  return (
    <Card title="Datos del negocio" icon="store" className="print:hidden">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Nombre"
          required
          minLength={2}
          maxLength={120}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Select
          label="Categoría"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as BusinessCategory })}
        >
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Field label="Ciudad" maxLength={80} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        {error && (
          <div className="sm:col-span-3">
            <Alert>{error}</Alert>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 sm:col-span-3">
          <Button type="button" variant="danger" icon="alert" onClick={remove}>
            Eliminar negocio
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} icon="check">
              Guardar cambios
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
