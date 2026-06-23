import WebSocket from 'ws';

export interface ClientInfo {
  id: string;
  name: string;
  ws: WebSocket;
  connectedAt: number;
}

export class ClientManager {
  private clients: Map<string, ClientInfo> = new Map();
  private currentClient: ClientInfo | null = null;

  register(id: string, name: string, ws: WebSocket): ClientInfo {
    const client: ClientInfo = {
      id,
      name,
      ws,
      connectedAt: Date.now(),
    };
    this.clients.set(id, client);
    this.currentClient = client;
    console.log(`Client registered: ${name} (${id})`);
    return client;
  }

  remove(id: string): ClientInfo | null {
    const client = this.clients.get(id);
    if (client) {
      this.clients.delete(id);
      if (this.currentClient?.id === id) {
        this.currentClient = null;
      }
    }
    return client || null;
  }

  removeByConnection(ws: WebSocket): ClientInfo | null {
    for (const [id, client] of this.clients.entries()) {
      if (client.ws === ws) {
        this.clients.delete(id);
        if (this.currentClient?.id === id) {
          this.currentClient = null;
        }
        return client;
      }
    }
    return null;
  }

  get(id: string): ClientInfo | undefined {
    return this.clients.get(id);
  }

  getCurrent(): ClientInfo | null {
    return this.currentClient;
  }

  getAll(): Array<{ id: string; name: string; connectedAt: number }> {
    return Array.from(this.clients.values()).map(({ ws, ...rest }) => rest);
  }

  clear() {
    this.clients.clear();
    this.currentClient = null;
  }
}
