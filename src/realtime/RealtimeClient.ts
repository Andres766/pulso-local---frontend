import type { AnalysisRun } from '../api/types';

export type RealtimeStatus = 'idle' | 'connecting' | 'live' | 'offline';

export interface AnalysisMessage {
  type: 'analysis';
  businessId: string;
  run: AnalysisRun;
}

type Handler = (message: AnalysisMessage) => void;
type StatusListener = (status: RealtimeStatus) => void;

export interface Ticket {
  ticket: string;
  /** URL del WebSocket; null = mismo origen (proxy de Vite en desarrollo, nginx en Docker). */
  url: string | null;
}

/** Lo mínimo del WebSocket del navegador que se usa (permite probarlo con un doble). */
export interface SocketLike {
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(code?: number): void;
}

const OPEN = 1;
const MAX_BACKOFF_MS = 30_000;
/** Al dejar de haber suscriptores (cambio de página) se espera un poco antes de cerrar. */
const IDLE_CLOSE_MS = 5_000;

/**
 * Una sola conexión WebSocket por pestaña, compartida por todas las pantallas. Cada pantalla se
 * suscribe a los negocios que muestra; si la conexión se cae, se reconecta con espera exponencial
 * (1 s, 2 s, 4 s… hasta 30 s, con algo de azar para que miles de pestañas no vuelvan a la vez) y
 * al volver re-suscribe todo. Mientras no esté "live", las pantallas usan el polling de respaldo.
 */
export class RealtimeClient {
  private socket: SocketLike | null = null;
  private status: RealtimeStatus = 'idle';
  private readonly handlers = new Map<string, Set<Handler>>();
  private readonly statusListeners = new Set<StatusListener>();
  private attempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly fetchTicket: () => Promise<Ticket>,
    private readonly createSocket: (url: string) => SocketLike = (url) => new WebSocket(url) as unknown as SocketLike,
    private readonly origin: () => { protocol: string; host: string } = () => window.location,
  ) {}

  get currentStatus(): RealtimeStatus {
    return this.status;
  }

  /** Escucha los eventos de análisis de un negocio. Devuelve la función para dejar de escuchar. */
  subscribe(businessId: string, handler: Handler): () => void {
    let set = this.handlers.get(businessId);
    if (!set) {
      set = new Set();
      this.handlers.set(businessId, set);
      this.sendIfOpen({ type: 'subscribe', businessId });
    }
    set.add(handler);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
    // Una sola conexión: no se abre otra si ya hay una, una en camino o un reintento programado.
    if (!this.socket && !this.reconnectTimer && this.status !== 'connecting') void this.connect();

    return () => {
      const current = this.handlers.get(businessId);
      current?.delete(handler);
      if (current?.size === 0) {
        this.handlers.delete(businessId);
        this.sendIfOpen({ type: 'unsubscribe', businessId });
      }
      if (this.handlers.size === 0) this.idleTimer = setTimeout(() => this.disconnect(), IDLE_CLOSE_MS);
    };
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /** Cierra la conexión y cancela reconexiones (al cerrar sesión). */
  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      socket.close(1000);
    }
    this.setStatus('idle');
  }

  /** Reintenta ya (por ejemplo, al volver la conexión a internet). */
  retryNow(): void {
    if (this.status !== 'offline' || this.handlers.size === 0) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.attempts = 0;
    void this.connect();
  }

  private async connect(): Promise<void> {
    this.setStatus('connecting');
    let ticket: Ticket;
    try {
      ticket = await this.fetchTicket();
    } catch {
      this.scheduleReconnect();
      return;
    }
    if (this.handlers.size === 0) {
      this.setStatus('idle');
      return;
    }

    const { protocol, host } = this.origin();
    const base = ticket.url ?? `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/api/ws`;
    const socket = this.createSocket(`${base}?ticket=${encodeURIComponent(ticket.ticket)}`);
    this.socket = socket;

    socket.onmessage = (event) => this.onMessage(event.data);
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.scheduleReconnect();
    };
    socket.onerror = () => socket.close();
  }

  private onMessage(data: unknown): void {
    let message: { type?: string; businessId?: string };
    try {
      message = JSON.parse(String(data));
    } catch {
      return;
    }
    if (message.type === 'ready') {
      // Conexión lista: se (re)suscriben todos los negocios que las pantallas están mirando.
      this.attempts = 0;
      for (const businessId of this.handlers.keys()) this.sendIfOpen({ type: 'subscribe', businessId });
      this.setStatus('live');
      return;
    }
    if (message.type === 'analysis' && message.businessId) {
      for (const handler of this.handlers.get(message.businessId) ?? []) handler(message as AnalysisMessage);
    }
  }

  private scheduleReconnect(): void {
    if (this.handlers.size === 0) {
      this.setStatus('idle');
      return;
    }
    this.setStatus('offline');
    const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** this.attempts) * (0.8 + Math.random() * 0.4);
    this.attempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private sendIfOpen(message: object): void {
    if (this.socket?.readyState === OPEN) this.socket.send(JSON.stringify(message));
  }

  private setStatus(status: RealtimeStatus): void {
    if (status === this.status) return;
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }
}
