// Markdown専用検索・置換システム

export interface SearchMatch {
  start: number;
  end: number;
  text: string;
  line: number;
  column: number;
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  searchInSelection: boolean;
}

export interface ReplaceResult {
  newText: string;
  replacedCount: number;
  matches: SearchMatch[];
}

export class MarkdownSearchReplace {
  private static defaultOptions: SearchOptions = {
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    searchInSelection: false
  };

  // テキスト内で検索を実行
  static search(
    text: string, 
    searchTerm: string, 
    options: Partial<SearchOptions> = {},
    selectionStart?: number,
    selectionEnd?: number
  ): SearchMatch[] {
    if (!searchTerm.trim()) return [];

    const opts = { ...this.defaultOptions, ...options };
    const matches: SearchMatch[] = [];
    
    // 検索範囲を決定
    const searchText = opts.searchInSelection && selectionStart !== undefined && selectionEnd !== undefined
      ? text.substring(selectionStart, selectionEnd)
      : text;
    
    const offset = opts.searchInSelection && selectionStart !== undefined ? selectionStart : 0;

    try {
      let searchPattern: RegExp;
      
      if (opts.useRegex) {
        // 正規表現モード
        const flags = opts.caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(searchTerm, flags);
      } else {
        // 通常の文字列検索
        let escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        if (opts.wholeWord) {
          escapedTerm = `\\b${escapedTerm}\\b`;
        }
        
        const flags = opts.caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(escapedTerm, flags);
      }

      let match;
      while ((match = searchPattern.exec(searchText)) !== null) {
        const start = match.index + offset;
        const end = start + match[0].length;
        const { line, column } = this.getLineColumn(text, start);
        
        matches.push({
          start,
          end,
          text: match[0],
          line,
          column
        });
        
        // 無限ループ防止
        if (match.index === searchPattern.lastIndex) {
          searchPattern.lastIndex++;
        }
      }
    } catch (error) {
      console.warn('Search pattern error:', error);
      return [];
    }

    return matches;
  }

  // 単一の置換を実行
  static replace(
    text: string,
    searchTerm: string,
    replaceTerm: string,
    options: Partial<SearchOptions> = {}
  ): ReplaceResult {
    const matches = this.search(text, searchTerm, options);
    
    if (matches.length === 0) {
      return {
        newText: text,
        replacedCount: 0,
        matches: []
      };
    }

    // 最初のマッチのみを置換
    const firstMatch = matches[0]!;
    const newText = text.substring(0, firstMatch.start) + 
                   replaceTerm + 
                   text.substring(firstMatch.end);

    return {
      newText,
      replacedCount: 1,
      matches: [firstMatch]
    };
  }

  // 全ての置換を実行
  static replaceAll(
    text: string,
    searchTerm: string,
    replaceTerm: string,
    options: Partial<SearchOptions> = {},
    selectionStart?: number,
    selectionEnd?: number
  ): ReplaceResult {
    const matches = this.search(text, searchTerm, options, selectionStart, selectionEnd);
    
    if (matches.length === 0) {
      return {
        newText: text,
        replacedCount: 0,
        matches: []
      };
    }

    // 後ろから順番に置換（インデックスが変わらないように）
    let newText = text;
    const reversedMatches = [...matches].reverse();
    
    for (const match of reversedMatches) {
      newText = newText.substring(0, match.start) + 
                replaceTerm + 
                newText.substring(match.end);
    }

    return {
      newText,
      replacedCount: matches.length,
      matches
    };
  }

  // 次のマッチを検索
  static findNext(
    text: string,
    searchTerm: string,
    currentPosition: number,
    options: Partial<SearchOptions> = {}
  ): SearchMatch | null {
    const matches = this.search(text, searchTerm, options);
    
    // 現在位置より後のマッチを検索
    const nextMatch = matches.find(match => match.start > currentPosition);
    if (nextMatch) return nextMatch;
    
    // 見つからない場合は最初のマッチを返す（循環検索）
    return matches.length > 0 ? matches[0]! : null;
  }

  // 前のマッチを検索
  static findPrevious(
    text: string,
    searchTerm: string,
    currentPosition: number,
    options: Partial<SearchOptions> = {}
  ): SearchMatch | null {
    const matches = this.search(text, searchTerm, options);
    
    // 現在位置より前のマッチを検索（逆順）
    const reversedMatches = [...matches].reverse();
    const prevMatch = reversedMatches.find(match => match.start < currentPosition);
    if (prevMatch) return prevMatch;
    
    // 見つからない場合は最後のマッチを返す（循環検索）
    return matches.length > 0 ? matches[matches.length - 1]! : null;
  }

  // 行と列の番号を取得
  private static getLineColumn(text: string, position: number): { line: number; column: number } {
    try {
      if (position < 0 || position > text.length) {
        return { line: 1, column: 1 };
      }
      
      const lines = text.substring(0, position).split('\n');
      return {
        line: lines.length,
        column: lines[lines.length - 1]!.length + 1
      };
    } catch (error) {
      console.warn('Failed to get line column:', error);
      return { line: 1, column: 1 };
    }
  }

  // マッチをハイライト用のHTMLに変換
  static highlightMatches(text: string, matches: SearchMatch[]): string {
    if (matches.length === 0) return this.escapeHtml(text);

    let result = '';
    let lastIndex = 0;

    // マッチを開始位置でソート
    const sortedMatches = [...matches].sort((a, b) => a.start - b.start);

    for (const match of sortedMatches) {
      // マッチ前のテキスト
      if (match.start > lastIndex) {
        result += this.escapeHtml(text.substring(lastIndex, match.start));
      }

      // ハイライト部分
      result += `<mark class="bg-yellow-200 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 rounded px-1">`;
      result += this.escapeHtml(match.text);
      result += '</mark>';

      lastIndex = match.end;
    }

    // 残りのテキスト
    if (lastIndex < text.length) {
      result += this.escapeHtml(text.substring(lastIndex));
    }

    return result;
  }

  // 検索統計を取得
  static getSearchStats(matches: SearchMatch[]): {
    totalMatches: number;
    linesWithMatches: number;
    averageMatchLength: number;
    matchPositions: number[];
  } {
    if (matches.length === 0) {
      return {
        totalMatches: 0,
        linesWithMatches: 0,
        averageMatchLength: 0,
        matchPositions: []
      };
    }

    const uniqueLines = new Set(matches.map(match => match.line));
    const totalLength = matches.reduce((sum, match) => sum + match.text.length, 0);
    const matchPositions = matches.map(match => match.start);

    return {
      totalMatches: matches.length,
      linesWithMatches: uniqueLines.size,
      averageMatchLength: totalLength / matches.length,
      matchPositions
    };
  }

  // Markdown固有の検索パターン
  static getMarkdownPatterns(): Array<{ name: string; pattern: string; description: string }> {
    return [
      { name: 'heading', pattern: '^#{1,6}\\s+.+$', description: '見出し行' },
      { name: 'bold', pattern: '\\*\\*[^*]+\\*\\*', description: '太字テキスト' },
      { name: 'italic', pattern: '\\*[^*]+\\*', description: '斜体テキスト' },
      { name: 'code', pattern: '`[^`]+`', description: 'インラインコード' },
      { name: 'codeblock', pattern: '```[\\s\\S]*?```', description: 'コードブロック' },
      { name: 'link', pattern: '\\[[^\\]]+\\]\\([^)]+\\)', description: 'リンク' },
      { name: 'image', pattern: '!\\[[^\\]]*\\]\\([^)]+\\)', description: '画像' },
      { name: 'list', pattern: '^\\s*[-*+]\\s+.+$', description: 'リスト項目' },
      { name: 'orderedlist', pattern: '^\\s*\\d+\\.\\s+.+$', description: '番号付きリスト' },
      { name: 'quote', pattern: '^>\\s+.+$', description: '引用' },
      { name: 'table', pattern: '^\\|.+\\|$', description: 'テーブル行' },
      { name: 'hr', pattern: '^(---|\\*\\*\\*|___)\\s*$', description: '水平線' }
    ];
  }

  // よく使われる検索・置換パターン
  static getCommonPatterns(): Array<{ name: string; search: string; replace: string; description: string }> {
    return [
      {
        name: 'spaces-to-tabs',
        search: '    ',
        replace: '\t',
        description: '4つのスペースをタブに変換'
      },
      {
        name: 'tabs-to-spaces',
        search: '\t',
        replace: '    ',
        description: 'タブを4つのスペースに変換'
      },
      {
        name: 'double-newlines',
        search: '\n\n\n+',
        replace: '\n\n',
        description: '3つ以上の改行を2つに統一'
      },
      {
        name: 'trailing-spaces',
        search: ' +$',
        replace: '',
        description: '行末の余分なスペースを削除'
      },
      {
        name: 'japanese-quotes',
        search: '"([^"]+)"',
        replace: '「$1」',
        description: '英語の引用符を日本語に変換'
      },
      {
        name: 'bold-to-strong',
        search: '\\*\\*([^*]+)\\*\\*',
        replace: '<strong>$1</strong>',
        description: 'Markdown太字をHTMLに変換'
      }
    ];
  }

  // HTMLエスケープ
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 検索パフォーマンス最適化：大きなテキスト用
  static searchLarge(
    text: string,
    searchTerm: string,
    options: Partial<SearchOptions> = {},
    maxResults: number = 1000
  ): SearchMatch[] {
    const matches = this.search(text, searchTerm, options);
    return matches.slice(0, maxResults);
  }
}