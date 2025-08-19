// Markdown専用キーボードショートカットシステム

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: string;
  description: string;
  callback: (event: KeyboardEvent, selection: { start: number; end: number; text: string }) => {
    newText: string;
    newCursorPosition: number;
    preventDefault?: boolean;
  };
}

export interface TextSelection {
  start: number;
  end: number;
  text: string;
}

export class MarkdownKeyboardShortcuts {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();

  constructor() {
    this.initializeDefaultShortcuts();
  }

  // デフォルトのショートカットを初期化
  private initializeDefaultShortcuts() {
    const shortcuts: KeyboardShortcut[] = [
      // 基本的なフォーマット
      {
        key: 'b',
        ctrlKey: true,
        action: 'bold',
        description: '太字',
        callback: (_, selection) => this.wrapText(selection, '**', '**', '太字テキスト')
      },
      {
        key: 'i',
        ctrlKey: true,
        action: 'italic',
        description: '斜体',
        callback: (_, selection) => this.wrapText(selection, '*', '*', '斜体テキスト')
      },
      {
        key: 'u',
        ctrlKey: true,
        action: 'underline',
        description: '下線（HTML）',
        callback: (_, selection) => this.wrapText(selection, '<u>', '</u>', '下線テキスト')
      },
      {
        key: 'k',
        ctrlKey: true,
        action: 'link',
        description: 'リンク',
        callback: (_, selection) => this.wrapText(selection, '[', '](URL)', 'リンクテキスト')
      },

      // 見出し
      {
        key: '1',
        ctrlKey: true,
        action: 'heading1',
        description: '見出し1',
        callback: (_, selection) => this.insertLinePrefix(selection, '# ')
      },
      {
        key: '2',
        ctrlKey: true,
        action: 'heading2',
        description: '見出し2',
        callback: (_, selection) => this.insertLinePrefix(selection, '## ')
      },
      {
        key: '3',
        ctrlKey: true,
        action: 'heading3',
        description: '見出し3',
        callback: (_, selection) => this.insertLinePrefix(selection, '### ')
      },
      {
        key: '4',
        ctrlKey: true,
        action: 'heading4',
        description: '見出し4',
        callback: (_, selection) => this.insertLinePrefix(selection, '#### ')
      },
      {
        key: '5',
        ctrlKey: true,
        action: 'heading5',
        description: '見出し5',
        callback: (_, selection) => this.insertLinePrefix(selection, '##### ')
      },
      {
        key: '6',
        ctrlKey: true,
        action: 'heading6',
        description: '見出し6',
        callback: (_, selection) => this.insertLinePrefix(selection, '###### ')
      },

      // リスト
      {
        key: 'l',
        ctrlKey: true,
        action: 'unordered-list',
        description: '箇条書きリスト',
        callback: (_, selection) => this.insertLinePrefix(selection, '- ')
      },
      {
        key: 'l',
        ctrlKey: true,
        shiftKey: true,
        action: 'ordered-list',
        description: '番号付きリスト',
        callback: (_, selection) => this.insertNumberedList(selection)
      },
      {
        key: 't',
        ctrlKey: true,
        action: 'task-list',
        description: 'タスクリスト',
        callback: (_, selection) => this.insertLinePrefix(selection, '- [ ] ')
      },

      // 引用・コード
      {
        key: 'q',
        ctrlKey: true,
        action: 'quote',
        description: '引用',
        callback: (_, selection) => this.insertLinePrefix(selection, '> ')
      },
      {
        key: '`',
        ctrlKey: true,
        action: 'inline-code',
        description: 'インラインコード',
        callback: (_, selection) => this.wrapText(selection, '`', '`', 'コード')
      },
      {
        key: '`',
        ctrlKey: true,
        shiftKey: true,
        action: 'code-block',
        description: 'コードブロック',
        callback: (_, selection) => this.insertCodeBlock(selection)
      },

      // テーブル・画像
      {
        key: 't',
        ctrlKey: true,
        shiftKey: true,
        action: 'table',
        description: 'テーブル',
        callback: (_, selection) => this.insertTable(selection)
      },
      {
        key: 'g',
        ctrlKey: true,
        action: 'image',
        description: '画像',
        callback: (_, selection) => this.wrapText(selection, '![', '](画像URL)', '画像の説明')
      },

      // 水平線・改行
      {
        key: 'r',
        ctrlKey: true,
        action: 'horizontal-rule',
        description: '水平線',
        callback: (_, selection) => this.insertText(selection, '\n\n---\n\n')
      },
      {
        key: 'Enter',
        shiftKey: true,
        action: 'line-break',
        description: '改行',
        callback: (_, selection) => this.insertText(selection, '  \n')
      },

      // 検索・置換
      {
        key: 'f',
        ctrlKey: true,
        action: 'find',
        description: '検索',
        callback: () => ({ newText: '', newCursorPosition: 0, preventDefault: true })
      },
      {
        key: 'h',
        ctrlKey: true,
        action: 'replace',
        description: '置換',
        callback: () => ({ newText: '', newCursorPosition: 0, preventDefault: true })
      },

      // 選択・編集
      {
        key: 'a',
        ctrlKey: true,
        action: 'select-all',
        description: '全選択',
        callback: () => ({ newText: '', newCursorPosition: 0, preventDefault: false })
      },
      {
        key: 'd',
        ctrlKey: true,
        action: 'duplicate-line',
        description: '行複製',
        callback: (_, selection) => this.duplicateLine(selection)
      },
      {
        key: 'x',
        ctrlKey: true,
        shiftKey: true,
        action: 'delete-line',
        description: '行削除',
        callback: (_, selection) => this.deleteLine(selection)
      },

      // インデント
      {
        key: 'Tab',
        action: 'indent',
        description: 'インデント',
        callback: (_, selection) => this.indentText(selection, true)
      },
      {
        key: 'Tab',
        shiftKey: true,
        action: 'outdent',
        description: 'アウトデント',
        callback: (_, selection) => this.indentText(selection, false)
      },

      // 特殊記号
      {
        key: 'e',
        ctrlKey: true,
        action: 'emoji',
        description: '絵文字パレット',
        callback: (_, selection) => this.insertText(selection, ':smile:')
      },
      {
        key: 'm',
        ctrlKey: true,
        action: 'math',
        description: '数式',
        callback: (_, selection) => this.wrapText(selection, '$', '$', 'x^2 + y^2 = z^2')
      },
      {
        key: 'm',
        ctrlKey: true,
        shiftKey: true,
        action: 'math-block',
        description: '数式ブロック',
        callback: (_, selection) => this.insertText(selection, '\n\n$$\n数式をここに入力\n$$\n\n')
      }
    ];

    shortcuts.forEach(shortcut => {
      this.addShortcut(shortcut);
    });
  }

  // ショートカットを追加
  addShortcut(shortcut: KeyboardShortcut) {
    const key = this.generateShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }

  // ショートカットを削除
  removeShortcut(action: string) {
    for (const [key, shortcut] of this.shortcuts.entries()) {
      if (shortcut.action === action) {
        this.shortcuts.delete(key);
        break;
      }
    }
  }

  // キーイベントを処理
  handleKeyDown(
    event: KeyboardEvent,
    currentText: string,
    selectionStart: number,
    selectionEnd: number,
    onTextChange: (newText: string, newCursorPosition: number) => void,
    onSpecialAction?: (action: string) => void
  ): boolean {
    try {
      const key = this.generateEventKey(event);
      const shortcut = this.shortcuts.get(key);

      if (!shortcut) return false;

      const selection: TextSelection = {
        start: selectionStart,
        end: selectionEnd,
        text: currentText.substring(selectionStart, selectionEnd)
      };

      const result = shortcut.callback(event, selection);

      // 特別なアクション（検索・置換など）の場合
      if (result.preventDefault && onSpecialAction) {
        event.preventDefault();
        onSpecialAction(shortcut.action);
        return true;
      }

      // 通常のテキスト変更の場合
      if (result.newText !== '') {
        event.preventDefault();
        onTextChange(result.newText, result.newCursorPosition);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Keyboard shortcut error:', error);
      return false;
    }
  }

  // 利用可能なショートカット一覧を取得
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  // ショートカットをカテゴリ別に取得
  getShortcutsByCategory(): { [category: string]: KeyboardShortcut[] } {
    const categories: { [category: string]: KeyboardShortcut[] } = {
      'フォーマット': [],
      '見出し': [],
      'リスト': [],
      'コード': [],
      'その他': [],
      '編集': [],
      '検索': []
    };

    this.getShortcuts().forEach(shortcut => {
      if (['bold', 'italic', 'underline', 'link'].includes(shortcut.action)) {
        categories['フォーマット']!.push(shortcut);
      } else if (shortcut.action.startsWith('heading')) {
        categories['見出し']!.push(shortcut);
      } else if (shortcut.action.includes('list') || shortcut.action === 'task-list') {
        categories['リスト']!.push(shortcut);
      } else if (shortcut.action.includes('code') || shortcut.action === 'quote') {
        categories['コード']!.push(shortcut);
      } else if (['find', 'replace'].includes(shortcut.action)) {
        categories['検索']!.push(shortcut);
      } else if (['duplicate-line', 'delete-line', 'indent', 'outdent', 'select-all'].includes(shortcut.action)) {
        categories['編集']!.push(shortcut);
      } else {
        categories['その他']!.push(shortcut);
      }
    });

    return categories;
  }

  // プライベートメソッド：ショートカットキーを生成
  private generateShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = [];
    if (shortcut.ctrlKey || shortcut.metaKey) modifiers.push('ctrl');
    if (shortcut.shiftKey) modifiers.push('shift');
    if (shortcut.altKey) modifiers.push('alt');
    return `${modifiers.join('+')}-${shortcut.key.toLowerCase()}`;
  }

  // プライベートメソッド：イベントからキーを生成
  private generateEventKey(event: KeyboardEvent): string {
    const modifiers = [];
    if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    return `${modifiers.join('+')}-${event.key.toLowerCase()}`;
  }

  // プライベートメソッド：テキストを囲む
  private wrapText(
    selection: TextSelection, 
    before: string, 
    after: string, 
    placeholder: string
  ) {
    const text = selection.text || placeholder;
    const newText = before + text + after;
    return {
      newText: selection.start === selection.end 
        ? `${newText}`
        : newText,
      newCursorPosition: selection.start + before.length + text.length
    };
  }

  // プライベートメソッド：行の先頭にプレフィックスを追加
  private insertLinePrefix(selection: TextSelection, prefix: string) {
    const lines = selection.text.split('\n');
    const prefixedLines = lines.map(line => 
      line.trim() ? (line.startsWith(prefix.trim()) ? line : prefix + line) : prefix
    );
    const newText = prefixedLines.join('\n');
    
    return {
      newText: newText,
      newCursorPosition: selection.start + newText.length
    };
  }

  // プライベートメソッド：番号付きリストを挿入
  private insertNumberedList(selection: TextSelection) {
    const lines = selection.text.split('\n');
    const numberedLines = lines.map((line, index) => 
      line.trim() ? `${index + 1}. ${line}` : `${index + 1}. `
    );
    const newText = numberedLines.join('\n');
    
    return {
      newText: newText,
      newCursorPosition: selection.start + newText.length
    };
  }

  // プライベートメソッド：コードブロックを挿入
  private insertCodeBlock(selection: TextSelection) {
    const language = selection.text.includes('javascript') ? 'javascript' : '';
    const newText = `\`\`\`${language}\n${selection.text || 'コードをここに入力'}\n\`\`\``;
    
    return {
      newText: newText,
      newCursorPosition: selection.start + 4 + language.length
    };
  }

  // プライベートメソッド：テーブルを挿入
  private insertTable(selection: TextSelection) {
    const newText = `\n| ヘッダー1 | ヘッダー2 | ヘッダー3 |\n|-----------|-----------|----------- |\n| セル1 | セル2 | セル3 |\n| セル4 | セル5 | セル6 |\n`;
    
    return {
      newText: newText,
      newCursorPosition: selection.start + newText.length
    };
  }

  // プライベートメソッド：テキストを挿入
  private insertText(selection: TextSelection, text: string) {
    return {
      newText: text,
      newCursorPosition: selection.start + text.length
    };
  }

  // プライベートメソッド：行を複製
  private duplicateLine(selection: TextSelection) {
    // 現在の行を特定して複製
    const lines = selection.text.split('\n');
    const duplicatedLines = [...lines, ...lines];
    const newText = duplicatedLines.join('\n');
    
    return {
      newText: newText,
      newCursorPosition: selection.start + selection.text.length + 1
    };
  }

  // プライベートメソッド：行を削除
  private deleteLine(selection: TextSelection) {
    return {
      newText: '',
      newCursorPosition: selection.start
    };
  }

  // プライベートメソッド：インデント処理
  private indentText(selection: TextSelection, indent: boolean) {
    const lines = selection.text.split('\n');
    const processedLines = lines.map(line => {
      if (indent) {
        return '  ' + line;
      } else {
        return line.startsWith('  ') ? line.substring(2) : line;
      }
    });
    const newText = processedLines.join('\n');
    
    return {
      newText: newText,
      newCursorPosition: selection.start + (indent ? 2 : -2)
    };
  }

  // ショートカットヘルプテキストを生成
  generateHelpText(): string {
    const categories = this.getShortcutsByCategory();
    let helpText = '# Markdownエディタ キーボードショートカット\n\n';

    Object.entries(categories).forEach(([category, shortcuts]) => {
      if (shortcuts.length > 0) {
        helpText += `## ${category}\n\n`;
        shortcuts.forEach(shortcut => {
          const keyCombo = this.formatKeyCombo(shortcut);
          helpText += `- **${keyCombo}**: ${shortcut.description}\n`;
        });
        helpText += '\n';
      }
    });

    return helpText;
  }

  // キーの組み合わせを表示用にフォーマット
  private formatKeyCombo(shortcut: KeyboardShortcut): string {
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
  }
}

// シングルトンインスタンス
export const markdownKeyboardShortcuts = new MarkdownKeyboardShortcuts();