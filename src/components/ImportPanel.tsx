import { useRef, useState } from 'react';
import { ApiError } from '../api/http';
import { api } from '../api/services';
import type { ImportSummary } from '../api/types';
import { Alert, Button } from './ui';

const MAX_FILE_BYTES = 1024 * 1024;

export function ImportPanel({ businessId, onImported }: { businessId: string; onImported: () => void }) {
  const [tab, setTab] = useState<'csv' | 'text'>('csv');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function submit() {
    setError(null);
    setSummary(null);
    // Validación temprana en el cliente (comodidad); el servidor vuelve a validar todo.
    if (tab === 'csv') {
      if (!file) return setError('Selecciona un archivo .csv');
      if (file.size > MAX_FILE_BYTES) return setError('El archivo supera 1 MB');
    } else if (text.trim().length < 3) {
      return setError('Pega al menos una reseña');
    }

    setBusy(true);
    try {
      const result = tab === 'csv' ? await api.reviews.uploadCsv(businessId, file!) : await api.reviews.paste(businessId, text);
      setSummary(result);
      setText('');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo importar');
    } finally {
      setBusy(false);
    }
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${active ? 'bg-card text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`;

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg bg-surface p-1" role="tablist">
        <button role="tab" aria-selected={tab === 'csv'} className={tabClass(tab === 'csv')} onClick={() => setTab('csv')}>Archivo CSV</button>
        <button role="tab" aria-selected={tab === 'text'} className={tabClass(tab === 'text')} onClick={() => setTab('text')}>Pegar texto</button>
      </div>

      {tab === 'csv' ? (
        <div className="space-y-2">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink-2 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand"
          />
          <p className="text-xs text-ink-3">
            Columnas reconocidas: <code>comentario</code> (o texto, reseña), <code>calificacion</code> (1–5) y <code>fecha</code>. Separador coma o punto y coma. Máx. 1 MB.
          </p>
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          maxLength={200_000}
          placeholder={'Una reseña por línea, por ejemplo:\nEl café muy rico pero se demoraron mucho\nExcelente atención, volveré'}
          className="w-full rounded-lg border border-line bg-card p-3 text-sm text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
        />
      )}

      <Button onClick={submit} loading={busy}>Importar reseñas</Button>

      {error && <Alert>{error}</Alert>}
      {summary && (
        <Alert tone="success">
          Se importaron <strong>{summary.imported}</strong> de {summary.received} reseñas
          {summary.duplicates > 0 && ` · ${summary.duplicates} duplicadas omitidas`}
          {summary.rejected.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs text-ink-2">
              {summary.rejected.slice(0, 5).map((r) => (
                <li key={r.row}>Fila {r.row}: {r.reason}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
    </div>
  );
}
