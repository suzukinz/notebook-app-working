# Claude Code Assistant Settings

## プロジェクト概要
- **プロジェクト名**: ノートアプリ（Upnote風）
- **技術スタック**: React 18 + TypeScript + Zustand + Tailwind CSS
- **開発環境**: Windows, Node.js

## 重要なファイル構成

### 主要コンポーネント
- `src/components/notes/NaturalNoteEditor.tsx` - メインエディタ
- `src/components/notes/NoteList.tsx` - ノートリスト
- `src/components/layout/Sidebar.tsx` - サイドバー
- `src/store/useNotebookStore.ts` - 状態管理
- `src/App.tsx` - メインアプリケーション

### UI/UXコンポーネント
- `src/components/ui/` - 共通UIコンポーネント
- `src/contexts/ThemeContext.tsx` - テーマ管理
- `src/hooks/useKeyboardShortcuts.ts` - キーボードショートカット

## 開発規約

### コーディング規約
- **言語**: TypeScript必須
- **スタイル**: Tailwind CSS使用
- **状態管理**: Zustand使用
- **コンポーネント**: React.memo, useCallback, useMemo活用

### 命名規約
- **コンポーネント**: PascalCase
- **フック**: useで始まる camelCase
- **CSS**: Tailwind utilities優先

## 実装済み機能

### 完了済み
- ✅ ノート作成・編集・削除
- ✅ ページ機能（追加・削除・ナビゲーション）
- ✅ タグ管理
- ✅ 検索・フィルター
- ✅ 画像アップロード（Base64）
- ✅ 自動保存
- ✅ レスポンシブデザイン
- ✅ ダークモード
- ✅ アニメーション
- ✅ キーボードショートカット
- ✅ アクセシビリティ
- ✅ エラーハンドリング
- ✅ パフォーマンス最適化

## 開発時の注意点

### 必須事項
1. **React.memo**: 新しいコンポーネントは必ずmemo化
2. **useCallback**: イベントハンドラーは必ずCallback化
3. **useMemo**: 重い計算は必ずMemo化
4. **TypeScript**: 型定義必須
5. **アクセシビリティ**: ARIA属性、フォーカス管理

### パフォーマンス
- 仮想化リスト使用（大量データ）
- 不要な再レンダリング防止
- 遅延読み込み実装

### デザイン
- Tailwind CSS使用
- ダークモード対応
- レスポンシブデザイン
- アニメーション統一

## よく使うコマンド

### 開発サーバー
```bash
cd "D:\app\notebook-app-working"
npm start
```

### ビルド
```bash
npm run build
```

### 型チェック
```bash
npx tsc --noEmit
```

## トラブルシューティング

### よくある問題
1. **型エラー**: TypeScript型定義確認
2. **スタイル**: Tailwind CSS適用確認
3. **状態管理**: Zustand store確認
4. **パフォーマンス**: React DevTools使用

### デバッグ
- React DevTools
- Browser DevTools
- TypeScript型エラー確認

## 今後の拡張予定

### 次の機能候補
1. エクスポート機能強化
2. プラグインシステム
3. 同期機能
4. 共同編集
5. 高度なMarkdown対応

---

*このファイルは次回開発時の参考として使用してください。*