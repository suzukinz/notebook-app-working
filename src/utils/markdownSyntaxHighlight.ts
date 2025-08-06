// Markdown専用シンタックスハイライトユーティリティ
import { CodeHighlighter } from './codeHighlighter';

export interface HighlightToken {
  type: 'heading' | 'bold' | 'italic' | 'code' | 'codeblock' | 'link' | 'list' | 'quote' | 'table' | 'strikethrough' | 'text';
  content: string;
  start: number;
  end: number;
  level?: number; // for headings
  language?: string; // for code blocks
}

export class MarkdownSyntaxHighlighter {
  private static readonly patterns = {
    // 見出し（# ## ### など）
    heading: /^(#{1,6})\s+(.+)$/gm,
    // 太字（**text** または __text__）
    bold: /(\*\*|__)((?:(?!\1).)+)\1/g,
    // 斜体（*text* または _text_）
    italic: /(?<!\*|_)(\*|_)((?:(?!\1).)+)\1(?!\*|_)/g,
    // インラインコード（`code`）
    inlineCode: /`([^`]+)`/g,
    // コードブロック（```code```）
    codeBlock: /```(\w+)?\n([\s\S]*?)```/g,
    // リンク（[text](url)）
    link: /\[([^\]]+)\]\(([^)]+)\)/g,
    // 画像（![alt](url)）  
    image: /!\[([^\]]*)\]\(([^)]+)\)/g,
    // リスト（- item または * item または + item）
    unorderedList: /^(\s*)([-*+])\s+(.+)$/gm,
    // 番号付きリスト（1. item）
    orderedList: /^(\s*)(\d+\.)\s+(.+)$/gm,
    // 引用（> text）
    quote: /^(>\s+)(.+)$/gm,
    // 水平線（--- または ***）
    hr: /^(---|\*\*\*|___)\s*$/gm,
    // 取り消し線（~~text~~）
    strikethrough: /~~((?:(?!~~).)+)~~/g,
    // テーブル
    table: /^\|(.+)\|\s*$/gm,
    // チェックリスト（- [ ] item または - [x] item）
    checkbox: /^(\s*)([-*+])\s+(\[[ x]\])\s+(.+)$/gm
  };

  static tokenize(text: string): HighlightToken[] {
    const tokens: HighlightToken[] = [];
    const processedRanges: Array<{ start: number; end: number }> = [];

    // 各パターンをチェックして、重複しない範囲でトークンを作成
    const addToken = (type: HighlightToken['type'], content: string, start: number, end: number, level?: number, language?: string) => {
      // 既に処理された範囲と重複しないかチェック
      const isOverlapping = processedRanges.some(range => 
        (start >= range.start && start < range.end) || 
        (end > range.start && end <= range.end) ||
        (start <= range.start && end >= range.end)
      );

      if (!isOverlapping) {
        tokens.push({ type, content, start, end, level, language });
        processedRanges.push({ start, end });
      }
    };

    // 見出しの処理
    let match;
    while ((match = this.patterns.heading.exec(text)) !== null) {
      const level = match[1].length;
      addToken('heading', match[0], match.index, match.index + match[0].length, level);
    }

    // コードブロックの処理（優先度高）
    this.patterns.codeBlock.lastIndex = 0;
    while ((match = this.patterns.codeBlock.exec(text)) !== null) {
      const language = match[1] || 'text'; // 言語指定がない場合はtext
      addToken('codeblock', match[0], match.index, match.index + match[0].length, undefined, language);
    }

    // インラインコードの処理
    this.patterns.inlineCode.lastIndex = 0;
    while ((match = this.patterns.inlineCode.exec(text)) !== null) {
      addToken('code', match[0], match.index, match.index + match[0].length);
    }

    // 太字の処理
    this.patterns.bold.lastIndex = 0;
    while ((match = this.patterns.bold.exec(text)) !== null) {
      addToken('bold', match[0], match.index, match.index + match[0].length);
    }

    // 斜体の処理
    this.patterns.italic.lastIndex = 0;
    while ((match = this.patterns.italic.exec(text)) !== null) {
      addToken('italic', match[0], match.index, match.index + match[0].length);
    }

    // 取り消し線の処理
    this.patterns.strikethrough.lastIndex = 0;
    while ((match = this.patterns.strikethrough.exec(text)) !== null) {
      addToken('strikethrough', match[0], match.index, match.index + match[0].length);
    }

    // リンクの処理
    this.patterns.link.lastIndex = 0;
    while ((match = this.patterns.link.exec(text)) !== null) {
      addToken('link', match[0], match.index, match.index + match[0].length);
    }

    // 画像の処理
    this.patterns.image.lastIndex = 0;
    while ((match = this.patterns.image.exec(text)) !== null) {
      addToken('link', match[0], match.index, match.index + match[0].length);
    }

    // 引用の処理
    this.patterns.quote.lastIndex = 0;
    while ((match = this.patterns.quote.exec(text)) !== null) {
      addToken('quote', match[0], match.index, match.index + match[0].length);
    }

    // リストの処理
    this.patterns.unorderedList.lastIndex = 0;
    while ((match = this.patterns.unorderedList.exec(text)) !== null) {
      addToken('list', match[0], match.index, match.index + match[0].length);
    }

    this.patterns.orderedList.lastIndex = 0;
    while ((match = this.patterns.orderedList.exec(text)) !== null) {
      addToken('list', match[0], match.index, match.index + match[0].length);
    }

    // チェックボックスの処理
    this.patterns.checkbox.lastIndex = 0;
    while ((match = this.patterns.checkbox.exec(text)) !== null) {
      addToken('list', match[0], match.index, match.index + match[0].length);
    }

    // テーブルの処理
    this.patterns.table.lastIndex = 0;
    while ((match = this.patterns.table.exec(text)) !== null) {
      addToken('table', match[0], match.index, match.index + match[0].length);
    }

    // トークンを開始位置でソート
    tokens.sort((a, b) => a.start - b.start);

    return tokens;
  }

  static getHighlightedHtml(text: string): string {
    const tokens = this.tokenize(text);
    let result = '';
    let lastIndex = 0;

    tokens.forEach(token => {
      // 前回のトークン終了位置から現在のトークン開始位置までの通常テキストを追加
      if (token.start > lastIndex) {
        result += this.escapeHtml(text.substring(lastIndex, token.start));
      }

      // トークンに応じたスタイルを適用
      const styledContent = this.applyTokenStyle(token);
      result += styledContent;

      lastIndex = token.end;
    });

    // 残りのテキストを追加
    if (lastIndex < text.length) {
      result += this.escapeHtml(text.substring(lastIndex));
    }

    return result;
  }

  private static applyTokenStyle(token: HighlightToken): string {
    const content = this.escapeHtml(token.content);
    
    switch (token.type) {
      case 'heading':
        const headingClass = `text-${token.level === 1 ? '2xl' : token.level === 2 ? 'xl' : 'lg'} font-bold text-blue-600 dark:text-blue-400`;
        return `<span class="${headingClass}">${content}</span>`;
        
      case 'bold':
        return `<span class="font-bold text-gray-900 dark:text-white">${content}</span>`;
        
      case 'italic':
        return `<span class="italic text-gray-800 dark:text-gray-200">${content}</span>`;
        
      case 'code':
        return `<span class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 font-mono text-sm rounded">${content}</span>`;
        
      case 'codeblock':
        return this.highlightCodeBlock(token.content, token.language || 'text');
        
      case 'link':
        return `<span class="text-blue-600 dark:text-blue-400 underline">${content}</span>`;
        
      case 'list':
        return `<span class="text-green-600 dark:text-green-400">${content}</span>`;
        
      case 'quote':
        return `<span class="text-gray-600 dark:text-gray-400 italic">${content}</span>`;
        
      case 'table':
        return `<span class="text-purple-600 dark:text-purple-400">${content}</span>`;
        
      case 'strikethrough':
        return `<span class="line-through text-gray-500 dark:text-gray-500">${content}</span>`;
        
      default:
        return content;
    }
  }

  private static highlightCodeBlock(content: string, language: string): string {
    // コードブロックの構造を解析
    const codeBlockMatch = content.match(/^```(\w+)?\n([\s\S]*?)```$/);
    if (!codeBlockMatch) {
      return `<span class="block bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono text-sm">${this.escapeHtml(content)}</span>`;
    }

    const [, detectedLang, code] = codeBlockMatch;
    const actualLanguage = detectedLang || language;
    const highlightedCode = CodeHighlighter.highlightCode(code, actualLanguage);
    
    return `<span class="block bg-gray-100 dark:bg-gray-800 p-3 rounded font-mono text-sm border-l-4 border-blue-500">
      <span class="text-xs text-gray-500 dark:text-gray-400 mb-2 block">${actualLanguage}</span>
      ${highlightedCode}
    </span>`;
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // CSS クラス定義を返すメソッド
  static getCssStyles(): string {
    return `
      .markdown-editor-highlighted {
        font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
        line-height: 1.6;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      
      .markdown-editor-highlighted .heading-1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #2563eb;
      }
      
      .markdown-editor-highlighted .heading-2 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #2563eb;
      }
      
      .markdown-editor-highlighted .heading-3 {
        font-size: 1.125rem;
        font-weight: 700;
        color: #2563eb;
      }
    `;
  }
}