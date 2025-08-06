import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { 
  AlertTriangle, 
  FileText, 
  Folder, 
  Briefcase, 
  Check, 
  GitMerge,
  Clock,
  User
} from 'lucide-react';
import { autoSyncManager } from '../../utils/autoSyncManager';
import { ConflictInfo } from '../../utils/conflictResolver';
import { logger } from '../../utils/logger';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictInfo | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshConflicts();

      // 競合状態の監視
      const unsubscribe = autoSyncManager.onConflictInfo((newConflicts) => {
        setConflicts(newConflicts);
        // 選択中の競合が解決されたかチェック
        if (selectedConflict && !newConflicts.find(c => 
          c.itemId === selectedConflict.itemId && c.itemType === selectedConflict.itemType
        )) {
          setSelectedConflict(null);
        }
      });

      return unsubscribe;
    }
    return () => {}; // isOpen が false の場合の戻り値
  }, [isOpen, selectedConflict]);

  const refreshConflicts = () => {
    const pendingConflicts = autoSyncManager.getPendingConflicts();
    setConflicts(pendingConflicts);
  };

  const handleResolveConflict = async (
    itemId: string | number, 
    itemType: string, 
    resolution: 'local' | 'remote' | 'merge'
  ) => {
    setIsResolving(true);
    try {
      const success = autoSyncManager.resolveConflict(itemId, itemType, resolution);
      if (success) {
        logger.info(`Conflict resolved: ${itemType}-${itemId} with ${resolution}`);
        refreshConflicts();
        setSelectedConflict(null);
      } else {
        alert('競合の解決に失敗しました');
      }
    } catch (error) {
      logger.error('Failed to resolve conflict:', error);
      alert('競合の解決中にエラーが発生しました');
    } finally {
      setIsResolving(false);
    }
  };

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'note':
        return <FileText size={16} className="text-blue-600" />;
      case 'folder':
        return <Folder size={16} className="text-yellow-600" />;
      case 'workspace':
        return <Briefcase size={16} className="text-green-600" />;
      default:
        return <AlertTriangle size={16} className="text-red-600" />;
    }
  };

  const getConflictTypeText = (conflictType: string) => {
    switch (conflictType) {
      case 'content':
        return 'コンテンツの競合';
      case 'delete':
        return '削除の競合';
      case 'metadata':
        return 'メタデータの競合';
      case 'structural':
        return '構造の競合';
      default:
        return '不明な競合';
    }
  };

  const getItemTypeText = (itemType: string) => {
    switch (itemType) {
      case 'note':
        return 'ノート';
      case 'folder':
        return 'フォルダ';
      case 'workspace':
        return 'ワークスペース';
      default:
        return 'アイテム';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP');
  };

  if (conflicts.length === 0 && isOpen) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="🔀 競合解決"
        size="md"
      >
        <div className="text-center py-12">
          <Check size={48} className="mx-auto mb-4 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            競合はありません
          </h3>
          <p className="text-gray-600">
            すべての競合が解決されました。
          </p>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            閉じる
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔀 競合解決"
      size="xl"
    >
      <div className="flex h-[600px] max-h-[80vh] overflow-hidden">
        {/* 競合一覧 */}
        <div className="w-1/3 border-r border-gray-200 pr-4">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <AlertTriangle size={16} className="mr-2 text-red-500" />
              競合一覧 ({conflicts.length}件)
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              解決が必要な競合です
            </p>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {conflicts.map((conflict) => (
              <button
                key={`${conflict.itemType}-${conflict.itemId}`}
                onClick={() => setSelectedConflict(conflict)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedConflict?.itemId === conflict.itemId && 
                  selectedConflict?.itemType === conflict.itemType
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {getItemIcon(conflict.itemType)}
                  <span className="font-medium text-sm">
                    {getItemTypeText(conflict.itemType)}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-1">
                  {getConflictTypeText(conflict.conflictType)}
                </div>
                <div className="text-xs text-gray-500">
                  ID: {conflict.itemId}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 競合詳細と解決オプション */}
        <div className="flex-1 pl-4 overflow-y-auto">
          {selectedConflict ? (
            <div className="space-y-6">
              {/* 競合情報 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  {getItemIcon(selectedConflict.itemType)}
                  <span className="ml-2">
                    {getItemTypeText(selectedConflict.itemType)}の競合
                  </span>
                </h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <AlertTriangle size={16} className="text-red-600 mr-2" />
                    <span className="font-medium text-red-800">
                      {getConflictTypeText(selectedConflict.conflictType)}
                    </span>
                  </div>
                  <div className="text-sm text-red-700">
                    <p>アイテムID: {selectedConflict.itemId}</p>
                    <p>推奨解決法: {selectedConflict.suggestedResolution === 'local' ? 'ローカル版を採用' :
                      selectedConflict.suggestedResolution === 'remote' ? 'リモート版を採用' :
                      selectedConflict.suggestedResolution === 'merge' ? 'マージ' : '手動解決'}</p>
                  </div>
                </div>
              </div>

              {/* 解決オプション */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">解決方法を選択</h4>
                
                <div className="grid gap-4">
                  {/* ローカル版を採用 */}
                  <div className="border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <User size={16} className="text-blue-600 mr-2" />
                        <span className="font-medium text-blue-800">ローカル版を採用</span>
                      </div>
                      <button
                        onClick={() => handleResolveConflict(
                          selectedConflict.itemId, 
                          selectedConflict.itemType, 
                          'local'
                        )}
                        disabled={isResolving}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        採用
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      このデバイスで編集した内容を保持します
                    </p>
                    {selectedConflict.localVersion?.updatedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        更新日時: {formatTimestamp(new Date(selectedConflict.localVersion.updatedAt).getTime())}
                      </p>
                    )}
                  </div>

                  {/* リモート版を採用 */}
                  <div className="border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Clock size={16} className="text-green-600 mr-2" />
                        <span className="font-medium text-green-800">リモート版を採用</span>
                      </div>
                      <button
                        onClick={() => handleResolveConflict(
                          selectedConflict.itemId, 
                          selectedConflict.itemType, 
                          'remote'
                        )}
                        disabled={isResolving}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        採用
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      他のデバイスで編集した内容で上書きします
                    </p>
                    {selectedConflict.remoteVersion?.updatedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        更新日時: {formatTimestamp(new Date(selectedConflict.remoteVersion.updatedAt).getTime())}
                      </p>
                    )}
                  </div>

                  {/* マージ */}
                  {selectedConflict.itemType === 'note' && (
                    <div className="border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <GitMerge size={16} className="text-purple-600 mr-2" />
                          <span className="font-medium text-purple-800">マージ</span>
                        </div>
                        <button
                          onClick={() => handleResolveConflict(
                            selectedConflict.itemId, 
                            selectedConflict.itemType, 
                            'merge'
                          )}
                          disabled={isResolving}
                          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                        >
                          マージ
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        両方の変更を統合します（競合マーカー付き）
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ※ ノートの場合、競合箇所に「&lt;&lt;&lt;&lt;&lt;&lt;&lt; ローカル」マーカーが追加されます
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 詳細情報 */}
              {selectedConflict.localVersion && selectedConflict.remoteVersion && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4">変更内容の比較</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 mb-2">ローカル版</h5>
                      {selectedConflict.itemType === 'note' && (
                        <div className="text-sm space-y-2">
                          <p><strong>タイトル:</strong> {selectedConflict.localVersion.title}</p>
                          <p><strong>タグ:</strong> {selectedConflict.localVersion.tags?.join(', ') || 'なし'}</p>
                          <p><strong>更新日:</strong> {selectedConflict.localVersion.updatedAt}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h5 className="font-medium text-green-800 mb-2">リモート版</h5>
                      {selectedConflict.itemType === 'note' && (
                        <div className="text-sm space-y-2">
                          <p><strong>タイトル:</strong> {selectedConflict.remoteVersion.title}</p>
                          <p><strong>タグ:</strong> {selectedConflict.remoteVersion.tags?.join(', ') || 'なし'}</p>
                          <p><strong>更新日:</strong> {selectedConflict.remoteVersion.updatedAt}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <AlertTriangle size={48} className="mx-auto mb-4 text-gray-300" />
                <p>競合を選択してください</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フッター */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t">
        <div className="text-sm text-gray-500">
          {conflicts.length > 0 && `${conflicts.length}件の競合があります`}
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          閉じる
        </button>
      </div>
    </Modal>
  );
};

export default ConflictResolutionDialog;