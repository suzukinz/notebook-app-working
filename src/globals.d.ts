export interface ElectronAPI {
  // アプリケーション情報
  getAppVersion: () => Promise<string>;
  
  // ファイルダイアログ
  showSaveDialog: (options: any) => Promise<any>;
  showOpenDialog: (options: any) => Promise<any>;
  
  // メニューイベント
  onMenuNewWorkspace: (callback: () => void) => () => void;
  onMenuExportData: (callback: () => void) => () => void;
  onMenuImportData: (callback: () => void) => () => void;
  
  // プラットフォーム情報
  platform: string;
  
  // ウィンドウ操作
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;

  // 同期機能
  getSyncInfo: () => Promise<{
    port: number;
    wsPort: number;
    isServerRunning: boolean;
  }>;
  
  // 同期イベント
  onSyncServerReady?: (callback: (info: any) => void) => () => void;
  onSyncRequestState?: (callback: () => void) => () => void;
  onSyncReceiveData?: (callback: (data: any) => void) => () => void;
  onSyncWebSocketMessage?: (callback: (data: any) => void) => () => void;
  onSyncRequestUserInfo?: (callback: () => void) => () => void;
  
  // 同期データ送信
  sendSyncStateResponse: (state: any) => void;
  sendSyncUserInfoResponse: (userInfo: any) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};