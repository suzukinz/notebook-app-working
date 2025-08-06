import React from 'react';
import { Edit3, FileText, X } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics';

interface EditorTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'rich' | 'markdown') => void;
}

const EditorTypeSelector: React.FC<EditorTypeSelectorProps> = ({ isOpen, onClose, onSelect }) => {
  const { tapFeedback, selectionFeedback } = useHaptics();

  const handleSelect = (type: 'rich' | 'markdown') => {
    selectionFeedback();
    onSelect(type);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm transform transition-transform scale-100">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            エディタを選択
          </h2>
          <button
            onClick={() => {
              tapFeedback();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          どちらのエディタでノートを作成しますか？
        </p>

        {/* エディタ選択肢 */}
        <div className="space-y-3">
          {/* リッチテキストエディタ */}
          <button
            onClick={() => handleSelect('rich')}
            className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50">
                <Edit3 size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">リッチテキスト</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  書式バー・画像・音声入力対応
                </p>
              </div>
            </div>
          </button>

          {/* Markdownエディタ */}
          <button
            onClick={() => handleSelect('markdown')}
            className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-4 group-hover:bg-green-200 dark:group-hover:bg-green-900/50">
                <FileText size={24} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">Markdown</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  マークダウン記法・ライブプレビュー
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* 説明 */}
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            💡 作成後もエディタタイプは変更できます
          </p>
        </div>
      </div>
    </div>
  );
};

export default EditorTypeSelector;