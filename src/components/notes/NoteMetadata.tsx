import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Star, Pin, Trash2, Map, Plus, X } from 'lucide-react';
import { validateTag } from '../../utils/validation';
import { logger } from '../../utils/logger';
import { debounce } from '../../utils/debounce';

interface NoteMetadataProps {
  title: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  onTitleChange: (title: string) => void;
  onTagsChange: (tags: string[]) => void;
  onToggleFavorite: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onShowMindMap: () => void;
  isEditing: boolean;
}

const NoteMetadata: React.FC<NoteMetadataProps> = React.memo(({
  title,
  tags,
  isFavorite,
  isPinned,
  onTitleChange,
  onTagsChange,
  onToggleFavorite,
  onTogglePin,
  onDelete,
  onShowMindMap,
  isEditing
}) => {
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [editingTitle, setEditingTitle] = useState(title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [internalSaveStatus, setInternalSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // titleが外部から変更されたときに編集中のタイトルも更新
  useEffect(() => {
    setEditingTitle(title);
    setInternalSaveStatus('saved');
  }, [title]);

  // リアルタイムタイトル保存（デバウンス）
  const debouncedTitleSave = useMemo(() => {
    return debounce((newTitle: string) => {
      if (newTitle.trim() && newTitle !== title) {
        setInternalSaveStatus('saving');
        onTitleChange(newTitle);
        // 保存完了は親コンポーネントからtitleが更新されたときに'saved'になる
      }
    }, 1000); // 1秒のデバウンス
  }, [title, onTitleChange]);

  // タイトル編集開始
  const handleStartEditTitle = useCallback(() => {
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 0);
  }, []);

  // タイトル変更ハンドラー（リアルタイム保存）
  const handleTitleChange = useCallback((newTitle: string) => {
    setEditingTitle(newTitle);
    setInternalSaveStatus('unsaved');
    debouncedTitleSave(newTitle);
  }, [debouncedTitleSave]);

  // タイトル編集完了（確定）
  const handleFinishEditTitle = useCallback(() => {
    setIsEditingTitle(false);
    // 最終的な保存を確実に実行
    if (editingTitle.trim() && editingTitle !== title) {
      onTitleChange(editingTitle);
    }
  }, [editingTitle, title, onTitleChange]);

  // タイトル編集キャンセル
  const handleCancelEditTitle = useCallback(() => {
    setEditingTitle(title);
    setInternalSaveStatus('saved');
    setIsEditingTitle(false);
  }, [title]);

  const handleAddTag = useCallback(() => {
    if (newTag.trim()) {
      const validation = validateTag(newTag.trim());
      if (validation.isValid) {
        const updatedTags = [...tags, newTag.trim()];
        onTagsChange(updatedTags);
        setNewTag('');
        setShowTagInput(false);
      } else {
        logger.warn('Invalid tag:', validation.error);
      }
    }
  }, [newTag, tags, onTagsChange]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    onTagsChange(updatedTags);
  }, [tags, onTagsChange]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTag();
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setNewTag('');
    }
  }, [handleAddTag]);

  const handleDeleteClick = useCallback(() => {
    if (window.confirm('このノートを削除しますか？')) {
      onDelete();
    }
  }, [onDelete]);

  // パフォーマンス向上のためログを削減
  // console.log('🏷️ NoteMetadata - isEditing:', isEditing, 'title:', title);
  
  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      {/* タイトルと操作ボタン */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 flex items-center gap-2">
          {isEditingTitle ? (
            <>
              <input
                ref={titleInputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFinishEditTitle();
                  } else if (e.key === 'Escape') {
                    handleCancelEditTitle();
                  }
                }}
                onBlur={handleFinishEditTitle}
                className="text-xl font-bold bg-white border-2 border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 flex-1"
                placeholder="ノートタイトルを入力..."
              />
              
              {/* タイトル保存状態インジケーター */}
              <div className="flex items-center px-2 py-1 text-xs rounded ml-2">
                {internalSaveStatus === 'saved' && (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-green-600">保存済み</span>
                  </>
                )}
                {internalSaveStatus === 'saving' && (
                  <>
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                    <span className="text-blue-600">保存中...</span>
                  </>
                )}
                {internalSaveStatus === 'unsaved' && (
                  <>
                    <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                    <span className="text-orange-600">未保存</span>
                  </>
                )}
              </div>
              
              <button
                onClick={handleCancelEditTitle}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors ml-2"
                title="キャンセル (Esc)"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <h2 
                onClick={handleStartEditTitle}
                className="text-xl font-bold px-2 py-1 cursor-pointer hover:bg-gray-50 rounded transition-colors border-2 border-gray-200 bg-gray-50 min-h-[42px] flex items-center"
                title="クリックして編集"
              >
                {title || "ノートタイトルを入力..."}
              </h2>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-lg transition-colors ${
              isFavorite ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'
            }`}
            title={isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
          >
            <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          
          <button
            onClick={onTogglePin}
            className={`p-2 rounded-lg transition-colors ${
              isPinned ? 'text-orange-500 bg-orange-50' : 'text-gray-400 hover:text-orange-500 hover:bg-gray-100'
            }`}
            title={isPinned ? 'ピン留めを解除' : 'ピン留めする'}
          >
            <Pin size={18} />
          </button>
          
          <button
            onClick={onShowMindMap}
            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="ノートマップで表示"
          >
            <Map size={18} />
          </button>
          
          <button
            onClick={handleDeleteClick}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="ノートを削除"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* タグ管理 */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 group"
            >
              {tag}
              {isEditing && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              )}
            </span>
          ))}
          
          {isEditing && !showTagInput && (
            <button
              onClick={() => setShowTagInput(true)}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <Plus size={14} className="mr-1" />
              タグを追加
            </button>
          )}
        </div>

        {showTagInput && (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="新しいタグ"
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleAddTag}
              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              追加
            </button>
            <button
              onClick={() => {
                setShowTagInput(false);
                setNewTag('');
              }}
              className="px-3 py-1 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
            >
              キャンセル
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

NoteMetadata.displayName = 'NoteMetadata';

export default NoteMetadata;