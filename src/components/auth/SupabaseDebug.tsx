import React, { useState } from 'react';
import { supabase } from '../../utils/supabaseSync';

const SupabaseDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    let info = '=== Supabase診断情報 ===\n\n';
    
    // 1. 環境変数チェック
    info += '📋 環境変数:\n';
    info += `REACT_APP_SUPABASE_URL: ${process.env.REACT_APP_SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定'}\n`;
    info += `URL: ${process.env.REACT_APP_SUPABASE_URL || 'N/A'}\n`;
    info += `REACT_APP_SUPABASE_ANON_KEY: ${process.env.REACT_APP_SUPABASE_ANON_KEY ? '✅ 設定済み' : '❌ 未設定'}\n\n`;
    
    // 2. Supabaseクライアントチェック
    info += '🔌 Supabaseクライアント:\n';
    info += `初期化: ${supabase ? '✅ 成功' : '❌ 失敗'}\n\n`;
    
    // 3. 現在のURLチェック
    info += '🌐 現在のURL情報:\n';
    info += `Origin: ${window.location.origin}\n`;
    info += `Host: ${window.location.host}\n`;
    info += `Protocol: ${window.location.protocol}\n`;
    info += `Port: ${window.location.port || '(default)'}\n\n`;
    
    if (supabase) {
      try {
        // 4. セッション状態チェック
        info += '👤 セッション状態:\n';
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          info += `❌ エラー: ${sessionError.message}\n`;
        } else if (session) {
          info += `✅ ログイン済み\n`;
          info += `ユーザーID: ${session.user.id}\n`;
          info += `Email: ${session.user.email}\n`;
          info += `Provider: ${session.user.app_metadata?.provider || 'N/A'}\n`;
        } else {
          info += `⚪ 未ログイン\n`;
        }
        info += '\n';
        
        // 5. プロバイダー設定の確認
        info += '🔐 認証プロバイダー:\n';
        info += `GitHub OAuth設定については、Supabaseダッシュボードで確認してください。\n`;
        info += `- Authentication → Providers → GitHub\n`;
        info += `- Client IDとClient Secretが設定されているか\n`;
        info += `- GitHubプロバイダーが有効になっているか\n\n`;
        
        // 6. URL設定の確認
        info += '🔗 必要なURL設定:\n';
        info += `Supabaseダッシュボード → Authentication → URL Configuration\n`;
        info += `- Site URL: ${window.location.origin}\n`;
        info += `- Redirect URLs: ${window.location.origin} を追加\n\n`;
        
        // 7. Callback URLの確認
        info += '📍 GitHub OAuth Callback URL:\n';
        const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
        if (supabaseUrl) {
          const callbackUrl = `${supabaseUrl}/auth/v1/callback`;
          info += `${callbackUrl}\n`;
          info += `↑ このURLをGitHub OAuth AppのAuthorization callback URLに設定してください\n\n`;
        }
        
      } catch (error: any) {
        info += `\n❌ 診断中にエラー: ${error.message}\n`;
      }
    }
    
    // 8. トラブルシューティングのヒント
    info += '💡 トラブルシューティング:\n';
    info += '1. .envファイルを変更した場合は、必ずアプリを再起動\n';
    info += '2. GitHub OAuth AppのCallback URLが完全一致しているか確認\n';
    info += '3. SupabaseのURL Configurationが正しく設定されているか確認\n';
    info += '4. ブラウザのキャッシュをクリアして再試行\n';
    
    setDebugInfo(info);
    setLoading(false);
  };

  const testGitHubAuth = async () => {
    if (!supabase) {
      alert('Supabaseが初期化されていません');
      return;
    }
    
    try {
      console.log('GitHub認証テスト開始...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}`,
          scopes: 'read:user user:email'
        }
      });
      
      if (error) {
        console.error('エラー:', error);
        alert(`エラー: ${error.message}`);
      } else {
        console.log('認証URL:', data.url);
        alert(`認証URLが生成されました。\nコンソールを確認してください。`);
      }
    } catch (error: any) {
      console.error('テスト失敗:', error);
      alert(`テスト失敗: ${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Supabase認証診断ツール
      </h2>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '診断中...' : '診断を実行'}
          </button>
          
          <button
            onClick={testGitHubAuth}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
          >
            GitHub認証URLテスト
          </button>
        </div>
        
        {debugInfo && (
          <pre className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded overflow-x-auto text-sm font-mono whitespace-pre-wrap">
            {debugInfo}
          </pre>
        )}
      </div>
    </div>
  );
};

export default SupabaseDebug;