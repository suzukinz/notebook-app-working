import { createClient } from '@supabase/supabase-js';
// import { Note, Notebook, SubFolder, Workspace } from '../types';

// Supabase設定（環境変数で管理）
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// オフラインファースト同期マネージャー
export class OfflineFirstSync {
  private syncQueue: any[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    // オンライン/オフライン監視
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  // ローカルの変更を検知して同期キューに追加
  async queueSync(operation: 'create' | 'update' | 'delete', table: string, data: any) {
    const syncItem = {
      id: crypto.randomUUID(),
      operation,
      table,
      data,
      timestamp: new Date().toISOString(),
      synced: false
    };

    // ローカルストレージの同期キューに追加
    this.syncQueue.push(syncItem);
    localStorage.setItem('sync-queue', JSON.stringify(this.syncQueue));

    // オンラインなら即座に同期
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  // オンライン復帰時の処理
  private async handleOnline() {
    this.isOnline = true;
    console.log('🌐 オンラインに復帰 - 同期開始');
    
    // 1. ローカルの変更をサーバーにプッシュ
    await this.processSyncQueue();
    
    // 2. サーバーの最新データをプル
    await this.pullFromServer();
  }

  // オフライン時の処理
  private handleOffline() {
    this.isOnline = false;
    console.log('📴 オフラインモード - ローカル保存のみ');
  }

  // 同期キューの処理
  private async processSyncQueue() {
    if (!supabase) return;
    
    const queue = JSON.parse(localStorage.getItem('sync-queue') || '[]');
    
    for (const item of queue) {
      if (!item.synced) {
        try {
          switch (item.operation) {
            case 'create':
              await supabase.from(item.table).insert(item.data);
              break;
            case 'update':
              await supabase.from(item.table).update(item.data).eq('id', item.data.id);
              break;
            case 'delete':
              await supabase.from(item.table).delete().eq('id', item.data.id);
              break;
          }
          item.synced = true;
        } catch (error) {
          console.error('同期エラー:', error);
        }
      }
    }

    // 同期済みアイテムをクリア
    const pendingItems = queue.filter((item: any) => !item.synced);
    localStorage.setItem('sync-queue', JSON.stringify(pendingItems));
  }

  // サーバーから最新データを取得
  private async pullFromServer() {
    if (!supabase) return;
    
    try {
      // ユーザーのデータを取得
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('*')
        .order('updated_at', { ascending: false });

      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('*')
        .order('updated_at', { ascending: false });

      const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      // ローカルストレージと同期
      if (workspaces || notebooks || notes) {
        const currentStore = JSON.parse(localStorage.getItem('notebook-store') || '{}');
        
        // タイムスタンプベースのマージ戦略
        const mergedData = this.mergeData(currentStore, {
          workspaces,
          notebooks,
          notes
        });

        localStorage.setItem('notebook-store', JSON.stringify(mergedData));
        console.log('✅ サーバーとの同期完了');
      }
    } catch (error) {
      console.error('プルエラー:', error);
    }
  }

  // データマージ戦略（最新のタイムスタンプを優先）
  private mergeData(local: any, remote: any) {
    // 実装: より新しいタイムスタンプのデータを採用
    // 競合解決ロジックをここに実装
    return {
      ...local,
      ...remote
    };
  }
}

// シングルトンインスタンス
export const syncManager = new OfflineFirstSync();