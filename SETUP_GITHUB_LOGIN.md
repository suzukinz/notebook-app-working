# GitHub ログイン設定ガイド

## 問題
GitHubログインが機能していない原因は、Supabaseの環境変数が設定されていないためです。

## 解決方法

### ステップ 1: Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセス
2. 無料アカウントを作成（GitHubアカウントでサインアップ可能）
3. 新しいプロジェクトを作成

### ステップ 2: GitHub OAuth アプリの設定

#### Supabase側の設定:
1. Supabaseダッシュボードで「Authentication」→「Providers」を選択
2. 「GitHub」を有効化
3. 表示される以下の情報をメモ:
   - `Callback URL (for OAuth)` - これをGitHub側で使用します

#### GitHub側の設定:
1. GitHubで[Settings](https://github.com/settings/profile) → [Developer settings](https://github.com/settings/developers) → [OAuth Apps](https://github.com/settings/developers) へ移動
2. 「New OAuth App」をクリック
3. 以下の情報を入力:
   - **Application name**: `My Notebook App` (任意の名前)
   - **Homepage URL**: `http://localhost:3004` (開発用)
   - **Authorization callback URL**: Supabaseから取得したCallback URLを貼り付け
4. 「Register application」をクリック
5. 生成された以下をコピー:
   - `Client ID`
   - `Client Secret`（「Generate a new client secret」をクリックして生成）

#### Supabaseに戻って設定を完了:
1. Supabaseの「GitHub」プロバイダー設定に戻る
2. GitHubから取得した情報を入力:
   - `Client ID`
   - `Client Secret`
3. 「Save」をクリック

### ステップ 3: 環境変数の設定

1. Supabaseダッシュボードで「Settings」→「API」を選択
2. 以下の情報をコピー:
   - `Project URL`
   - `anon public` キー

3. プロジェクトルートの `.env` ファイルを編集:

```bash
# 既存の内容
HOST=localhost
PORT=3004

# 以下を追加
REACT_APP_SUPABASE_URL=your_project_url_here
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

例:
```bash
REACT_APP_SUPABASE_URL=https://xyzxyzxyz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### ステップ 4: アプリケーションの再起動

```bash
# 現在実行中のサーバーを停止 (Ctrl+C)
# 再起動
npm start
```

### ステップ 5: 動作確認

1. ブラウザで `http://localhost:3004` にアクセス
2. ログイン画面で「GitHubでログイン」をクリック
3. GitHubの認証画面が表示される
4. 承認するとアプリにリダイレクトされログイン完了

## トラブルシューティング

### エラー: "Invalid Request"
- Callback URLが正しく設定されているか確認
- GitHubとSupabaseの両方で同じURLを使用しているか確認

### エラー: "redirect_uri_mismatch"
- GitHub OAuth AppのAuthorization callback URLを確認
- Supabaseで表示されるCallback URLと完全に一致している必要があります

### エラー: "supabase is null"
- `.env`ファイルの環境変数が正しく設定されているか確認
- アプリケーションを再起動したか確認

### リダイレクト後にログインできない
- Supabaseダッシュボードで「Authentication」→「URL Configuration」を確認
- `Site URL`を`http://localhost:3004`に設定

## セキュリティに関する注意

- `.env`ファイルは`.gitignore`に含まれていることを確認（既に設定済み）
- `Client Secret`は絶対に公開リポジトリにコミットしない
- 本番環境では異なるOAuth Appを作成し、適切なURLを設定する

## ローカルモードでの使用

Supabaseを設定しない場合でも、アプリはローカルモードで動作します：
- データはブラウザのlocalStorageに保存
- 同期機能は使用できません
- デバイス間でのデータ共有はできません

## 参考リンク

- [Supabase Auth with GitHub](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [GitHub OAuth Apps Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)