import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseSync';
import { useNotebookStore } from '../store/useNotebookStore';

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { syncWithSupabase } = useNotebookStore();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 現在のセッションを確認（オフライン対応）
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        // ログイン時にデータ同期（オンライン時のみ）
        if (navigator.onLine) {
          syncWithSupabase?.(session.user.id);
        }
      }
    }).catch((error) => {
      console.warn('Supabase認証エラー（オフライン可能性）:', error);
      // オフラインでも動作を継続
      setLoading(false);
      // ローカルストレージから前回のユーザー情報を復元
      const savedUser = localStorage.getItem('supabase-user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.warn('保存されたユーザー情報の読み込みに失敗:', e);
        }
      }
    });

    // 認証状態の変更を監視（エラーハンドリング付き）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      // ユーザー情報をローカルストレージに保存（オフライン対応）
      if (session?.user) {
        localStorage.setItem('supabase-user', JSON.stringify(session.user));
        // ログイン時にデータ同期（オンライン時のみ）
        if (navigator.onLine) {
          syncWithSupabase?.(session.user.id).catch(error => {
            console.warn('データ同期エラー（オフライン可能性）:', error);
          });
        }
      } else {
        localStorage.removeItem('supabase-user');
      }
    });

    return () => subscription.unsubscribe();
  }, [syncWithSupabase]);

  // GitHub認証
  const signInWithGitHub = async () => {
    if (!supabase) {
      console.error('Supabaseが初期化されていません。環境変数を確認してください。');
      alert('認証システムが設定されていません。\n.envファイルにSupabaseの設定を追加してください。');
      return;
    }
    
    try {
      console.log('GitHub認証を開始します...');
      console.log('リダイレクトURL:', window.location.origin);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin.trim(),
          scopes: 'read:user user:email'
        }
      });
      
      if (error) {
        console.error('GitHub認証エラー詳細:', {
          message: error.message,
          status: error.status,
          code: error.code,
          details: error
        });
        
        // ユーザーにわかりやすいエラーメッセージを表示
        if (error.message?.includes('500') || error.message?.includes('unexpected_failure')) {
          alert('Supabaseのサーバーエラーが発生しました。\n\n考えられる原因:\n1. GitHub OAuth Appの設定が正しくない\n2. SupabaseプロジェクトのGitHub認証が有効化されていない\n3. Callback URLが一致していない\n\nSupabaseダッシュボードで設定を確認してください。');
        } else {
          alert(`認証エラー: ${error.message}`);
        }
        throw error;
      }
      
      console.log('GitHub認証レスポンス:', data);
    } catch (error: any) {
      console.error('GitHub認証エラー:', error);
      throw error;
    }
  };

  // メール認証
  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
    } catch (error) {
      console.error('メール認証エラー:', error);
      throw error;
    }
  };

  // サインアップ
  const signUp = async (email: string, password: string) => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password
      });
      if (error) throw error;
    } catch (error) {
      console.error('サインアップエラー:', error);
      throw error;
    }
  };

  // サインアウト
  const signOut = async () => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('サインアウトエラー:', error);
    }
  };

  return {
    user,
    loading,
    signInWithGitHub,
    signInWithEmail,
    signUp,
    signOut
  };
};