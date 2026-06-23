import WebSocket from 'ws';
import { BrowserWindow } from 'electron';
import { ClientManager } from './client-manager';

export const MessageCodes = {
  REGISTER: 100,
  GET_SOURCE_BEAN_LIST: 201,
  GET_SOURCE_BEAN_LIST_RESULT: 202,
  GET_HOME_CONTENT: 203,
  GET_HOME_CONTENT_RESULT: 204,
  GET_CATEGORY_CONTENT: 205,
  GET_CATEGORY_CONTENT_RESULT: 206,
  GET_DETAIL_CONTENT: 207,
  GET_DETAIL_CONTENT_RESULT: 208,
  GET_PLAYER_CONTENT: 209,
  GET_PLAYER_CONTENT_RESULT: 210,
  GET_PLAY_HISTORY: 211,
  GET_PLAY_HISTORY_RESULT: 212,
  GET_SEARCH_CONTENT: 213,
  GET_SEARCH_CONTENT_RESULT: 214,
  SAVE_PLAY_HISTORY: 215,
  DELETE_PLAY_HISTORY: 217,
  DELETE_PLAY_HISTORY_RESULT: 218,
  GET_MOVIE_COLLECTION: 219,
  GET_MOVIE_COLLECTION_RESULT: 220,
  SAVE_MOVIE_COLLECTION: 221,
  SAVE_MOVIE_COLLECTION_RESULT: 222,
  DELETE_MOVIE_COLLECTION: 223,
  DELETE_MOVIE_COLLECTION_RESULT: 224,
  GET_ONE_PLAY_HISTORY: 225,
  GET_ONE_PLAY_HISTORY_RESULT: 226,
  GET_MOVIE_COLLECTED_STATUS: 227,
  GET_MOVIE_COLLECTED_STATUS_RESULT: 228,
  GET_LIVES: 229,
  GET_LIVES_RESULT: 230,
} as const;

interface WsMessage {
  code: number;
  data: any;
  topicFlag?: boolean;
  topicId?: string;
}

export class MessageDispatcher {
  private clientManager: ClientManager;
  private mainWindow: BrowserWindow;

  constructor(clientManager: ClientManager, mainWindow: BrowserWindow) {
    this.clientManager = clientManager;
    this.mainWindow = mainWindow;
  }

  dispatch(message: WsMessage, ws: WebSocket, mainWindow: BrowserWindow) {
    console.log('Received message:', message);

    switch (message.code) {
      case MessageCodes.REGISTER:
        this.handleRegister(message, ws);
        break;
      case MessageCodes.GET_SOURCE_BEAN_LIST_RESULT:
      case MessageCodes.GET_HOME_CONTENT_RESULT:
      case MessageCodes.GET_CATEGORY_CONTENT_RESULT:
      case MessageCodes.GET_DETAIL_CONTENT_RESULT:
      case MessageCodes.GET_PLAYER_CONTENT_RESULT:
      case MessageCodes.GET_SEARCH_CONTENT_RESULT:
      case MessageCodes.GET_PLAY_HISTORY_RESULT:
      case MessageCodes.GET_ONE_PLAY_HISTORY_RESULT:
      case MessageCodes.GET_LIVES_RESULT:
        this.handleTopicResponse(message, mainWindow);
        break;
      default:
        console.log('Unknown message code:', message.code);
    }
  }

  private handleRegister(message: WsMessage, ws: WebSocket) {
    const data = message.data;
    if (!data || !data.clientId) {
      ws.close();
      return;
    }

    const client = this.clientManager.register(data.clientId, data.clientName || 'Unknown', ws);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('client-connected', {
        id: client.id,
        name: client.name,
      });
    }

    console.log(`Client registered: ${client.name}`);
  }

  private handleTopicResponse(message: WsMessage, mainWindow: BrowserWindow) {
    if (message.topicId && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('ws-response', {
        topicId: message.topicId,
        code: message.code,
        data: message.data,
      });
    }
  }
}
