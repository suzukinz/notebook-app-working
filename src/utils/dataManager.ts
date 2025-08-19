// データのインポート・エクスポート機能
import { logger } from './logger';
import { Workspace, Notebook, Note, SubFolder, NotebookState } from '../types';

export interface ExportData {
  version: string;
  timestamp: string;
  workspaces: Workspace[];
  notebooks: Record<string, Notebook[]>;
  notesData: Record<string, Note[]>;
  subFoldersData: Record<string, SubFolder[]>;
  settings?: {
    theme?: string;
    accessibility?: any;
    pwa?: any;
  };
  metadata?: {
    exportType: 'full' | 'workspace' | 'settings-only';
    workspaceId?: string;
    includeSettings?: boolean;
  };
}

export interface ExportOptions {
  type?: 'full' | 'workspace' | 'settings-only';
  workspaceId?: string | undefined;
  includeSettings?: boolean;
  includeTheme?: boolean;
  includeAccessibility?: boolean;
  includePWASettings?: boolean;
}

export const exportData = (storeData: Partial<NotebookState>, options: ExportOptions = {}): string => {
  const {
    type = 'full',
    workspaceId,
    includeSettings = true,
    includeTheme = true,
    includeAccessibility = true,
    includePWASettings = false
  } = options;

  let exportData: ExportData;

  if (type === 'settings-only') {
    // 設定のみエクスポート
    exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      workspaces: [],
      notebooks: {},
      notesData: {},
      subFoldersData: {},
      metadata: {
        exportType: 'settings-only',
        includeSettings: true
      }
    };
  } else if (type === 'workspace' && workspaceId) {
    // 特定ワークスペースのみエクスポート
    const workspaces = (storeData.workspaces || []).filter(ws => ws.id === workspaceId);
    const notebooks = { [workspaceId]: storeData.notebooks?.[workspaceId] || [] };
    const workspaceNotebooks = storeData.notebooks?.[workspaceId] || [];
    
    const subFoldersData: Record<string, SubFolder[]> = {};
    const notesData: Record<string, Note[]> = {};
    
    workspaceNotebooks.forEach(notebook => {
      if (storeData.subFoldersData?.[notebook.id]) {
        subFoldersData[notebook.id] = storeData.subFoldersData[notebook.id]!;
        
        storeData.subFoldersData[notebook.id]!.forEach(subFolder => {
          if (storeData.notesData?.[subFolder.id]) {
            notesData[subFolder.id] = storeData.notesData[subFolder.id]!;
          }
        });
      }
    });

    exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      workspaces,
      notebooks,
      notesData,
      subFoldersData,
      metadata: {
        exportType: 'workspace',
        workspaceId,
        includeSettings
      }
    };
  } else {
    // 完全エクスポート
    exportData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      workspaces: storeData.workspaces || [],
      notebooks: storeData.notebooks || {},
      notesData: storeData.notesData || {},
      subFoldersData: storeData.subFoldersData || {},
      metadata: {
        exportType: 'full',
        includeSettings
      }
    };
  }

  // 設定を含める場合
  if (includeSettings) {
    const settings: any = {};
    
    if (includeTheme) {
      try {
        const theme = localStorage.getItem('theme');
        if (theme) settings.theme = theme;
      } catch (error) {
        console.warn('テーマ設定の読み込みに失敗:', error);
      }
    }
    
    if (includeAccessibility) {
      try {
        const accessibility = localStorage.getItem('notespace-accessibility-settings');
        if (accessibility) settings.accessibility = JSON.parse(accessibility);
      } catch (error) {
        console.warn('アクセシビリティ設定の読み込みに失敗:', error);
      }
    }
    
    if (includePWASettings) {
      try {
        const pwaSettings: any = {};
        const installDismissed = localStorage.getItem('pwa-install-dismissed');
        if (installDismissed) pwaSettings.installDismissed = installDismissed;
        
        if (Object.keys(pwaSettings).length > 0) {
          settings.pwa = pwaSettings;
        }
      } catch (error) {
        console.warn('PWA設定の読み込みに失敗:', error);
      }
    }
    
    if (Object.keys(settings).length > 0) {
      exportData.settings = settings;
    }
  }

  return JSON.stringify(exportData, null, 2);
};

export const downloadData = (data: string, filename?: string) => {
  if (!filename) {
    const timestamp = new Date().toISOString().split('T')[0];
    filename = `notespace-backup-${timestamp}.json`;
  }
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface ImportOptions {
  replaceExisting?: boolean;
  mergeWithExisting?: boolean;
  importSettings?: boolean;
  importTheme?: boolean;
  importAccessibility?: boolean;
  importPWASettings?: boolean;
}

export interface ImportResult {
  success: boolean;
  data?: ExportData;
  error?: string;
  warnings?: string[];
  stats?: {
    workspacesImported: number;
    notebooksImported: number;
    notesImported: number;
    settingsImported: string[];
  };
}

export const validateImportData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.version) {
    errors.push('バージョン情報が見つかりません');
  }
  
  if (!Array.isArray(data.workspaces)) {
    errors.push('ワークスペースデータが無効です');
  }
  
  if (typeof data.notebooks !== 'object' || data.notebooks === null) {
    errors.push('ノートブックデータが無効です');
  }
  
  if (typeof data.notesData !== 'object' || data.notesData === null) {
    errors.push('ノートデータが無効です');
  }
  
  if (typeof data.subFoldersData !== 'object' || data.subFoldersData === null) {
    errors.push('サブフォルダデータが無効です');
  }
  
  // データの整合性チェック
  if (errors.length === 0) {
    try {
      data.workspaces.forEach((workspace: any) => {
        if (!workspace.id || !workspace.name) {
          errors.push(`ワークスペース「${workspace.name || workspace.id}」のデータが不完全です`);
        }
        
        const notebooks = data.notebooks[workspace.id] || [];
        notebooks.forEach((notebook: any) => {
          if (!notebook.id || !notebook.name) {
            errors.push(`ノートブック「${notebook.name || notebook.id}」のデータが不完全です`);
          }
        });
      });
    } catch (error) {
      errors.push('データ構造の検証中にエラーが発生しました');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const importData = (jsonString: string, options: ImportOptions = {}): ImportResult => {
  const {
    importSettings = true,
    importTheme = true,
    importAccessibility = true,
    importPWASettings = false
  } = options;
  
  const warnings: string[] = [];
  const settingsImported: string[] = [];
  
  try {
    const data = JSON.parse(jsonString) as ExportData;
    
    // データの妥当性検証
    const validation = validateImportData(data);
    if (!validation.isValid) {
      return {
        success: false,
        error: `データ形式が無効です:\n${validation.errors.join('\n')}`,
        warnings
      };
    }
    
    // 設定のインポート
    if (data.settings && importSettings) {
      try {
        if (data.settings.theme && importTheme) {
          localStorage.setItem('theme', data.settings.theme);
          settingsImported.push('テーマ設定');
        }
        
        if (data.settings.accessibility && importAccessibility) {
          localStorage.setItem('notespace-accessibility-settings', JSON.stringify(data.settings.accessibility));
          settingsImported.push('アクセシビリティ設定');
        }
        
        if (data.settings.pwa && importPWASettings) {
          if (data.settings.pwa.installDismissed) {
            localStorage.setItem('pwa-install-dismissed', data.settings.pwa.installDismissed);
            settingsImported.push('PWA設定');
          }
        }
      } catch (error) {
        warnings.push('一部の設定のインポートに失敗しました');
      }
    }
    
    // 統計情報の計算
    const stats = {
      workspacesImported: data.workspaces.length,
      notebooksImported: Object.values(data.notebooks).flat().length,
      notesImported: Object.values(data.notesData).flat().length,
      settingsImported
    };
    
    return {
      success: true,
      data,
      warnings,
      stats
    };
    
  } catch (error) {
    logger.error('Failed to import data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'データの解析に失敗しました',
      warnings
    };
  }
};

export const uploadFile = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    
    input.click();
  });
};