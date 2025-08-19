# NoteSpace - ノート設計ドキュメント

## 📖 概要

NoteSpaceのノート設計の詳細仕様書。4階層構造とマルチページ対応による柔軟なノート管理システム。

---

## 🏗️ アーキテクチャ概要

### 階層構造（4層）
```
Workspace （ワークスペース）
    └── Notebook （ノートブック）
         └── SubFolder （サブフォルダ）
              └── Note （ノート）
                   └── Page[] （ページ配列）
```

### 特徴
- **階層化管理**: プロジェクト単位での整理
- **視覚的アイコン**: ノートブック・サブフォルダに画像対応
- **マルチページ**: 1ノートに複数ページを持てる設計
- **リアルタイム編集**: デバウンス1.5秒での自動保存

---

## 📊 データモデル

### Core Types

```typescript
interface Note {
  id: number;                           // Auto-increment ID
  title: string;                        // ノートタイトル
  tags: string[];                       // タグ配列
  createdAt: string;                    // 作成日時 (YYYY-MM-DD)
  updatedAt: string;                    // 更新日時 (YYYY-MM-DD) 
  isPinned: boolean;                    // ピン留めフラグ
  isFavorite: boolean;                  // お気に入りフラグ
  pages: Page[];                        // ページ配列 ⭐️
  editorType?: 'rich' | 'markdown';     // エディタタイプ
  color?: string;                       // ノートカードの色
}

interface Page {
  id: number;                           // ページID（Noteごとに一意）
  title: string;                        // ページタイトル
  content: string;                      // コンテンツ（HTML/Markdown）
}
```

### 階層関連の型

```typescript
interface Workspace {
  id: string;                           // UUID
  name: string;                         // ワークスペース名
  icon: string;                         // アイコン文字列
  color: string;                        // カラーテーマ
}

interface Notebook {
  id: string;                           // UUID
  workspaceId: string;                  // 所属ワークスペースID
  name: string;                         // ノートブック名
  count: number;                        // 含まれるノート数
  color: string;                        // カラーテーマ
  description?: string;                 // 説明（オプション）
  image?: string;                       // Base64画像データ ⭐️
}

interface SubFolder {
  id: string;                           // UUID
  name: string;                         // フォルダ名  
  count: number;                        // 含まれるノート数
  color: string;                        // カラーテーマ
  image?: string;                       // Base64画像データ ⭐️
}
```

---

## 🔧 ページ機能の実装

### 1. ページ管理の特徴

- **複数ページ対応**: 1つのノートに複数のページを持てる
- **独立コンテンツ**: 各ページは独立したコンテンツを持つ
- **ページナビゲーション**: Previous/Nextボタンでページ移動
- **ページタイトル**: 各ページごとにタイトル設定可能

### 2. ページ追加機能

```typescript
const handleAddPage = useCallback(() => {
  if (selectedNote) {
    // 現在のページを保存
    const currentPageData = selectedNote.pages[currentPage];
    if (currentPageData) {
      const updatedCurrentPages = selectedNote.pages.map((page, index) =>
        index === currentPage ? { ...page, content } : page
      );
      updateNote(selectedNote.id, { pages: updatedCurrentPages });
    }
    
    // 新しいページを追加
    const newPageId = Math.max(...selectedNote.pages.map(p => p.id)) + 1;
    const newPage = {
      id: newPageId,
      title: `ページ ${newPageId}`,
      content: ''
    };
    
    const finalPages = [...selectedNote.pages.map((page, index) =>
      index === currentPage ? { ...page, content } : page
    ), newPage];
    
    // 全ページを更新
    updateNote(selectedNote.id, { pages: finalPages });
    
    // 新しいページに移動
    setCurrentPage(finalPages.length - 1);
    setContent('');
  }
}, [selectedNote, currentPage, content, updateNote, setCurrentPage]);
```

### 3. ページナビゲーション

```typescript
// 前のページへ
const handlePrevPage = useCallback(() => {
  if (currentPage > 0) {
    saveCurrentPage(); // 現在のページを保存
    setTimeout(() => {
      setCurrentPage(currentPage - 1);
    }, 50);
  }
}, [currentPage, setCurrentPage, saveCurrentPage]);

// 次のページへ  
const handleNextPage = useCallback(() => {
  if (selectedNote && currentPage < selectedNote.pages.length - 1) {
    saveCurrentPage();
    setTimeout(() => {
      setCurrentPage(currentPage + 1);
    }, 50);
  }
}, [selectedNote, currentPage, setCurrentPage, saveCurrentPage]);
```

---

## ⚡ リアルタイム編集システム

### 自動保存機能

```typescript
// 1.5秒デバウンスによる自動保存
const debouncedSave = useMemo(() => {
  return debounce(() => {
    if (selectedNote && selectedNote.pages[currentPage]) {
      setSaveStatus('saving');
      updateNote(selectedNote.id, {
        title,
        tags, 
        editorType,
        pages: selectedNote.pages.map((page, index) =>
          index === currentPage ? { ...page, content } : page
        )
      });
      setSaveStatus('saved');
    }
  }, 1500);
}, [selectedNote, title, content, tags, currentPage, updateNote, editorType]);
```

### 緊急保存システム

```typescript
// ノート切り替え時の緊急保存
useEffect(() => {
  const prevNote = prevSelectedNoteRef.current;
  const prevPage = prevCurrentPageRef.current;
  
  if (prevNote && (prevNote.id !== selectedNote?.id || prevPage !== currentPage)) {
    // デバウンス中の保存を即座に実行
    debouncedSave.flush();
    
    // 明示的保存（double safety）
    if (prevNote.pages && prevNote.pages[prevPage]) {
      updateNote(prevNote.id, {
        title: prevTitleRef.current,
        tags: prevTagsRef.current,
        editorType: prevEditorTypeRef.current,
        pages: prevNote.pages.map((page, index) =>
          index === prevPage ? { ...page, content: prevContentRef.current } : page
        )
      });
    }
  }
}, [selectedNote, currentPage, updateNote]);
```

---

## 🎨 UI/UX設計

### ページネーション UI

```tsx
{/* ページナビゲーション */}
<div className="flex items-center gap-2 text-sm text-gray-500">
  <button 
    onClick={handlePrevPage}
    disabled={currentPage === 0}
    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
    title="前のページ"
  >
    <ChevronLeft className="w-4 h-4" />
  </button>
  
  <span className="px-2">
    {currentPage + 1} / {selectedNote?.pages?.length || 1}
  </span>
  
  <button 
    onClick={handleNextPage}
    disabled={!selectedNote || currentPage >= (selectedNote.pages?.length || 1) - 1}
    className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
    title="次のページ"
  >
    <ChevronRight className="w-4 h-4" />
  </button>
  
  <button 
    onClick={handleAddPage}
    className="p-1 rounded hover:bg-gray-100 text-blue-600"
    title="新しいページを追加"
  >
    <Plus className="w-4 h-4" />
  </button>
</div>
```

### 保存状態インジケーター

```tsx
{/* 保存状態の表示 */}
{showSaveNotification && (
  <div className="flex items-center gap-1 text-green-600 text-sm">
    <Check className="w-4 h-4" />
    保存しました
  </div>
)}

{/* 保存ステータス */}
<div className={`text-xs ${
  saveStatus === 'saved' ? 'text-green-600' : 
  saveStatus === 'saving' ? 'text-yellow-600' : 
  'text-red-600'
}`}>
  {saveStatus === 'saved' ? '保存済み' : 
   saveStatus === 'saving' ? '保存中...' : 
   '未保存'}
</div>
```

---

## 📦 状態管理（Zustand）

### NotebookStore での実装

```typescript
interface NotebookState {
  // ページ関連の状態
  selectedNote: Note | null;             // 選択中のノート
  currentPage: number;                   // 現在のページインデックス
  
  // 編集状態
  editableTitle: string;                 // 編集中のタイトル
  editablePageTitle: string;             // 編集中のページタイトル  
  editableContent: string;               // 編集中のコンテンツ
}

interface NotebookActions {
  // ページ操作
  setCurrentPage: (page: number) => void;
  
  // ノート更新（ページ配列込み）
  updateNote: (noteId: number, updates: Partial<Note>) => void;
}
```

### 新しいノート作成時のページ初期化

```typescript
addNoteToSubFolder: (subFolderId, editorType = 'rich') => {
  const newNote = {
    title: '新しいノート',
    tags: [],
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0], 
    isPinned: false,
    isFavorite: false,
    editorType,
    pages: [                              // ⭐️ デフォルトで1ページ作成
      {
        id: 1,
        title: '新しいページ',
        content: ''
      }
    ]
  };
  
  // ... ノート追加処理
}
```

---

## ⚠️ 既知の問題と改善ポイント

### 1. ページID生成の競合リスク

**現在の実装:**
```typescript
const newPageId = Math.max(...selectedNote.pages.map(p => p.id)) + 1;
```

**問題:** 空のページ配列で`Math.max(...[])`がエラーになる可能性

**改善案:**
```typescript
const newPageId = selectedNote.pages.length > 0 
  ? Math.max(...selectedNote.pages.map(p => p.id)) + 1 
  : 1;
```

### 2. 状態同期のタイミング

**課題:** ページ切り替え時の状態更新順序が不安定
**対策:** `setTimeout`を使った遅延実行で安定化済み

### 3. エラーハンドリングの強化

```typescript
// 提案: 安全なページ追加関数
const safeAddPage = useCallback(() => {
  try {
    if (!selectedNote || !selectedNote.pages) {
      throw new Error('Invalid note or pages structure');
    }
    
    // 安全なID生成
    const maxId = selectedNote.pages.reduce((max, page) => 
      Math.max(max, page.id || 0), 0);
    const newPageId = maxId + 1;
    
    // ... rest of implementation
    
  } catch (error) {
    console.error('Failed to add page:', error);
    // ユーザーフィードバック
    showErrorNotification('ページの追加に失敗しました');
  }
}, [selectedNote, /* ... */]);
```

---

## 🚀 パフォーマンス最適化

### デバウンス戦略
- **コンテンツ保存**: 1.5秒デバウンス
- **タイトル変更**: 即時反映+デバウンス保存
- **緊急保存**: ページ切り替え・アンマウント時

### メモリ効率化
- React.memo による不要な再レンダリング防止
- useCallback による関数メモ化
- コンポーネントの遅延読み込み

### 保存戦略
```typescript
// 3つの保存レベル
1. リアルタイム自動保存 (1.5s debounce)
2. 緊急保存 (ページ切り替え時)  
3. 手動保存 (Ctrl+S)
```

---

## 📱 モバイル対応

### レスポンシブページネーション
- タッチスワイプでのページ切り替え
- モバイル最適化されたページボタン
- 画面幅に応じたUI調整

---

## 🔄 同期戦略

### マルチデバイス同期
- IndexedDB → Supabase 双方向同期
- ページ単位での変更追跡
- 競合解決: Last Writer Wins

### オフライン対応
- ローカル編集の優先
- 接続回復時の自動同期
- 変更履歴の保持

---

## 📈 拡張性

### 将来の機能予定
- **ページテンプレート**: 定型ページの作成
- **ページ間リンク**: ノート内相互参照
- **ページ複製**: 既存ページのコピー
- **ページ並び替え**: ドラッグ&ドロップ
- **ページ削除**: 不要ページの削除機能

### アーキテクチャ拡張
- ページプラグインシステム
- カスタムページタイプ
- ページバージョン管理

---

## 🧪 テスト要求

### ユニットテスト
- [ ] ページ追加機能のテスト
- [ ] ページナビゲーションのテスト  
- [ ] 自動保存機能のテスト
- [ ] エラーハンドリングのテスト

### 統合テスト
- [ ] ノート→ページ→コンテンツの一連フロー
- [ ] マルチページでの編集・保存フロー
- [ ] 同期機能との統合テスト

### E2Eテスト
- [ ] 実際のユーザーフローでのページ操作
- [ ] パフォーマンステスト（大量ページでの動作）

---

このドキュメントは`v1.0.1`時点でのノート設計を反映しており、今後の機能拡張・改善の指針として活用されます。

**最終更新**: 2025-08-18  
**バージョン**: v1.0.1