import React, { useState } from 'react';
import { X, Save, BookOpen } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useHaptics } from '../../hooks/useHaptics';

interface NotebookCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOTEBOOK_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#eab308'
];

const NotebookCreateModal: React.FC<NotebookCreateModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTEBOOK_COLORS[0]);
  
  const { addNotebook } = useNotebookStore();
  const { tapFeedback, successFeedback } = useHaptics();

  const handleSave = () => {
    if (name.trim()) {
      tapFeedback();
      const trimmedDescription = description.trim();
      addNotebook({
        name: name.trim(),
        color: selectedColor || '#3b82f6',
        ...(trimmedDescription && { description: trimmedDescription })
      });
      successFeedback();
      handleClose();
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setSelectedColor(NOTEBOOK_COLORS[0]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white dark:bg-gray-800 w-full rounded-t-2xl p-6 transform transition-transform max-h-[90vh] overflow-y-auto">
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
            新しいノートブック
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
            ノートブック名 *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 読書メモ、アイデア、会議記録"
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* 説明入力 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            説明（オプション）
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="このノートブックの用途を簡単に説明してください"
            rows={3}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* カラー選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            カラー
          </label>
          <div className="grid grid-cols-6 gap-3">
            {NOTEBOOK_COLORS.map((color) => (
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
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white mr-3"
              style={{ backgroundColor: selectedColor }}
            >
              <BookOpen size={20} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {name || 'ノートブック名'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description || 'ノートブックの説明'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                0 サブフォルダー • 0 ノート
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotebookCreateModal;