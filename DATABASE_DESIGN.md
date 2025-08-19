# ノートアプリケーション データベース設計書

## 概要

このドキュメントでは、ノートアプリケーションの完全なデータベース設計、データ構造、ストア管理システムについて説明します。

## アーキテクチャ概要

### デュアルストレージシステム
- **LocalStorage**: レガシーデータとUI状態の管理
- **IndexedDB**: メインデータストレージとオフライン同期
- **Supabase**: クラウド同期とマルチデバイス対応

### データ階層（4層構造）
```
Workspace → Notebook → SubFolder → Note
```

## データモデル

### 1. 基本エンティティ

#### User（ユーザー）
```typescript
interface User {
  id: string;                // UUID
  email: string;             // メールアドレス
  displayName: string;       // 表示名
  createdAt: string;         // 作成日時
  updatedAt: string;         // 更新日時
}
```

#### Workspace（ワークスペース）
```typescript
interface Workspace {
  id: string;                // UUID
  name: string;              // ワークスペース名
  icon: string;              // アイコン文字列
  color: string;             // カラーテーマ
}
```

#### Notebook（ノートブック）
```typescript
interface Notebook {
  id: string;                // UUID
  workspaceId: string;       // 所属ワークスペースID
  name: string;              // ノートブック名
  count: number;             // 含まれるノート数
  color: string;             // カラーテーマ
  description?: string;      // 説明（オプション）
  image?: string;            // Base64画像データ（オプション）
}
```

#### SubFolder（サブフォルダ）
```typescript
interface SubFolder {
  id: string;                // UUID
  name: string;              // フォルダ名
  count: number;             // 含まれるノート数
  color: string;             // カラーテーマ
  image?: string;            // Base64画像データ（オプション）
}
```

#### Note（ノート）
```typescript
interface Note {
  id: number;                // Auto-increment ID
  title: string;             // ノートタイトル
  tags: string[];            // タグ配列
  createdAt: string;         // 作成日時
  updatedAt: string;         // 更新日時
  isPinned: boolean;         // ピン留めフラグ
  isFavorite: boolean;       // お気に入りフラグ
  pages: Page[];             // ページ配列
  editorType?: 'rich' | 'markdown'; // エディタタイプ
  color?: string;            // ノートカードの色
}
```

#### Page（ページ）
```typescript
interface Page {
  id: number;                // ページID
  title: string;             // ページタイトル
  content: string;           // コンテンツ（HTML/Markdown）
}
```

### 2. 補助エンティティ

#### Tag（タグ）
```typescript
interface Tag {
  name: string;              // タグ名
  color: string;             // タグ色
  count: number;             // 使用回数
}
```

#### Activity（アクティビティ）
```typescript
interface Activity {
  id: string;                // UUID
  type: 'created' | 'updated' | 'deleted'; // アクション種別
  noteTitle: string;         // 対象ノートタイトル
  timestamp: string;         // タイムスタンプ
  folder: string;            // フォルダ名
}
```

## IndexedDB スキーマ

### データベース設定
- **Database Name**: `NoteSpaceDB`
- **Current Version**: 5
- **Migration Strategy**: Sequential version-based migrations

### Object Stores

#### 1. notes
```typescript
interface IndexedDBNote {
  id: string;                // Primary Key
  workspaceId: string;       // ワークスペースID
  notebookId: string;        // ノートブックID
  subFolderId: string;       // サブフォルダID
  title: string;             // タイトル
  content: string;           // コンテンツ
  tags: string[];            // タグ配列
  version: number;           // バージョン管理
  deleted: boolean;          // 論理削除フラグ
  createdAt: string;         // 作成日時
  updatedAt: string;         // 更新日時
  lastSyncAt?: string;       // 最終同期日時
}

// Indexes
- workspaceId
- notebookId  
- subFolderId
- updatedAt
- deleted
- workspaceId_updatedAt (composite)
- deleted_updatedAt (composite)
```

#### 2. workspaces
```typescript
interface IndexedDBWorkspace {
  id: string;                // Primary Key
  name: string;              // ワークスペース名
  icon: string;              // アイコン
  color: string;             // カラー
  version: number;           // バージョン管理
  deleted: boolean;          // 論理削除フラグ
  createdAt: string;         // 作成日時
  updatedAt: string;         // 更新日時
  lastSyncAt?: string;       // 最終同期日時
}

// Indexes
- updatedAt
- deleted
```

#### 3. settings
```typescript
interface IndexedDBSetting {
  id: string;                // Primary Key
  key: string;               // 設定キー
  value: any;                // 設定値
  version: number;           // バージョン管理
  deleted: boolean;          // 論理削除フラグ
  createdAt: string;         // 作成日時
  updatedAt: string;         // 更新日時
}

// Indexes
- key (unique)
```

#### 4. changes (Outbox Pattern)
```typescript
interface Change {
  id: string;                // Primary Key
  action: 'create' | 'update' | 'delete'; // アクション
  entityType: 'note' | 'workspace' | 'setting' | 'attachment';
  entityId: string;          // エンティティID
  payload: any;              // ペイロード
  clientSeq: number;         // クライアントシーケンス
  createdAt: string;         // 作成日時
  updatedAt: string;         // 更新日時
  version: number;           // バージョン
  status: 'queued' | 'sending' | 'acked' | 'error';
  lastError?: string;        // エラー情報
}

// Indexes
- status
- createdAt
- entityType
```

#### 5. attachments
```typescript
interface Attachment {
  id: string;                // Primary Key
  noteId: string;            // ノートID
  filename: string;          // ファイル名
  mimeType: string;          // MIMEタイプ
  size: number;              // ファイルサイズ
  data: ArrayBuffer;         // ファイルデータ
  version: number;           // バージョン管理
  deleted: boolean;          // 論理削除フラグ
  createdAt: string;         // 作成日時
  updatedAt: string;         // 更新日時
  lastSyncAt?: string;       // 最終同期日時
}

// Indexes
- noteId
- updatedAt
- deleted
```

#### 6. sync_state
```typescript
interface SyncState {
  key: string;               // Primary Key
  value: any;                // 同期状態データ
}
```

#### 7. meta
```typescript
interface Meta {
  key: string;               // Primary Key
  value: any;                // メタデータ
}
```

## ストア管理システム

### 1. NotebookStore（Zustand）

#### 状態管理
```typescript
interface NotebookState {
  // 選択状態
  selectedWorkspace: string;
  selectedNotebook: string;
  selectedSubFolder: string;
  selectedNote: Note | null;
  currentPage: number;
  isSyncing: boolean;
  
  // 検索・フィルタ
  searchQuery: string;
  selectedTags: string[];
  listViewMode: 'list' | 'grid';
  showNoteList: boolean;
  sidebarExpanded: boolean;
  
  // 展開状態
  expandedNotebooks: string[];
  expandedSubFolders: string[];
  
  // ビュー状態
  showMindMap: boolean;
  showDashboard: boolean;
  viewMode: 'home' | 'notes' | 'dashboard';
  
  // データ
  notesData: Record<string, Note[]>;
  subFoldersData: Record<string, SubFolder[]>;
  workspaces: Workspace[];
  notebooks: Record<string, Notebook[]>;
}
```

### 2. IndexedDBStore（Zustand）

#### IndexedDB専用状態
```typescript
interface IndexedDBState {
  isInitialized: boolean;
  notes: IndexedDBNote[];
  workspaces: IndexedDBWorkspace[];
  viewMode: 'home' | 'notes' | 'dashboard';
  selectedWorkspace: string;
  selectedNotebook: string;
  selectedSubFolder: string;
  showNoteList: boolean;
}
```

## データ同期戦略

### 1. 階層型同期
```
Local Storage (UI State) ←→ IndexedDB (Offline) ←→ Supabase (Cloud)
```

### 2. 競合解決
- **Last Writer Wins**: タイムスタンプベース
- **Version Control**: インクリメンタルバージョン管理
- **Outbox Pattern**: 変更履歴の追跡

### 3. オフライン対応
- **Change Tracking**: 全変更をローカルに記録
- **Queue Management**: 接続回復時の自動同期
- **Conflict Detection**: サーバーとの差分検出

## API インターフェース

### 1. IndexedDBManager

#### 主要メソッド
```typescript
class IndexedDBManager {
  // ノート操作
  createNote(noteData: Omit<Note, 'id' | 'version' | 'deleted' | 'createdAt' | 'updatedAt'>): Promise<Note>
  updateNote(id: string, updates: Partial<Note>): Promise<Note>
  deleteNote(id: string, hardDelete?: boolean): Promise<void>
  getNote(id: string): Promise<Note | null>
  getNotesByWorkspace(workspaceId: string, includeDeleted?: boolean): Promise<Note[]>
  
  // ワークスペース操作
  createWorkspace(workspaceData: Omit<Workspace, 'id' | 'version' | 'deleted' | 'createdAt' | 'updatedAt'>): Promise<Workspace>
  updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace>
  deleteWorkspace(id: string, hardDelete?: boolean): Promise<void>
  getAllWorkspaces(includeDeleted?: boolean): Promise<Workspace[]>
  
  // 設定操作
  setSetting(key: string, value: any): Promise<void>
  getSetting(key: string): Promise<any>
  deleteSetting(key: string): Promise<void>
  
  // 同期状態管理
  getSyncState(key: string): Promise<any>
  setSyncState(key: string, value: any): Promise<void>
  
  // 変更履歴管理
  getQueuedChanges(): Promise<Change[]>
  markChangeAsAcked(changeId: string): Promise<void>
  markChangeAsError(changeId: string, error: string): Promise<void>
}
```

### 2. NotebookStore Actions

#### データ操作
```typescript
// ノート管理
updateNote: (noteId: number, updates: Partial<Note>) => void
addNote: (subFolderId: string, note: Omit<Note, 'id'>) => void
addNoteToSubFolder: (subFolderId: string, editorType?: 'rich' | 'markdown') => void
deleteNote: (noteId: number) => void

// フォルダ管理
addSubFolder: (notebookId: string, subFolder: Omit<SubFolder, 'id'>) => void
deleteSubFolder: (subFolderId: string) => void

// ノートブック管理
addNotebook: (notebook: { name: string; color: string; description?: string; image?: string }) => void
deleteNotebook: (notebookId: string) => void

// ワークスペース管理
addWorkspace: (workspace: { name: string; icon: string; color: string }) => void
editWorkspace: (workspaceId: string, updates: { name: string; icon: string; color: string }) => void
deleteWorkspace: (workspaceId: string) => void

// データ管理
exportAllData: () => void
importAllData: () => Promise<void>
syncWithSupabase?: (userId: string) => Promise<void>
```

## デフォルトデータ構造

### 初期フォルダ設定
```typescript
const subFoldersInitial = {
  'projects': [
    { id: 'frontend', name: 'Frontend', color: 'blue', count: 0 },
    { id: 'backend', name: 'Backend', color: 'green', count: 0 },
    { id: 'database', name: 'Database', color: 'yellow', count: 0 }
  ],
  'meetings': [
    { id: 'standup', name: 'Standup', color: 'orange', count: 0 },
    { id: 'planning', name: 'Planning', color: 'red', count: 0 }
  ],
  'diary': [
    { id: 'daily', name: '日記', color: 'pink', count: 0 },
    { id: 'travel', name: '旅行', color: 'purple', count: 0 }
  ],
  'tech': [
    { id: 'programming', name: 'プログラミング', color: 'indigo', count: 0 },
    { id: 'tools', name: 'ツール', color: 'gray', count: 0 }
  ]
};
```

### カラーパレット
```typescript
const COLORS = [
  'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'indigo', 'gray'
];
```

## パフォーマンス最適化

### 1. デバウンス戦略
- **データ保存**: 1秒デバウンス
- **検索インデックス更新**: 2秒デバウンス
- **Supabase同期**: 5秒デバウンス

### 2. インデックス戦略
- **単一カラムインデックス**: 基本クエリ用
- **複合インデックス**: 複雑な検索クエリ用
- **タイムスタンプインデックス**: 時系列クエリ用

### 3. メモリ管理
- **Lazy Loading**: 必要時のみデータロード
- **Virtual Scrolling**: 大量データの効率的表示
- **Component Memoization**: 不要な再レンダリング防止

## トラブルシューティング

### よくある問題と解決策

#### 1. IndexedDB接続エラー
```typescript
// エラーハンドリング例
try {
  await indexedDBManager.initialize();
} catch (error) {
  console.error('IndexedDB initialization failed:', error);
  // フォールバックモードに切り替え
  useLocalStorageOnly();
}
```

#### 2. データ同期競合
```typescript
// 競合解決ロジック
const resolveConflict = (localData, remoteData) => {
  if (localData.updatedAt > remoteData.updatedAt) {
    return localData; // ローカルが新しい
  }
  return remoteData; // リモートが新しい
};
```

#### 3. ストア状態の不整合
```typescript
// 状態リセット
const resetStoreState = () => {
  localStorage.removeItem('notebook-store');
  window.location.reload();
};
```

## セキュリティ考慮事項

### 1. データ検証
- 入力値のサニタイゼーション
- XSS攻撃の防止
- データ型の厳格な検証

### 2. アクセス制御
- ユーザー認証の必須化
- データの暗号化（Supabase RLS）
- セッション管理

### 3. プライバシー保護
- PII（個人識別情報）の適切な処理
- データの最小収集原則
- ユーザー同意の取得

## 拡張性

### 1. 新機能追加時の考慮点
- データベーススキーマのバージョン管理
- マイグレーション戦略
- 後方互換性の保持

### 2. スケーリング戦略
- インデックスの最適化
- データ分割（パーティショニング）
- キャッシュ戦略

## 検索システム

### 1. 検索アーキテクチャ概要

#### 強化された全文検索エンジン
- **多言語対応**: 日本語（n-gram）+ 英語（ステミング）
- **リアルタイム検索**: 300msデバウンス
- **インテリジェント検索**: コンテキスト認識、候補生成
- **高速パフォーマンス**: キャッシュ戦略、並列処理

#### 検索インデックス拡張（IndexedDB v6対応）
```typescript
// 5つの新しいObject Stores
'search_documents'   // 検索ドキュメント
'search_index'      // 検索インデックス
'search_history'    // 検索履歴
'search_suggestions' // 検索候補
'search_analytics'   // 検索分析
```

### 2. 検索データモデル

#### SearchDocument（検索ドキュメント）
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
```

#### SearchIndexEntry（検索インデックスエントリ）
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
```

### 3. 検索インデックススキーマ（IndexedDB v6拡張）

#### search_documents
```typescript
ObjectStore: 'search_documents'
KeyPath: 'id'
Indexes:
- type
- noteId
- subFolderId, notebookId, workspaceId
- createdAt, updatedAt
- isPinned, isFavorite
- tags (multiEntry)
- popularity
```

#### search_index
```typescript
ObjectStore: 'search_index'
KeyPath: 'id'
Indexes:
- token
- docId
- noteId
- subFolderId
- fieldType
- token_fieldType (composite)
- frequency
- score
```

#### search_history
```typescript
ObjectStore: 'search_history'
KeyPath: 'id'
Indexes:
- query
- timestamp
- resultCount
```

#### search_suggestions
```typescript
ObjectStore: 'search_suggestions'  
KeyPath: 'id'
Indexes:
- partialQuery
- suggestionText
- frequency
- lastUsed
```

#### search_analytics
```typescript
ObjectStore: 'search_analytics'
KeyPath: 'id'
Indexes:
- query
- timestamp
- performance
```

### 4. トークン化アルゴリズム

#### 日本語トークン化（N-gram方式）
```typescript
// 2-gram, 3-gram生成
'プログラミング' → ['プロ', 'ログ', 'グラ', 'ラミ', 'ミン', 'ング', 'プログ', 'ログラ', 'グラミ', 'ラミン', 'ミング']
```

#### 英語トークン化（ステミング）
```typescript
// 語尾変化対応
'programming' → ['program', 'programming']
'developed' → ['develop', 'developed']
```

#### 特殊コンテンツ抽出
- **URL**: `https://example.com`
- **数字**: `2024`, `123`
- **日付**: `2024-01-01`

### 5. 検索スコアリングアルゴリズム

#### 多要素スコアリング
```typescript
基本スコア = 1
× フィールド重み (title: 3, tag: 2, content: 1)
× トークンタイプ重み (phrase: 1.2, word: 1, special: 0.8)
× 言語重み (Japanese: 1.1, English: 1.0)
× 属性重み (pinned: 1.5, favorite: 1.2)
× 頻度重み (出現回数)
```

#### 関連性計算
- **完全一致**: 最高スコア
- **部分一致**: 中程度スコア
- **類似一致**: 低スコア
- **コンテキスト**: 周辺テキスト解析

### 6. パフォーマンス最適化

#### キャッシング戦略
```typescript
class EnhancedTokenizer {
  private htmlCleanCache = new Map<string, string>();     // HTML清浄化キャッシュ
  private tokenizeCache = new Map<string, Token[]>();     // トークン化キャッシュ
}

class EnhancedSearchIndexManager {
  private dbCache: IDBDatabase | null = null;            // DB接続キャッシュ
  private searchCache = new Map<string, SearchResult[]>(); // 検索結果キャッシュ
}
```

#### 並列処理による高速化
```typescript
// 並列トークン検索
const searchPromises = queryTokens.map(async (token) => {
  const index = indexStore.index('token');
  return index.getAll(token.normalized);
});
const searchResults = await Promise.all(searchPromises);
```

#### 最適化アルゴリズム
- **Top-Kソート**: 必要な件数のみソート
- **早期終了**: フィルタ条件不一致で即座に除外
- **インデックス活用**: 複合インデックスによる高速クエリ

### 7. 検索フィルタリング機能

#### 基本フィルタ
- **クエリ検索**: 全文検索
- **タグフィルタ**: 複数タグ選択
- **日付範囲**: 8つのプリセット + カスタム範囲
- **階層フィルタ**: ワークスペース/ノートブック/サブフォルダ

#### 高度なフィルタ
- **属性フィルタ**: ピン留め、お気に入り
- **エディタタイプ**: Rich/Markdown
- **コンテンツタイプ**: テキスト、画像、リンク
- **単語数範囲**: 最小/最大単語数

#### ソート機能
- **関連性**: スコアベース（デフォルト）
- **日付**: 作成日時/更新日時/最終アクセス日時
- **タイトル**: アルファベット順
- **人気度**: アクセス頻度ベース

### 8. 検索UI コンポーネント

#### EnhancedSearchInterface
```typescript
// メイン検索インターフェース
- リアルタイム検索（300msデバウンス）
- 検索候補表示
- キーボードナビゲーション
- ハイライト表示
- 検索統計表示
```

#### TagFilterComponent
```typescript
// タグフィルタリング
- 使用頻度統計
- カラー分類
- 複数選択対応
- 動的表示制御
```

#### DateRangeFilter
```typescript
// 日付範囲フィルタ
- 8つのプリセット（今日、昨日、過去7日間...）
- カスタム日付範囲
- 3つの日付フィールド対応
```

### 9. 検索履歴・統計機能

#### 検索履歴管理
- **自動保存**: LocalStorage（最大20件）
- **履歴から再検索**: ワンクリック実行
- **統計表示**: 検索回数、結果件数
- **履歴クリア**: 全削除機能

#### リアルタイム統計
```typescript
interface SearchStats {
  documentCount: number;      // インデックス済みドキュメント数
  indexEntryCount: number;    // 検索エントリ総数
  lastUpdated: string;        // 最終更新日時
  isIndexing: boolean;        // インデックス処理中フラグ
}
```

### 10. 検索システム統合

#### NotebookStoreとの連携
```typescript
// 現在の選択状態を検索フィルタに自動適用
- selectedWorkspace → workspaceIds filter
- selectedNotebook → notebookIds filter  
- selectedSubFolder → subFolderIds filter
```

#### useEnhancedSearchフック
```typescript
// React統合による状態管理
- query, results, isSearching状態
- filters, history, stats管理
- デバウンス検索実行
- インデックス自動更新
```

### 11. 検索システムAPI

#### EnhancedSearchIndexManager
```typescript
class EnhancedSearchIndexManager {
  // ドキュメント管理
  addDocument(note: Note, subFolderId: string, notebookId: string, workspaceId: string): Promise<void>
  
  // 検索実行
  search(filters: SearchFilters): Promise<SearchResult[]>
  
  // インデックス管理
  clearIndex(): Promise<void>
  getIndexStats(): Promise<SearchStats>
  
  // パフォーマンス
  private executeSearch(transaction: IDBTransaction, filters: SearchFilters): Promise<SearchResult[]>
  private generateSnippet(document: SearchDocument, query: string): string
  private generateHighlights(document: SearchDocument, query: string): Highlight[]
}
```

### 12. 拡張性・保守性

#### 将来対応予定機能
- **機械学習**: 検索学習、パーソナライズ
- **セマンティック検索**: 意味ベース検索
- **音声検索**: 音声入力対応  
- **画像内テキスト**: OCR検索
- **クロスリファレンス**: 関連ノート推薦

#### パフォーマンスモニタリング
- **検索時間計測**: ミリ秒単位
- **インデックスサイズ**: ストレージ使用量
- **キャッシュ効率**: ヒット率測定
- **エラー追跡**: 失敗パターン分析

この設計書は現在の実装状況を正確に反映しており、システムの保守・拡張時の参考資料として活用できます。