import { type Lang, useI18n } from '../i18n/I18nContext';

const OPTIONS: { value: Lang; short: string }[] = [
  { value: 'es', short: 'ES' },
  { value: 'en', short: 'EN' },
];

/** Selector de idioma con radios nativos, igual que el selector de tema. */
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <fieldset className="inline-flex rounded-md border border-line bg-raised p-0.5">
      <legend className="sr-only">{t('lang.legend')}</legend>
      {OPTIONS.map((o) => (
        <label
          key={o.value}
          title={t(`lang.${o.value}`)}
          lang={o.value}
          className={`grid h-7 min-w-8 cursor-pointer place-items-center rounded px-1.5 text-xs font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
            lang === o.value ? 'bg-card text-ink ring-1 ring-line' : 'text-ink-3 hover:text-ink'
          }`}
        >
          <input
            type="radio"
            name="lang"
            value={o.value}
            checked={lang === o.value}
            onChange={() => setLang(o.value)}
            className="sr-only"
          />
          <span aria-hidden>{o.short}</span>
          <span className="sr-only">{t(`lang.${o.value}`)}</span>
        </label>
      ))}
    </fieldset>
  );
}
