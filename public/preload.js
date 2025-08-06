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
  close: () => ipcRenderer.invoke('close-window')
});