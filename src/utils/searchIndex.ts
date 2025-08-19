// 全文検索インデックス実装
import { Note } from '../types';

interface SearchDocument {
  id: string;
  type: 'note' | 'page';
  noteId: string; // ✅ ID統一修正: number → string
  pageId?: string; // ✅ ID統一修正: number → string
  title: string;
  content: string;
  tags: string[];
  subFolderId: string;
  tokens: string[];
  createdAt: string;
  updatedAt: string;
}

interface SearchIndex {
  documents: Map<string, SearchDocument>;
  invertedIndex: Map<string, Set<string>>;
  lastUpdated: string;
}

class FullTextSearchIndex {
  private index: SearchIndex = {
    documents: new Map(),
    invertedIndex: new Map(),
    lastUpdated: new Date().toISOString()
  };

  // 日本語のトークン化（簡易版）
  private tokenize(text: string): string[] {
    // HTMLタグを除去
    const cleanText = text
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-z]+;/gi, ' ');
    
    // 日本語と英語の単語を抽出
    const tokens: string[] = [];
    
    // 英単語の抽出
    const englishWords = cleanText.match(/[a-zA-Z]+/g) || [];
    tokens.push(...englishWords.map(w => w.toLowerCase()));
    
    // 日本語の文字n-gram（2-gram）
    const japaneseText = cleanText.replace(/[a-zA-Z0-9\s]/g, '');
    for (let i = 0; i < japaneseText.length - 1; i++) {
      tokens.push(japaneseText.substring(i, i + 2));
    }
    
    // 数字
    const numbers = cleanText.match(/\d+/g) || [];
    tokens.push(...numbers);
    
    return [...new Set(tokens)]; // 重複除去
  }

  // ドキュメントをインデックスに追加
  addDocument(note: Note, subFolderId: string) {
    // ノート自体を追加
    const noteDocId = `note-${note.id}`;
    const noteTokens = [
      ...this.tokenize(note.title),
      ...note.tags.flatMap(tag => this.tokenize(tag))
    ];
    
    const noteDoc: SearchDocument = {
      id: noteDocId,
      type: 'note',
      noteId: note.id,
      title: note.title,
      content: '',
      tags: note.tags,
      subFolderId,
      tokens: noteTokens,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    };
    
    this.index.documents.set(noteDocId, noteDoc);
    this.updateInvertedIndex(noteDocId, noteTokens);
    
    // 各ページを追加
    note.pages.forEach(page => {
      const pageDocId = `page-${note.id}-${page.id}`;
      const pageTokens = [
        ...this.tokenize(page.title),
        ...this.tokenize(page.content)
      ];
      
      const pageDoc: SearchDocument = {
        id: pageDocId,
        type: 'page',
        noteId: note.id,
        pageId: page.id,
        title: page.title,
        content: page.content,
        tags: note.tags,
        subFolderId,
        tokens: pageTokens,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      };
      
      this.index.documents.set(pageDocId, pageDoc);
      this.updateInvertedIndex(pageDocId, pageTokens);
    });
  }

  // 逆インデックスを更新
  private updateInvertedIndex(docId: string, tokens: string[]) {
    tokens.forEach(token => {
      if (!this.index.invertedIndex.has(token)) {
        this.index.invertedIndex.set(token, new Set());
      }
      this.index.invertedIndex.get(token)!.add(docId);
    });
  }

  // ドキュメントを削除
  removeDocument(noteId: string) { // ✅ ID統一修正: number → string
    const docIdsToRemove: string[] = [];
    
    this.index.documents.forEach((doc, docId) => {
      if (doc.noteId === noteId) {
        docIdsToRemove.push(docId);
      }
    });
    
    docIdsToRemove.forEach(docId => {
      const doc = this.index.documents.get(docId);
      if (doc) {
        // 逆インデックスから削除
        doc.tokens.forEach(token => {
          const docSet = this.index.invertedIndex.get(token);
          if (docSet) {
            docSet.delete(docId);
            if (docSet.size === 0) {
              this.index.invertedIndex.delete(token);
            }
          }
        });
        this.index.documents.delete(docId);
      }
    });
  }

  // 検索実行
  search(query: string, options: { 
    limit?: number; 
    subFolderId?: string;
    tags?: string[];
  } = {}): string[] { // ✅ ID統一修正: number[] → string[]
    const queryTokens = this.tokenize(query.toLowerCase());
    const matchingDocs = new Map<string, number>(); // ✅ ID統一修正: noteId string → score number
    
    // 各トークンに対してマッチするドキュメントを検索
    queryTokens.forEach(token => {
      const docIds = this.index.invertedIndex.get(token);
      if (docIds) {
        docIds.forEach(docId => {
          const doc = this.index.documents.get(docId);
          if (doc) {
            // フィルタリング
            if (options.subFolderId && doc.subFolderId !== options.subFolderId) {
              return;
            }
            if (options.tags && options.tags.length > 0) {
              const hasAllTags = options.tags.every(tag => doc.tags.includes(tag));
              if (!hasAllTags) return;
            }
            
            // スコアリング（簡易版）
            let score = matchingDocs.get(doc.noteId) || 0;
            
            // タイトルマッチは高スコア
            if (doc.type === 'note' && doc.title.toLowerCase().includes(query.toLowerCase())) {
              score += 10;
            }
            // ページタイトルマッチ
            if (doc.type === 'page' && doc.title.toLowerCase().includes(query.toLowerCase())) {
              score += 5;
            }
            // コンテンツマッチ
            score += 1;
            
            matchingDocs.set(doc.noteId, score);
          }
        });
      }
    });
    
    // スコア順にソート
    const sortedResults = Array.from(matchingDocs.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([noteId]) => noteId);
    
    // 制限を適用
    if (options.limit) {
      return sortedResults.slice(0, options.limit);
    }
    
    return sortedResults;
  }

  // インデックスをクリア
  clear() {
    this.index.documents.clear();
    this.index.invertedIndex.clear();
    this.index.lastUpdated = new Date().toISOString();
  }

  // インデックスをリビルド
  rebuild(notesData: Record<string, Note[]>) {
    this.clear();
    
    Object.entries(notesData).forEach(([subFolderId, notes]) => {
      notes.forEach(note => {
        this.addDocument(note, subFolderId);
      });
    });
    
    this.index.lastUpdated = new Date().toISOString();
  }

  // インデックスの統計情報
  getStats() {
    return {
      documentCount: this.index.documents.size,
      tokenCount: this.index.invertedIndex.size,
      lastUpdated: this.index.lastUpdated
    };
  }

  // インデックスをエクスポート（永続化用）
  export(): string {
    return JSON.stringify({
      documents: Array.from(this.index.documents.entries()),
      invertedIndex: Array.from(this.index.invertedIndex.entries()).map(([token, docIds]) => [
        token,
        Array.from(docIds)
      ]),
      lastUpdated: this.index.lastUpdated
    });
  }

  // インデックスをインポート
  import(data: string) {
    try {
      const parsed = JSON.parse(data);
      this.index.documents = new Map(parsed.documents);
      this.index.invertedIndex = new Map(
        parsed.invertedIndex.map(([token, docIds]: [string, string[]]) => [
          token,
          new Set(docIds)
        ])
      );
      this.index.lastUpdated = parsed.lastUpdated;
    } catch (error) {
      console.error('Failed to import search index:', error);
      this.clear();
    }
  }
}

// シングルトンインスタンス
export const searchIndex = new FullTextSearchIndex();

// ローカルストレージへの永続化
const STORAGE_KEY = 'notespace-search-index';

export const saveSearchIndex = () => {
  try {
    const data = searchIndex.export();
    localStorage.setItem(STORAGE_KEY, data);
  } catch (error) {
    console.error('Failed to save search index:', error);
  }
};

export const loadSearchIndex = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      searchIndex.import(data);
    }
  } catch (error) {
    console.error('Failed to load search index:', error);
  }
};