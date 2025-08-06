import React from 'react';
import { Star, Trash2, Share2, Copy, ChevronRight } from 'lucide-react';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useHaptics } from '../../hooks/useHaptics';
import { Note } from '../../types';

interface SwipeableNoteItemProps {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onShare?: () => void;
  onCopy?: () => void;
}

const SwipeableNoteItem: React.FC<SwipeableNoteItemProps> = ({
  note,
  onEdit,
  onDelete,
  onToggleFavorite,
  onShare,
  onCopy
}) => {
  const { tapFeedback } = useHaptics();

  const leftActions = [
    {
      id: 'favorite',
      label: note.isFavorite ? 'お気に入り解除' : 'お気に入り',
      icon: <Star size={20} className={note.isFavorite ? 'fill-current' : ''} />,
      backgroundColor: '#f59e0b',
      textColor: '#ffffff',
      onAction: onToggleFavorite
    }
  ];

  const rightActions = [
    ...(onShare ? [{
      id: 'share',
      label: '共有',
      icon: <Share2 size={20} />,
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      onAction: onShare
    }] : []),
    ...(onCopy ? [{
      id: 'copy',
      label: '複製',
      icon: <Copy size={20} />,
      backgroundColor: '#10b981',
      textColor: '#ffffff',
      onAction: onCopy
    }] : []),
    {
      id: 'delete',
      label: '削除',
      icon: <Trash2 size={20} />,
      backgroundColor: '#ef4444',
      textColor: '#ffffff',
      onAction: onDelete
    }
  ];

  const {
    swipeProps,
    showLeftActions,
    showRightActions,
    leftActions: visibleLeftActions,
    rightActions: visibleRightActions
  } = useSwipeGesture({
    leftActions,
    rightActions,
    threshold: 75
  });

  const handleNoteClick = () => {
    tapFeedback();
    onEdit();
  };

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
      {/* 左側アクション（お気に入り） */}
      {showLeftActions && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center">
          {visibleLeftActions.map((action) => (
            <div
              key={action.id}
              className="h-full flex items-center justify-center px-6"
              style={{ backgroundColor: action.backgroundColor }}
            >
              <div className="flex flex-col items-center">
                <div style={{ color: action.textColor }}>
                  {action.icon}
                </div>
                <span 
                  className="text-xs mt-1 font-medium"
                  style={{ color: action.textColor }}
                >
                  {action.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 右側アクション（共有・複製・削除） */}
      {showRightActions && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center">
          {visibleRightActions.map((action) => (
            <div
              key={action.id}
              className="h-full flex items-center justify-center px-6"
              style={{ backgroundColor: action.backgroundColor }}
            >
              <div className="flex flex-col items-center">
                <div style={{ color: action.textColor }}>
                  {action.icon}
                </div>
                <span 
                  className="text-xs mt-1 font-medium"
                  style={{ color: action.textColor }}
                >
                  {action.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* メインノートアイテム */}
      <div
        {...swipeProps}
        className="bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-200 dark:border-gray-700 active:bg-gray-50 dark:active:bg-gray-700 cursor-pointer"
        onClick={handleNoteClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-white">{note.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {(note.pages[0]?.content || '').replace(/<[^>]*>/g, '').substring(0, 100)}
              {(note.pages[0]?.content || '').length > 100 ? '...' : ''}
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(note.updatedAt).toLocaleDateString()}
              </span>
              <div className="flex items-center space-x-2">
                {note.isPinned && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
                {note.isFavorite && (
                  <Star size={14} className="text-yellow-500 fill-current" />
                )}
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwipeableNoteItem;