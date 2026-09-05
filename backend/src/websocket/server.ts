import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { marketManager } from '../market/manager.ts';

interface ClientConnection {
  ws: WebSocket;
  isAlive: boolean;
  subscriptions: Set<string>;
  userId?: string;
}

export class MarketWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Set<ClientConnection>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  init(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/market',
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const client: ClientConnection = {
        ws,
        isAlive: true,
        subscriptions: new Set<string>(),
      };
      this.clients.add(client);

      // Send initial data status & replay state
      this.sendToClient(client, 'DATA_STATUS', marketManager.getDataStatus());
      this.sendToClient(client, 'REPLAY_STATUS', marketManager.getReplayProvider().getReplayState());

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('message', (message: WebSocket.Data) => {
        try {
          const parsed = JSON.parse(message.toString());
          this.handleClientMessage(client, parsed);
        } catch (err) {
          // invalid JSON ignored
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
      });

      ws.on('error', (err) => {
        console.warn('[WebSocket Client Error]', err.message);
        this.clients.delete(client);
      });
    });

    // Start heartbeat monitor
    this.heartbeatTimer = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          client.ws.terminate();
          this.clients.delete(client);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 15000);

    // Wire broadcast from MarketManager
    marketManager.setBroadcastCallback((event, data) => {
      this.broadcast(event, data);
    });

    console.log('[WebSocket] Server mounted on /ws/market');
  }

  private handleClientMessage(client: ClientConnection, msg: any) {
    const { type, data } = msg;
    switch (type) {
      case 'SUBSCRIBE':
        if (Array.isArray(data?.symbols)) {
          data.symbols.forEach((s: string) => client.subscriptions.add(s.toUpperCase()));
          marketManager.subscribe(data.symbols);
        }
        break;

      case 'UNSUBSCRIBE':
        if (Array.isArray(data?.symbols)) {
          data.symbols.forEach((s: string) => client.subscriptions.delete(s.toUpperCase()));
        }
        break;

      case 'PING':
        this.sendToClient(client, 'PONG', { timestamp: Date.now() });
        break;

      case 'SET_USER':
        if (data?.userId) {
          client.userId = data.userId;
        }
        break;
    }
  }

  broadcast(type: string, data: any): void {
    const payload = JSON.stringify({ type, data });
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Optional symbol filter for price updates
        if (type === 'PRICE_UPDATE' && data?.symbol) {
          if (client.subscriptions.size > 0 && !client.subscriptions.has(data.symbol.toUpperCase())) {
            return;
          }
        }
        client.ws.send(payload);
      }
    });
  }

  private sendToClient(client: ClientConnection, type: string, data: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type, data }));
    }
  }

  stop(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

export const marketWsServer = new MarketWebSocketServer();
