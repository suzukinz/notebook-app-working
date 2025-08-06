import React from 'react';
import Modal from '../ui/Modal';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  isOpen,
  onClose
}) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';
  const altKey = isMac ? '⌥' : 'Alt';
  const shiftKey = '⇧';

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: '全般',
      shortcuts: [
        { keys: [cmdKey, 'N'], description: '新しいノートを作成' },
        { keys: [cmdKey, 'S'], description: '現在のノートを保存' },
        { keys: [cmdKey, 'F'], description: '検索にフォーカス' },
        { keys: [cmdKey, 'K'], description: 'コマンドパレットを開く' },
        { keys: [cmdKey, 'B'], description: 'サイドバーを切り替え' },
        { keys: [cmdKey, 'P'], description: 'プレビューモードを切り替え' },
        { keys: [cmdKey, '/'], description: 'このヘルプを表示' },
        { keys: ['Esc'], description: 'ダイアログを閉じる' },
      ]
    },
    {
      title: 'ナビゲーション',
      shortcuts: [
        { keys: [cmdKey, 'Tab'], description: '次のノートに切り替え' },
        { keys: [cmdKey, shiftKey, 'Tab'], description: '前のノートに切り替え' },
        { keys: [cmdKey, 'Enter'], description: '新しいページを追加' },
        { keys: ['PageUp'], description: '前のページへ' },
        { keys: ['PageDown'], description: '次のページへ' },
        { keys: [cmdKey, '1'], description: 'ワークスペース 1' },
        { keys: [cmdKey, '2'], description: 'ワークスペース 2' },
        { keys: [cmdKey, '3'], description: 'ワークスペース 3' },
      ]
    },
    {
      title: 'テキスト編集',
      shortcuts: [
        { keys: [cmdKey, 'B'], description: '太字' },
        { keys: [cmdKey, 'I'], description: '斜体' },
        { keys: [cmdKey, 'U'], description: '下線' },
        { keys: [cmdKey, shiftKey, 'X'], description: '取り消し線' },
        { keys: [cmdKey, 'Z'], description: '元に戻す' },
        { keys: [cmdKey, 'Y'], description: 'やり直し' },
        { keys: [cmdKey, 'X'], description: '切り取り' },
        { keys: [cmdKey, 'C'], description: 'コピー' },
        { keys: [cmdKey, 'V'], description: '貼り付け' },
      ]
    },
    {
      title: '書式設定',
      shortcuts: [
        { keys: [cmdKey, altKey, '1'], description: '見出し 1' },
        { keys: [cmdKey, altKey, '2'], description: '見出し 2' },
        { keys: [cmdKey, altKey, '3'], description: '見出し 3' },
        { keys: [cmdKey, shiftKey, 'L'], description: '箇条書きリスト' },
        { keys: [cmdKey, shiftKey, 'O'], description: '番号付きリスト' },
        { keys: [cmdKey, shiftKey, 'Q'], description: '引用' },
        { keys: [cmdKey, '`'], description: 'インラインコード' },
        { keys: [cmdKey, shiftKey, '`'], description: 'コードブロック' },
      ]
    },
    {
      title: '挿入',
      shortcuts: [
        { keys: [cmdKey, 'K'], description: 'リンクを挿入' },
        { keys: [cmdKey, shiftKey, 'I'], description: '画像を挿入' },
        { keys: [cmdKey, shiftKey, 'T'], description: 'テーブルを挿入' },
        { keys: [cmdKey, 'E'], description: '絵文字を挿入' },
        { keys: [cmdKey, 'D'], description: '現在の日付を挿入' },
      ]
    }
  ];

  const renderKeyCombo = (keys: string[]) => (
    <div className="flex items-center space-x-1">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 border border-gray-300 rounded shadow-sm">
            {key}
          </kbd>
          {index < keys.length - 1 && <span className="text-gray-400">+</span>}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="⌨️ キーボードショートカット"
      size="xl"
    >
      <div className="max-h-96 overflow-y-auto">
        <div className="space-y-6">
          {shortcutGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Keyboard size={18} className="mr-2 text-blue-600" />
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, shortcutIndex) => (
                  <div
                    key={shortcutIndex}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-700">
                      {shortcut.description}
                    </span>
                    {renderKeyCombo(shortcut.keys)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">💡 ヒント</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• このダイアログは <kbd className="px-1 bg-white border rounded">Ctrl+/</kbd> でいつでも開けます</p>
            <p>• {isMac ? 'Cmd' : 'Ctrl'}キーは{isMac ? ' Command ⌘' : ' Ctrl'}キーです</p>
            <p>• エディタにフォーカスがあるときは、テキスト編集のショートカットが使用できます</p>
            <p>• モーダルが開いているときは、Escキーで閉じることができます</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="キーボードショートカットダイアログを閉じる"
        >
          閉じる
        </button>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsDialog;