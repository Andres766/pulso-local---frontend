import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ApiError } from '../api/http';
import { api } from '../api/services';
import { BUSINESS_CATEGORIES, type Business, type BusinessCategory } from '../api/types';
import { Icon } from '../components/icons';
import { Alert, Button, Card, Chip, EmptyState, Field, Select, Skeleton } from '../components/ui';

export const categoryLabel = (c: BusinessCategory) => BUSINESS_CATEGORIES.find((x) => x.value === c)?.label ?? c;

export function BusinessesPage() {
  const [items, setItems] = useState<Business[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; category: BusinessCategory; city: string }>({ name: '', category: 'restaurante', city: '' });
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.businesses
      .list()
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar'));

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
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-brand">Panel</p>
        <h1 className="mt-1 text-3xl font-extrabold text-ink">Mis negocios</h1>
        <p className="mt-1 text-ink-2">Elige un negocio para ver su pulso o registra uno nuevo.</p>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          {items === null ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon="store" title="Todavía no tienes negocios">
              Crea el primero con el formulario y luego carga sus reseñas.
            </EmptyState>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {items.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/negocios/${b.id}`}
                    className="group flex h-full flex-col rounded-2xl border border-line bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/50"
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft font-display text-lg font-extrabold text-brand">
                        {b.name.charAt(0).toUpperCase()}
                      </span>
                      <Icon name="chevronRight" className="h-5 w-5 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-brand" />
                    </div>
                    <p className="mt-4 font-display text-lg font-bold text-ink">{b.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Chip icon="tag">{categoryLabel(b.category)}</Chip>
                      {b.city && <Chip icon="pin">{b.city}</Chip>}
                    </div>
                    <p className="mt-auto pt-5 text-sm font-semibold text-brand">Ver dashboard</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Card title="Nuevo negocio" icon="plus" className="h-fit">
          <form onSubmit={onCreate} className="space-y-4">
            <Field label="Nombre" required minLength={2} maxLength={120} placeholder="Ej. Café Galeras" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Select label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as BusinessCategory })}>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
            <Field label="Ciudad (opcional)" maxLength={80} placeholder="Ej. Pasto" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Button type="submit" loading={saving} icon="plus" className="w-full">
              Crear negocio
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
