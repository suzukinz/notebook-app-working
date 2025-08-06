import React from 'react';
import { X } from 'lucide-react';

interface TagBadgeProps {
  tag: string;
  color: string;
  size?: 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  color,
  size = 'sm',
  removable = false,
  onRemove,
  onClick,
  className = ''
}) => {
  const getColorClasses = (color: string) => {
    const colorMap = {
      red: 'bg-red-100 text-red-800',
      orange: 'bg-orange-100 text-orange-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      pink: 'bg-pink-100 text-pink-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      gray: 'bg-gray-100 text-gray-800'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium max-w-full ${getColorClasses(color)} ${sizeClasses[size]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={onClick}
      title={tag}
    >
      <span className="truncate max-w-32">{tag}</span>
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 text-current hover:text-red-600 transition-colors flex-shrink-0"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
};

export default TagBadge;