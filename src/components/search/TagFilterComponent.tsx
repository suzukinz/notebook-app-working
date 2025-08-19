// タグフィルタリングコンポーネント
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { X, Tag, Plus, Search, Hash } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';

interface TagInfo {
  name: string;
  count: number;
  color: string;
  category?: string;
  lastUsed: string;
}

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
  showCount?: boolean;
  maxVisible?: number;
  allowCreate?: boolean;
}

const TagFilterComponent: React.FC<TagFilterProps> = ({
  selectedTags,
  onTagsChange,
  className = '',
  showCount = true,
  maxVisible = 10,
  allowCreate = false
}) => {
  // 状態管理
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);

  // ストアからデータ取得
  const { notesData } = useNotebookStore();

  // 全タグの分析と統計
  const tagAnalysis = useMemo(() => {
    const tagMap = new Map<string, TagInfo>();
    const tagColors = [
      'blue', 'green', 'red', 'purple', 'yellow', 'pink', 'indigo', 'gray', 'orange'
    ];

    // 全ノートからタグを抽出・分析
    Object.values(notesData).flat().forEach(note => {
      note.tags.forEach(tagName => {
        const existing = tagMap.get(tagName);
        if (existing) {
          existing.count++;
          // 最新の使用日時を更新
          if (note.updatedAt > existing.lastUsed) {
            existing.lastUsed = note.updatedAt;
          }
        } else {
          tagMap.set(tagName, {
            name: tagName,
            count: 1,
            color: tagColors[tagMap.size % tagColors.length] || 'gray',
            lastUsed: note.updatedAt
          });
        }
      });
    });

    return Array.from(tagMap.values());
  }, [notesData]);

  // フィルタされたタグリスト
  const filteredTags = useMemo(() => {
    let filtered = tagAnalysis;

    // 検索クエリでフィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tag => 
        tag.name.toLowerCase().includes(query)
      );
    }

    // 使用頻度でソート（高頻度 → 最新使用日時）
    filtered.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count; // 使用頻度優先
      }
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });

    return filtered;
  }, [tagAnalysis, searchQuery]);

  // 表示するタグリスト
  const displayTags = useMemo(() => {
    const visible = showAll ? filteredTags : filteredTags.slice(0, maxVisible);
    return visible;
  }, [filteredTags, showAll, maxVisible]);

  // タグ選択/選択解除
  const handleTagToggle = useCallback((tagName: string) => {
    const newTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName];
    
    onTagsChange(newTags);
  }, [selectedTags, onTagsChange]);

  // 全タグクリア
  const handleClearAll = useCallback(() => {
    onTagsChange([]);
  }, [onTagsChange]);

  // 新しいタグ作成
  const handleCreateTag = useCallback(() => {
    const tagName = newTagInput.trim();
    if (tagName && !selectedTags.includes(tagName)) {
      onTagsChange([...selectedTags, tagName]);
      setNewTagInput('');
      setShowCreateInput(false);
    }
  }, [newTagInput, selectedTags, onTagsChange]);

  // キーボードショートカット
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showCreateInput && allowCreate) {
      e.preventDefault();
      handleCreateTag();
    }
    if (e.key === 'Escape') {
      setShowCreateInput(false);
      setShowDropdown(false);
    }
  }, [showCreateInput, allowCreate, handleCreateTag]);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.tag-filter-container')) {
        setShowDropdown(false);
        setShowCreateInput(false);
      }
    };

    if (showDropdown || showCreateInput) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [showDropdown, showCreateInput]);

  // タグカウント表示
  const getTagDisplay = (tag: TagInfo) => {
    return showCount ? `${tag.name} (${tag.count})` : tag.name;
  };

  // タグ色のクラス取得
  const getTagColorClass = (color: string, isSelected: boolean) => {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer';
    
    if (isSelected) {
      const selectedColors = {
        blue: 'bg-blue-500 text-white shadow-md',
        green: 'bg-green-500 text-white shadow-md',
        red: 'bg-red-500 text-white shadow-md',
        purple: 'bg-purple-500 text-white shadow-md',
        yellow: 'bg-yellow-500 text-white shadow-md',
        pink: 'bg-pink-500 text-white shadow-md',
        indigo: 'bg-indigo-500 text-white shadow-md',
        gray: 'bg-gray-500 text-white shadow-md',
        orange: 'bg-orange-500 text-white shadow-md'
      };
      return `${baseClasses} ${selectedColors[color as keyof typeof selectedColors] || selectedColors.gray}`;
    } else {
      const unselectedColors = {
        blue: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
        green: 'bg-green-100 text-green-800 hover:bg-green-200',
        red: 'bg-red-100 text-red-800 hover:bg-red-200',
        purple: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
        yellow: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
        pink: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
        indigo: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
        gray: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        orange: 'bg-orange-100 text-orange-800 hover:bg-orange-200'
      };
      return `${baseClasses} ${unselectedColors[color as keyof typeof unselectedColors] || unselectedColors.gray}`;
    }
  };

  return (
    <div className={`tag-filter-container ${className}`}>
      {/* 選択済みタグ表示 */}
      {selectedTags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              選択中のタグ ({selectedTags.length})
            </span>
            <button
              onClick={handleClearAll}
              className="text-xs text-red-600 hover:text-red-800 transition-colors"
              title="全てクリア"
            >
              クリア
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tagName => {
              const tagInfo = tagAnalysis.find(t => t.name === tagName);
              return (
                <div
                  key={tagName}
                  className={getTagColorClass(tagInfo?.color || 'gray', true)}
                >
                  <span>{getTagDisplay(tagInfo || { name: tagName, count: 0, color: 'gray', lastUsed: '' })}</span>
                  <button
                    onClick={() => handleTagToggle(tagName)}
                    className="ml-2 hover:bg-white hover:bg-opacity-20 rounded-full p-0.5 transition-colors"
                    title="タグを削除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* タグフィルタUI */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">タグでフィルタ</span>
          <span className="text-xs text-gray-500">({tagAnalysis.length}個のタグ)</span>
        </div>

        {/* 検索入力 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="タグを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* タグリスト */}
        <div className="space-y-2">
          {/* 利用可能なタグ */}
          <div>
            <div className="text-xs text-gray-500 mb-2">利用可能なタグ</div>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {displayTags.map(tag => (
                <button
                  key={tag.name}
                  onClick={() => handleTagToggle(tag.name)}
                  className={getTagColorClass(tag.color, selectedTags.includes(tag.name))}
                  title={`最終使用: ${new Date(tag.lastUsed).toLocaleDateString()}`}
                >
                  {getTagDisplay(tag)}
                </button>
              ))}
              
              {/* もっと見るボタン */}
              {!showAll && filteredTags.length > maxVisible && (
                <button
                  onClick={() => setShowAll(true)}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  +{filteredTags.length - maxVisible} 個もっと見る
                </button>
              )}
              
              {/* 折りたたみボタン */}
              {showAll && filteredTags.length > maxVisible && (
                <button
                  onClick={() => setShowAll(false)}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  折りたたむ
                </button>
              )}
            </div>
          </div>

          {/* 新しいタグ作成 */}
          {allowCreate && (
            <div>
              <div className="text-xs text-gray-500 mb-2">新しいタグ</div>
              {!showCreateInput ? (
                <button
                  onClick={() => setShowCreateInput(true)}
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  新しいタグを作成
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="新しいタグ名..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagInput.trim()}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    作成
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateInput(false);
                      setNewTagInput('');
                    }}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 統計情報 */}
        {tagAnalysis.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-600">
              <div className="flex justify-between items-center">
                <span>タグ統計</span>
                <span>{selectedTags.length}/{tagAnalysis.length} 選択中</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                最も使用: {tagAnalysis[0]?.name} ({tagAnalysis[0]?.count}回)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagFilterComponent;