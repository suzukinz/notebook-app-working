// Conflict Resolution Modal - Phase 3 Wave 2
// Three-way merge visualization and resolution interface

import React, { useState, useMemo } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  RotateCcw,
  GitMerge,
  Clock,
  User,
  Monitor,
  FileText,
  Settings,
  Database
} from 'lucide-react';
import { useEnhancedOffline } from '../../contexts/EnhancedOfflineContext';
// import type { ConflictInfo } from '../../contexts/EnhancedOfflineContext';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictId?: string;
}

interface ConflictDetails {
  id: string;
  entityType: 'note' | 'workspace' | 'setting';
  entityTitle: string;
  localData: any;
  remoteData: any;
  baseData?: any;
  localTimestamp: string;
  remoteTimestamp: string;
  conflictType: 'concurrent_edit' | 'offline_edit' | 'delete_conflict';
  previewDiff: {
    added: string[];
    removed: string[];
    modified: string[];
  };
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflictId
}) => {
  const { conflicts, resolveConflict } = useEnhancedOffline();
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | 'merge' | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);

  // Find the current conflict
  const currentConflict = useMemo(() => {
    if (conflictId) {
      return conflicts.find(c => c.id === conflictId);
    }
    return conflicts[currentConflictIndex] || null;
  }, [conflicts, conflictId, currentConflictIndex]);

  // Mock conflict details (in real implementation, this would fetch from IndexedDB)
  const conflictDetails = useMemo((): ConflictDetails | null => {
    if (!currentConflict) return null;

    // Mock data for demonstration
    return {
      id: currentConflict.id,
      entityType: currentConflict.entityType,
      entityTitle: currentConflict.entityTitle,
      localData: {
        title: currentConflict.entityTitle + ' (Local)',
        content: 'Local version of the content with user changes...',
        lastModified: currentConflict.timestamp,
        tags: ['local', 'draft']
      },
      remoteData: {
        title: currentConflict.entityTitle + ' (Remote)',
        content: 'Remote version of the content with different changes...',
        lastModified: new Date(Date.now() - 30000).toISOString(),
        tags: ['remote', 'published']
      },
      baseData: {
        title: currentConflict.entityTitle + ' (Original)',
        content: 'Original version before any changes...',
        lastModified: new Date(Date.now() - 60000).toISOString(),
        tags: ['original']
      },
      localTimestamp: currentConflict.timestamp,
      remoteTimestamp: new Date(Date.now() - 30000).toISOString(),
      conflictType: currentConflict.conflictType,
      previewDiff: {
        added: ['+ New line added locally', '+ Another local addition'],
        removed: ['- Line removed in remote', '- Old content removed'],
        modified: ['~ Modified title', '~ Updated tags']
      }
    };
  }, [currentConflict]);

  if (!isOpen || !currentConflict || !conflictDetails) return null;

  const handleResolve = async () => {
    if (!selectedResolution) return;
    
    setIsResolving(true);
    try {
      await resolveConflict(currentConflict.id, selectedResolution);
      
      // Move to next conflict or close modal
      if (conflicts.length > 1 && !conflictId) {
        setCurrentConflictIndex(prev => 
          prev >= conflicts.length - 1 ? 0 : prev + 1
        );
        setSelectedResolution(null);
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const getEntityIcon = () => {
    switch (conflictDetails.entityType) {
      case 'note': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'workspace': return <Database className="w-5 h-5 text-green-500" />;
      case 'setting': return <Settings className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getConflictTypeText = () => {
    switch (conflictDetails.conflictType) {
      case 'concurrent_edit': return '同時編集競合';
      case 'offline_edit': return 'オフライン編集競合';
      case 'delete_conflict': return '削除競合';
      default: return '不明な競合';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">競合の解決</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {getEntityIcon()}
                <span>{conflictDetails.entityTitle}</span>
                <span>•</span>
                <span>{getConflictTypeText()}</span>
                {conflicts.length > 1 && !conflictId && (
                  <>
                    <span>•</span>
                    <span>{currentConflictIndex + 1} / {conflicts.length}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {conflicts.length > 1 && !conflictId && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentConflictIndex(prev => 
                    prev <= 0 ? conflicts.length - 1 : prev - 1
                  )}
                  className="p-2 rounded-md hover:bg-gray-100"
                  title="前の競合"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentConflictIndex(prev => 
                    prev >= conflicts.length - 1 ? 0 : prev + 1
                  )}
                  className="p-2 rounded-md hover:bg-gray-100"
                  title="次の競合"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Three-way comparison */}
          <div className="flex-1 grid grid-cols-3 divide-x divide-gray-200">
            {/* Local Version */}
            <div className="flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-blue-50">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4 text-blue-600" />
                  <h3 className="font-medium text-blue-900">ローカル版</h3>
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  {formatTimestamp(conflictDetails.localTimestamp)}
                </div>
              </div>
              <div className="flex-1 p-4 overflow-auto">
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="font-medium text-gray-700">タイトル:</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {conflictDetails.localData.title}
                    </div>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">内容:</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border h-32 overflow-auto">
                      {conflictDetails.localData.content}
                    </div>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">タグ:</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {conflictDetails.localData.tags?.map((tag: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Remote Version */}
            <div className="flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-green-50">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-green-600" />
                  <h3 className="font-medium text-green-900">リモート版</h3>
                </div>
                <div className="text-xs text-green-700 mt-1">
                  {formatTimestamp(conflictDetails.remoteTimestamp)}
                </div>
              </div>
              <div className="flex-1 p-4 overflow-auto">
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="font-medium text-gray-700">タイトル:</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {conflictDetails.remoteData.title}
                    </div>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">内容:</label>
                    <div className="mt-1 p-2 bg-gray-50 rounded border h-32 overflow-auto">
                      {conflictDetails.remoteData.content}
                    </div>
                  </div>
                  <div>
                    <label className="font-medium text-gray-700">タグ:</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {conflictDetails.remoteData.tags?.map((tag: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Diff Preview */}
            <div className="flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-purple-50">
                <div className="flex items-center space-x-2">
                  <GitMerge className="w-4 h-4 text-purple-600" />
                  <h3 className="font-medium text-purple-900">差分プレビュー</h3>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-auto">
                <div className="space-y-3 text-sm">
                  {conflictDetails.previewDiff.added.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">追加された内容</h4>
                      {conflictDetails.previewDiff.added.map((line, index) => (
                        <div key={index} className="text-green-600 bg-green-50 px-2 py-1 rounded font-mono text-xs">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {conflictDetails.previewDiff.removed.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">削除された内容</h4>
                      {conflictDetails.previewDiff.removed.map((line, index) => (
                        <div key={index} className="text-red-600 bg-red-50 px-2 py-1 rounded font-mono text-xs">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {conflictDetails.previewDiff.modified.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-700 mb-2">変更された内容</h4>
                      {conflictDetails.previewDiff.modified.map((line, index) => (
                        <div key={index} className="text-blue-600 bg-blue-50 px-2 py-1 rounded font-mono text-xs">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resolution Options */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">解決方法を選択</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Use Local */}
            <button
              onClick={() => setSelectedResolution('local')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedResolution === 'local'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">ローカル版を使用</span>
              </div>
              <p className="text-sm text-gray-600">
                あなたの変更を優先し、リモートの変更を破棄します
              </p>
            </button>

            {/* Use Remote */}
            <button
              onClick={() => setSelectedResolution('remote')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedResolution === 'remote'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">リモート版を使用</span>
              </div>
              <p className="text-sm text-gray-600">
                リモートの変更を優先し、ローカルの変更を破棄します
              </p>
            </button>

            {/* Merge */}
            <button
              onClick={() => setSelectedResolution('merge')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedResolution === 'merge'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
              disabled={!currentConflict.autoResolvable}
            >
              <div className="flex items-center space-x-2 mb-2">
                <GitMerge className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-900">自動マージ</span>
                {currentConflict.autoResolvable && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-1 py-0.5 rounded">
                    推奨 {Math.round(currentConflict.confidence * 100)}%
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {currentConflict.autoResolvable 
                  ? '両方の変更を統合します'
                  : '手動マージが必要です'
                }
              </p>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>競合発生時刻: {formatTimestamp(currentConflict.timestamp)}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleResolve}
                disabled={!selectedResolution || isResolving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {isResolving ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>解決中...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>解決</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;