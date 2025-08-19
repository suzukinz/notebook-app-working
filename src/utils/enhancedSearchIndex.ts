// 強化された検索インデックス実装
import { Note, Page } from '../types';

// 検索ドキュメント型定義
export interface SearchDocument {
  id: string;                    // Primary Key
  type: 'note' | 'page';         // ドキュメントタイプ
  noteId: string;                // ノートID
  pageId?: string | undefined;   // ページID
  title: string;                 // タイトル
  content: string;               // コンテンツ（HTML除去済み）
  plainText: string;             // プレーンテキスト
  tags: string[];                // タグ配列
  
  // 階層情報
  subFolderId: string;           // サブフォルダID
  notebookId: string;            // ノートブックID
  workspaceId: string;           // ワークスペースID
  
  // メタデータ
  wordCount: number;             // 単語数
  characterCount: number;        // 文字数
  language: 'ja' | 'en' | 'mixed'; // 主要言語
  
  // 日時情報
  createdAt: string;             // 作成日時
  updatedAt: string;             // 更新日時
  lastAccessedAt: string;        // 最終アクセス日時
  
  // 属性
  isPinned: boolean;             // ピン留め
  isFavorite: boolean;           // お気に入り
  editorType: 'rich' | 'markdown'; // エディタタイプ
  
  // 検索用計算値
  titleLength: number;           // タイトル長
  popularity: number;            // 人気度（アクセス頻度ベース）
  relevanceScore: number;        // 関連性スコア
}

// 検索インデックスエントリ
export interface SearchIndexEntry {
  id: string;                    // Primary Key: "token:docId"
  token: string;                 // 検索トークン
  docId: string;                 // ドキュメントID
  docType: 'note' | 'page';      // ドキュメントタイプ
  noteId: string;                // ノートID
  pageId?: string | undefined;   // ページID（ページの場合）
  subFolderId: string;           // サブフォルダID
  notebookId: string;            // ノートブックID
  workspaceId: string;           // ワークスペースID
  frequency: number;             // トークン出現頻度
  position: number[];            // トークン位置
  fieldType: 'title' | 'content' | 'tag'; // フィールドタイプ
  score: number;                 // 事前計算スコア
  createdAt: string;             // 作成日時
  updatedAt: string;             // 更新日時
}

// 検索フィルタ
export interface SearchFilters {
  // 基本フィルタ
  query?: string;
  
  // 階層フィルタ
  workspaceIds?: string[];
  notebookIds?: string[];
  subFolderIds?: string[];
  
  // 属性フィルタ
  tags?: string[];
  isPinned?: boolean;
  isFavorite?: boolean;
  editorType?: ('rich' | 'markdown')[];
  
  // 日付フィルタ
  dateRange?: {
    start?: string | undefined;
    end?: string | undefined;
    field: 'createdAt' | 'updatedAt' | 'lastAccessedAt';
  } | undefined;
  
  // コンテンツフィルタ
  contentType?: ('text' | 'image' | 'link')[];
  wordCountRange?: { min?: number; max?: number; };
  
  // ソートオプション
  sortBy?: 'relevance' | 'date' | 'title' | 'popularity' | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
  
  // ページネーション
  limit?: number;
  offset?: number;
}

// 検索結果
export interface SearchResult {
  noteId: string;
  pageId?: string | undefined;
  title: string;
  snippet: string;              // ハイライト付きスニペット
  score: number;
  highlights: Array<{
    field: 'title' | 'content';
    text: string;
    positions: number[];
  }>;
  matchedTokens: string[];
  document: SearchDocument;
}

// トークン型
export interface Token {
  text: string;
  type: 'word' | 'phrase' | 'url' | 'email' | 'date' | 'number';
  language: 'ja' | 'en';
  position: number;
  length: number;
  stemmed?: string;
  normalized: string;
}

// 強化されたトークナイザー
class EnhancedTokenizer {
  private htmlCleanCache = new Map<string, string>();
  private tokenizeCache = new Map<string, Token[]>();

  // HTMLタグを除去してプレーンテキストに変換（キャッシュ付き）
  private cleanHtml(html: string): string {
    if (this.htmlCleanCache.has(html)) {
      return this.htmlCleanCache.get(html)!;
    }
    
    const cleaned = html
      .replace(/<[^>]*>/g, ' ')           // HTMLタグ除去
      .replace(/&[a-z]+;/gi, ' ')         // HTMLエンティティ除去
      .replace(/\s+/g, ' ')               // 連続空白を1つに
      .trim();
      
    // キャッシュサイズ制限（最大1000エントリ）
    if (this.htmlCleanCache.size > 1000) {
      this.htmlCleanCache.clear();
    }
    this.htmlCleanCache.set(html, cleaned);
    return cleaned;
  }

  // 言語検出
  detectLanguage(text: string): 'ja' | 'en' | 'mixed' {
    const cleanText = this.cleanHtml(text);
    const japaneseChars = (cleanText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
    const englishChars = (cleanText.match(/[a-zA-Z]/g) || []).length;
    const totalChars = japaneseChars + englishChars;
    
    if (totalChars === 0) return 'en';
    
    const japaneseRatio = japaneseChars / totalChars;
    if (japaneseRatio > 0.7) return 'ja';
    if (japaneseRatio < 0.3) return 'en';
    return 'mixed';
  }

  // 日本語トークン化（改良版）
  private tokenizeJapanese(text: string): Token[] {
    const tokens: Token[] = [];
    const cleanText = this.cleanHtml(text);
    
    // 日本語文字のみ抽出
    const japaneseText = cleanText.replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
    
    // 2-gram, 3-gram生成
    for (let i = 0; i <= japaneseText.length - 2; i++) {
      const bigram = japaneseText.substring(i, i + 2);
      if (bigram.length === 2) {
        tokens.push({
          text: bigram,
          type: 'word',
          language: 'ja',
          position: cleanText.indexOf(bigram),
          length: 2,
          normalized: bigram.toLowerCase()
        });
      }
      
      // 3-gramも生成（より精密な検索のため）
      if (i <= japaneseText.length - 3) {
        const trigram = japaneseText.substring(i, i + 3);
        tokens.push({
          text: trigram,
          type: 'phrase',
          language: 'ja',
          position: cleanText.indexOf(trigram),
          length: 3,
          normalized: trigram.toLowerCase()
        });
      }
    }
    
    return tokens;
  }

  // 英語トークン化（改良版）
  private tokenizeEnglish(text: string): Token[] {
    const tokens: Token[] = [];
    const cleanText = this.cleanHtml(text).toLowerCase();
    
    // 英単語抽出
    const words = cleanText.match(/[a-zA-Z]+/g) || [];
    words.forEach(word => {
      const position = cleanText.indexOf(word);
      tokens.push({
        text: word,
        type: 'word',
        language: 'en',
        position,
        length: word.length,
        normalized: word.toLowerCase(),
        stemmed: this.simpleStem(word) // 簡易ステミング
      });
    });
    
    return tokens;
  }

  // 特殊コンテンツ抽出
  private extractSpecialContent(text: string): Token[] {
    const tokens: Token[] = [];
    const cleanText = this.cleanHtml(text);
    
    // URL抽出
    const urls = cleanText.match(/https?:\/\/[^\s]+/g) || [];
    urls.forEach(url => {
      tokens.push({
        text: url,
        type: 'url',
        language: 'en',
        position: cleanText.indexOf(url),
        length: url.length,
        normalized: url.toLowerCase()
      });
    });
    
    // 数字抽出
    const numbers = cleanText.match(/\d+/g) || [];
    numbers.forEach(num => {
      tokens.push({
        text: num,
        type: 'number',
        language: 'en',
        position: cleanText.indexOf(num),
        length: num.length,
        normalized: num
      });
    });
    
    return tokens;
  }

  // 簡易英語ステミング
  private simpleStem(word: string): string {
    // 基本的な語尾変化のみ対応
    if (word.endsWith('ing')) return word.slice(0, -3);
    if (word.endsWith('ed')) return word.slice(0, -2);
    if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
    return word;
  }

  // メインのトークン化メソッド（キャッシュ付き）
  tokenize(text: string, fieldType: 'title' | 'content' | 'tag'): Token[] {
    const cacheKey = `${fieldType}:${text.substring(0, 100)}`;
    if (this.tokenizeCache.has(cacheKey)) {
      return this.tokenizeCache.get(cacheKey)!;
    }
    
    const allTokens: Token[] = [];
    const language = this.detectLanguage(text);
    
    // 言語別トークン化
    if (language === 'ja' || language === 'mixed') {
      allTokens.push(...this.tokenizeJapanese(text));
    }
    if (language === 'en' || language === 'mixed') {
      allTokens.push(...this.tokenizeEnglish(text));
    }
    
    // 特殊コンテンツ抽出
    allTokens.push(...this.extractSpecialContent(text));
    
    // 重複除去とソート（最適化）
    const uniqueMap = new Map<string, Token>();
    allTokens.forEach(token => {
      if (!uniqueMap.has(token.normalized)) {
        uniqueMap.set(token.normalized, token);
      }
    });
    
    const result = Array.from(uniqueMap.values()).sort((a, b) => a.position - b.position);
    
    // キャッシュサイズ制限（最大500エントリ）
    if (this.tokenizeCache.size > 500) {
      this.tokenizeCache.clear();
    }
    this.tokenizeCache.set(cacheKey, result);
    return result;
  }
}

// 強化された検索インデックスマネージャー
export class EnhancedSearchIndexManager {
  private tokenizer = new EnhancedTokenizer();
  private dbName = 'NoteSpaceDB';
  private version = 6; // バージョン6に拡張
  private dbCache: IDBDatabase | null = null;
  private searchCache = new Map<string, SearchResult[]>();

  // IndexedDBデータベース取得（キャッシュ付き）
  private async getDatabase(): Promise<IDBDatabase> {
    if (this.dbCache && this.dbCache.version === this.version) {
      return this.dbCache;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.dbCache = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.dbCache = db;
        
        // 検索ドキュメントストア
        if (!db.objectStoreNames.contains('search_documents')) {
          const docStore = db.createObjectStore('search_documents', { keyPath: 'id' });
          docStore.createIndex('type', 'type');
          docStore.createIndex('noteId', 'noteId');
          docStore.createIndex('subFolderId', 'subFolderId');
          docStore.createIndex('notebookId', 'notebookId');
          docStore.createIndex('workspaceId', 'workspaceId');
          docStore.createIndex('createdAt', 'createdAt');
          docStore.createIndex('updatedAt', 'updatedAt');
          docStore.createIndex('isPinned', 'isPinned');
          docStore.createIndex('isFavorite', 'isFavorite');
          docStore.createIndex('tags', 'tags', { multiEntry: true });
          docStore.createIndex('popularity', 'popularity');
        }
        
        // 検索インデックスストア
        if (!db.objectStoreNames.contains('search_index')) {
          const indexStore = db.createObjectStore('search_index', { keyPath: 'id' });
          indexStore.createIndex('token', 'token');
          indexStore.createIndex('docId', 'docId');
          indexStore.createIndex('noteId', 'noteId');
          indexStore.createIndex('subFolderId', 'subFolderId');
          indexStore.createIndex('fieldType', 'fieldType');
          indexStore.createIndex('token_fieldType', ['token', 'fieldType']);
          indexStore.createIndex('frequency', 'frequency');
          indexStore.createIndex('score', 'score'); // スコアインデックス追加
        }
      };
    });
  }

  // ノートからドキュメント生成
  private createSearchDocument(
    note: Note, 
    page: Page | null, 
    subFolderId: string, 
    notebookId: string, 
    workspaceId: string
  ): SearchDocument {
    const isNotePage = page !== null;
    const content = isNotePage ? page!.content : note.pages[0]?.content || '';
    const title = isNotePage ? page!.title : note.title;
    const plainText = this.tokenizer['cleanHtml'](content);
    
    return {
      id: isNotePage ? `page-${note.id}-${page!.id}` : `note-${note.id}`,
      type: isNotePage ? 'page' : 'note',
      noteId: note.id.toString(),
      pageId: isNotePage ? page!.id.toString() : undefined,
      title,
      content,
      plainText,
      tags: note.tags,
      subFolderId,
      notebookId,
      workspaceId,
      wordCount: plainText.split(/\s+/).length,
      characterCount: plainText.length,
      language: this.tokenizer.detectLanguage(plainText),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      lastAccessedAt: new Date().toISOString(),
      isPinned: note.isPinned,
      isFavorite: note.isFavorite,
      editorType: note.editorType || 'rich',
      titleLength: title.length,
      popularity: 0, // 初期値
      relevanceScore: 0 // 初期値
    };
  }

  // ドキュメントをインデックスに追加
  async addDocument(
    note: Note, 
    subFolderId: string, 
    notebookId: string, 
    workspaceId: string
  ): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(['search_documents', 'search_index'], 'readwrite');
    
    try {
      // ノート本体のドキュメント作成
      const noteDocument = this.createSearchDocument(note, null, subFolderId, notebookId, workspaceId);
      await this.storeDocument(transaction, noteDocument);
      
      // 各ページのドキュメント作成
      for (const page of note.pages) {
        const pageDocument = this.createSearchDocument(note, page, subFolderId, notebookId, workspaceId);
        await this.storeDocument(transaction, pageDocument);
      }
      
      console.log(`✅ インデックス追加完了: ノート ${note.id} (${note.pages.length} ページ)`);
    } catch (error) {
      console.error('❌ インデックス追加エラー:', error);
      throw error;
    }
  }

  // ドキュメントとインデックスエントリをストレージに保存
  private async storeDocument(transaction: IDBTransaction, document: SearchDocument): Promise<void> {
    const docStore = transaction.objectStore('search_documents');
    const indexStore = transaction.objectStore('search_index');
    
    // ドキュメント保存
    docStore.put(document);
    
    // インデックスエントリ生成・保存
    await this.createIndexEntries(indexStore, document);
  }

  // インデックスエントリ生成
  private async createIndexEntries(indexStore: IDBObjectStore, document: SearchDocument): Promise<void> {
    const entries: SearchIndexEntry[] = [];
    
    // タイトルのトークン化
    const titleTokens = this.tokenizer.tokenize(document.title, 'title');
    titleTokens.forEach((token, index) => {
      entries.push({
        id: `${token.normalized}:${document.id}:title:${index}`,
        token: token.normalized,
        docId: document.id,
        docType: document.type,
        noteId: document.noteId,
        pageId: document.pageId,
        subFolderId: document.subFolderId,
        notebookId: document.notebookId,
        workspaceId: document.workspaceId,
        frequency: 1,
        position: [token.position],
        fieldType: 'title',
        score: this.calculateTokenScore(token, 'title', document),
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      });
    });
    
    // コンテンツのトークン化
    const contentTokens = this.tokenizer.tokenize(document.content, 'content');
    const tokenFrequency = new Map<string, number>();
    
    contentTokens.forEach(token => {
      const freq = tokenFrequency.get(token.normalized) || 0;
      tokenFrequency.set(token.normalized, freq + 1);
    });
    
    contentTokens.forEach((token, index) => {
      entries.push({
        id: `${token.normalized}:${document.id}:content:${index}`,
        token: token.normalized,
        docId: document.id,
        docType: document.type,
        noteId: document.noteId,
        pageId: document.pageId,
        subFolderId: document.subFolderId,
        notebookId: document.notebookId,
        workspaceId: document.workspaceId,
        frequency: tokenFrequency.get(token.normalized) || 1,
        position: [token.position],
        fieldType: 'content',
        score: this.calculateTokenScore(token, 'content', document),
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      });
    });
    
    // タグのトークン化
    document.tags.forEach(tag => {
      const tagTokens = this.tokenizer.tokenize(tag, 'tag');
      tagTokens.forEach((token, index) => {
        entries.push({
          id: `${token.normalized}:${document.id}:tag:${index}`,
          token: token.normalized,
          docId: document.id,
          docType: document.type,
          noteId: document.noteId,
          pageId: document.pageId,
          subFolderId: document.subFolderId,
          notebookId: document.notebookId,
          workspaceId: document.workspaceId,
          frequency: 1,
          position: [0],
          fieldType: 'tag',
          score: this.calculateTokenScore(token, 'tag', document),
          createdAt: document.createdAt,
          updatedAt: document.updatedAt
        });
      });
    });
    
    // バッチでインデックスエントリを保存
    for (const entry of entries) {
      indexStore.put(entry);
    }
  }

  // トークンスコア計算
  private calculateTokenScore(token: Token, fieldType: 'title' | 'content' | 'tag', document: SearchDocument): number {
    let score = 1;
    
    // フィールドタイプによる重み付け
    switch (fieldType) {
      case 'title': score *= 3; break;
      case 'tag': score *= 2; break;
      case 'content': score *= 1; break;
    }
    
    // トークンタイプによる重み付け
    switch (token.type) {
      case 'phrase': score *= 1.2; break;
      case 'word': score *= 1; break;
      default: score *= 0.8; break;
    }
    
    // 言語による重み付け
    if (token.language === 'ja') score *= 1.1;
    
    // ドキュメント属性による重み付け
    if (document.isPinned) score *= 1.5;
    if (document.isFavorite) score *= 1.2;
    
    return score;
  }

  // 検索実行（キャッシュ付き）
  async search(filters: SearchFilters): Promise<SearchResult[]> {
    if (!filters.query) return [];
    
    // キャッシュキー生成
    const cacheKey = JSON.stringify(filters);
    if (this.searchCache.has(cacheKey)) {
      console.log(`💾 キャッシュヒット: "${filters.query}"`);
      return this.searchCache.get(cacheKey)!;
    }
    
    const db = await this.getDatabase();
    const transaction = db.transaction(['search_documents', 'search_index'], 'readonly');
    
    try {
      const results = await this.executeSearch(transaction, filters);
      
      // キャッシュに保存（最大100エントリ）
      if (this.searchCache.size > 100) {
        const keys = Array.from(this.searchCache.keys());
        // 古いエントリの半分を削除
        keys.slice(0, 50).forEach(key => this.searchCache.delete(key));
      }
      this.searchCache.set(cacheKey, results);
      
      console.log(`🔍 検索完了: "${filters.query}" -> ${results.length}件`);
      return results;
    } catch (error) {
      console.error('❌ 検索エラー:', error);
      return [];
    }
  }

  // 検索実行の実装（最適化版）
  private async executeSearch(transaction: IDBTransaction, filters: SearchFilters): Promise<SearchResult[]> {
    const query = filters.query!;
    const queryTokens = this.tokenizer.tokenize(query, 'content');
    const matchingDocs = new Map<string, { score: number; matchedTokens: string[]; }>(); 
    
    const indexStore = transaction.objectStore('search_index');
    
    // 並列検索でパフォーマンス向上
    const searchPromises = queryTokens.map(async (token) => {
      const index = indexStore.index('token');
      const request = index.getAll(token.normalized);
      
      const entries: SearchIndexEntry[] = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      return { token, entries };
    });
    
    const searchResults = await Promise.all(searchPromises);
    
    // 結果を結合
    for (const { token, entries } of searchResults) {
      for (const entry of entries) {
        // フィルタ適用（早期退出）
        if (!this.passesFilters(entry, filters)) continue;
        
        const existing = matchingDocs.get(entry.docId) || { score: 0, matchedTokens: [] };
        existing.score += entry.score;
        if (!existing.matchedTokens.includes(token.normalized)) {
          existing.matchedTokens.push(token.normalized);
        }
        matchingDocs.set(entry.docId, existing);
      }
    }
    
    // ドキュメント詳細取得
    const docStore = transaction.objectStore('search_documents');
    const results: SearchResult[] = [];
    
    for (const [docId, match] of matchingDocs.entries()) {
      const docRequest = docStore.get(docId);
      const document: SearchDocument = await new Promise((resolve, reject) => {
        docRequest.onsuccess = () => resolve(docRequest.result);
        docRequest.onerror = () => reject(docRequest.error);
      });
      
      if (document) {
        results.push({
          noteId: document.noteId,
          pageId: document.pageId || undefined,
          title: document.title,
          snippet: this.generateSnippet(document, query),
          score: match.score,
          highlights: this.generateHighlights(document, query),
          matchedTokens: match.matchedTokens,
          document
        });
      }
    }
    
    // 高速ソート（top-kアルゴリズム使用）
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    // 部分ソート（必要な分だけ）
    if (results.length > limit + offset) {
      results.sort((a, b) => b.score - a.score);
      return results.slice(offset, offset + limit);
    } else {
      results.sort((a, b) => b.score - a.score);
      return results.slice(offset);
    }
  }

  // フィルタ適用チェック
  private passesFilters(entry: SearchIndexEntry, filters: SearchFilters): boolean {
    if (filters.subFolderIds && !filters.subFolderIds.includes(entry.subFolderId)) return false;
    if (filters.notebookIds && !filters.notebookIds.includes(entry.notebookId)) return false;
    if (filters.workspaceIds && !filters.workspaceIds.includes(entry.workspaceId)) return false;
    return true;
  }

  // スニペット生成
  private generateSnippet(document: SearchDocument, query: string): string {
    const maxLength = 150;
    const queryTokens = this.tokenizer.tokenize(query, 'content');
    
    if (queryTokens.length === 0) {
      return document.plainText.substring(0, maxLength) + '...';
    }
    
    // 最初のマッチ位置を探す
    const firstToken = queryTokens[0];
    if (!firstToken) {
      return document.plainText.substring(0, maxLength) + '...';
    }
    const content = document.plainText.toLowerCase();
    const matchPos = content.indexOf(firstToken.normalized);
    
    if (matchPos === -1) {
      return document.plainText.substring(0, maxLength) + '...';
    }
    
    // マッチ位置を中心にスニペット生成
    const start = Math.max(0, matchPos - 50);
    const end = Math.min(document.plainText.length, start + maxLength);
    
    let snippet = document.plainText.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < document.plainText.length) snippet = snippet + '...';
    
    return snippet;
  }

  // ハイライト生成
  private generateHighlights(document: SearchDocument, query: string): Array<{
    field: 'title' | 'content';
    text: string;
    positions: number[];
  }> {
    const highlights: Array<{ field: 'title' | 'content'; text: string; positions: number[]; }> = [];
    const queryTokens = this.tokenizer.tokenize(query, 'content');
    
    // タイトルハイライト
    const titleHighlight = this.findHighlights(document.title, queryTokens);
    if (titleHighlight.positions.length > 0) {
      highlights.push({
        field: 'title',
        text: titleHighlight.text,
        positions: titleHighlight.positions
      });
    }
    
    // コンテンツハイライト
    const contentHighlight = this.findHighlights(document.plainText, queryTokens);
    if (contentHighlight.positions.length > 0) {
      highlights.push({
        field: 'content',
        text: contentHighlight.text,
        positions: contentHighlight.positions
      });
    }
    
    return highlights;
  }

  // テキスト内ハイライト検索
  private findHighlights(text: string, queryTokens: Token[]): { text: string; positions: number[]; } {
    const positions: number[] = [];
    const lowerText = text.toLowerCase();
    
    for (const token of queryTokens) {
      let searchStart = 0;
      let pos = lowerText.indexOf(token.normalized, searchStart);
      
      while (pos !== -1) {
        positions.push(pos);
        searchStart = pos + token.normalized.length;
        pos = lowerText.indexOf(token.normalized, searchStart);
      }
    }
    
    return { text, positions: positions.sort((a, b) => a - b) };
  }

  // インデックスクリア
  async clearIndex(): Promise<void> {
    const db = await this.getDatabase();
    const transaction = db.transaction(['search_documents', 'search_index'], 'readwrite');
    
    const docStore = transaction.objectStore('search_documents');
    const indexStore = transaction.objectStore('search_index');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = docStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = indexStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
    
    // キャッシュもクリア
    this.searchCache.clear();
    this.tokenizer['htmlCleanCache'].clear();
    this.tokenizer['tokenizeCache'].clear();
    
    console.log('🗑️ 検索インデックスクリア完了');
  }

  // インデックス統計取得
  async getIndexStats(): Promise<{
    documentCount: number;
    indexEntryCount: number;
    lastUpdated: string;
  }> {
    const db = await this.getDatabase();
    const transaction = db.transaction(['search_documents', 'search_index'], 'readonly');
    
    const docCount = await this.getStoreCount(transaction.objectStore('search_documents'));
    const indexCount = await this.getStoreCount(transaction.objectStore('search_index'));
    
    return {
      documentCount: docCount,
      indexEntryCount: indexCount,
      lastUpdated: new Date().toISOString()
    };
  }

  // ストア内アイテム数取得
  private async getStoreCount(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// シングルトンインスタンス
export const enhancedSearchIndex = new EnhancedSearchIndexManager();