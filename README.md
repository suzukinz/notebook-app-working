# NoteSpace - 階層型ノートアプリケーション

## 🚀 概要

**NoteSpace**は、階層構造でノートを管理できる高機能なノートアプリケーションです。ワークスペース > ノートブック > サブフォルダ > ノートの4階層構造と視覚的な画像アイコン機能により、直感的で効率的なノート管理を実現します。

## ✨ 主な機能

### 📁 階層構造管理
- **4階層構造**: ワークスペース → ノートブック → サブフォルダ → ノート
- **画像アイコン**: ノートブック（40×40px）、サブフォルダ（32×32px）で視覚的識別 ⭐️NEW
- **カラーテーマ**: 9色のカラーパレット対応
- **動的管理**: 作成・編集・削除・並び替え

### 📝 エディタ機能
- **リッチテキスト**: WYSIWYG編集
- **Markdown**: マークダウン記法対応
- **リアルタイム保存**: 遅延なし編集 ⭐️NEW
- **画像機能**: ドラッグ&ドロップ、ワンクリックリサイズ
- **マルチページ**: 1ノートに複数ページ対応

### 🗺️ マインドマップ
- **Obsidian風**: 美しい円形ノード表示
- **インタラクティブ**: ドラッグ&ドロップ、ズーム対応
- **フォースレイアウト**: 自動配置アルゴリズム
- **関係性可視化**: ノート間の関連性表示

### 🔍 検索・管理
- **全文検索**: ノート内容の高速検索
- **タグシステム**: 動的タグ管理とフィルタリング
- **お気に入り**: スター機能
- **ピン留め**: 重要ノートの固定表示

### 💾 データ管理
- **自動保存**: ローカルストレージ対応
- **エクスポート/インポート**: JSON形式
- **PWA対応**: オフライン利用可能
- **バックアップ**: データ復元機能

## 🛠️ 技術スタック

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **Build Tool**: Create React App
- **Desktop**: Electron (対応済み)
- **Mobile**: Capacitor (計画中)

## 🚀 クイックスタート

### 必要な環境
- Node.js 16.0.0 以上
- npm または yarn

### インストール

```bash
# リポジトリのクローン
git clone [repository-url]
cd notebook-app-working

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

### ビルドとテスト

```bash
# TypeScript型チェック
npm run type-check

# ESLintによるコード品質チェック
npm run lint

# 本番ビルド
npm run build

# テスト実行
npm test
```

### Electronアプリとして実行

```bash
# Electron開発モード
npm run electron-dev

# Electronアプリビルド
npm run electron-pack
```

## 📱 スマホアプリ化計画

### Phase 1: Capacitor導入（予定）
```bash
# Capacitor セットアップ
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios android

# ビルド & 同期
npm run build
npx cap sync

# 実機実行
npx cap run ios
npx cap run android
```

### 追加予定機能
- カメラ統合（写真撮影・ギャラリー連携）
- プッシュ通知
- オフライン同期
- ネイティブファイルシステム連携

## 🗂️ プロジェクト構造

```
src/
├── components/
│   ├── dialogs/          # モーダルダイアログ
│   │   ├── AddNotebookDialog.tsx    # ノートブック作成（画像対応）⭐️
│   │   ├── AddFolderDialog.tsx      # フォルダ作成（画像対応）⭐️
│   │   └── ...
│   ├── layout/           # レイアウト
│   │   ├── Sidebar.tsx   # メインサイドバー
│   │   └── MainLayout.tsx
│   ├── navigation/       # ナビゲーション
│   │   ├── NotebookTree.tsx         # ツリービュー（画像表示対応）⭐️
│   │   └── ...
│   ├── notes/           # エディタ関連
│   │   ├── RichNoteEditor.tsx       # メインエディタ
│   │   ├── RichTextEditor.tsx       # リッチテキスト（リアルタイム）⭐️
│   │   └── ...
│   ├── mindmap/         # マインドマップ
│   └── ui/              # 共通コンポーネント
├── store/
│   └── useNotebookStore.ts          # Zustand状態管理
├── types/
│   └── index.ts         # TypeScript型定義
├── utils/               # ユーティリティ
└── hooks/               # カスタムフック
```

## 🎯 重要な実装ポイント

### 画像アップロード機能 ⭐️NEW
```typescript
// 自動リサイズ + Base64保存
const resizedBase64 = await resizeImage(file, 40, 40);
setNotebookImage(resizedBase64);
```

### リアルタイム編集 ⭐️NEW
```typescript
// デバウンス無効化による即時反映
const handleContentChange = useCallback((newContent: string) => {
  setContent(newContent);
  // 即座に状態更新
}, []);
```

### 階層データ構造
```typescript
interface Notebook {
  id: string;
  name: string;
  color: string;
  image?: string; // Base64画像データ ⭐️NEW
}

interface SubFolder {
  id: string;
  name: string;
  color: string;
  image?: string; // Base64画像データ ⭐️NEW
}
```

## 🧪 テスト

### 基本機能テスト
- [ ] ワークスペース管理（作成・編集・削除）
- [ ] ノートブック管理（画像アップロード含む）
- [ ] サブフォルダ管理（画像アップロード含む）
- [ ] ノート編集（リアルタイム保存）
- [ ] マインドマップ表示

### パフォーマンステスト
- [ ] 大量データでの動作確認
- [ ] リアルタイム編集の応答性
- [ ] メモリ使用量チェック

## 🔧 設定ファイル

### 重要な設定
- `package.json`: 依存関係とスクリプト
- `tailwind.config.js`: Tailwindカスタマイズ
- `tsconfig.json`: TypeScript設定
- `public/manifest.json`: PWA設定

### 環境変数
```bash
# 開発用ポート設定
PORT=3000

# Electron用設定
ELECTRON_IS_DEV=true
```

## 🤝 コントリビューション

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🆘 トラブルシューティング

### よくある問題

**Q: npm startでエラーが出る**
```bash
# node_modulesをクリア
rm -rf node_modules package-lock.json
npm install
```

**Q: TypeScriptエラーが発生する**
```bash
# 型チェックを実行
npm run type-check
```

**Q: 画像アップロードが動作しない**
- ファイルサイズが5MB以下であることを確認
- 対応形式: JPEG, PNG, GIF, WebP

**Q: リアルタイム編集が反映されない**
- ブラウザのlocalStorageをクリア
- ページをリフレッシュ

## 📞 サポート

問題が発生した場合は、以下の情報を含めてIssueを作成してください：
- OS とブラウザのバージョン
- Node.js のバージョン
- エラーメッセージの全文
- 再現手順

---

⭐️ **最新の主要更新（v1.0.1）**
- ノートブック・サブフォルダの画像アイコン機能追加
- リアルタイム編集機能の大幅改善
- UI/UXの視認性向上
- フラッシュカード機能の削除とコード最適化