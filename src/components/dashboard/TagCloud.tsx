import React from 'react';
import { Tag } from 'lucide-react';
import { DashboardStats } from '../../utils/analytics';

interface TagCloudProps {
  tags: DashboardStats['mostUsedTags'];
}

const TagCloud: React.FC<TagCloudProps> = ({ tags }) => {
  if (tags.length === 0) {
    return (
      <div className="text-center py-8">
        <Tag className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500 dark:text-gray-400">タグが見つかりません</p>
      </div>
    );
  }

  const maxCount = Math.max(...tags.map(tag => tag.count));
  
  const getSizeClass = (count: number): string => {
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 'text-lg font-bold';
    if (ratio >= 0.6) return 'text-base font-semibold';
    if (ratio >= 0.4) return 'text-sm font-medium';
    return 'text-xs';
  };

  const getColorClass = (index: number): string => {
    const colors = [
      'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900',
      'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900',
      'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900',
      'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900',
      'text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900',
      'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-3">
      {tags.map((tag, index) => (
        <div 
          key={tag.tag}
          className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-2">
            <span 
              className={`px-3 py-1 rounded-full ${getSizeClass(tag.count)} ${getColorClass(index)}`}
            >
              #{tag.tag}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {tag.count}
            </span>
            <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${getColorClass(index).split(' ')[0].replace('text', 'bg')}`}
                style={{ width: `${(tag.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TagCloud;