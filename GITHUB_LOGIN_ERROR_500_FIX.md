# GitHub ログイン エラー500 解決ガイド

## エラー内容
```json
{
  "code": 500,
  "error_code": "unexpected_failure",
  "msg": "Unexpected failure, please check server logs for more information"
}
```

## このエラーの原因

このエラーは通常、以下のいずれかが原因で発生します：

### 1. 🔴 最も可能性が高い：GitHub OAuth Appの設定ミス

**確認項目：**
- GitHub OAuth AppのCallback URLが正確に設定されているか
- SupabaseのCallback URLと完全に一致しているか

**解決方法：**

1. **Supabaseダッシュボードで正確なCallback URLを確認:**
   - Supabaseダッシュボード → Authentication → Providers → GitHub
   - `Callback URL (for OAuth)`をコピー
   - 例: `https://xxxxx.supabase.co/auth/v1/callback`

2. **GitHubで設定を修正:**
   - GitHub → Settings → Developer settings → OAuth Apps
   - 該当アプリを選択
   - `Authorization callback URL`を上記のURLに**完全一致**させる
   - 保存

### 2. 🟡 GitHub認証が有効化されていない

**確認と解決:**
1. Supabaseダッシュボード → Authentication → Providers
2. GitHubの横のトグルが**有効（緑色）**になっているか確認
3. Client IDとClient Secretが正しく入力されているか確認
4. 「Save」をクリック

### 3. 🟡 環境変数の設定ミス

**確認方法:**
1. ブラウザの開発者ツール（F12）でConsoleを開く
2. 以下のようなメッセージが表示されているか確認：
   - `⚠️ Supabase環境変数が設定されていません`
   - `✅ Supabase設定完了`

**解決方法:**
`.env`ファイルを確認し、以下が正しく設定されているか確認：
```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **重要**: 環境変数を変更した後は、必ずアプリを再起動してください！

### 4. 🟡 Supabaseプロジェクトの地域設定

**確認項目:**
- Supabaseプロジェクトのリージョンが適切か
- 日本からアクセスする場合、東京リージョンを推奨

### 5. 🟡 Redirect URLの設定ミス

**Supabaseダッシュボードで確認:**
1. Authentication → URL Configuration
2. 以下を設定：
   - `Site URL`: `http://localhost:3004`（開発環境）
   - `Redirect URLs`: `http://localhost:3004`を追加

## デバッグ手順

### ステップ1: ブラウザコンソールを確認

1. F12キーで開発者ツールを開く
2. Consoleタブを選択
3. 「GitHubでログイン」をクリック
4. 表示されるエラーメッセージを確認

### ステップ2: Supabaseログを確認

1. Supabaseダッシュボード → Logs → Auth
2. エラーの詳細を確認

### ステップ3: ネットワークタブで確認

1. 開発者ツール → Networkタブ
2. 「GitHubでログイン」をクリック
3. 失敗したリクエストの詳細を確認

## クイックチェックリスト

- [ ] `.env`ファイルにSupabaseの環境変数が設定されている
- [ ] アプリを再起動した（環境変数変更後）
- [ ] SupabaseでGitHub認証が有効化されている
- [ ] GitHub OAuth AppのCallback URLが正確
- [ ] SupabaseのClient ID/Secretが正しく設定されている
- [ ] SupabaseのURL Configurationが設定されている

## それでも解決しない場合

### オプション1: 新しいGitHub OAuth Appを作成

1. 既存のOAuth Appを削除
2. 新しく作成し直す
3. Supabaseに新しいClient ID/Secretを設定

### オプション2: メール認証を使用

GitHubログインの代わりに、メール/パスワード認証を使用：
1. メールアドレスとパスワードで登録
2. 確認メールをチェック
3. ログイン

### オプション3: ローカルモードで使用

Supabase認証を使わず、ローカルストレージのみで使用：
- `.env`ファイルからSupabase設定を削除
- アプリを再起動
- ローカルモードで動作（同期機能なし）

## サポート

問題が解決しない場合は、以下の情報を含めて報告してください：

1. ブラウザコンソールのエラーメッセージ全文
2. ネットワークタブのエラーレスポンス
3. Supabase Authログのエラー内容
4. 使用しているブラウザとバージョン

## 参考リンク

- [Supabase Auth Debugging](https://supabase.com/docs/guides/auth/debugging)
- [GitHub OAuth Troubleshooting](https://docs.github.com/en/developers/apps/troubleshooting-oauth-app-access-token-request-errors)
- [Supabase Error Codes](https://supabase.com/docs/reference/javascript/auth-error-codes)