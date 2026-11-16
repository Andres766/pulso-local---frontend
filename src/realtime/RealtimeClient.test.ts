import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeClient, type RealtimeStatus, type SocketLike } from './RealtimeClient';

/** Doble del WebSocket del navegador: registra lo enviado y deja simular al servidor. */
class FakeSocket implements SocketLike {
  readyState = 0;
  sent: { type: string; businessId?: string }[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {}

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
    this.readyState = 3;
    this.onclose?.();
  }
  /** El servidor acepta la conexión y anuncia que está listo. */
  accept() {
    this.readyState = 1;
    this.onopen?.();
    this.serverSends({ type: 'ready' });
  }
  serverSends(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  /** Se cae la red. */
  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
}

const BUSINESS = '7f1c2d3e-0000-4000-8000-000000000001';
const run = (status: string) => ({ id: 'r1', status, createdAt: '2026-11-15T00:00:00Z' });

describe('RealtimeClient', () => {
  let sockets: FakeSocket[];
  let client: RealtimeClient;
  let statuses: RealtimeStatus[];
  const flush = () => vi.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    statuses = [];
    client = new RealtimeClient(
      async () => ({ ticket: 'tk', url: null }),
      (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
      () => ({ protocol: 'https:', host: 'pulso.example' }),
    );
    client.onStatus((s) => statuses.push(s));
  });

  afterEach(() => {
    client.disconnect();
    vi.useRealTimers();
  });

  it('abre una sola conexión con el ticket, se suscribe al estar lista y entrega los eventos', async () => {
    const received: string[] = [];
    client.subscribe(BUSINESS, (m) => received.push(m.run.status));
    client.subscribe(BUSINESS, (m) => received.push(`otra pestaña: ${m.run.status}`));
    await flush();

    expect(sockets).toHaveLength(1);
    expect(sockets[0]!.url).toBe('wss://pulso.example/api/ws?ticket=tk');
    sockets[0]!.accept();
    expect(client.currentStatus).toBe('live');
    expect(sockets[0]!.sent).toEqual([{ type: 'subscribe', businessId: BUSINESS }]);

    sockets[0]!.serverSends({ type: 'analysis', businessId: BUSINESS, run: run('running') });
    sockets[0]!.serverSends({ type: 'analysis', businessId: 'otro-negocio', run: run('running') });
    expect(received).toEqual(['running', 'otra pestaña: running']);
  });

  it('si se cae la conexión, reintenta con espera creciente y vuelve a suscribir', async () => {
    client.subscribe(BUSINESS, () => undefined);
    await flush();
    sockets[0]!.accept();

    sockets[0]!.drop();
    expect(client.currentStatus).toBe('offline');
    await vi.advanceTimersByTimeAsync(500);
    expect(sockets).toHaveLength(1); // aún no: la primera espera es de ~1 s
    await vi.advanceTimersByTimeAsync(1000);
    expect(sockets).toHaveLength(2);

    sockets[1]!.accept();
    expect(client.currentStatus).toBe('live');
    expect(sockets[1]!.sent).toEqual([{ type: 'subscribe', businessId: BUSINESS }]);
    expect(statuses).toEqual(['connecting', 'live', 'offline', 'connecting', 'live']);
  });

  it('al dejar de haber suscriptores se desuscribe y luego cierra la conexión', async () => {
    const stop = client.subscribe(BUSINESS, () => undefined);
    await flush();
    sockets[0]!.accept();

    stop();
    expect(sockets[0]!.sent.at(-1)).toEqual({ type: 'unsubscribe', businessId: BUSINESS });
    await vi.advanceTimersByTimeAsync(5000);
    expect(sockets[0]!.closed).toBe(true);
    expect(client.currentStatus).toBe('idle');
  });

  it('si no consigue el ticket (servidor dormido) queda en respaldo y reintenta', async () => {
    let fail = true;
    client = new RealtimeClient(
      async () => {
        if (fail) throw new Error('503');
        return { ticket: 'tk', url: 'wss://api.example/api/ws' };
      },
      (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
    );
    client.subscribe(BUSINESS, () => undefined);
    await flush();
    expect(client.currentStatus).toBe('offline');
    expect(sockets).toHaveLength(0);

    fail = false;
    await vi.advanceTimersByTimeAsync(1300);
    expect(sockets[0]!.url).toBe('wss://api.example/api/ws?ticket=tk');
  });
});
