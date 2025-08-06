import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useHaptics } from '../../hooks/useHaptics';

interface WorkspaceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WORKSPACE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#eab308'
];

const WORKSPACE_ICONS = [
  '📁', '💼', '📚', '🎯', '💡', '🚀', 
  '🎨', '🔬', '💻', '📊', '🏠', '🌟'
];

const WorkspaceCreateModal: React.FC<WorkspaceCreateModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(WORKSPACE_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(WORKSPACE_ICONS[0]);
  
  const { addWorkspace } = useNotebookStore();
  const { tapFeedback, successFeedback } = useHaptics();

  const handleSave = () => {
    if (name.trim()) {
      tapFeedback();
      addWorkspace({
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor
      });
      successFeedback();
      handleClose();
    }
  };

  const handleClose = () => {
    setName('');
    setSelectedColor(WORKSPACE_COLORS[0]);
    setSelectedIcon(WORKSPACE_ICONS[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white dark:bg-gray-800 w-full rounded-t-2xl p-6 transform transition-transform">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              tapFeedback();
              handleClose();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            新しいワークスペース
          </h2>
          
          <button
            onClick={() => {
              tapFeedback();
              handleSave();
            }}
            disabled={!name.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg"
          >
            <Save size={20} className="text-white" />
          </button>
        </div>

        {/* 名前入力 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ワークスペース名
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 仕事、プライベート、学習"
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* アイコン選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            アイコン
          </label>
          <div className="grid grid-cols-6 gap-3">
            {WORKSPACE_ICONS.map((icon) => (
              <button
                key={icon}
                onClick={() => {
                  tapFeedback();
                  setSelectedIcon(icon);
                }}
                className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                  selectedIcon === icon
                    ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500 scale-110'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* カラー選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            カラー
          </label>
          <div className="grid grid-cols-6 gap-3">
            {WORKSPACE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  tapFeedback();
                  setSelectedColor(color);
                }}
                className={`w-12 h-12 rounded-xl transition-all ${
                  selectedColor === color
                    ? 'ring-4 ring-offset-2 dark:ring-offset-gray-800 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ 
                  backgroundColor: color
                }}
              />
            ))}
          </div>
        </div>

        {/* プレビュー */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">プレビュー</p>
          <div className="flex items-center">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold mr-3"
              style={{ backgroundColor: selectedColor }}
            >
              {selectedIcon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {name || 'ワークスペース名'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">0 ノートブック</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceCreateModal;