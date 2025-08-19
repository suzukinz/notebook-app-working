# 検索機能強化アーキテクチャ設計書

## 概要

既存の基本的な検索機能を大幅に強化し、高性能で直感的な検索体験を提供する。

## アーキテクチャ概要

### 3層検索システム
```
UI Layer (検索インターフェース)
├── Advanced Search Component
├── Search Suggestions
└── Search Result Highlighting

Processing Layer (検索エンジン)
├── Enhanced Full-Text Index
├── Filter Engine (日付、タグ、属性)
└── Real-time Index Update

Storage Layer (データ永続化)
├── IndexedDB Search Index
├── Search History
└── Search Analytics
```

## IndexedDB拡張設計

### 新しいObject Stores

#### 1. search_index
```typescript
interface SearchIndexEntry {
  id: string;                    // Primary Key: "token:docId"
  token: string;                 // 検索トークン
  docId: string;                 // ドキュメントID
  docType: 'note' | 'page';      // ドキュメントタイプ
  noteId: string;                // ノートID
  pageId?: string;               // ページID（ページの場合）
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

// Indexes
- token (composite: token + docType + fieldType)
- docId
- noteId
- subFolderId
- notebookId
- workspaceId
- token_frequency (composite: token + frequency)
- updatedAt
```

#### 2. search_documents
```typescript
interface SearchDocument {
  id: string;                    // Primary Key
  type: 'note' | 'page';         // ドキュメントタイプ
  noteId: string;                // ノートID
  pageId?: string;               // ページID
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

// Indexes
- type
- noteId
- subFolderId
- notebookId
- workspaceId
- createdAt
- updatedAt
- isPinned
- isFavorite
- editorType
- popularity
- tags (multi-entry)
- wordCount
- createdAt_workspaceId (composite)
- isPinned_updatedAt (composite)
- isFavorite_updatedAt (composite)
```

#### 3. search_history
```typescript
interface SearchHistory {
  id: string;                    // Primary Key
  query: string;                 // 検索クエリ
  filters: {
    dateRange?: {
      start: string;
      end: string;
    };
    tags?: string[];
    contentType?: string[];
    workspace?: string[];
    notebook?: string[];
    subFolder?: string[];
  };
  resultCount: number;           // 結果件数
  clickedResults: string[];      // クリックされた結果ID
  searchTime: number;            // 検索時間（ms）
  timestamp: string;             // 検索実行時刻
  userId?: string;               // ユーザーID（将来用）
}

// Indexes
- query
- timestamp
- resultCount
- searchTime
```

#### 4. search_suggestions
```typescript
interface SearchSuggestion {
  id: string;                    // Primary Key
  type: 'query' | 'tag' | 'title' | 'auto-complete';
  text: string;                  // 候補テキスト
  frequency: number;             // 使用頻度
  category: string;              // カテゴリ
  score: number;                 // スコア
  lastUsed: string;              // 最終使用日時
  metadata?: any;                // 追加メタデータ
}

// Indexes
- type
- text
- frequency
- score
- lastUsed
- type_score (composite)
```

#### 5. search_analytics
```typescript
interface SearchAnalytics {
  id: string;                    // Primary Key
  date: string;                  // 日付（YYYY-MM-DD）
  totalSearches: number;         // 総検索数
  uniqueQueries: number;         // ユニーク検索数
  avgResultCount: number;        // 平均結果件数
  avgSearchTime: number;         // 平均検索時間
  popularQueries: Array<{        // 人気検索クエリ
    query: string;
    count: number;
  }>;
  noResultQueries: string[];     // 結果なしクエリ
  topClickedResults: Array<{     // よくクリックされる結果
    noteId: string;
    title: string;
    clicks: number;
  }>;
}

// Indexes
- date
- totalSearches
- avgSearchTime
```

## 強化された検索エンジン

### 1. トークナイザー強化

```typescript
interface EnhancedTokenizer {
  // 日本語処理
  tokenizeJapanese(text: string): Token[];
  extractKanji(text: string): string[];
  extractHiragana(text: string): string[];
  extractKatakana(text: string): string[];
  
  // 英語処理
  tokenizeEnglish(text: string): Token[];
  stemWords(words: string[]): string[];
  
  // 混合処理
  detectLanguage(text: string): 'ja' | 'en' | 'mixed';
  tokenizeMixed(text: string): Token[];
  
  // 特殊処理
  extractURLs(text: string): string[];
  extractEmails(text: string): string[];
  extractDates(text: string): Date[];
  extractNumbers(text: string): number[];
}

interface Token {
  text: string;
  type: 'word' | 'phrase' | 'url' | 'email' | 'date' | 'number';
  language: 'ja' | 'en';
  position: number;
  length: number;
  stemmed?: string;
  normalized: string;
}
```

### 2. スコアリングアルゴリズム

```typescript
interface ScoringFactors {
  // テキストマッチ
  exactMatch: number;           // 完全一致
  partialMatch: number;         // 部分一致
  fuzzyMatch: number;          // 曖昧一致
  
  // 位置ベース
  titleMatch: number;          // タイトル一致
  contentMatch: number;        // コンテンツ一致
  tagMatch: number;            // タグ一致
  
  // 頻度ベース
  termFrequency: number;       // 単語頻度
  documentFrequency: number;   // 文書頻度
  
  // 属性ベース
  isPinned: number;            // ピン留め
  isFavorite: number;          // お気に入り
  recency: number;             // 最新性
  popularity: number;          // 人気度
  
  // コンテキスト
  subFolderRelevance: number;  // フォルダ関連性
  tagRelevance: number;        // タグ関連性
}
```

### 3. フィルタリングエンジン

```typescript
interface SearchFilters {
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
    start?: string;
    end?: string;
    field: 'createdAt' | 'updatedAt' | 'lastAccessedAt';
  };
  
  // コンテンツフィルタ
  contentType?: ('text' | 'image' | 'link')[];
  wordCountRange?: { min?: number; max?: number; };
  
  // ソートオプション
  sortBy?: 'relevance' | 'date' | 'title' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  
  // ページネーション
  limit?: number;
  offset?: number;
}
```

## パフォーマンス最適化

### 1. インデックス戦略
- **複合インデックス**: よく使用される組み合わせ
- **部分インデックス**: 条件付きインデックス
- **カバリングインデックス**: クエリに必要な全データを含む

### 2. キャッシュ戦略
- **検索結果キャッシュ**: 同一クエリの高速化
- **インデックスキャッシュ**: 頻繁アクセストークン
- **候補キャッシュ**: 検索候補の事前生成

### 3. 非同期処理
- **段階的検索**: 高速結果→詳細結果
- **バックグラウンド更新**: UIブロックしないインデックス更新
- **Worker活用**: 重い処理の並列化

## リアルタイム更新

### インデックス更新戦略
```typescript
interface IndexUpdateStrategy {
  // 即座更新
  immediateUpdate: string[];    // 'title', 'tags'
  
  // デバウンス更新
  debouncedUpdate: {
    fields: string[];           // 'content'
    delay: number;             // 500ms
  };
  
  // バッチ更新
  batchUpdate: {
    fields: string[];           // 'lastAccessedAt'
    interval: number;          // 5000ms
    maxBatchSize: number;      // 100
  };
}
```

## 検索品質向上

### 1. 学習機能
- **クリック学習**: クリック率でスコア調整
- **頻度学習**: 検索頻度でランキング調整
- **パターン学習**: 検索パターンの識別

### 2. 候補生成
- **クエリ補完**: 入力途中での候補表示
- **関連検索**: 関連キーワード提案
- **履歴ベース**: 過去の検索履歴活用

### 3. エラー訂正
- **スペル訂正**: 入力ミス自動訂正
- **読み方検索**: ひらがな→漢字変換
- **類義語検索**: 同義語での検索拡張

## 実装マイルストーン

### Phase 1: 基盤構築
- IndexedDB拡張
- 強化トークナイザー
- 基本検索エンジン

### Phase 2: UI/UX改善
- 高度検索インターフェース
- 検索候補・履歴
- 結果ハイライト

### Phase 3: パフォーマンス最適化
- インデックス最適化
- キャッシュシステム
- 非同期処理

### Phase 4: 知能化
- 学習機能
- 分析・改善
- パーソナライゼーション

この設計により、エンタープライズレベルの検索体験を実現し、ユーザーの生産性を大幅に向上させることができます。