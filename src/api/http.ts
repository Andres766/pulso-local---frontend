/** Error tipado de la API: el resto de la app nunca inspecciona respuestas crudas. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: { field: string; message: string }[] = [],
  ) {
    super(message);
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

type Json = Record<string, unknown> | unknown[];

/**
 * Cliente HTTP único (patrón Facade sobre fetch):
 *  - envía la cookie de sesión (credentials: 'same-origin'; el token nunca toca JavaScript),
 *  - agrega el header anti-CSRF que exige el backend en peticiones que modifican estado,
 *  - normaliza los errores a ApiError.
 */
export class HttpClient {
  private static readonly CSRF_HEADER = { 'X-Requested-With': 'PulsoLocal' };

  constructor(private readonly baseUrl = '/api') {}

  get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
    const qs = query
      ? new URLSearchParams(
          Object.entries(query).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '').map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return this.request<T>('GET', qs ? `${path}?${qs}` : path);
  }

  post<T>(path: string, body?: Json | FormData): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  private async request<T>(method: string, path: string, body?: Json | FormData): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json', ...HttpClient.CSRF_HEADER };
    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body; // el navegador pone el boundary del multipart
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { method, headers, body: payload, credentials: 'same-origin' });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR', 'No se pudo conectar con el servidor');
    }

    if (response.status === 204) return undefined as T;
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const err = data?.error;
      throw new ApiError(response.status, err?.code ?? 'UNKNOWN', err?.message ?? 'Error inesperado', err?.details);
    }
    return data as T;
  }
}

export const http = new HttpClient();
