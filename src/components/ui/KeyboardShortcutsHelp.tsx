import React, { memo, useState } from 'react';
import { HelpCircle, X, Command, MonitorSpeaker } from 'lucide-react';
import { useGlobalKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

const KeyboardShortcutsHelp: React.FC = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const shortcuts = useGlobalKeyboardShortcuts();

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const formatShortcut = (shortcut: any) => {
    const keys = [];
    
    if (shortcut.ctrl) {
      keys.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.alt) {
      keys.push(isMac ? '⌥' : 'Alt');
    }
    if (shortcut.shift) {
      keys.push(isMac ? '⇧' : 'Shift');
    }
    if (shortcut.meta) {
      keys.push('Meta');
    }
    
    keys.push(shortcut.key.toUpperCase());
    
    return keys.join(' + ');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="キーボードショートカット"
        aria-label="キーボードショートカットを表示"
      >
        <HelpCircle size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                {isMac ? <Command size={20} className="mr-2" /> : <MonitorSpeaker size={20} className="mr-2" />}
                キーボードショートカット
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded"
                aria-label="閉じる"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      {shortcut.description}
                    </span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-mono border border-gray-300 dark:border-gray-600">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ショートカットは現在のフォーカス位置に関係なく動作します
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

KeyboardShortcutsHelp.displayName = 'KeyboardShortcutsHelp';

export default KeyboardShortcutsHelp;