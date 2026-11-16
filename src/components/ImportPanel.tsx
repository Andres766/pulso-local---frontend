import { useRef, useState } from 'react';
import { api } from '../api/services';
import type { ImportSummary } from '../api/types';
import { saveBlob } from '../hooks/exporting';
import { useI18n } from '../i18n/I18nContext';
import { buildCsvTemplate } from './csvTemplate';
import { Icon } from './icons';
import { useToast } from './toast';
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
  const toast = useToast();
  const i18n = useI18n();
  const { t } = i18n;

  async function submit() {
    setError(null);
    setSummary(null);
    // Validación temprana en el cliente (comodidad); el servidor vuelve a validar todo.
    if (tab === 'csv') {
      if (!file) return setError(t('import.pickFile'));
      if (file.size > MAX_FILE_BYTES) return setError(t('import.tooBig'));
    } else if (text.trim().length < 3) {
      return setError(t('import.pasteOne'));
    }

    setBusy(true);
    try {
      const result = tab === 'csv' ? await api.reviews.uploadCsv(businessId, file!) : await api.reviews.paste(businessId, text);
      setSummary(result);
      setText('');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      toast.success(i18n.plural('import.done', result.imported));
      onImported();
    } catch (err) {
      setError(i18n.errorMessage(err, 'import.error'));
    } finally {
      setBusy(false);
    }
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${active ? 'bg-card text-ink ring-1 ring-line' : 'text-ink-2 hover:text-ink'}`;

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg bg-raised p-1" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'csv'} className={tabClass(tab === 'csv')} onClick={() => setTab('csv')}>
          {t('import.csvTab')}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'text'} className={tabClass(tab === 'text')} onClick={() => setTab('text')}>
          {t('import.textTab')}
        </button>
      </div>

      {tab === 'csv' ? (
        <div className="space-y-2">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-ink-2 file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink"
          />
          <p className="text-xs text-ink-3">{t('import.columns')}</p>
          <button
            type="button"
            onClick={() => saveBlob(buildCsvTemplate(i18n.lang), t('import.templateFile'))}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
          >
            <Icon name="download" className="h-3.5 w-3.5" />
            {t('import.template')}
          </button>
        </div>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          maxLength={200_000}
          placeholder={t('import.placeholder')}
          className="w-full rounded-lg border border-line bg-card p-3 text-sm text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none"
        />
      )}

      <Button onClick={submit} loading={busy}>
        {t('import.submit')}
      </Button>

      {error && <Alert>{error}</Alert>}
      {summary && (
        <Alert tone="success">
          {t('import.summary', { imported: summary.imported, received: summary.received })}
          {summary.duplicates > 0 && t('import.duplicates', { count: summary.duplicates })}
          {summary.rejected.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs text-ink-2">
              {summary.rejected.slice(0, 5).map((r) => (
                <li key={r.row}>{t('import.row', { row: r.row, reason: r.reason })}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
    </div>
  );
}
