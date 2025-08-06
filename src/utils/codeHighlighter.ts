// コードブロック専用シンタックスハイライトシステム

export interface CodeToken {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'operator' | 'function' | 'variable' | 'type' | 'property' | 'tag' | 'attribute' | 'text';
  content: string;
  start: number;
  end: number;
}

export class CodeHighlighter {
  // JavaScript/TypeScript用のパターン
  private static readonly jsPatterns = {
    // キーワード
    keywords: /\b(const|let|var|function|class|if|else|for|while|do|switch|case|default|break|continue|return|try|catch|finally|throw|new|this|super|extends|implements|interface|type|import|export|from|as|async|await|yield|typeof|instanceof|in|of|void|null|undefined|true|false)\b/g,
    // 文字列
    strings: /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
    // テンプレートリテラル
    templateLiteral: /(`)((?:\\.|[^\\`])*?)(`)/g,
    // コメント
    singleLineComment: /\/\/.*$/gm,
    multiLineComment: /\/\*[\s\S]*?\*\//g,
    // 数値
    numbers: /\b(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\b/g,
    // 関数名
    functions: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
    // 演算子
    operators: /[+\-*/%=<>!&|^~?:]/g,
    // プロパティ
    properties: /\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    // 型（TypeScript）
    types: /\b([A-Z][a-zA-Z0-9_]*)\b/g
  };

  // Python用のパターン
  private static readonly pythonPatterns = {
    keywords: /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|break|continue|pass|lambda|and|or|not|in|is|None|True|False|global|nonlocal|assert|del|raise)\b/g,
    strings: /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
    tripleQuotedStrings: /("""[\s\S]*?"""|'''[\s\S]*?''')/g,
    comments: /#.*$/gm,
    numbers: /\b(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\b/g,
    functions: /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
    decorators: /@[a-zA-Z_][a-zA-Z0-9_.]*/g,
    operators: /[+\-*/%=<>!&|^~]/g,
    builtins: /\b(print|len|str|int|float|list|dict|set|tuple|range|enumerate|zip|map|filter|sorted|any|all|max|min|sum|abs|round|type|isinstance|hasattr|getattr|setattr|delattr)\b/g
  };

  // HTML用のパターン
  private static readonly htmlPatterns = {
    tags: /<\/?([a-zA-Z][a-zA-Z0-9-]*)/g,
    attributes: /\s([a-zA-Z-]+)(?==)/g,
    attributeValues: /=\s*(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
    comments: /<!--[\s\S]*?-->/g,
    doctype: /<!DOCTYPE[\s\S]*?>/gi
  };

  // CSS用のパターン
  private static readonly cssPatterns = {
    selectors: /([.#]?[a-zA-Z][a-zA-Z0-9-]*|\*|::?[a-zA-Z-]+|\[[^\]]*\])(?=\s*[,{])/g,
    properties: /([a-zA-Z-]+)\s*:/g,
    values: /:\s*([^;{}]+)/g,
    comments: /\/\*[\s\S]*?\*\//g,
    units: /(\d+(?:\.\d+)?)(px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch|vmin|vmax|deg|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)/g,
    colors: /#([0-9a-fA-F]{3,8})\b/g,
    functions: /([a-zA-Z-]+)\(/g
  };

  // JSON用のパターン
  private static readonly jsonPatterns = {
    strings: /(")([^"\\]|\\.)*(")/g,
    numbers: /\b-?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\b/g,
    booleans: /\b(true|false|null)\b/g,
    keys: /(")([^"\\]|\\.)*(")\s*:/g
  };

  static highlightCode(code: string, language: string): string {
    const normalizedLang = language.toLowerCase();
    
    switch (normalizedLang) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        return this.highlightJavaScript(code);
      case 'python':
      case 'py':
        return this.highlightPython(code);
      case 'html':
      case 'xml':
        return this.highlightHtml(code);
      case 'css':
      case 'scss':
      case 'sass':
        return this.highlightCss(code);
      case 'json':
        return this.highlightJson(code);
      default:
        return this.escapeHtml(code);
    }
  }

  private static highlightJavaScript(code: string): string {
    let result = code;
    const replacements: Array<{ start: number; end: number; replacement: string }> = [];

    // コメント（最優先）
    this.addMatches(result, this.jsPatterns.multiLineComment, 'comment', replacements);
    this.addMatches(result, this.jsPatterns.singleLineComment, 'comment', replacements);
    
    // 文字列
    this.addMatches(result, this.jsPatterns.templateLiteral, 'string', replacements);
    this.addMatches(result, this.jsPatterns.strings, 'string', replacements);
    
    // キーワード
    this.addMatches(result, this.jsPatterns.keywords, 'keyword', replacements);
    
    // 数値
    this.addMatches(result, this.jsPatterns.numbers, 'number', replacements);
    
    // 関数
    this.addMatches(result, this.jsPatterns.functions, 'function', replacements);
    
    // プロパティ
    this.addMatches(result, this.jsPatterns.properties, 'property', replacements);
    
    // 演算子
    this.addMatches(result, this.jsPatterns.operators, 'operator', replacements);

    return this.applyReplacements(result, replacements);
  }

  private static highlightPython(code: string): string {
    let result = code;
    const replacements: Array<{ start: number; end: number; replacement: string }> = [];

    // コメント
    this.addMatches(result, this.pythonPatterns.comments, 'comment', replacements);
    
    // 文字列
    this.addMatches(result, this.pythonPatterns.tripleQuotedStrings, 'string', replacements);
    this.addMatches(result, this.pythonPatterns.strings, 'string', replacements);
    
    // キーワード
    this.addMatches(result, this.pythonPatterns.keywords, 'keyword', replacements);
    
    // ビルトイン関数
    this.addMatches(result, this.pythonPatterns.builtins, 'function', replacements);
    
    // デコレーター
    this.addMatches(result, this.pythonPatterns.decorators, 'property', replacements);
    
    // 数値
    this.addMatches(result, this.pythonPatterns.numbers, 'number', replacements);
    
    // 演算子
    this.addMatches(result, this.pythonPatterns.operators, 'operator', replacements);

    return this.applyReplacements(result, replacements);
  }

  private static highlightHtml(code: string): string {
    let result = code;
    const replacements: Array<{ start: number; end: number; replacement: string }> = [];

    // コメント
    this.addMatches(result, this.htmlPatterns.comments, 'comment', replacements);
    
    // DOCTYPE
    this.addMatches(result, this.htmlPatterns.doctype, 'keyword', replacements);
    
    // タグ
    this.addMatches(result, this.htmlPatterns.tags, 'tag', replacements);
    
    // 属性値
    this.addMatches(result, this.htmlPatterns.attributeValues, 'string', replacements);
    
    // 属性名
    this.addMatches(result, this.htmlPatterns.attributes, 'attribute', replacements);

    return this.applyReplacements(result, replacements);
  }

  private static highlightCss(code: string): string {
    let result = code;
    const replacements: Array<{ start: number; end: number; replacement: string }> = [];

    // コメント
    this.addMatches(result, this.cssPatterns.comments, 'comment', replacements);
    
    // セレクター
    this.addMatches(result, this.cssPatterns.selectors, 'tag', replacements);
    
    // プロパティ
    this.addMatches(result, this.cssPatterns.properties, 'property', replacements);
    
    // 色
    this.addMatches(result, this.cssPatterns.colors, 'string', replacements);
    
    // 単位付き数値
    this.addMatches(result, this.cssPatterns.units, 'number', replacements);
    
    // 関数
    this.addMatches(result, this.cssPatterns.functions, 'function', replacements);

    return this.applyReplacements(result, replacements);
  }

  private static highlightJson(code: string): string {
    let result = code;
    const replacements: Array<{ start: number; end: number; replacement: string }> = [];

    // キー
    this.addMatches(result, this.jsonPatterns.keys, 'property', replacements);
    
    // 文字列
    this.addMatches(result, this.jsonPatterns.strings, 'string', replacements);
    
    // ブール値・null
    this.addMatches(result, this.jsonPatterns.booleans, 'keyword', replacements);
    
    // 数値
    this.addMatches(result, this.jsonPatterns.numbers, 'number', replacements);

    return this.applyReplacements(result, replacements);
  }

  private static addMatches(
    text: string, 
    pattern: RegExp, 
    type: string, 
    replacements: Array<{ start: number; end: number; replacement: string }>
  ) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      // 重複チェック
      const isOverlapping = replacements.some(r => 
        (start >= r.start && start < r.end) || 
        (end > r.start && end <= r.end) ||
        (start <= r.start && end >= r.end)
      );
      
      if (!isOverlapping) {
        const replacement = this.wrapWithClass(match[0], type);
        replacements.push({ start, end, replacement });
      }
    }
  }

  private static applyReplacements(
    text: string, 
    replacements: Array<{ start: number; end: number; replacement: string }>
  ): string {
    // 開始位置の逆順でソート（後ろから置換して位置がずれないようにする）
    replacements.sort((a, b) => b.start - a.start);
    
    let result = text;
    for (const { start, end, replacement } of replacements) {
      result = result.substring(0, start) + replacement + result.substring(end);
    }
    
    return result;
  }

  private static wrapWithClass(content: string, type: string): string {
    const escapedContent = this.escapeHtml(content);
    const colorClass = this.getColorClass(type);
    return `<span class="${colorClass}">${escapedContent}</span>`;
  }

  private static getColorClass(type: string): string {
    const colorMap: Record<string, string> = {
      keyword: 'text-purple-600 dark:text-purple-400 font-semibold',
      string: 'text-green-600 dark:text-green-400',
      comment: 'text-gray-500 dark:text-gray-400 italic',
      number: 'text-blue-600 dark:text-blue-400',
      operator: 'text-yellow-600 dark:text-yellow-400',
      function: 'text-red-600 dark:text-red-400 font-medium',
      variable: 'text-gray-800 dark:text-gray-200',
      type: 'text-cyan-600 dark:text-cyan-400',
      property: 'text-orange-600 dark:text-orange-400',
      tag: 'text-red-600 dark:text-red-400 font-medium',
      attribute: 'text-yellow-600 dark:text-yellow-400',
      text: 'text-gray-900 dark:text-white'
    };
    
    return colorMap[type] || 'text-gray-900 dark:text-white';
  }

  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}