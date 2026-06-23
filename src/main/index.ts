import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { WsServer } from './ws-server';
import { startProxyServer, stopProxyServer, createProxySession } from './proxy-server';

let mainWindow: BrowserWindow | null = null;
let wsServer: WsServer | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  function createTrayIcon() {
    const size = 16;
    const canvas = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <rect width="${size}" height="${size}" rx="3" fill="#667eea"/>
        <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
              font-family="Arial" font-size="10" font-weight="bold" fill="white">P</text>
      </svg>
    `;
    return nativeImage.createFromBuffer(
      Buffer.from(canvas.trim()),
      { width: size, height: size }
    );
  }

  function createTray() {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('PcBox');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show PcBox',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Quit PcBox',
        click: () => {
          forceQuit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }

  function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
      width: Math.min(1280, width - 100),
      height: Math.min(800, height - 100),
      minWidth: 900,
      minHeight: 600,
      title: 'PcBox',
      backgroundColor: '#0f0f0f',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    mainWindow.on('close', (e) => {
      if (tray && !isQuitting) {
        e.preventDefault();
        mainWindow!.hide();
      }
    });

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  function forceQuit() {
    isQuitting = true;
    if (mainWindow) {
      mainWindow.removeAllListeners('close');
      mainWindow.close();
    }
    wsServer?.stop();
    tray?.destroy();
    tray = null;
    app.quit();
  }

  app.whenReady().then(async () => {
    createWindow();
    createTray();
    wsServer = new WsServer(mainWindow!);

    try {
      await startProxyServer();
      console.log('[PcBox] Proxy server started');
    } catch (err) {
      console.error('[PcBox] Failed to start proxy server:', err);
    }

    app.on('activate', () => {
      if (mainWindow) {
        mainWindow.show();
      } else {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (isQuitting) {
      wsServer?.stop();
    }
  });

  ipcMain.handle('ws-server:start', async (_event, port: number) => {
    if (!mainWindow) return false;

    if (wsServer) {
      wsServer.stop();
    }

    wsServer = new WsServer(mainWindow);
    const success = await wsServer.start(port);
    return success;
  });

  ipcMain.handle('ws-server:stop', () => {
    wsServer?.stop();
    wsServer = null;
    return true;
  });

  ipcMain.handle('ws-server:status', () => {
    if (!wsServer) {
      return { running: false, port: 0 };
    }
    const status = wsServer.getStatus();
    return status;
  });

  ipcMain.handle('ws-server:get-local-ip', () => {
    return WsServer.getLocalIp();
  });

  ipcMain.handle('ws-server:get-clients', () => {
    return wsServer?.getClients() || [];
  });

  ipcMain.handle('ws-server:send-message', (_event, clientId: string, code: number, data: any) => {
    return wsServer?.sendMessage(clientId, code, data);
  });

  ipcMain.handle('proxy:create-session', (_event, url: string, headers: Record<string, string>) => {
    return createProxySession(url, headers);
  });

  ipcMain.handle('window:toggle-fullscreen', (_event, fullscreen?: boolean) => {
    if (!mainWindow) return false;
    const isFullScreen = fullscreen !== undefined ? fullscreen : !mainWindow.isFullScreen();
    mainWindow.setFullScreen(isFullScreen);
    return isFullScreen;
  });

  ipcMain.handle('window:is-fullscreen', () => {
    return mainWindow?.isFullScreen() || false;
  });

  ipcMain.handle('window:set-always-on-top', (_event, flag: boolean) => {
    if (!mainWindow) return false;
    mainWindow.setAlwaysOnTop(flag);
    return true;
  });

  ipcMain.handle('window:set-frame', (_event, frame: boolean) => {
    if (!mainWindow) return false;
    (mainWindow as any).setFrame(frame);
    return true;
  });

  ipcMain.handle('window:is-frameless', () => {
    return mainWindow ? !(mainWindow as any).isFrame() : false;
  });
}
