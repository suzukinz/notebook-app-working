import React from 'react';
import { X, Keyboard, Zap, Hash, Bold, Italic } from 'lucide-react';
import { markdownKeyboardShortcuts } from '../../utils/markdownKeyboardShortcuts';
import { useHaptics } from '../../hooks/useHaptics';

interface MarkdownShortcutHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const MarkdownShortcutHelp: React.FC<MarkdownShortcutHelpProps> = ({ isOpen, onClose }) => {
  const { tapFeedback } = useHaptics();
  const shortcutCategories = markdownKeyboardShortcuts.getShortcutsByCategory();

  // カテゴリーアイコンマッピング
  const categoryIcons: { [key: string]: React.ReactNode } = {
    'フォーマット': <Bold size={20} className="text-blue-600 dark:text-blue-400" />,
    '見出し': <Hash size={20} className="text-green-600 dark:text-green-400" />,
    'リスト': <Italic size={20} className="text-purple-600 dark:text-purple-400" />,
    'コード': <Zap size={20} className="text-yellow-600 dark:text-yellow-400" />,
    '編集': <Keyboard size={20} className="text-red-600 dark:text-red-400" />,
    '検索': <X size={20} className="text-indigo-600 dark:text-indigo-400" />,
    'その他': <Keyboard size={20} className="text-gray-600 dark:text-gray-400" />
  };

  // キーの組み合わせを表示用にフォーマット
  const formatKeyCombo = (shortcut: any): string => {
    const parts = [];
    if (shortcut.ctrlKey || shortcut.metaKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    
    let key = shortcut.key;
    if (key === ' ') key = 'Space';
    if (key === 'Enter') key = 'Enter';
    if (key === 'Tab') key = 'Tab';
    
    parts.push(key.toUpperCase());
    return parts.join(' + ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Keyboard size={24} className="text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              キーボードショートカット
            </h2>
          </div>
          <button
            onClick={() => {
              tapFeedback();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="p-6 space-y-6">
            {/* 基本的な使い方 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                基本的な使い方
              </h3>
              <div className="text-blue-800 dark:text-blue-200 text-sm space-y-1">
                <p>• シンタックスハイライトモードでキーボードショートカットが有効になります</p>
                <p>• テキストを選択してからショートカットを使うと選択範囲が対象になります</p>
                <p>• 何も選択していない場合はデフォルトのテキストが挿入されます</p>
              </div>
            </div>

            {/* ショートカット一覧 */}
            {Object.entries(shortcutCategories).map(([category, shortcuts]) => {
              if (shortcuts.length === 0) return null;
              
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {categoryIcons[category]}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {category}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {shortcuts.map((shortcut, index) => (
                      <div
                        key={`${category}-${index}`}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {shortcut.description}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-3">
                          {formatKeyCombo(shortcut).split(' + ').map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              {keyIndex > 0 && (
                                <span className="text-gray-400 text-xs">+</span>
                              )}
                              <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300 shadow-sm">
                                {key}
                              </kbd>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* 特別なキー */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                特別なキー
              </h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center justify-between">
                  <span>選択したテキストを太字にする</span>
                  <div className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl</kbd>
                    <span className="text-xs">+</span>
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">B</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>検索・置換ダイアログを開く</span>
                  <div className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl</kbd>
                    <span className="text-xs">+</span>
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">F</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>行を複製する</span>
                  <div className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">Ctrl</kbd>
                    <span className="text-xs">+</span>
                    <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">D</kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* ヒント */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                💡 ヒント
              </h3>
              <div className="text-yellow-800 dark:text-yellow-200 text-sm space-y-1">
                <p>• 数字キー（1〜6）と Ctrl を組み合わせると見出しレベルを設定できます</p>
                <p>• Tab キーでインデント、Shift + Tab でアウトデントができます</p>
                <p>• Shift + Enter で改行（<code>  \n</code>）を挿入できます</p>
                <p>• Ctrl + K でリンク、Ctrl + G で画像を素早く挿入できます</p>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            これらのショートカットはシンタックスハイライトモードでのみ利用できます
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownShortcutHelp;