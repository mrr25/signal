type WebSocketEventHandler = (data: any) => void;

export class MarketWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners = new Map<string, Set<WebSocketEventHandler>>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private isExplicitlyClosed = false;
  private subscribedSymbols = new Set<string>();

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws/market`;
  }

  connect(): void {
    this.isExplicitlyClosed = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connection_status', { connected: true });

        // Resubscribe symbols
        if (this.subscribedSymbols.size > 0) {
          this.send('SUBSCRIBE', { symbols: Array.from(this.subscribedSymbols) });
        }

        // Setup ping
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data);
          this.emit(type, data);
        } catch (err) {
          // ignore malformed message
        }
      };

      this.ws.onclose = () => {
        this.emit('connection_status', { connected: false });
        this.stopPing();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS Client] Error occurred:', err);
      };
    } catch (err) {
      console.warn('[WS Client] Connection initiation error:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WS Client] Max reconnect attempts reached');
      return;
    }

    const backoff = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, backoff);
  }

  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('PING', {});
      }
    }, 20000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  send(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  subscribe(symbols: string[]): void {
    symbols.forEach((s) => this.subscribedSymbols.add(s.toUpperCase()));
    this.send('SUBSCRIBE', { symbols });
  }

  unsubscribe(symbols: string[]): void {
    symbols.forEach((s) => this.subscribedSymbols.delete(s.toUpperCase()));
    this.send('UNSUBSCRIBE', { symbols });
  }

  on(event: string, handler: WebSocketEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  private emit(event: string, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((h) => {
        try {
          h(data);
        } catch (e) {
          console.error('[WS handler error]', e);
        }
      });
    }
  }

  disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new MarketWebSocketClient();
