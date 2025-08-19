const { contextBridge, ipcRenderer } = require('electron');

// セキュアなAPIをレンダラープロセスに公開
contextBridge.exposeInMainWorld('electronAPI', {
  // アプリケーション情報
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // ファイルダイアログ
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // メニューからのイベントリスナー
  onMenuNewWorkspace: (callback) => {
    ipcRenderer.on('menu-new-workspace', callback);
    return () => ipcRenderer.removeListener('menu-new-workspace', callback);
  },
  
  onMenuExportData: (callback) => {
    ipcRenderer.on('menu-export-data', callback);
    return () => ipcRenderer.removeListener('menu-export-data', callback);
  },
  
  onMenuImportData: (callback) => {
    ipcRenderer.on('menu-import-data', callback);
    return () => ipcRenderer.removeListener('menu-import-data', callback);
  },
  
  // プラットフォーム情報
  platform: process.platform,
  
  // ウィンドウ操作
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),

  // 同期機能
  getSyncInfo: () => ipcRenderer.invoke('get-sync-info'),
  
  // 同期イベント
  onSyncServerReady: (callback) => {
    ipcRenderer.on('sync-server-ready', callback);
    return () => ipcRenderer.removeListener('sync-server-ready', callback);
  },
  
  onSyncRequestState: (callback) => {
    ipcRenderer.on('sync-request-state', callback);
    return () => ipcRenderer.removeListener('sync-request-state', callback);
  },
  
  onSyncReceiveData: (callback) => {
    ipcRenderer.on('sync-receive-data', callback);
    return () => ipcRenderer.removeListener('sync-receive-data', callback);
  },
  
  onSyncWebSocketMessage: (callback) => {
    ipcRenderer.on('sync-websocket-message', callback);
    return () => ipcRenderer.removeListener('sync-websocket-message', callback);
  },

  onSyncRequestUserInfo: (callback) => {
    ipcRenderer.on('sync-request-user-info', callback);
    return () => ipcRenderer.removeListener('sync-request-user-info', callback);
  },
  
  // 同期データ送信
  sendSyncStateResponse: (state) => ipcRenderer.send('sync-state-response', state),
  sendSyncUserInfoResponse: (userInfo) => ipcRenderer.send('sync-user-info-response', userInfo)
});