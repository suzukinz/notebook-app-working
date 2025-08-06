import { useCallback } from 'react';
import { offlineManager } from '../utils/offlineManager';

// オフライン対応アクションのフック
export const useOfflineActions = () => {
  
  // ノート作成（オフライン対応）
  const createNoteOffline = useCallback((noteData: any) => {
    // ローカルでの即座の作成
    const localNoteId = `temp-${Date.now()}`;
    const noteWithTempId = { ...noteData, id: localNoteId, _isTemp: true };
    
    // オフラインキューに追加
    offlineManager.queueAction({
      type: 'CREATE_NOTE',
      data: noteWithTempId
    });
    
    return noteWithTempId;
  }, []);

  // ノート更新（オフライン対応）
  const updateNoteOffline = useCallback((noteId: number, updates: any) => {
    // オフラインキューに追加
    offlineManager.queueAction({
      type: 'UPDATE_NOTE',
      data: { noteId, updates }
    });
    
    // ローカル更新は通常のstoreアクションで実行
    return { noteId, updates };
  }, []);

  // ノート削除（オフライン対応）
  const deleteNoteOffline = useCallback((noteId: number) => {
    // オフラインキューに追加
    offlineManager.queueAction({
      type: 'DELETE_NOTE',
      data: { noteId }
    });
    
    return noteId;
  }, []);

  // フォルダ作成（オフライン対応）
  const createFolderOffline = useCallback((folderData: any) => {
    const localFolderId = `temp-folder-${Date.now()}`;
    const folderWithTempId = { ...folderData, id: localFolderId, _isTemp: true };
    
    // オフラインキューに追加
    offlineManager.queueAction({
      type: 'CREATE_FOLDER',
      data: folderWithTempId
    });
    
    return folderWithTempId;
  }, []);

  // 設定更新（オフライン対応）
  const updateSettingsOffline = useCallback((settings: any) => {
    // オフラインキューに追加
    offlineManager.queueAction({
      type: 'UPDATE_SETTINGS',
      data: settings
    });
    
    return settings;
  }, []);

  // バックグラウンド同期の登録
  const registerBackgroundSync = useCallback(async (tag: string) => {
    try {
      await offlineManager.registerBackgroundSync(tag);
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }, []);

  return {
    createNoteOffline,
    updateNoteOffline,
    deleteNoteOffline,
    createFolderOffline,
    updateSettingsOffline,
    registerBackgroundSync
  };
};