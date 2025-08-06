import { logger } from './logger';
import { Note } from '../types';

export interface ConflictInfo {
  itemId: string | number;
  itemType: 'note' | 'workspace' | 'folder';
  localVersion: any;
  remoteVersion: any;
  baseVersion?: any;
  conflictType: 'content' | 'delete' | 'metadata' | 'structural';
  suggestedResolution: 'local' | 'remote' | 'merge' | 'manual';
}

export interface MergeResult {
  success: boolean;
  mergedData?: any;
  conflicts?: ConflictInfo[];
  requiresManualResolution: boolean;
}

export interface ConflictResolutionStrategy {
  type: 'timestamp' | 'merge' | 'user-choice' | 'auto-merge';
  priority?: 'local' | 'remote';
}

class ConflictResolver {
  private static instance: ConflictResolver;
  private resolutionCallbacks: Array<(conflicts: ConflictInfo[]) => void> = [];
  private pendingConflicts: Map<string, ConflictInfo> = new Map();

  private constructor() {}

  public static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  // ノートの競合を解決
  public resolveNoteConflict(
    localNote: Note,
    remoteNote: Note,
    baseNote?: Note
  ): MergeResult {
    logger.info('Resolving note conflict:', {
      noteId: localNote.id,
      localUpdated: localNote.updatedAt,
      remoteUpdated: remoteNote.updatedAt
    });

    // 同じ内容の場合、競合なし
    if (this.areNotesEqual(localNote, remoteNote)) {
      return {
        success: true,
        mergedData: localNote,
        requiresManualResolution: false
      };
    }

    // 削除競合のチェック
    if (this.isDeleteConflict(localNote, remoteNote)) {
      return this.handleDeleteConflict(localNote, remoteNote);
    }

    // メタデータのみの競合
    if (this.isMetadataOnlyConflict(localNote, remoteNote)) {
      return this.mergeMetadata(localNote, remoteNote);
    }

    // コンテンツ競合
    if (this.isContentConflict(localNote, remoteNote)) {
      return this.mergeContent(localNote, remoteNote, baseNote);
    }

    // その他の競合は手動解決が必要
    const conflict: ConflictInfo = {
      itemId: localNote.id,
      itemType: 'note',
      localVersion: localNote,
      remoteVersion: remoteNote,
      baseVersion: baseNote,
      conflictType: 'structural',
      suggestedResolution: 'manual'
    };

    this.addPendingConflict(conflict);

    return {
      success: false,
      conflicts: [conflict],
      requiresManualResolution: true
    };
  }

  // ワークスペースの競合を解決
  public resolveWorkspaceConflict(
    localWorkspace: any,
    remoteWorkspace: any
  ): MergeResult {
    // 名前やアイコンの変更は最新のタイムスタンプを採用
    const useLocal = this.compareTimestamps(localWorkspace, remoteWorkspace) > 0;
    
    return {
      success: true,
      mergedData: useLocal ? localWorkspace : remoteWorkspace,
      requiresManualResolution: false
    };
  }

  // フォルダの競合を解決
  public resolveFolderConflict(
    localFolder: any,
    remoteFolder: any
  ): MergeResult {
    // フォルダ名や色の変更は最新のタイムスタンプを採用
    const useLocal = this.compareTimestamps(localFolder, remoteFolder) > 0;
    
    return {
      success: true,
      mergedData: useLocal ? localFolder : remoteFolder,
      requiresManualResolution: false
    };
  }

  // ノートが同じかチェック
  private areNotesEqual(note1: Note, note2: Note): boolean {
    return (
      note1.title === note2.title &&
      JSON.stringify(note1.pages) === JSON.stringify(note2.pages) &&
      JSON.stringify(note1.tags) === JSON.stringify(note2.tags) &&
      note1.isPinned === note2.isPinned &&
      note1.isFavorite === note2.isFavorite
    );
  }

  // 削除競合かチェック
  private isDeleteConflict(localNote: any, remoteNote: any): boolean {
    return (
      (localNote.deleted && !remoteNote.deleted) ||
      (!localNote.deleted && remoteNote.deleted)
    );
  }

  // 削除競合を処理
  private handleDeleteConflict(localNote: any, remoteNote: any): MergeResult {
    // 削除されていない方を保持（削除は慎重に）
    const keepNote = localNote.deleted ? remoteNote : localNote;
    
    const conflict: ConflictInfo = {
      itemId: localNote.id,
      itemType: 'note',
      localVersion: localNote,
      remoteVersion: remoteNote,
      conflictType: 'delete',
      suggestedResolution: localNote.deleted ? 'remote' : 'local'
    };

    return {
      success: true,
      mergedData: keepNote,
      conflicts: [conflict],
      requiresManualResolution: false
    };
  }

  // メタデータのみの競合かチェック
  private isMetadataOnlyConflict(localNote: Note, remoteNote: Note): boolean {
    // コンテンツが同じでメタデータのみ異なる
    const contentEqual = JSON.stringify(localNote.pages) === JSON.stringify(remoteNote.pages);
    const metadataDifferent = 
      localNote.title !== remoteNote.title ||
      JSON.stringify(localNote.tags) !== JSON.stringify(remoteNote.tags) ||
      localNote.isPinned !== remoteNote.isPinned ||
      localNote.isFavorite !== remoteNote.isFavorite;
    
    return contentEqual && metadataDifferent;
  }

  // メタデータをマージ
  private mergeMetadata(localNote: Note, remoteNote: Note): MergeResult {
    const mergedNote: Note = {
      ...localNote,
      // タイトルは最新のものを使用
      title: this.compareTimestamps(localNote, remoteNote) > 0 
        ? localNote.title 
        : remoteNote.title,
      // タグは両方をマージ（重複排除）
      tags: Array.from(new Set([...localNote.tags, ...remoteNote.tags])),
      // ピン留めとお気に入りはOR条件（どちらかがtrueならtrue）
      isPinned: localNote.isPinned || remoteNote.isPinned,
      isFavorite: localNote.isFavorite || remoteNote.isFavorite,
      // 更新日時は最新
      updatedAt: this.compareTimestamps(localNote, remoteNote) > 0
        ? localNote.updatedAt
        : remoteNote.updatedAt
    };

    return {
      success: true,
      mergedData: mergedNote,
      requiresManualResolution: false
    };
  }

  // コンテンツ競合かチェック
  private isContentConflict(localNote: Note, remoteNote: Note): boolean {
    return JSON.stringify(localNote.pages) !== JSON.stringify(remoteNote.pages);
  }

  // コンテンツをマージ
  private mergeContent(
    localNote: Note,
    remoteNote: Note,
    baseNote?: Note
  ): MergeResult {
    // 3-way mergeの試行
    if (baseNote) {
      const mergeResult = this.threeWayMerge(localNote, remoteNote, baseNote);
      if (mergeResult.success) {
        return mergeResult;
      }
    }

    // 自動マージが失敗した場合、競合マーカーを追加
    const mergedPages = this.mergePages(localNote.pages, remoteNote.pages);
    
    if (mergedPages.hasConflicts) {
      const conflict: ConflictInfo = {
        itemId: localNote.id,
        itemType: 'note',
        localVersion: localNote,
        remoteVersion: remoteNote,
        baseVersion: baseNote,
        conflictType: 'content',
        suggestedResolution: 'manual'
      };

      this.addPendingConflict(conflict);

      return {
        success: false,
        mergedData: {
          ...localNote,
          pages: mergedPages.pages,
          hasConflicts: true
        },
        conflicts: [conflict],
        requiresManualResolution: true
      };
    }

    return {
      success: true,
      mergedData: {
        ...localNote,
        pages: mergedPages.pages,
        updatedAt: new Date().toISOString().split('T')[0]
      },
      requiresManualResolution: false
    };
  }

  // 3-way merge
  private threeWayMerge(
    localNote: Note,
    remoteNote: Note,
    baseNote: Note
  ): MergeResult {
    // ベースからの変更を検出
    const localChanges = this.detectChanges(baseNote, localNote);
    const remoteChanges = this.detectChanges(baseNote, remoteNote);

    // 変更が重複していない場合は自動マージ可能
    if (!this.hasOverlappingChanges(localChanges, remoteChanges)) {
      const mergedNote = this.applyChanges(baseNote, localChanges, remoteChanges);
      return {
        success: true,
        mergedData: mergedNote,
        requiresManualResolution: false
      };
    }

    // 重複する変更がある場合は手動解決が必要
    return {
      success: false,
      requiresManualResolution: true
    };
  }

  // ページをマージ（競合マーカー付き）
  private mergePages(localPages: any[], remotePages: any[]): { pages: any[], hasConflicts: boolean } {
    const maxLength = Math.max(localPages.length, remotePages.length);
    const mergedPages = [];
    let hasConflicts = false;

    for (let i = 0; i < maxLength; i++) {
      const localPage = localPages[i];
      const remotePage = remotePages[i];

      if (!localPage && remotePage) {
        // リモートのみに存在
        mergedPages.push(remotePage);
      } else if (localPage && !remotePage) {
        // ローカルのみに存在
        mergedPages.push(localPage);
      } else if (localPage && remotePage) {
        // 両方に存在
        if (localPage.content === remotePage.content) {
          mergedPages.push(localPage);
        } else {
          // 競合マーカーを追加
          hasConflicts = true;
          mergedPages.push({
            ...localPage,
            content: `<<<<<<< ローカルの変更
${localPage.content}
=======
${remotePage.content}
>>>>>>> リモートの変更`,
            hasConflict: true
          });
        }
      }
    }

    return { pages: mergedPages, hasConflicts };
  }

  // タイムスタンプを比較
  private compareTimestamps(item1: any, item2: any): number {
    const time1 = new Date(item1.updatedAt || item1.timestamp || 0).getTime();
    const time2 = new Date(item2.updatedAt || item2.timestamp || 0).getTime();
    return time1 - time2;
  }

  // 変更を検出
  private detectChanges(baseItem: any, changedItem: any): any[] {
    // 簡易的な変更検出（実際はより詳細な実装が必要）
    const changes = [];
    
    if (baseItem.title !== changedItem.title) {
      changes.push({ type: 'title', value: changedItem.title });
    }
    
    if (JSON.stringify(baseItem.pages) !== JSON.stringify(changedItem.pages)) {
      changes.push({ type: 'pages', value: changedItem.pages });
    }
    
    return changes;
  }

  // 重複する変更があるかチェック
  private hasOverlappingChanges(localChanges: any[], remoteChanges: any[]): boolean {
    const localTypes = new Set(localChanges.map(c => c.type));
    return remoteChanges.some(c => localTypes.has(c.type));
  }

  // 変更を適用
  private applyChanges(baseItem: any, localChanges: any[], remoteChanges: any[]): any {
    const result = { ...baseItem };
    
    // ローカルの変更を適用
    localChanges.forEach(change => {
      result[change.type] = change.value;
    });
    
    // リモートの変更を適用（重複しないもののみ）
    remoteChanges.forEach(change => {
      if (!localChanges.some(lc => lc.type === change.type)) {
        result[change.type] = change.value;
      }
    });
    
    return result;
  }

  // ペンディング競合を追加
  private addPendingConflict(conflict: ConflictInfo): void {
    const key = `${conflict.itemType}-${conflict.itemId}`;
    this.pendingConflicts.set(key, conflict);
    this.notifyConflictCallbacks();
  }

  // 競合を解決
  public resolveConflict(
    itemId: string | number,
    itemType: string,
    resolution: 'local' | 'remote' | 'merge'
  ): boolean {
    const key = `${itemType}-${itemId}`;
    const conflict = this.pendingConflicts.get(key);
    
    if (!conflict) {
      logger.warn('No pending conflict found:', key);
      return false;
    }

    // 解決方法に応じて処理
    switch (resolution) {
      case 'local':
        // ローカルバージョンを採用
        logger.info('Resolved conflict with local version:', key);
        break;
      case 'remote':
        // リモートバージョンを採用
        logger.info('Resolved conflict with remote version:', key);
        break;
      case 'merge':
        // マージバージョンを採用
        logger.info('Resolved conflict with merge:', key);
        break;
    }

    this.pendingConflicts.delete(key);
    this.notifyConflictCallbacks();
    
    return true;
  }

  // ペンディング競合を取得
  public getPendingConflicts(): ConflictInfo[] {
    return Array.from(this.pendingConflicts.values());
  }

  // 競合通知のコールバックを登録
  public onConflict(callback: (conflicts: ConflictInfo[]) => void): () => void {
    this.resolutionCallbacks.push(callback);
    return () => {
      const index = this.resolutionCallbacks.indexOf(callback);
      if (index > -1) {
        this.resolutionCallbacks.splice(index, 1);
      }
    };
  }

  // コールバックに通知
  private notifyConflictCallbacks(): void {
    const conflicts = this.getPendingConflicts();
    this.resolutionCallbacks.forEach(callback => {
      try {
        callback(conflicts);
      } catch (error) {
        logger.error('Conflict callback error:', error);
      }
    });
  }
}

export const conflictResolver = ConflictResolver.getInstance();