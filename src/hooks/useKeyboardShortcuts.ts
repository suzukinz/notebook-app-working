import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // エディタ内では通常のキー操作を優先
      const target = event.target as HTMLElement;
      if (target.contentEditable === 'true' || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // エディタ内での矢印キーなどの基本操作は完全に除外
        return;
      }

      shortcuts.forEach(({ key, ctrl, alt, shift, meta, action }) => {
        // 修飾キーの正しい判定ロジック
        const isCtrlMatch = ctrl === undefined ? true : (ctrl ? event.ctrlKey : !event.ctrlKey);
        const isAltMatch = alt === undefined ? true : (alt ? event.altKey : !event.altKey);
        const isShiftMatch = shift === undefined ? true : (shift ? event.shiftKey : !event.shiftKey);
        const isMetaMatch = meta === undefined ? true : (meta ? event.metaKey : !event.metaKey);

        if (
          event.key.toLowerCase() === key.toLowerCase() &&
          isCtrlMatch &&
          isAltMatch &&
          isShiftMatch &&
          isMetaMatch
        ) {
          event.preventDefault();
          action();
        }
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

export const useGlobalKeyboardShortcuts = () => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'n',
      ctrl: true,
      action: () => {
        // 新しいノートを作成
        const event = new CustomEvent('createNewNote');
        window.dispatchEvent(event);
      },
      description: '新しいノートを作成'
    },
    {
      key: 's',
      ctrl: true,
      action: () => {
        // 現在のノートを保存
        const event = new CustomEvent('saveCurrentNote');
        window.dispatchEvent(event);
      },
      description: '現在のノートを保存'
    },
    {
      key: 'f',
      ctrl: true,
      action: () => {
        // 検索にフォーカス
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: '検索にフォーカス'
    },
    {
      key: 'k',
      ctrl: true,
      action: () => {
        // コマンドパレットを開く
        const event = new CustomEvent('openCommandPalette');
        window.dispatchEvent(event);
      },
      description: 'コマンドパレットを開く'
    },
    {
      key: 'b',
      ctrl: true,
      action: () => {
        // サイドバーを切り替え
        const event = new CustomEvent('toggleSidebar');
        window.dispatchEvent(event);
      },
      description: 'サイドバーを切り替え'
    },
    {
      key: 'p',
      ctrl: true,
      action: () => {
        // プレビューモードを切り替え
        const event = new CustomEvent('togglePreview');
        window.dispatchEvent(event);
      },
      description: 'プレビューモードを切り替え'
    },
    {
      key: 'Enter',
      ctrl: true,
      action: () => {
        // 新しいページを追加
        const event = new CustomEvent('addNewPage');
        window.dispatchEvent(event);
      },
      description: '新しいページを追加'
    },
    {
      key: 'Tab',
      ctrl: true,
      action: () => {
        // 次のタブに切り替え
        const event = new CustomEvent('switchToNextNote');
        window.dispatchEvent(event);
      },
      description: '次のノートに切り替え'
    },
    {
      key: 'Tab',
      ctrl: true,
      shift: true,
      action: () => {
        // 前のタブに切り替え
        const event = new CustomEvent('switchToPreviousNote');
        window.dispatchEvent(event);
      },
      description: '前のノートに切り替え'
    },
    {
      key: 'Escape',
      action: () => {
        // モーダルを閉じる
        const event = new CustomEvent('closeModal');
        window.dispatchEvent(event);
      },
      description: 'モーダルを閉じる'
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
};