import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, HttpClient } from './http';

const respond = (status: number, body?: unknown) =>
  vi.fn().mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

describe('HttpClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('envía el header anti-CSRF, la cookie (same-origin) y el cuerpo como JSON', async () => {
    const fetchMock = respond(201, { id: '1' });
    vi.stubGlobal('fetch', fetchMock);

    const result = await new HttpClient('/api').post<{ id: string }>('/businesses', { name: 'Café' });

    expect(result).toEqual({ id: '1' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/businesses');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', body: '{"name":"Café"}' });
    expect(init.headers).toMatchObject({ 'X-Requested-With': 'PulsoLocal', 'Content-Type': 'application/json' });
  });

  it('convierte las respuestas de error en ApiError con código, mensaje y detalles', async () => {
    vi.stubGlobal(
      'fetch',
      respond(400, { error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ field: 'name', message: 'Muy corto' }] } }),
    );
    const err = await new HttpClient().get('/x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: [{ field: 'name' }] });
  });

  it('reporta los fallos de red y las respuestas 204 sin cuerpo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(new HttpClient().get('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });

    vi.stubGlobal('fetch', respond(204));
    await expect(new HttpClient().delete('/x')).resolves.toBeUndefined();
  });

  it('arma la query string omitiendo los parámetros vacíos', async () => {
    const fetchMock = respond(200, {});
    vi.stubGlobal('fetch', fetchMock);
    await new HttpClient('/api').get('/reviews', { sentiment: 'negative', q: '', topic: undefined, limit: 10 });
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/reviews?sentiment=negative&limit=10');
  });
});
