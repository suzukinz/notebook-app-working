# ✅ Supabase設定チェックリスト

## 🔍 現在の問題分析

スクリーンショットから確認した問題点：

### 1. **ポート番号の確認**
- 現在のアプリURL: `http://localhost:3004`
- Supabaseに設定すべきURL: `http://localhost:3004`

### 2. **Supabase URL Configuration 修正**

**Supabaseダッシュボード → Authentication → URL Configuration**

✅ **Site URL**: 
```
http://localhost:3004
```

✅ **Redirect URLs**（下の入力欄に追加）:
```
http://localhost:3004
```

⚠️ **重要**: `http://localhost:3005` が含まれている場合は削除してください

### 3. **GitHub OAuth App修正**

**GitHub → Settings → Developer settings → OAuth Apps**

あなたのOAuth Appで以下を確認：

✅ **Homepage URL**:
```
http://localhost:3004
```

✅ **Authorization callback URL**:
```
https://aogjdvyyxcfyvgexkoic.supabase.co/auth/v1/callback
```

## 🚀 修正手順

### ステップ1: Supabase側修正
1. Supabaseダッシュボード → Authentication → URL Configuration
2. **Site URL** を `http://localhost:3004` に設定
3. **Redirect URLs** に `http://localhost:3004` を追加
4. 他の不要なポート（3005等）があれば削除
5. 「Save」をクリック

### ステップ2: GitHub OAuth App確認
1. GitHub → Settings → Developer settings → OAuth Apps
2. あなたのアプリを選択
3. **Authorization callback URL** が下記と完全一致するか確認：
   ```
   https://aogjdvyyxcfyvgexkoic.supabase.co/auth/v1/callback
   ```
4. 必要に応じて修正し、「Update application」をクリック

### ステップ3: アプリ再起動
```bash
# 現在のアプリを停止（Ctrl+C）
# 再起動
PORT=3004 npm start
```

### ステップ4: 診断ツールで確認
1. アプリで `Ctrl+Shift+D` を押す
2. 「診断を実行」をクリック
3. 設定情報を確認
4. 「GitHub認証URLテスト」をクリックしてテスト

## 🔧 よくある追加の問題

### GitHub Client ID/Secret確認
Supabaseダッシュボード → Authentication → Providers → GitHub で：
- **Client ID** が正しく入力されているか
- **Client Secret** が正しく入力されているか
- **Enable sign in with GitHub** がONになっているか

### ブラウザキャッシュクリア
1. F12 → Application タブ
2. Storage セクションで「Clear storage」
3. または シークレットモードでテスト

## 📝 テスト手順

1. 修正完了後、アプリを再起動
2. ログインページでGitHubボタンをクリック
3. GitHubの認証ページにリダイレクトされることを確認
4. 認証後、アプリに正常に戻ることを確認

## 🆘 まだ解決しない場合

上記の修正後も500エラーが発生する場合：

1. **診断ツール**（`Ctrl+Shift+D`）で詳細情報を確認
2. **ブラウザコンソール**（F12）でエラーメッセージを確認
3. **Supabase Auth Logs**で具体的なエラーを確認：
   - Supabaseダッシュボード → Logs → Auth

## 🎯 期待される結果

修正後は以下のようになるはずです：
- GitHubログインボタンクリック → GitHub認証ページに正常遷移
- GitHub認証完了 → アプリに正常リダイレクト
- 500エラーが解消