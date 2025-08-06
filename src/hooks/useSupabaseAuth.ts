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

    // 現在のセッションを確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        // ログイン時にデータ同期
        syncWithSupabase?.(session.user.id);
      }
    });

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // ログイン時にデータ同期
        syncWithSupabase?.(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [syncWithSupabase]);

  // GitHub認証
  const signInWithGitHub = async () => {
    if (!supabase) return;
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('GitHub認証エラー:', error);
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