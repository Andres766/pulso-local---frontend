import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../api/http';
import { en, es, type MessageKey } from './messages';

export type Lang = 'es' | 'en';
type Vars = Record<string, string | number>;

const STORAGE_KEY = 'pulso-lang';
const DICTIONARIES: Record<Lang, Record<MessageKey, string>> = { es, en };
const LOCALES: Record<Lang, string> = { es: 'es-CO', en: 'en-US' };

/** Idioma guardado en este navegador. Por defecto español: el producto es para negocios de Pasto. */
function readLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

/** Marca el idioma en <html lang>: lo usan los lectores de pantalla y el corrector del navegador. */
export function applyLang(lang: Lang = readLang()): void {
  document.documentElement.lang = LOCALES[lang];
}

export interface I18n {
  lang: Lang;
  /** Etiqueta BCP 47 para Intl (fechas, números, tiempos relativos). */
  locale: string;
  setLang(lang: Lang): void;
  /** Texto traducido con sus variables: t('kpi.topics', { count: 7 }). */
  t(key: MessageKey, vars?: Vars): string;
  /** Singular o plural según `count`: plural('import.done', 3) usa 'import.done.other'. */
  plural(base: PluralBase, count: number, vars?: Vars): string;
  /** Número con los separadores del idioma (12,5 en español, 12.5 en inglés). */
  number(n: number, maxDecimals?: number): string;
  /** Porcentaje con la convención del idioma: "12,5 %" en español, "12.5%" en inglés. */
  percent(n: number, maxDecimals?: number): string;
  /** Fecha y hora cortas, en el formato del idioma. */
  dateTime(iso: string | Date, style?: 'medium' | 'long'): string;
  /** Solo la fecha. */
  date(iso: string | Date): string;
  /** Mensaje de un error de la API: en inglés se traducen los códigos conocidos. */
  errorMessage(err: unknown, fallback: MessageKey): string;
}

/** Claves que tienen variante .one y .other. */
type PluralBase = MessageKey extends infer K ? (K extends `${infer B}.one` ? B : never) : never;

const interpolate = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match)) : text;

function buildI18n(lang: Lang, setLang: (lang: Lang) => void): I18n {
  const dict = DICTIONARIES[lang];
  const locale = LOCALES[lang];
  const t = (key: MessageKey, vars?: Vars) => interpolate(dict[key], vars);
  const number = (n: number, maxDecimals = 1) => n.toLocaleString(locale, { maximumFractionDigits: maxDecimals });
  return {
    lang,
    locale,
    setLang,
    t,
    plural: (base, count, vars) => t(`${base}.${count === 1 ? 'one' : 'other'}` as MessageKey, { count: number(count, 0), ...vars }),
    number,
    percent: (n, maxDecimals = 1) => (lang === 'en' ? `${number(n, maxDecimals)}%` : `${number(n, maxDecimals)} %`),
    dateTime: (iso, style = 'medium') => new Date(iso).toLocaleString(locale, { dateStyle: style, timeStyle: 'short' }),
    date: (iso) => new Date(iso).toLocaleDateString(locale),
    errorMessage: (err, fallback) => {
      if (!(err instanceof ApiError)) return t(fallback);
      if (lang === 'es') return err.message || t(fallback);
      // El servidor responde en español: en inglés se traducen los códigos conocidos.
      const key = `apiError.${err.code}` as MessageKey;
      return key in dict ? dict[key] : err.message || t(fallback);
    },
  };
}

/** Sin proveedor (p. ej. en pruebas de un componente suelto) la interfaz queda en español. */
const I18nContext = createContext<I18n>(buildI18n('es', () => undefined));

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);

  useEffect(() => applyLang(lang), [lang]);

  const setLang = useCallback((next: Lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // almacenamiento no disponible: el idioma dura solo esta sesión
    }
    setLangState(next);
  }, []);

  const value = useMemo(() => buildI18n(lang, setLang), [lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  return useContext(I18nContext);
}

export { I18nContext };
