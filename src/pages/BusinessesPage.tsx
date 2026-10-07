import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/http';
import { api } from '../api/services';
import { BUSINESS_CATEGORIES, type Business, type BusinessCategory } from '../api/types';
import { Alert, Button, Card, Field, Select, Spinner } from '../components/ui';

const categoryLabel = (c: BusinessCategory) => BUSINESS_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export function BusinessesPage() {
  const [items, setItems] = useState<Business[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; category: BusinessCategory; city: string }>({ name: '', category: 'restaurante', city: '' });
  const [saving, setSaving] = useState(false);

  const load = () => api.businesses.list().then(setItems).catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar'));
  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.businesses.create({ name: form.name, category: form.category, city: form.city || undefined });
      setForm({ ...form, name: '', city: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el negocio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mis negocios</h1>
        <p className="text-sm text-ink-2">Elige un negocio para ver su pulso o registra uno nuevo.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {items === null ? (
            <div className="py-10 text-center text-brand"><Spinner /></div>
          ) : items.length === 0 ? (
            <Card><p className="text-sm text-ink-2">Todavía no tienes negocios. Crea el primero con el formulario.</p></Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {items.map((b) => (
                <li key={b.id}>
                  <Link to={`/negocios/${b.id}`} className="block rounded-2xl border border-line bg-card p-5 transition hover:border-brand">
                    <p className="text-lg font-semibold">{b.name}</p>
                    <p className="mt-1 text-sm text-ink-2">
                      {categoryLabel(b.category)}
                      {b.city ? ` · ${b.city}` : ''}
                    </p>
                    <p className="mt-4 text-sm font-medium text-brand">Ver dashboard →</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card title="Nuevo negocio">
          <form onSubmit={onCreate} className="space-y-3">
            <Field label="Nombre" required minLength={2} maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as BusinessCategory })}>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
            <Field label="Ciudad (opcional)" maxLength={80} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Button type="submit" loading={saving} className="w-full">Crear negocio</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
