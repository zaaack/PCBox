import WebSocket, { WebSocketServer as WSServer } from 'ws';
import { BrowserWindow } from 'electron';
import { ClientManager } from './client-manager';
import { MessageDispatcher } from './message-dispatcher';
import os from 'os';

export interface WsServerStatus {
  running: boolean;
  port: number;
}

export class WsServer {
  private server: WSServer | null = null;
  private clientManager: ClientManager;
  private messageDispatcher: MessageDispatcher;
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.clientManager = new ClientManager();
    this.messageDispatcher = new MessageDispatcher(this.clientManager, mainWindow);
  }

  start(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.server) {
        this.stop();
      }

      this.server = new WSServer({ port }, () => {
        console.log(`WebSocket server started on port ${port}`);
        resolve(true);
      });

      this.server.on('error', (err) => {
        console.error('WebSocket server error:', err);
        resolve(false);
      });

      this.server.on('connection', (ws: WebSocket) => {
        console.log('New WebSocket connection');
        this.handleConnection(ws);
      });
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
    this.clientManager.clear();
  }

  getStatus(): WsServerStatus {
    return {
      running: this.server !== null,
      port: 0,
    };
  }

  getClients() {
    return this.clientManager.getAll();
  }

  sendMessage(clientId: string, code: number, data: any) {
    const client = this.clientManager.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      const topicId = data?.topicId || null;
      const topicFlag = topicId !== null;
      const { topicId: _tid, ...restData } = data || {};
      const hasData = Object.keys(restData).length > 0;
      const message = JSON.stringify({ code, data: hasData ? restData : null, topicFlag, topicId });
      console.log('Sending message:', message);
      client.ws.send(message);
      return true;
    }
    return false;
  }

  private handleConnection(ws: WebSocket) {
    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.messageDispatcher.dispatch(message, ws, this.mainWindow);
      } catch (e) {
        console.error('Failed to parse message:', e);
        ws.close();
      }
    });

    ws.on('close', () => {
      this.clientManager.removeByConnection(ws);
      this.notifyMainWindow('client-disconnected', null);
    });

    ws.on('error', (err) => {
      console.error('WebSocket connection error:', err);
    });
  }

  private notifyMainWindow(event: string, data: any) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(event, data);
    }
  }

  static getLocalIp(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }
}
