# NoteSpace Backend API

## 概要

NoteSpaceアプリケーションのバックエンドAPI。JWT認証、PostgreSQLデータベース、REST APIを提供します。

## セットアップ

### 1. 依存関係のインストール

```bash
cd backend
npm install
```

### 2. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、必要な環境変数を設定してください。

### 3. データベースのセットアップ

PostgreSQLデータベースを作成し、環境変数`DATABASE_URL`を設定してください。

```bash
# Prismaクライアントの生成
npm run db:generate

# データベースマイグレーション
npm run db:migrate
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

APIサーバーは `http://localhost:3001` で起動します。

## API エンドポイント

### 認証

- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `POST /api/auth/refresh` - トークンリフレッシュ
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - ユーザー情報取得

### ワークスペース

- `GET /api/workspaces` - ワークスペース一覧
- `POST /api/workspaces` - ワークスペース作成
- `GET /api/workspaces/:id` - ワークスペース詳細
- `PUT /api/workspaces/:id` - ワークスペース更新
- `DELETE /api/workspaces/:id` - ワークスペース削除

### ノートブック

- `GET /api/notebooks/workspace/:workspaceId` - ノートブック一覧
- `POST /api/notebooks` - ノートブック作成
- `PUT /api/notebooks/:id` - ノートブック更新
- `DELETE /api/notebooks/:id` - ノートブック削除

### ノート

- `GET /api/notes/subfolder/:subfolderId` - ノート一覧
- `POST /api/notes` - ノート作成
- `GET /api/notes/:id` - ノート詳細
- `PUT /api/notes/:id` - ノート更新
- `DELETE /api/notes/:id` - ノート削除

## 技術スタック

- **Node.js** + **Express** - Webサーバー
- **TypeScript** - 型安全性
- **Prisma** - ORM
- **PostgreSQL** - データベース
- **JWT** - 認証
- **bcrypt** - パスワードハッシュ化
- **Zod** - バリデーション
- **Helmet** - セキュリティ
- **express-rate-limit** - レート制限

## セキュリティ機能

- JWT アクセストークン (15分有効)
- JWT リフレッシュトークン (30日有効)
- パスワードハッシュ化 (bcrypt)
- レート制限
- CORS設定
- セキュリティヘッダー (Helmet)

## 開発

```bash
# 開発サーバー起動 (ホットリロード)
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# テスト実行
npm test

# リント実行
npm run lint

# Prisma Studio起動
npm run db:studio
```