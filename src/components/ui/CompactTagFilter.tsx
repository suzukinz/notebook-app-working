import React, { useState, useMemo } from 'react';
import { Tag, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';

interface CompactTagFilterProps {
  selectedTags: string[];
  onTagSelect: (tags: string[]) => void;
  className?: string;
}

const CompactTagFilter: React.FC<CompactTagFilterProps> = ({
  selectedTags,
  onTagSelect,
  className = ''
}) => {
  const { notesData } = useNotebookStore();
  const [isExpanded, setIsExpanded] = useState(false);
  
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
      'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200',
      'bg-green-100 text-green-700 border-green-200 hover:bg-green-200',
      'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200',
      'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200',
      'bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200',
      'bg-red-100 text-red-700 border-red-200 hover:bg-red-200',
      'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
    ];
    return colors[index % colors.length];
  };
  
  if (tagData.length === 0) {
    return null;
  }
  
  return (
    <div className={`min-w-0 overflow-hidden ${className}`}>
      {/* タグフィルタヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Tag size={14} className="mr-1" />
          タグフィルタ
          {isExpanded ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
          {selectedTags.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {selectedTags.length}
            </span>
          )}
        </button>
        
        {selectedTags.length > 0 && (
          <button
            onClick={clearAllTags}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            すべてクリア
          </button>
        )}
      </div>
      
      {/* 選択中のタグ（常に表示） */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 w-full overflow-hidden">
          {selectedTags.map((tag, index) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`inline-flex items-center px-2 py-1 text-xs rounded-full border transition-colors max-w-full truncate ${getTagColor(index)}`}
              title={tag}
            >
              <span className="truncate max-w-20">{tag}</span>
              <X size={10} className="ml-1 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
      
      {/* 展開時のタグ一覧 */}
      {isExpanded && (
        <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg border w-full overflow-hidden">
          {tagData
            .filter(({ tag }) => !selectedTags.includes(tag))
            .map(({ tag, count }, index) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-1 text-xs rounded-full border transition-colors max-w-full truncate ${getTagColor(index + selectedTags.length)}`}
                title={`${tag} (${count})`}
              >
                <span className="truncate max-w-24">{tag} ({count})</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default CompactTagFilter;