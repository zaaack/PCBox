import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  startWsServer: (port: number) => ipcRenderer.invoke('ws-server:start', port),
  stopWsServer: () => ipcRenderer.invoke('ws-server:stop'),
  getWsServerStatus: () => ipcRenderer.invoke('ws-server:status'),
  getLocalIp: () => ipcRenderer.invoke('ws-server:get-local-ip'),
  getClients: () => ipcRenderer.invoke('ws-server:get-clients'),
  sendMessage: (clientId: string, code: number, data: any) =>
    ipcRenderer.invoke('ws-server:send-message', clientId, code, data),

  createProxySession: (url: string, headers: Record<string, string>) =>
    ipcRenderer.invoke('proxy:create-session', url, headers),

  onClientConnected: (callback: (client: any) => void) => {
    ipcRenderer.on('client-connected', (_event, client) => callback(client));
  },
  onClientDisconnected: (callback: () => void) => {
    ipcRenderer.on('client-disconnected', () => callback());
  },
  onWsResponse: (callback: (response: any) => void) => {
    ipcRenderer.on('ws-response', (_event, response) => callback(response));
  },

  toggleFullscreen: (fullscreen?: boolean) => ipcRenderer.invoke('window:toggle-fullscreen', fullscreen),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('window:set-always-on-top', flag),
  setFrame: (frame: boolean) => ipcRenderer.invoke('window:set-frame', frame),
  isFrameless: () => ipcRenderer.invoke('window:is-frameless'),
  setMenuBarVisibility: (visible: boolean) => ipcRenderer.invoke('window:set-menu-bar-visibility', visible),
  isMenuBarVisible: () => ipcRenderer.invoke('window:is-menu-bar-visible'),

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
