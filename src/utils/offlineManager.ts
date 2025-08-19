// オフライン管理ユーティリティ
export interface OfflineAction {
  id: string;
  type: 'CREATE_NOTE' | 'UPDATE_NOTE' | 'DELETE_NOTE' | 'CREATE_FOLDER' | 'DELETE_FOLDER' | 'UPDATE_SETTINGS';
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

export interface OfflineStatus {
  isOnline: boolean;
  hasQueuedActions: boolean;
  queuedActionsCount: number;
  lastSyncTime?: number;
}

class OfflineManager {
  private static instance: OfflineManager;
  private onlineStatus: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private statusCallbacks: ((status: OfflineStatus) => void)[] = [];
  private readonly OFFLINE_QUEUE_KEY = 'notespace-offline-queue';
  private readonly LAST_SYNC_KEY = 'notespace-last-sync';

  private constructor() {
    this.setupEventListeners();
    this.setupServiceWorkerCommunication();
  }

  public static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  // イベントリスナーの設定
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      console.log('Application came online');
      this.onlineStatus = true;
      this.notifyStatusChange();
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      console.log('Application went offline');
      this.onlineStatus = false;
      this.notifyStatusChange();
    });

    // ページロード時の同期
    document.addEventListener('DOMContentLoaded', () => {
      if (this.onlineStatus) {
        setTimeout(() => this.triggerSync(), 1000);
      }
    });
  }

  // Service Workerとの通信設定
  private setupServiceWorkerCommunication(): void {
    if ('serviceWorker' in navigator) {
      // Import service worker manager dynamically to avoid circular dependencies
      import('./serviceWorkerManager').then(({ serviceWorkerManager }) => {
        // Listen for service worker messages
        serviceWorkerManager.onMessage((message) => {
          const { type, data } = message;
          
          switch (type) {
            case 'SYNC_COMPLETE':
              console.log(`Synced ${data.synced} offline actions`);
              this.onSyncComplete();
              break;
              
            case 'AUTO_BACKUP_REQUEST':
              this.handleAutoBackupRequest();
              break;
              
            case 'SW_ACTIVATED':
              console.log('Service Worker activated, checking for queued actions...');
              if (this.onlineStatus) {
                setTimeout(() => this.triggerSync(), 1000);
              }
              break;
              
            default:
              console.log('Unknown SW message:', type);
          }
        });

        // Register background sync when service worker is ready
        serviceWorkerManager.waitForControlling().then(() => {
          this.registerBackgroundSync('offline-sync').catch((error) => {
            console.warn('Background sync registration failed:', error);
          });
        });
      });

      // Fallback to direct service worker communication
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'SYNC_COMPLETE':
            console.log(`Synced ${data.synced} offline actions`);
            this.onSyncComplete();
            break;
            
          case 'AUTO_BACKUP_REQUEST':
            this.handleAutoBackupRequest();
            break;
            
          default:
            console.log('Unknown SW message:', type);
        }
      });
    }
  }

  // オフラインアクションをキューに追加
  public queueAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): void {
    const queuedAction: OfflineAction = {
      id: this.generateId(),
      ...action,
      timestamp: Date.now(),
      retryCount: 0
    };

    try {
      const existingQueue = this.getOfflineQueue();
      existingQueue.push(queuedAction);
      localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(existingQueue));
      
      console.log('Action queued for offline sync:', queuedAction.type);
      this.notifyStatusChange();
      
      // Service Workerにも通知
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'QUEUE_OFFLINE_ACTION',
          data: queuedAction
        });
      }
    } catch (error) {
      console.error('Failed to queue offline action:', error);
    }
  }

  // オフラインキューの取得
  private getOfflineQueue(): OfflineAction[] {
    try {
      const queue = localStorage.getItem(this.OFFLINE_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  }

  // 同期の実行
  private async triggerSync(): Promise<void> {
    if (this.syncInProgress || !this.onlineStatus) {
      return;
    }

    const queue = this.getOfflineQueue();
    if (queue.length === 0) {
      return;
    }

    console.log(`Starting sync of ${queue.length} offline actions`);
    this.syncInProgress = true;
    this.notifyStatusChange();

    try {
      // Try service worker manager first
      try {
        const { serviceWorkerManager } = await import('./serviceWorkerManager');
        await serviceWorkerManager.triggerSync();
        return;
      } catch (swError) {
        console.warn('Service worker sync failed, falling back to direct sync:', swError);
      }

      // Service Worker経由で同期 (fallback)
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        await navigator.serviceWorker.ready;
        return navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_OFFLINE_ACTIONS'
        });
      } else {
        // フォールバック: 直接同期
        await this.syncActionsDirectly(queue);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      this.syncInProgress = false;
      this.notifyStatusChange();
    }
  }

  // 直接同期の実装
  private async syncActionsDirectly(actions: OfflineAction[]): Promise<void> {
    const syncedActions: string[] = [];

    for (const action of actions) {
      try {
        await this.syncSingleAction(action);
        syncedActions.push(action.id);
        console.log('Synced action:', action.type);
      } catch (error) {
        console.error('Failed to sync action:', action.type, error);
        // リトライ回数を増やす
        action.retryCount++;
      }
    }

    // 成功したアクションをキューから削除
    if (syncedActions.length > 0) {
      const remainingActions = actions.filter(action => !syncedActions.includes(action.id));
      localStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(remainingActions));
    }

    this.onSyncComplete();
  }

  // 単一アクションの同期
  private async syncSingleAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'CREATE_NOTE':
        // ノート作成の同期ロジック
        break;
      case 'UPDATE_NOTE':
        // ノート更新の同期ロジック  
        break;
      case 'DELETE_NOTE':
        // ノート削除の同期ロジック
        break;
      case 'CREATE_FOLDER':
        // フォルダ作成の同期ロジック
        break;
      case 'UPDATE_SETTINGS':
        // 設定更新の同期ロジック
        break;
      default:
        console.warn('Unknown action type:', action.type);
    }
  }

  // 同期完了時の処理
  private onSyncComplete(): void {
    this.syncInProgress = false;
    localStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());
    this.notifyStatusChange();
    console.log('Offline sync completed');
  }

  // 自動バックアップリクエストの処理
  private handleAutoBackupRequest(): void {
    try {
      // 現在のアプリケーション状態を取得
      const notebookStore = localStorage.getItem('notebook-store');
      const themeSettings = localStorage.getItem('theme');
      const accessibilitySettings = localStorage.getItem('notespace-accessibility-settings');

      const backupData = {
        notebookStore: notebookStore ? JSON.parse(notebookStore) : null,
        themeSettings,
        accessibilitySettings: accessibilitySettings ? JSON.parse(accessibilitySettings) : null,
        timestamp: Date.now()
      };

      // Service Workerに送信
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'AUTO_BACKUP_DATA',
          data: backupData
        });
      }
    } catch (error) {
      console.error('Failed to handle auto backup request:', error);
    }
  }

  // 現在のオフライン状態を取得
  public getStatus(): OfflineStatus {
    const queue = this.getOfflineQueue();
    const lastSync = localStorage.getItem(this.LAST_SYNC_KEY);
    
    const status: OfflineStatus = {
      isOnline: this.onlineStatus,
      hasQueuedActions: queue.length > 0,
      queuedActionsCount: queue.length
    };
    
    if (lastSync) {
      status.lastSyncTime = parseInt(lastSync);
    }
    
    return status;
  }

  // ステータス変更の通知
  public onStatusChange(callback: (status: OfflineStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    
    // アンサブスクライブ関数を返す
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  // ステータス変更の通知実行
  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => callback(status));
  }

  // キャッシュ状態の取得
  public async getCacheStatus(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        resolve({ error: 'No service worker controller' });
        return;
      }

      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      navigator.serviceWorker.controller.postMessage({
        type: 'GET_CACHE_STATUS'
      }, [channel.port2]);

      // タイムアウト設定
      setTimeout(() => {
        reject(new Error('Cache status request timeout'));
      }, 5000);
    });
  }

  // 手動同期の実行
  public async forcSync(): Promise<void> {
    if (!this.onlineStatus) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.triggerSync();
  }

  // オフラインキューのクリア
  public clearOfflineQueue(): void {
    localStorage.removeItem(this.OFFLINE_QUEUE_KEY);
    this.notifyStatusChange();
    console.log('Offline queue cleared');
  }

  // ユニークIDの生成
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Background Syncの登録
  public async registerBackgroundSync(tag: string): Promise<void> {
    try {
      // Try using service worker manager first
      const { serviceWorkerManager } = await import('./serviceWorkerManager');
      await serviceWorkerManager.registerBackgroundSync(tag);
      console.log('Background sync registered via SW manager:', tag);
    } catch (error) {
      console.warn('Service worker manager not available, using fallback:', error);
      
      // Fallback to direct registration
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        try {
          const registration = await navigator.serviceWorker.ready;
          // TypeScript型定義の問題を回避
          const syncRegistration = registration as any;
          if (syncRegistration.sync) {
            await syncRegistration.sync.register(tag);
            console.log('Background sync registered (fallback):', tag);
          }
        } catch (syncError) {
          console.error('Background sync registration failed:', syncError);
        }
      } else {
        console.log('Background sync not supported');
      }
    }
  }
}

// シングルトンインスタンスをエクスポート
export const offlineManager = OfflineManager.getInstance();