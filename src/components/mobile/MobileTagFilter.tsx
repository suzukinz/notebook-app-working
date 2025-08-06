import React, { useMemo } from 'react';
import { Tag, X } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';

interface MobileTagFilterProps {
  selectedTags: string[];
  onTagSelect: (tags: string[]) => void;
  onClose: () => void;
}

const MobileTagFilter: React.FC<MobileTagFilterProps> = ({
  selectedTags,
  onTagSelect,
  onClose
}) => {
  const { notesData } = useNotebookStore();
  
  // すべてのノートからタグを収集し、カウント
  const tagData = useMemo(() => {
    const tagCounts = new Map<string, number>();
    
    Object.values(notesData).forEach(notes => {
      notes.forEach(note => {
        (note.tags || []).forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });
    });
    
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [notesData]);
  
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagSelect(selectedTags.filter(t => t !== tag));
    } else {
      onTagSelect([...selectedTags, tag]);
    }
  };
  
  const clearAllTags = () => {
    onTagSelect([]);
  };
  
  const getTagColor = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-green-100 text-green-700 border-green-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-yellow-100 text-yellow-700 border-yellow-200',
      'bg-pink-100 text-pink-700 border-pink-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-red-100 text-red-700 border-red-200',
      'bg-gray-100 text-gray-700 border-gray-200'
    ];
    return colors[index % colors.length];
  };
  
  if (tagData.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Tag size={16} className="mr-2 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">タグ</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">利用可能なタグがありません</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Tag size={16} className="mr-2 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">タグフィルター</span>
          {selectedTags.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
              {selectedTags.length}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {selectedTags.length > 0 && (
            <button
              onClick={clearAllTags}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              すべてクリア
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>
      </div>
      
      {/* タグ一覧 */}
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
        {tagData.map(({ tag, count }, index) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`inline-flex items-center px-3 py-1 text-sm rounded-full border transition-colors ${
                isSelected
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : getTagColor(index) + ' hover:opacity-80'
              }`}
            >
              <span className="mr-1">{tag}</span>
              <span className="text-xs opacity-75">({count})</span>
              {isSelected && <X size={12} className="ml-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileTagFilter;