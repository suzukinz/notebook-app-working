import React from 'react';
import { Filter } from 'lucide-react';
import TagBadge from './TagBadge';
import { useNotebookStore } from '../../store/useNotebookStore';
import { Tag } from '../../types';

interface TagFilterProps {
  selectedTags: string[];
  onTagSelect: (tags: string[]) => void;
  className?: string;
}

const TagFilter: React.FC<TagFilterProps> = ({
  selectedTags,
  onTagSelect,
  className = ''
}) => {
  const { notesData } = useNotebookStore();

  // 動的にタグを抽出する
  const getAllTags = (): Tag[] => {
    const tagCounts: Record<string, number> = {};
    const tagColors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'indigo'];
    
    // 全ノートからタグを収集
    Object.values(notesData).flat().forEach(note => {
      note.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Tag[]型の配列に変換
    return Object.entries(tagCounts).map(([name, count], index) => ({
      name,
      color: tagColors[index % tagColors.length] || 'blue',
      count
    }));
  };

  const availableTags = getAllTags();

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

  return (
    <div className={`p-4 border-t ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center">
          <Filter size={16} className="mr-2" />
          タグでフィルタ
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
        {selectedTags.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">選択中のタグ:</div>
            <div className="flex flex-wrap gap-1 max-w-full">
              {selectedTags.map(tag => {
                const tagInfo = availableTags.find(t => t.name === tag);
                return (
                  <TagBadge
                    key={tag}
                    tag={tag}
                    color={tagInfo?.color || 'gray'}
                    removable
                    onRemove={() => toggleTag(tag)}
                    className="max-w-full"
                  />
                );
              })}
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500 mb-1">利用可能なタグ:</div>
        <div className="flex flex-wrap gap-1 max-w-full">
          {availableTags.length === 0 ? (
            <div className="text-xs text-gray-400 italic">
              ノートにタグが設定されていません
            </div>
          ) : (
            availableTags
              .filter(tag => !selectedTags.includes(tag.name))
              .map(tag => (
                <TagBadge
                  key={tag.name}
                  tag={`${tag.name} (${tag.count})`}
                  color={tag.color}
                  onClick={() => toggleTag(tag.name)}
                  className="max-w-full"
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TagFilter;