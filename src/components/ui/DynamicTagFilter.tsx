import React, { useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';

interface DynamicTagFilterProps {
  selectedTags: string[];
  onTagSelect: (tags: string[]) => void;
  className?: string;
}

const DynamicTagFilter: React.FC<DynamicTagFilterProps> = ({
  selectedTags,
  onTagSelect,
  className = ''
}) => {
  const { notesData } = useNotebookStore();
  
  // すべてのノートからタグを収集し、カウント
  const tagData = useMemo(() => {
    const tagCounts = new Map<string, number>();
    
    // すべてのノートからタグを収集
    Object.values(notesData).forEach(notes => {
      notes.forEach(note => {
        (note.tags || []).forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      });
    });
    
    // タグをカウント順にソート
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
      'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'bg-green-100 text-green-800 hover:bg-green-200',
      'bg-purple-100 text-purple-800 hover:bg-purple-200',
      'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      'bg-pink-100 text-pink-800 hover:bg-pink-200',
      'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
      'bg-red-100 text-red-800 hover:bg-red-200',
      'bg-gray-100 text-gray-800 hover:bg-gray-200'
    ];
    return colors[index % colors.length];
  };
  
  if (tagData.length === 0) {
    return null;
  }
  
  return (
    <div className={`p-3 border-t border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-600 flex items-center">
          <Filter size={12} className="mr-1" />
          タグ
        </h3>
        {selectedTags.length > 0 && (
          <button
            onClick={clearAllTags}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            クリア
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {/* 選択中のタグ */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 max-w-full">
            {selectedTags.map((tag, index) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`inline-flex items-center px-2 py-1 text-xs rounded-full transition-colors max-w-full truncate ${getTagColor(index)}`}
                title={tag}
              >
                <span className="truncate max-w-20">{tag}</span>
                <X size={10} className="ml-1 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
        
        {/* 利用可能なタグ */}
        <div className="flex flex-wrap gap-1 max-w-full">
          {tagData
            .filter(({ tag }) => !selectedTags.includes(tag))
            .slice(0, 8) // 最大8個まで表示
            .map(({ tag, count }, index) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-1 text-xs rounded-full transition-colors max-w-full truncate ${getTagColor(index + selectedTags.length)}`}
                title={`${tag} (${count})`}
              >
                <span className="truncate max-w-24">{tag} ({count})</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default DynamicTagFilter;