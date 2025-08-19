const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const os = require('os');
// const isDev = require('electron-is-dev');
const isDev = !app.isPackaged;

let mainWindow;
let syncServer;
let wsServer;
const SYNC_PORT = 3001;
const connectedDevices = new Map();

function createWindow() {
  console.log('Creating window...');
  // メインウィンドウを作成
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build', 'favicon.ico'),
    titleBarStyle: 'default',
    show: false
  });

  // React アプリケーションを読み込む
  const startUrl = `file://${path.join(__dirname, 'build/index.html')}`;
  
  console.log('Loading URL:', startUrl);
  mainWindow.loadURL(startUrl).catch(err => {
    console.error('Failed to load URL:', err);
  });

  // ウィンドウが準備完了したら表示
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    mainWindow.show();
    
    // 開発モードでは開発者ツールを開く
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // エラーハンドリングを追加
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
  });

  // ウィンドウが閉じられたときの処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 外部リンクをデフォルトブラウザで開く
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// メニューバーの設定
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Workspace',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-workspace');
          }
        },
        {
          label: 'Export Data',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-data');
          }
        },
        {
          label: 'Import Data',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu-import-data');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About NoteSpace',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About NoteSpace',
              message: 'NoteSpace v1.0.0',
              detail: '階層構造でノートを管理できるアプリケーション\n\nBuilt with React, TypeScript, and Electron'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 自動同期サーバーの作成
function createSyncServer() {
  const expressApp = express();
  expressApp.use(cors());
  expressApp.use(express.json({ limit: '50mb' }));

  // デバイス情報を取得するためのユニークIDを生成
  const deviceId = require('crypto').randomBytes(8).toString('hex');
  const deviceName = os.hostname();
  
  // デバイス発見エンドポイント
  expressApp.get('/discover', (req, res) => {
    if (mainWindow) {
      // レンダラープロセスからユーザー情報を取得
      mainWindow.webContents.send('sync-request-user-info');
      
      ipcMain.once('sync-user-info-response', (event, userInfo) => {
        res.json({
          deviceId,
          deviceName,
          appName: 'NoteSpace',
          version: app.getVersion(),
          port: SYNC_PORT,
          timestamp: Date.now(),
          // ユーザー認証情報を追加
          userId: userInfo?.userId,
          userName: userInfo?.userName,
          syncKey: userInfo?.syncKey
        });
      });
      
      // タイムアウト処理（3秒でレスポンス）
      setTimeout(() => {
        if (!res.headersSent) {
          res.json({
            deviceId,
            deviceName,
            appName: 'NoteSpace',
            version: app.getVersion(),
            port: SYNC_PORT,
            timestamp: Date.now()
          });
        }
      }, 3000);
    } else {
      res.json({
        deviceId,
        deviceName,
        appName: 'NoteSpace',
        version: app.getVersion(),
        port: SYNC_PORT,
        timestamp: Date.now()
      });
    }
  });

  // データ状態を取得
  expressApp.get('/api/state', (req, res) => {
    if (mainWindow) {
      mainWindow.webContents.send('sync-request-state');
      // レスポンスはIPCで処理
      ipcMain.once('sync-state-response', (event, state) => {
        res.json({
          success: true,
          data: state,
          timestamp: Date.now()
        });
      });
    } else {
      res.status(503).json({ success: false, error: 'App not ready' });
    }
  });

  // データを受信して適用
  expressApp.post('/api/sync', (req, res) => {
    const { data, timestamp } = req.body;
    
    if (mainWindow) {
      mainWindow.webContents.send('sync-receive-data', { data, timestamp });
      res.json({ success: true, applied: Date.now() });
    } else {
      res.status(503).json({ success: false, error: 'App not ready' });
    }
  });

  // ping エンドポイント（接続確認用）
  expressApp.get('/ping', (req, res) => {
    res.json({ 
      pong: true, 
      timestamp: Date.now(),
      deviceId,
      deviceName 
    });
  });

  // サーバーを起動
  try {
    syncServer = expressApp.listen(SYNC_PORT, '0.0.0.0', () => {
      console.log(`Sync server started on port ${SYNC_PORT}`);
      console.log(`Device ID: ${deviceId}, Name: ${deviceName}`);
      
      // レンダラープロセスに同期サーバーの開始を通知
      if (mainWindow) {
        mainWindow.webContents.send('sync-server-ready', {
          port: SYNC_PORT,
          deviceId,
          deviceName
        });
      }
    });

    // WebSocket サーバー（リアルタイム通信用）
    wsServer = new WebSocketServer({ port: SYNC_PORT + 1 });
    
    wsServer.on('connection', (ws, req) => {
      const clientIP = req.socket.remoteAddress;
      console.log(`WebSocket connection from ${clientIP}`);
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          // 他の接続されたクライアントにブロードキャスト
          wsServer.clients.forEach((client) => {
            if (client !== ws && client.readyState === ws.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
          
          // レンダラープロセスにメッセージを転送
          if (mainWindow) {
            mainWindow.webContents.send('sync-websocket-message', data);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket disconnected from ${clientIP}`);
      });
    });

  } catch (error) {
    console.error('Failed to start sync server:', error);
  }
}

// 同期サーバーを停止
function stopSyncServer() {
  if (syncServer) {
    syncServer.close();
    syncServer = null;
    console.log('Sync server stopped');
  }
  
  if (wsServer) {
    wsServer.close();
    wsServer = null;
    console.log('WebSocket server stopped');
  }
}

// アプリケーションの準備が完了したときの処理
app.whenReady().then(() => {
  console.log('App is ready');
  createWindow();
  createMenu();
  
  // 同期サーバーを開始
  setTimeout(() => {
    createSyncServer();
  }, 2000); // ウィンドウの準備完了を待つ

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(err => {
  console.error('App ready error:', err);
});

// すべてのウィンドウが閉じられたときの処理
app.on('window-all-closed', () => {
  stopSyncServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// 同期関連のIPC handlers
ipcMain.on('sync-state-response', (event, state) => {
  // Express API で処理されるため、ここでは何もしない
});

ipcMain.handle('get-sync-info', () => {
  return {
    port: SYNC_PORT,
    wsPort: SYNC_PORT + 1,
    isServerRunning: !!syncServer
  };
});

// セキュリティ強化
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});