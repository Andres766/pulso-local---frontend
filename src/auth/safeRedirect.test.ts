import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safeRedirect';

describe('safeRedirect (prevención de open redirect)', () => {
  it('acepta rutas internas', () => {
    expect(safeRedirect('/negocios/abc')).toBe('/negocios/abc');
    expect(safeRedirect('/cuenta?tab=seguridad')).toBe('/cuenta?tab=seguridad');
  });

  it.each([
    ['//evil.com', 'URL relativa al protocolo (otro dominio)'],
    ['/\\evil.com', 'barra invertida: el navegador la trata como //'],
    ['https://evil.com', 'URL absoluta'],
    ['javascript:alert(1)', 'esquema javascript'],
    ['negocios', 'ruta sin barra inicial'],
    ['/ok\n/evil', 'caracteres de control'],
    [42, 'valor que no es texto'],
    [undefined, 'sin destino'],
  ])('rechaza %j (%s)', (value, _reason) => {
    expect(safeRedirect(value)).toBe('/');
  });
});
