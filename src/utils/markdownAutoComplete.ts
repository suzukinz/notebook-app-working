// Markdown専用オートコンプリートシステム

export interface AutoCompleteItem {
  id: string;
  type: 'syntax' | 'emoji' | 'snippet' | 'symbol';
  trigger: string;
  replacement: string;
  description: string;
  category: string;
  insertPosition?: 'before' | 'after' | 'wrap';
  cursorOffset?: number; // 挿入後のカーソル位置調整
}

export class MarkdownAutoCompleter {
  private static readonly completionItems: AutoCompleteItem[] = [
    // Markdownシンタックス
    {
      id: 'heading1',
      type: 'syntax',
      trigger: '# ',
      replacement: '# ',
      description: '見出し1',
      category: '見出し',
      cursorOffset: 0
    },
    {
      id: 'heading2',
      type: 'syntax',
      trigger: '## ',
      replacement: '## ',
      description: '見出し2',
      category: '見出し',
      cursorOffset: 0
    },
    {
      id: 'heading3',
      type: 'syntax',
      trigger: '### ',
      replacement: '### ',
      description: '見出し3',
      category: '見出し',
      cursorOffset: 0
    },
    {
      id: 'bold',
      type: 'syntax',
      trigger: '**',
      replacement: '****',
      description: '太字テキスト',
      category: '装飾',
      insertPosition: 'wrap',
      cursorOffset: -2
    },
    {
      id: 'italic',
      type: 'syntax',
      trigger: '*',
      replacement: '**',
      description: '斜体テキスト',
      category: '装飾',
      insertPosition: 'wrap',
      cursorOffset: -1
    },
    {
      id: 'code',
      type: 'syntax',
      trigger: '`',
      replacement: '``',
      description: 'インラインコード',
      category: 'コード',
      insertPosition: 'wrap',
      cursorOffset: -1
    },
    {
      id: 'codeblock',
      type: 'syntax',
      trigger: '```',
      replacement: '```\n\n```',
      description: 'コードブロック',
      category: 'コード',
      cursorOffset: -4
    },
    {
      id: 'link',
      type: 'syntax',
      trigger: '[',
      replacement: '[テキスト](URL)',
      description: 'リンク',
      category: 'リンク',
      cursorOffset: -5
    },
    {
      id: 'image',
      type: 'syntax',
      trigger: '![',
      replacement: '![代替テキスト](画像URL)',
      description: '画像',
      category: 'メディア',
      cursorOffset: -8
    },
    {
      id: 'quote',
      type: 'syntax',
      trigger: '> ',
      replacement: '> ',
      description: '引用',
      category: '構造',
      cursorOffset: 0
    },
    {
      id: 'list',
      type: 'syntax',
      trigger: '- ',
      replacement: '- ',
      description: 'リスト項目',
      category: 'リスト',
      cursorOffset: 0
    },
    {
      id: 'orderedlist',
      type: 'syntax',
      trigger: '1. ',
      replacement: '1. ',
      description: '番号付きリスト',
      category: 'リスト',
      cursorOffset: 0
    },
    {
      id: 'checkbox',
      type: 'syntax',
      trigger: '- [ ] ',
      replacement: '- [ ] ',
      description: 'チェックボックス',
      category: 'リスト',
      cursorOffset: 0
    },
    {
      id: 'checkedbox',
      type: 'syntax',
      trigger: '- [x] ',
      replacement: '- [x] ',
      description: 'チェック済み',
      category: 'リスト',
      cursorOffset: 0
    },
    {
      id: 'table',
      type: 'syntax',
      trigger: '|',
      replacement: '| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| データ1 | データ2 | データ3 |',
      description: 'テーブル',
      category: 'テーブル',
      cursorOffset: -52
    },
    {
      id: 'hr',
      type: 'syntax',
      trigger: '---',
      replacement: '---',
      description: '水平線',
      category: '構造',
      cursorOffset: 0
    },
    {
      id: 'strikethrough',
      type: 'syntax',
      trigger: '~~',
      replacement: '~~~~',
      description: '取り消し線',
      category: '装飾',
      insertPosition: 'wrap',
      cursorOffset: -2
    },

    // 絵文字・シンボル
    {
      id: 'smile',
      type: 'emoji',
      trigger: ':smile:',
      replacement: '😊',
      description: '笑顔',
      category: '感情'
    },
    {
      id: 'heart',
      type: 'emoji',
      trigger: ':heart:',
      replacement: '❤️',
      description: 'ハート',
      category: '感情'
    },
    {
      id: 'thumbsup',
      type: 'emoji',
      trigger: ':thumbsup:',
      replacement: '👍',
      description: 'グッド',
      category: 'ジェスチャー'
    },
    {
      id: 'fire',
      type: 'emoji',
      trigger: ':fire:',
      replacement: '🔥',
      description: '炎',
      category: 'オブジェクト'
    },
    {
      id: 'star',
      type: 'emoji',
      trigger: ':star:',
      replacement: '⭐',
      description: '星',
      category: 'オブジェクト'
    },
    {
      id: 'warning',
      type: 'emoji',
      trigger: ':warning:',
      replacement: '⚠️',
      description: '警告',
      category: 'シンボル'
    },
    {
      id: 'info',
      type: 'emoji',
      trigger: ':info:',
      replacement: 'ℹ️',
      description: '情報',
      category: 'シンボル'
    },
    {
      id: 'check',
      type: 'emoji',
      trigger: ':check:',
      replacement: '✅',
      description: 'チェック',
      category: 'シンボル'
    },
    {
      id: 'cross',
      type: 'emoji',
      trigger: ':cross:',
      replacement: '❌',
      description: 'バツ',
      category: 'シンボル'
    },

    // スニペット・テンプレート
    {
      id: 'meeting-notes',
      type: 'snippet',
      trigger: 'meeting',
      replacement: `# 会議議事録

## 📅 日時
${new Date().toLocaleDateString()}

## 👥 参加者
- 

## 📋 アジェンダ
1. 

## 💡 決定事項
- 

## 🔄 アクションアイテム
- [ ] 
- [ ] 

## 📝 メモ
`,
      description: '会議議事録テンプレート',
      category: 'テンプレート',
      cursorOffset: -100
    },
    {
      id: 'daily-report',
      type: 'snippet',
      trigger: 'daily',
      replacement: `# 日報

## 📅 ${new Date().toLocaleDateString()}

## ✅ 今日やったこと
- 

## 🎯 明日やること
- 

## 💭 所感・気づき
- 

## ❓ 質問・相談
- 
`,
      description: '日報テンプレート',
      category: 'テンプレート',
      cursorOffset: -80
    },
    {
      id: 'project-plan',
      type: 'snippet',
      trigger: 'project',
      replacement: `# プロジェクト計画

## 🎯 目標


## 📋 概要


## 📅 スケジュール
| フェーズ | 期間 | 担当 | 成果物 |
|---------|------|------|--------|
|         |      |      |        |

## 🔍 要件
### 機能要件
- 

### 非機能要件
- 

## ⚠️ リスク
| リスク | 影響度 | 対策 |
|--------|--------|------|
|        |        |      |

## 📝 備考
`,
      description: 'プロジェクト計画テンプレート',
      category: 'テンプレート',
      cursorOffset: -200
    },
    {
      id: 'bug-report',
      type: 'snippet',
      trigger: 'bug',
      replacement: `# 🐛 バグレポート

## 📝 概要
簡潔にバグの内容を記述

## 🔄 再現手順
1. 
2. 
3. 

## 🎯 期待する動作
何が起こるべきか

## 💥 実際の動作
何が起こったか

## 🖥️ 環境
- OS: 
- ブラウザ: 
- バージョン: 

## 📷 スクリーンショット
（可能であれば添付）

## 📝 追加情報
`,
      description: 'バグレポートテンプレート',
      category: 'テンプレート',
      cursorOffset: -150
    }
  ];

  // オートコンプリート候補を取得
  static getSuggestions(text: string, cursorPosition: number, maxResults: number = 10): AutoCompleteItem[] {
    const beforeCursor = text.substring(0, cursorPosition);
    const words = beforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1] || '';
    
    // 現在の行を取得
    const lines = beforeCursor.split('\n');
    const currentLine = lines[lines.length - 1] || '';
    
    const suggestions: AutoCompleteItem[] = [];
    
    // 1. トリガー文字に基づく候補
    for (const item of this.completionItems) {
      if (item.trigger.toLowerCase().startsWith(currentWord.toLowerCase()) && currentWord.length > 0) {
        suggestions.push(item);
      }
    }
    
    // 2. 行の開始に基づく候補（見出し、リストなど）
    if (currentLine.trim() === currentWord) {
      const lineStartItems = this.completionItems.filter(item => 
        ['heading1', 'heading2', 'heading3', 'list', 'orderedlist', 'checkbox', 'checkedbox', 'quote'].includes(item.id)
      );
      suggestions.push(...lineStartItems);
    }
    
    // 3. コンテキストに基づく候補
    const contextSuggestions = this.getContextualSuggestions(currentLine, currentWord);
    suggestions.push(...contextSuggestions);
    
    // 重複を除去し、関連度でソート
    const uniqueSuggestions = Array.from(new Map(suggestions.map(item => [item.id, item])).values());
    
    return uniqueSuggestions
      .sort((a, b) => this.calculateRelevance(b, currentWord) - this.calculateRelevance(a, currentWord))
      .slice(0, maxResults);
  }
  
  // コンテキストに基づく候補を取得
  private static getContextualSuggestions(currentLine: string, currentWord: string): AutoCompleteItem[] {
    const suggestions: AutoCompleteItem[] = [];
    
    // コードブロック内でのプログラミング言語候補
    if (currentLine.startsWith('```') && currentWord === '') {
      const languages = [
        { id: 'js-lang', trigger: 'javascript', replacement: 'javascript', description: 'JavaScript', category: '言語' },
        { id: 'ts-lang', trigger: 'typescript', replacement: 'typescript', description: 'TypeScript', category: '言語' },
        { id: 'py-lang', trigger: 'python', replacement: 'python', description: 'Python', category: '言語' },
        { id: 'html-lang', trigger: 'html', replacement: 'html', description: 'HTML', category: '言語' },
        { id: 'css-lang', trigger: 'css', replacement: 'css', description: 'CSS', category: '言語' },
        { id: 'json-lang', trigger: 'json', replacement: 'json', description: 'JSON', category: '言語' }
      ] as AutoCompleteItem[];
      
      suggestions.push(...languages);
    }
    
    // リスト内での候補
    if (currentLine.match(/^(\s*)-\s/)) {
      const listItems = this.completionItems.filter(item => 
        item.category === 'リスト' || item.type === 'emoji'
      );
      suggestions.push(...listItems);
    }
    
    return suggestions;
  }
  
  // 関連度を計算
  private static calculateRelevance(item: AutoCompleteItem, input: string): number {
    let score = 0;
    
    // 完全一致
    if (item.trigger.toLowerCase() === input.toLowerCase()) {
      score += 100;
    }
    
    // 前方一致
    if (item.trigger.toLowerCase().startsWith(input.toLowerCase())) {
      score += 50;
    }
    
    // 部分一致
    if (item.trigger.toLowerCase().includes(input.toLowerCase())) {
      score += 25;
    }
    
    // 説明に含まれる
    if (item.description.toLowerCase().includes(input.toLowerCase())) {
      score += 10;
    }
    
    // タイプ別の重み付け
    switch (item.type) {
      case 'syntax':
        score += 20;
        break;
      case 'snippet':
        score += 15;
        break;
      case 'emoji':
        score += 10;
        break;
      case 'symbol':
        score += 5;
        break;
    }
    
    return score;
  }
  
  // テキストに候補を適用
  static applySuggestion(
    text: string, 
    cursorPosition: number, 
    item: AutoCompleteItem,
    selectedText: string = ''
  ): { newText: string; newCursorPosition: number } {
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    // 現在の単語を特定
    const words = beforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1] || '';
    const wordStart = beforeCursor.lastIndexOf(currentWord);
    
    let newText: string;
    let newCursorPosition: number;
    
    if (item.insertPosition === 'wrap' && selectedText) {
      // 選択テキストをラップ
      const beforeSelection = text.substring(0, cursorPosition - selectedText.length);
      const afterSelection = text.substring(cursorPosition);
      newText = beforeSelection + item.replacement.replace(/\*+/, selectedText) + afterSelection;
      newCursorPosition = cursorPosition + item.replacement.length - selectedText.length + (item.cursorOffset || 0);
    } else {
      // 通常の挿入
      const beforeWord = text.substring(0, wordStart);
      newText = beforeWord + item.replacement + afterCursor;
      newCursorPosition = wordStart + item.replacement.length + (item.cursorOffset || 0);
    }
    
    return { newText, newCursorPosition };
  }
  
  // カスタム候補を追加
  static addCustomItem(item: AutoCompleteItem): void {
    this.completionItems.push(item);
  }
  
  // カテゴリ別に候補を取得
  static getSuggestionsByCategory(category: string): AutoCompleteItem[] {
    return this.completionItems.filter(item => item.category === category);
  }
  
  // 全カテゴリを取得
  static getAllCategories(): string[] {
    const categories = new Set(this.completionItems.map(item => item.category));
    return Array.from(categories).sort();
  }
}