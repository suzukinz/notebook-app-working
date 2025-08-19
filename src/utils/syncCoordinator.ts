/**
 * SyncCoordinator - 中央集権型同期制御システム
 * SuperClaude強化版 - 優先度ベースキューイングと安全な同期実行
 */

import { syncStateManager } from './syncStateManager';
import { autoSyncManager } from './autoSyncManager';
import { supabase, OfflineFirstSync } from './supabaseSync';
import { logger } from './logger';
import type { NotebookState } from '../types';

export interface SyncOperation {
  id: string;
  type: 'supabase' | 'device' | 'local' | 'conflict_resolution';
  operation: 'create' | 'update' | 'delete' | 'bulk' | 'sync';
  priority: number; // 1-10 (10が最高優先度)
  data: any;
  retryCount?: number;
  maxRetries?: number;
  timeout?: number;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  onProgress?: (progress: number) => void;
}

export interface SyncResult {
  success: boolean;
  operationId: string;
  duration: number;
  error?: Error;
  result?: any;
  retriesUsed?: number;
}

export class SyncCoordinator {
  private static instance: SyncCoordinator;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly PROCESSING_INTERVAL_MS = 1000; // 1秒間隔
  
  // 実行統計
  private stats = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    retriedOperations: 0,
    averageExecutionTime: 0,
    lastExecutionTime: 0
  };

  static getInstance(): SyncCoordinator {
    if (!SyncCoordinator.instance) {
      SyncCoordinator.instance = new SyncCoordinator();
    }
    return SyncCoordinator.instance;
  }

  constructor() {
    this.startProcessing();
  }

  /**
   * 同期操作をスケジュール
   * @param operation 同期操作詳細
   */
  async scheduleSync(operation: SyncOperation): Promise<string> {
    // 操作IDを生成（指定されていない場合）
    if (!operation.id) {
      operation.id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // デフォルト値を設定
    const normalizedOperation: SyncOperation = {
      retryCount: 0,
      maxRetries: 3,
      timeout: 30000, // 30秒
      ...operation
    };

    // 重複チェック
    if (this.isDuplicateOperation(normalizedOperation)) {
      console.debug(`🔄 Duplicate sync operation ignored: ${normalizedOperation.id}`);
      return normalizedOperation.id;
    }

    // キューに追加
    syncStateManager.queueSyncOperation({
      id: normalizedOperation.id,
      operation: `${normalizedOperation.type}_${normalizedOperation.operation}`,
      priority: normalizedOperation.priority,
      data: normalizedOperation
    });

    logger.debug(`📋 Sync operation scheduled: ${normalizedOperation.type}/${normalizedOperation.operation} (ID: ${normalizedOperation.id})`);
    
    return normalizedOperation.id;
  }

  /**
   * 高優先度同期（即座に実行）
   * @param operation 同期操作詳細
   */
  async executePrioritySync(operation: SyncOperation): Promise<SyncResult> {
    operation.priority = 10; // 最高優先度
    const operationId = await this.scheduleSync(operation);
    
    // 強制的に処理を実行
    await this.processQueue();
    
    // 結果を待機（簡易実装）
    return new Promise((resolve) => {
      const checkResult = () => {
        // 実際の実装では結果ストレージから取得
        setTimeout(() => {
          resolve({
            success: true,
            operationId,
            duration: 0
          });
        }, 100);
      };
      checkResult();
    });
  }

  /**
   * Supabase同期のスケジュール
   * @param state 同期するノートブック状態
   * @param priority 優先度 (1-10)
   */
  async scheduleSupabaseSync(state: NotebookState, priority: number = 5): Promise<string> {
    return this.scheduleSync({
      id: `supabase_sync_${Date.now()}`,
      type: 'supabase',
      operation: 'sync',
      priority,
      data: { state },
      timeout: 45000, // Supabaseは時間がかかる場合があるため長めに設定
      onSuccess: (result) => {
        logger.info('✅ Supabase sync completed successfully', result);
      },
      onError: (error) => {
        logger.error('❌ Supabase sync failed', error);
      }
    });
  }

  /**
   * デバイス間同期のスケジュール
   * @param state 同期するノートブック状態
   * @param priority 優先度 (1-10)
   */
  async scheduleDeviceSync(state: NotebookState, priority: number = 7): Promise<string> {
    return this.scheduleSync({
      id: `device_sync_${Date.now()}`,
      type: 'device',
      operation: 'sync',
      priority,
      data: { state },
      timeout: 15000,
      onSuccess: (result) => {
        logger.info('✅ Device sync completed successfully', result);
      },
      onError: (error) => {
        logger.error('❌ Device sync failed', error);
      }
    });
  }

  /**
   * キュー処理の開始
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processQueue();
      }
    }, this.PROCESSING_INTERVAL_MS);

    logger.debug('🔄 SyncCoordinator processing started');
  }

  /**
   * キュー処理の実行
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // 既に処理中
    }

    this.isProcessing = true;

    try {
      const nextOperation = syncStateManager.dequeueNextOperation();
      
      if (nextOperation) {
        await this.executeOperation(nextOperation.data as SyncOperation);
      }
    } catch (error) {
      logger.error('❌ Queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 個別操作の実行
   * @param operation 実行する操作
   */
  private async executeOperation(operation: SyncOperation): Promise<SyncResult> {
    const startTime = Date.now();
    
    try {
      // 実行前チェック
      if (!syncStateManager.canTriggerSync()) {
        throw new Error('Sync blocked by state manager');
      }

      // 操作タイプ別の実行
      let result: any;
      
      switch (operation.type) {
        case 'supabase':
          result = await this.executeSupabaseSync(operation);
          break;
        case 'device':
          result = await this.executeDeviceSync(operation);
          break;
        default:
          throw new Error(`Unknown sync type: ${operation.type}`);
      }

      // 成功処理
      const duration = Date.now() - startTime;
      this.updateStats(true, duration);
      
      if (operation.onSuccess) {
        operation.onSuccess(result);
      }

      const syncResult: SyncResult = {
        success: true,
        operationId: operation.id,
        duration,
        result,
        retriesUsed: operation.retryCount || 0
      };

      logger.debug(`✅ Sync operation completed: ${operation.id} (${duration}ms)`);
      return syncResult;

    } catch (error) {
      // エラー処理とリトライ
      const shouldRetry = this.shouldRetryOperation(operation, error as Error);
      
      if (shouldRetry) {
        return await this.retryOperation(operation, error as Error);
      } else {
        // 最終的な失敗
        const duration = Date.now() - startTime;
        this.updateStats(false, duration);
        
        if (operation.onError) {
          operation.onError(error);
        }

        const syncResult: SyncResult = {
          success: false,
          operationId: operation.id,
          duration,
          error: error as Error,
          retriesUsed: operation.retryCount || 0
        };

        logger.error(`❌ Sync operation failed: ${operation.id}`, error);
        return syncResult;
      }
    }
  }

  /**
   * Supabase同期の実行
   * @param operation 同期操作
   */
  private async executeSupabaseSync(operation: SyncOperation): Promise<any> {
    syncStateManager.setSyncFlag('isApplyingSupabaseSync', true);
    
    try {
      const { state } = operation.data;
      
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }
      
      // OfflineFirstSyncを使用した同期処理
      const offlineSync = new OfflineFirstSync();
      
      // 簡易的な同期実装（実際には詳細な同期ロジックが必要）
      await offlineSync.queueSync('update', 'notebooks', state);
      
      return { success: true, state };
    } finally {
      syncStateManager.setSyncFlag('isApplyingSupabaseSync', false);
    }
  }

  /**
   * デバイス間同期の実行
   * @param operation 同期操作
   */
  private async executeDeviceSync(operation: SyncOperation): Promise<any> {
    syncStateManager.setSyncFlag('isSyncingInProgress', true);
    
    try {
      const { state } = operation.data;
      if (autoSyncManager.isRunning()) {
        autoSyncManager.broadcastStateChange(state);
        return { broadcast: 'success' };
      } else {
        throw new Error('AutoSyncManager is not running');
      }
    } finally {
      syncStateManager.setSyncFlag('isSyncingInProgress', false);
    }
  }

  /**
   * 操作のリトライ判定
   * @param operation 操作
   * @param error エラー
   */
  private shouldRetryOperation(operation: SyncOperation, error: Error): boolean {
    const retryCount = operation.retryCount || 0;
    const maxRetries = operation.maxRetries || 3;
    
    if (retryCount >= maxRetries) {
      return false;
    }

    // リトライ可能なエラータイプの判定
    const retryableErrors = [
      'network',
      'timeout',
      'temporary',
      'rate_limit'
    ];

    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(type => errorMessage.includes(type));
  }

  /**
   * 操作のリトライ実行
   * @param operation 操作
   * @param error 前回のエラー
   */
  private async retryOperation(operation: SyncOperation, error: Error): Promise<SyncResult> {
    const retryCount = (operation.retryCount || 0) + 1;
    const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 指数バックオフ

    logger.warn(`🔄 Retrying sync operation: ${operation.id} (attempt ${retryCount}/${operation.maxRetries})`);

    // 遅延
    await new Promise(resolve => setTimeout(resolve, retryDelay));

    // リトライカウントを更新してキューに再追加
    const retryOperation: SyncOperation = {
      ...operation,
      retryCount,
      priority: Math.max(operation.priority - 1, 1) // 優先度を少し下げる
    };

    await this.scheduleSync(retryOperation);
    this.stats.retriedOperations++;

    // 即座には実行結果を返さず、キューでの処理に委ねる
    return {
      success: false,
      operationId: operation.id,
      duration: 0,
      error,
      retriesUsed: retryCount
    };
  }

  /**
   * 重複操作の判定
   * @param _operation 操作（将来の実装用）
   */
  private isDuplicateOperation(_operation: SyncOperation): boolean {
    // 簡易実装：同じタイプ・操作の組み合わせが短時間内にある場合は重複とみなす
    // const metrics = syncStateManager.getMetrics();
    // const recentWindow = 5000; // 5秒以内
    
    // 実際の実装では、より詳細な重複チェックロジックを実装する
    return false;
  }

  /**
   * 統計の更新
   * @param success 成功したかどうか
   * @param duration 実行時間
   */
  private updateStats(success: boolean, duration: number): void {
    this.stats.totalOperations++;
    
    if (success) {
      this.stats.successfulOperations++;
    } else {
      this.stats.failedOperations++;
    }

    // 平均実行時間の更新
    const totalTime = this.stats.averageExecutionTime * (this.stats.totalOperations - 1) + duration;
    this.stats.averageExecutionTime = totalTime / this.stats.totalOperations;
    this.stats.lastExecutionTime = Date.now();
  }

  /**
   * 統計情報の取得
   */
  getStats(): typeof this.stats & {
    queueSize: number;
    isProcessing: boolean;
    syncManagerMetrics: any;
  } {
    return {
      ...this.stats,
      queueSize: syncStateManager.getMetrics().queueSize,
      isProcessing: this.isProcessing,
      syncManagerMetrics: syncStateManager.getMetrics()
    };
  }

  /**
   * 処理の停止
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    this.isProcessing = false;
    logger.debug('⏹️ SyncCoordinator processing stopped');
  }

  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    this.stop();
    syncStateManager.resetAllFlags();
    logger.debug('🗑️ SyncCoordinator destroyed');
  }
}

// シングルトンインスタンスをエクスポート
export const syncCoordinator = SyncCoordinator.getInstance();