import React, { useEffect, useRef } from 'react';
import { Edit2, Trash2, X } from 'lucide-react';

interface WorkspaceContextMenuProps {
  x: number;
  y: number;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  canDelete: boolean;
}

const WorkspaceContextMenu: React.FC<WorkspaceContextMenuProps> = ({
  x,
  y,
  onEdit,
  onDelete,
  onClose,
  canDelete
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute z-[9999] bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-40"
      style={{ left: x, top: y }}
    >
      <button
        onClick={onEdit}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
      >
        <Edit2 size={16} />
        <span>編集</span>
      </button>
      
      {canDelete && (
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
        >
          <Trash2 size={16} />
          <span>削除</span>
        </button>
      )}
      
      {!canDelete && (
        <div className="px-4 py-2 text-sm text-gray-400 cursor-not-allowed flex items-center space-x-2">
          <Trash2 size={16} />
          <span>削除（最低1つ必要）</span>
        </div>
      )}
      
      <div className="border-t border-gray-200 my-1"></div>
      
      <button
        onClick={onClose}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
      >
        <X size={16} />
        <span>閉じる</span>
      </button>
    </div>
  );
};

export default WorkspaceContextMenu;