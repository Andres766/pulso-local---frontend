import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '../api/http';
import { LanguageToggle } from '../components/LanguageToggle';
import { I18nProvider, useI18n } from './I18nContext';
import { en, es } from './messages';

function Probe() {
  const { t, plural, number, errorMessage } = useI18n();
  return (
    <div>
      <p data-testid="title">{t('businesses.title')}</p>
      <p data-testid="vars">{t('kpi.topics', { count: 7 })}</p>
      <p data-testid="plural">
        {plural('import.done', 1)} / {plural('import.done', 3)}
      </p>
      <p data-testid="number">{number(12.5)}</p>
      <p data-testid="error">{errorMessage(new ApiError(401, 'AUTHENTICATION_ERROR', 'Credenciales inválidas'), 'common.genericError')}</p>
      <LanguageToggle />
    </div>
  );
}

afterEach(() => localStorage.clear());

describe('i18n', () => {
  it('los dos diccionarios tienen las mismas claves y ningún texto vacío', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const dict of [es, en]) expect(Object.values(dict).every((text) => text.trim().length > 0)).toBe(true);
  });

  it('las variables de cada texto en inglés son las mismas que en español', () => {
    const vars = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');
    for (const key of Object.keys(es) as (keyof typeof es)[]) expect(vars(en[key]), key).toBe(vars(es[key]));
  });

  it('arranca en español, interpola variables y elige singular o plural', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('title')).toHaveTextContent('Mis negocios');
    expect(screen.getByTestId('vars')).toHaveTextContent('7 temas detectados');
    expect(screen.getByTestId('plural')).toHaveTextContent('1 reseña importada. / 3 reseñas importadas.');
    expect(screen.getByTestId('number')).toHaveTextContent('12,5');
    expect(screen.getByTestId('error')).toHaveTextContent('Credenciales inválidas');
    expect(document.documentElement.lang).toBe('es-CO');
  });

  it('al elegir inglés traduce la interfaz, los errores conocidos y recuerda la preferencia', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByRole('radio', { name: 'English' }));
    });
    expect(screen.getByTestId('title')).toHaveTextContent('My businesses');
    expect(screen.getByTestId('plural')).toHaveTextContent('1 review imported. / 3 reviews imported.');
    expect(screen.getByTestId('number')).toHaveTextContent('12.5');
    expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
    expect(document.documentElement.lang).toBe('en-US');
    expect(localStorage.getItem('pulso-lang')).toBe('en');
  });
});
