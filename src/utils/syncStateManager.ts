/**
 * Enhanced SyncStateManager - 高度な同期操作制御と無限ループ防止システム
 * SuperClaude強化版 - 操作固有フラグとタイムアウト機能付き
 */
export class SyncStateManager {
  private static instance: SyncStateManager;
  
  private syncFlags = {
    isApplyingRemoteChange: false,
    isApplyingSupabaseSync: false,
    isSyncingInProgress: false,
    isUpdatingFromStorage: false
  };
  
  // 操作固有フラグ (新機能)
  private operationFlags = {
    noteUpdate: false,
    noteCreate: false,
    noteDelete: false,
    folderOperation: false,
    bulkOperation: false,
    conflictResolution: false
  };
  
  // タイムアウト管理
  private flagTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly FLAG_TIMEOUT_MS = 30000; // 30秒でタイムアウト
  
  // 同期キュー
  private syncQueue: Array<{
    id: string;
    operation: string;
    priority: number;
    timestamp: number;
    data?: any;
  }> = [];
  
  // パフォーマンス監視
  private syncMetrics = {
    totalOperations: 0,
    loopPreventions: 0,
    timeouts: 0,
    queueOperations: 0,
    lastResetTime: Date.now()
  };
  
  static getInstance(): SyncStateManager {
    if (!SyncStateManager.instance) {
      SyncStateManager.instance = new SyncStateManager();
    }
    return SyncStateManager.instance;
  }
  
  /**
   * 同期処理の実行可否を判定（強化版）
   * @param operationType 操作タイプ（オプション）
   * @returns 実行可能かどうか
   */
  canTriggerSync(operationType?: keyof typeof this.operationFlags): boolean {
    // 基本同期フラグのチェック
    const hasActiveSync = Object.values(this.syncFlags).some(flag => flag);
    if (hasActiveSync) {
      this.syncMetrics.loopPreventions++;
      console.debug(`🚫 Sync blocked - Active sync flags:`, this.getActiveSyncFlags());
      return false;
    }
    
    // 操作固有フラグのチェック
    if (operationType && this.operationFlags[operationType]) {
      this.syncMetrics.loopPreventions++;
      console.debug(`🚫 Sync blocked - Operation ${operationType} in progress`);
      return false;
    }
    
    // キューサイズチェック（過負荷防止）
    if (this.syncQueue.length > 50) {
      console.warn('🚫 Sync blocked - Queue overflow protection');
      return false;
    }
    
    this.syncMetrics.totalOperations++;
    return true;
  }
  
  /**
   * 同期フラグを設定（強化版 - タイムアウト付き）
   * @param type フラグの種類
   * @param value 設定値
   * @param timeoutMs タイムアウト時間（デフォルト30秒）
   */
  setSyncFlag(
    type: keyof typeof this.syncFlags, 
    value: boolean, 
    timeoutMs: number = this.FLAG_TIMEOUT_MS
  ): void {
    const flagKey = `sync_${type}`;
    
    // 既存のタイムアウトをクリア
    if (this.flagTimeouts.has(flagKey)) {
      clearTimeout(this.flagTimeouts.get(flagKey)!);
      this.flagTimeouts.delete(flagKey);
    }
    
    this.syncFlags[type] = value;
    console.debug(`🔄 SyncFlag ${type} set to ${value}`);
    
    // フラグがtrueの場合、タイムアウトを設定
    if (value && timeoutMs > 0) {
      const timeout = setTimeout(() => {
        console.warn(`⏰ SyncFlag ${type} timed out, auto-resetting`);
        this.syncFlags[type] = false;
        this.syncMetrics.timeouts++;
        this.flagTimeouts.delete(flagKey);
      }, timeoutMs);
      
      this.flagTimeouts.set(flagKey, timeout);
    }
  }
  
  /**
   * 操作固有フラグを設定
   * @param operation 操作タイプ
   * @param value 設定値
   * @param timeoutMs タイムアウト時間
   */
  setOperationFlag(
    operation: keyof typeof this.operationFlags, 
    value: boolean, 
    timeoutMs: number = this.FLAG_TIMEOUT_MS
  ): void {
    const flagKey = `op_${operation}`;
    
    // 既存のタイムアウトをクリア
    if (this.flagTimeouts.has(flagKey)) {
      clearTimeout(this.flagTimeouts.get(flagKey)!);
      this.flagTimeouts.delete(flagKey);
    }
    
    this.operationFlags[operation] = value;
    console.debug(`🔧 OperationFlag ${operation} set to ${value}`);
    
    // フラグがtrueの場合、タイムアウトを設定
    if (value && timeoutMs > 0) {
      const timeout = setTimeout(() => {
        console.warn(`⏰ OperationFlag ${operation} timed out, auto-resetting`);
        this.operationFlags[operation] = false;
        this.syncMetrics.timeouts++;
        this.flagTimeouts.delete(flagKey);
      }, timeoutMs);
      
      this.flagTimeouts.set(flagKey, timeout);
    }
  }
  
  /**
   * 全同期フラグの状態を取得
   * @returns フラグの状態オブジェクト
   */
  getSyncFlags(): Record<string, boolean> {
    return { ...this.syncFlags };
  }
  
  /**
   * アクティブな同期フラグを取得（デバッグ用）
   * @returns アクティブなフラグのリスト
   */
  private getActiveSyncFlags(): string[] {
    return Object.entries(this.syncFlags)
      .filter(([_, value]) => value)
      .map(([key, _]) => key);
  }
  
  /**
   * 同期操作をキューに追加
   * @param operation 操作詳細
   */
  queueSyncOperation(operation: {
    id: string;
    operation: string;
    priority: number;
    data?: any;
  }): void {
    this.syncQueue.push({
      ...operation,
      timestamp: Date.now()
    });
    
    // 優先度でソート（高い優先度が先頭）
    this.syncQueue.sort((a, b) => b.priority - a.priority);
    
    this.syncMetrics.queueOperations++;
    console.debug(`📋 Queued sync operation: ${operation.operation} (priority: ${operation.priority})`);
  }
  
  /**
   * キューから次の操作を取得
   * @returns 次の操作またはnull
   */
  dequeueNextOperation(): typeof this.syncQueue[0] | null {
    const operation = this.syncQueue.shift();
    if (operation) {
      console.debug(`📤 Dequeued sync operation: ${operation.operation}`);
    }
    return operation || null;
  }
  
  /**
   * キューをクリア
   */
  clearQueue(): void {
    this.syncQueue = [];
    console.debug('📋 Sync queue cleared');
  }
  
  /**
   * 同期メトリクスを取得
   */
  getMetrics(): typeof this.syncMetrics & {
    queueSize: number;
    activeFlags: string[];
    uptime: number;
  } {
    return {
      ...this.syncMetrics,
      queueSize: this.syncQueue.length,
      activeFlags: [...this.getActiveSyncFlags(), ...this.getActiveOperationFlags()],
      uptime: Date.now() - this.syncMetrics.lastResetTime
    };
  }
  
  /**
   * アクティブな操作フラグを取得
   */
  private getActiveOperationFlags(): string[] {
    return Object.entries(this.operationFlags)
      .filter(([_, value]) => value)
      .map(([key, _]) => `op_${key}`);
  }
  
  /**
   * 全フラグをリセット（緊急時用 - 強化版）
   */
  resetAllFlags(): void {
    // 同期フラグリセット
    Object.keys(this.syncFlags).forEach(key => {
      this.syncFlags[key as keyof typeof this.syncFlags] = false;
    });
    
    // 操作フラグリセット
    Object.keys(this.operationFlags).forEach(key => {
      this.operationFlags[key as keyof typeof this.operationFlags] = false;
    });
    
    // 全タイムアウトをクリア
    this.flagTimeouts.forEach(timeout => clearTimeout(timeout));
    this.flagTimeouts.clear();
    
    // キューをクリア
    this.clearQueue();
    
    // メトリクスリセット
    this.syncMetrics = {
      totalOperations: 0,
      loopPreventions: 0,
      timeouts: 0,
      queueOperations: 0,
      lastResetTime: Date.now()
    };
    
    console.warn('🚨 Emergency reset: All sync flags, timeouts, and queue cleared');
  }
  
  /**
   * リソースクリーンアップ
   */
  destroy(): void {
    this.resetAllFlags();
    console.debug('🗑️ SyncStateManager destroyed');
  }
}

export const syncStateManager = SyncStateManager.getInstance();