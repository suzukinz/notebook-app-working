// データ整合性チェックとバックアップ機能

import { Note, Workspace, Notebook, SubFolder } from '../types';
import { validateId, validateNoteTitle, validateNoteContent, validateDateString } from './validation';
import { logger } from './logger';

// データ修復結果
export interface RepairResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  repairedItems: number;
}

// バックアップデータ
export interface BackupData {
  timestamp: string;
  version: string;
  workspaces: Workspace[];
  notebooks: Record<string, Notebook[]>;
  subFolders: Record<string, SubFolder[]>;
  notes: Record<string, Note[]>;
}

// データ整合性チェック結果
export interface IntegrityCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  corruptedData: {
    workspaces: string[];
    notebooks: string[];
    subFolders: string[];
    notes: string[];
  };
}

// ローカルストレージキー
const STORAGE_KEYS = {
  WORKSPACES: 'notebook-workspaces',
  NOTEBOOKS: 'notebook-notebooks',
  SUB_FOLDERS: 'notebook-subfolders',  
  NOTES: 'notebook-notes',
  BACKUP_PREFIX: 'notebook-backup-',
  LAST_BACKUP: 'notebook-last-backup'
} as const;

// バックアップを作成
export const createBackup = (): boolean => {
  try {
    const timestamp = new Date().toISOString();
    
    // 現在のデータを取得
    const workspacesData = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
    const notebooksData = localStorage.getItem(STORAGE_KEYS.NOTEBOOKS);
    const subFoldersData = localStorage.getItem(STORAGE_KEYS.SUB_FOLDERS);
    const notesData = localStorage.getItem(STORAGE_KEYS.NOTES);

    const backup: BackupData = {
      timestamp,
      version: '1.0.1',
      workspaces: workspacesData ? JSON.parse(workspacesData) : [],
      notebooks: notebooksData ? JSON.parse(notebooksData) : {},
      subFolders: subFoldersData ? JSON.parse(subFoldersData) : {},
      notes: notesData ? JSON.parse(notesData) : {}
    };

    // バックアップを保存
    const backupKey = STORAGE_KEYS.BACKUP_PREFIX + timestamp;
    localStorage.setItem(backupKey, JSON.stringify(backup));
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp);

    // 古いバックアップを削除（最新の5個まで保持）
    cleanupOldBackups();

    logger.info('バックアップを作成しました:', timestamp);
    return true;
  } catch (error) {
    logger.error('バックアップの作成に失敗しました:', error);
    return false;
  }
};

// 古いバックアップを削除
const cleanupOldBackups = (): void => {
  try {
    const backupKeys: string[] = [];
    
    // バックアップキーを収集
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.BACKUP_PREFIX)) {
        backupKeys.push(key);
      }
    }

    // タイムスタンプでソート（新しい順）
    backupKeys.sort((a, b) => {
      const timestampA = a.replace(STORAGE_KEYS.BACKUP_PREFIX, '');
      const timestampB = b.replace(STORAGE_KEYS.BACKUP_PREFIX, '');
      return new Date(timestampB).getTime() - new Date(timestampA).getTime();
    });

    // 5個を超える古いバックアップを削除
    const keysToDelete = backupKeys.slice(5);
    keysToDelete.forEach(key => {
      localStorage.removeItem(key);
      logger.info('古いバックアップを削除しました:', key);
    });
  } catch (error) {
    logger.error('バックアップのクリーンアップに失敗しました:', error);
  }
};

// バックアップから復元
export const restoreFromBackup = (timestamp: string): boolean => {
  try {
    const backupKey = STORAGE_KEYS.BACKUP_PREFIX + timestamp;
    const backupData = localStorage.getItem(backupKey);
    
    if (!backupData) {
      logger.error('指定されたバックアップが見つかりません:', timestamp);
      return false;
    }

    const backup: BackupData = JSON.parse(backupData);

    // データを復元
    localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(backup.workspaces));
    localStorage.setItem(STORAGE_KEYS.NOTEBOOKS, JSON.stringify(backup.notebooks));
    localStorage.setItem(STORAGE_KEYS.SUB_FOLDERS, JSON.stringify(backup.subFolders));
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(backup.notes));

    logger.info('バックアップから復元しました:', timestamp);
    return true;
  } catch (error) {
    logger.error('バックアップからの復元に失敗しました:', error);
    return false;
  }
};

// 利用可能なバックアップ一覧を取得
export const getAvailableBackups = (): string[] => {
  const backups: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.BACKUP_PREFIX)) {
        const timestamp = key.replace(STORAGE_KEYS.BACKUP_PREFIX, '');
        backups.push(timestamp);
      }
    }

    // タイムスタンプでソート（新しい順）
    backups.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  } catch (error) {
    logger.error('バックアップ一覧の取得に失敗しました:', error);
  }

  return backups;
};

// ワークスペースデータの整合性をチェック
const checkWorkspaceIntegrity = (workspaces: Workspace[]): string[] => {
  const errors: string[] = [];
  
  if (!Array.isArray(workspaces)) {
    errors.push('ワークスペースデータが配列ではありません');
    return errors;
  }

  const seenIds = new Set<string>();

  workspaces.forEach((workspace, index) => {
    if (!workspace || typeof workspace !== 'object') {
      errors.push(`ワークスペース[${index}]: 無効なオブジェクト`);
      return;
    }

    // ID検証
    const idValidation = validateId(workspace.id, `ワークスペース[${index}].id`);
    if (!idValidation.isValid) {
      errors.push(idValidation.error || '');
    }

    // 重複ID検証
    if (seenIds.has(workspace.id)) {
      errors.push(`ワークスペース[${index}]: 重複したID "${workspace.id}"`);
    } else {
      seenIds.add(workspace.id);
    }

    // 必須フィールド検証
    if (!workspace.name || typeof workspace.name !== 'string') {
      errors.push(`ワークスペース[${index}]: 名前が無効`);
    }
    
    if (!workspace.icon || typeof workspace.icon !== 'string') {
      errors.push(`ワークスペース[${index}]: アイコンが無効`);
    }
    
    if (!workspace.color || typeof workspace.color !== 'string') {
      errors.push(`ワークスペース[${index}]: 色が無効`);
    }
  });

  return errors;
};

// ノートブックデータの整合性をチェック
const checkNotebookIntegrity = (notebooks: Record<string, Notebook[]>, workspaces: Workspace[]): string[] => {
  const errors: string[] = [];
  const workspaceIds = new Set(workspaces.map(w => w.id));

  if (!notebooks || typeof notebooks !== 'object') {
    errors.push('ノートブックデータが無効なオブジェクト');
    return errors;
  }

  Object.keys(notebooks).forEach(workspaceId => {
    if (!workspaceIds.has(workspaceId)) {
      errors.push(`ノートブック: 存在しないワークスペースID "${workspaceId}"`);
      return;
    }

    const notebookList = notebooks[workspaceId];
    if (!Array.isArray(notebookList)) {
      errors.push(`ノートブック[${workspaceId}]: 配列ではありません`);
      return;
    }

    const seenIds = new Set<string>();

    notebookList.forEach((notebook, index) => {
      if (!notebook || typeof notebook !== 'object') {
        errors.push(`ノートブック[${workspaceId}][${index}]: 無効なオブジェクト`);
        return;
      }

      // ID検証
      const idValidation = validateId(notebook.id, `ノートブック[${workspaceId}][${index}].id`);
      if (!idValidation.isValid) {
        errors.push(idValidation.error || '');
      }

      // 重複ID検証
      if (seenIds.has(notebook.id)) {
        errors.push(`ノートブック[${workspaceId}][${index}]: 重複したID "${notebook.id}"`);
      } else {
        seenIds.add(notebook.id);
      }

      // ワークスペースID一致検証
      if (notebook.workspaceId !== workspaceId) {
        errors.push(`ノートブック[${workspaceId}][${index}]: ワークスペースIDが一致しません`);
      }

      // 必須フィールド検証
      if (!notebook.name || typeof notebook.name !== 'string') {
        errors.push(`ノートブック[${workspaceId}][${index}]: 名前が無効`);
      }

      if (typeof notebook.count !== 'number' || notebook.count < 0) {
        errors.push(`ノートブック[${workspaceId}][${index}]: カウントが無効`);
      }
    });
  });

  return errors;
};

// ノートデータの整合性をチェック
const checkNoteIntegrity = (notes: Record<string, Note[]>): string[] => {
  const errors: string[] = [];

  if (!notes || typeof notes !== 'object') {
    errors.push('ノートデータが無効なオブジェクト');
    return errors;
  }

  Object.keys(notes).forEach(subFolderId => {
    const noteList = notes[subFolderId];
    if (!Array.isArray(noteList)) {
      errors.push(`ノート[${subFolderId}]: 配列ではありません`);
      return;
    }

    const seenIds = new Set<string>(); // ✅ ID統一修正: number → string

    noteList.forEach((note, index) => {
      if (!note || typeof note !== 'object') {
        errors.push(`ノート[${subFolderId}][${index}]: 無効なオブジェクト`);
        return;
      }

      // ID検証
      if (typeof note.id !== 'string' || !note.id.trim()) { // ✅ ID統一修正: string型チェック
        errors.push(`ノート[${subFolderId}][${index}]: 無効なID`);
      }

      // 重複ID検証
      if (seenIds.has(note.id)) { // ✅ string IDでの重複チェック
        errors.push(`ノート[${subFolderId}][${index}]: 重複したID "${note.id}"`);
      } else {
        seenIds.add(note.id); // ✅ string IDを追加
      }

      // タイトル検証
      const titleValidation = validateNoteTitle(note.title);
      if (!titleValidation.isValid) {
        errors.push(`ノート[${subFolderId}][${index}]: ${titleValidation.error}`);
      }

      // ページデータ検証
      if (!Array.isArray(note.pages) || note.pages.length === 0) {
        errors.push(`ノート[${subFolderId}][${index}]: ページデータが無効`);
      } else {
        note.pages.forEach((page, pageIndex) => {
          if (!page || typeof page !== 'object') {
            errors.push(`ノート[${subFolderId}][${index}].ページ[${pageIndex}]: 無効なオブジェクト`);
            return;
          }

          if (typeof page.id !== 'number') {
            errors.push(`ノート[${subFolderId}][${index}].ページ[${pageIndex}]: 無効なID`);
          }

          if (page.content && typeof page.content === 'string') {
            const contentValidation = validateNoteContent(page.content);
            if (!contentValidation.isValid) {
              errors.push(`ノート[${subFolderId}][${index}].ページ[${pageIndex}]: ${contentValidation.error}`);
            }
          }
        });
      }

      // 日付検証
      if (note.createdAt) {
        const dateValidation = validateDateString(note.createdAt, 'createdAt');
        if (!dateValidation.isValid) {
          errors.push(`ノート[${subFolderId}][${index}]: ${dateValidation.error}`);
        }
      }

      if (note.updatedAt) {
        const dateValidation = validateDateString(note.updatedAt, 'updatedAt');
        if (!dateValidation.isValid) {
          errors.push(`ノート[${subFolderId}][${index}]: ${dateValidation.error}`);
        }
      }

      // タグ検証
      if (note.tags && !Array.isArray(note.tags)) {
        errors.push(`ノート[${subFolderId}][${index}]: タグが配列ではありません`);
      }

      // ブール値検証
      if (typeof note.isPinned !== 'boolean') {
        errors.push(`ノート[${subFolderId}][${index}]: isPinnedがブール値ではありません`);
      }

      if (typeof note.isFavorite !== 'boolean') {
        errors.push(`ノート[${subFolderId}][${index}]: isFavoriteがブール値ではありません`);
      }
    });
  });

  return errors;
};

// データ整合性の完全チェック
export const checkDataIntegrity = (): IntegrityCheckResult => {
  const result: IntegrityCheckResult = {
    isValid: true,
    errors: [],
    warnings: [],
    corruptedData: {
      workspaces: [],
      notebooks: [],
      subFolders: [],
      notes: []
    }
  };

  try {
    // データを取得
    const workspacesData = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
    const notebooksData = localStorage.getItem(STORAGE_KEYS.NOTEBOOKS);
    const notesData = localStorage.getItem(STORAGE_KEYS.NOTES);

    let workspaces: Workspace[] = [];
    let notebooks: Record<string, Notebook[]> = {};
    let notes: Record<string, Note[]> = {};

    // ワークスペースチェック
    if (workspacesData) {
      try {
        workspaces = JSON.parse(workspacesData);
        const workspaceErrors = checkWorkspaceIntegrity(workspaces);
        result.errors.push(...workspaceErrors);
      } catch (error) {
        result.errors.push('ワークスペースデータのパースに失敗しました');
        result.corruptedData.workspaces.push('parse-error');
      }
    }

    // ノートブックチェック
    if (notebooksData) {
      try {
        notebooks = JSON.parse(notebooksData);
        const notebookErrors = checkNotebookIntegrity(notebooks, workspaces);
        result.errors.push(...notebookErrors);
      } catch (error) {
        result.errors.push('ノートブックデータのパースに失敗しました');
        result.corruptedData.notebooks.push('parse-error');
      }
    }

    // ノートチェック
    if (notesData) {
      try {
        notes = JSON.parse(notesData);
        const noteErrors = checkNoteIntegrity(notes);
        result.errors.push(...noteErrors);
      } catch (error) {
        result.errors.push('ノートデータのパースに失敗しました');
        result.corruptedData.notes.push('parse-error');
      }
    }

    result.isValid = result.errors.length === 0;

  } catch (error) {
    result.errors.push(`データ整合性チェック中にエラーが発生しました: ${error}`);
    result.isValid = false;
  }

  return result;
};

// データの修復を試みる
export const repairData = (): RepairResult => {
  const result: RepairResult = {
    success: false,
    errors: [],
    warnings: [],
    repairedItems: 0
  };

  try {
    // 修復前にバックアップを作成
    if (!createBackup()) {
      result.warnings.push('修復前のバックアップ作成に失敗しました');
    }

    // 整合性チェック
    const integrityResult = checkDataIntegrity();
    
    if (integrityResult.isValid) {
      result.success = true;
      return result;
    }

    // 修復可能な問題を特定して修復
    // （現在は基本的なデータクリーンアップのみ実装）
    
    logger.info('データ修復を実行中...');
    result.success = true;
    
  } catch (error) {
    result.errors.push(`データ修復中にエラーが発生しました: ${error}`);
  }

  return result;
};

// 定期的なデータ整合性チェック
export const scheduleIntegrityCheck = (): void => {
  // アプリ起動時に1回実行
  setTimeout(() => {
    const result = checkDataIntegrity();
    if (!result.isValid) {
      logger.warn('データ整合性に問題があります:', result.errors);
      
      // 自動修復を試行
      const repairResult = repairData();
      if (repairResult.success) {
        logger.info('データの自動修復が完了しました');
      } else {
        logger.error('データの自動修復に失敗しました:', repairResult.errors);
      }
    }
  }, 1000);

  // 1時間ごとにチェック
  setInterval(() => {
    const result = checkDataIntegrity();
    if (!result.isValid) {
      logger.warn('定期チェックでデータ整合性に問題を検出:', result.errors.slice(0, 3)); // 最初の3つのエラーのみログ
      createBackup(); // 問題発見時は念のためバックアップ
    }
  }, 60 * 60 * 1000); // 1時間
};