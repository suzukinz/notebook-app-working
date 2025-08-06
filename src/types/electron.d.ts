// Electron API型定義
export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  
  showSaveDialog: (options: any) => Promise<any>;
  showOpenDialog: (options: any) => Promise<any>;
  
  onMenuNewWorkspace: (callback: () => void) => () => void;
  onMenuExportData: (callback: () => void) => () => void;
  onMenuImportData: (callback: () => void) => () => void;
  
  platform: string;
  
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
}


export {};