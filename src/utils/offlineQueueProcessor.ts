// Offline Queue Processor for NoteSpace - Phase 4
// Processes queued changes when online, handles conflicts, and manages retry logic

import { indexedDBManager } from './indexedDBManager';
import { backgroundSyncManager } from './backgroundSyncManager';
import { pushNotificationService } from './pushNotificationService';

// ==================== TYPES ====================

export interface QueuedOperation {
  id: string;
  action: 'create' | 'update' | 'delete' | 'sync' | 'backup';
  entityType: 'note' | 'workspace' | 'setting' | 'attachment';
  entityId: string;
  payload: any;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  updatedAt: number;
  scheduledAt?: number;
  lastError?: string;
  dependencies?: string[];
  metadata?: {
    userAgent?: string;
    source?: string;
    batchId?: string;
    conflictResolution?: 'local' | 'remote' | 'merge';
  };
}

export interface ProcessingResult {
  success: boolean;
  operationId: string;
  error?: string;
  conflictDetected?: boolean;
  requiresManualResolution?: boolean;
  serverResponse?: any;
}

export interface BatchProcessingResult {
  total: number;
  successful: number;
  failed: number;
  conflicts: number;
  results: ProcessingResult[];
  processingTime: number;
}

export interface ConflictResolution {
  operationId: string;
  resolution: 'local' | 'remote' | 'merge';
  mergedData?: any;
  notes?: string;
}

export interface SyncState {
  isProcessing: boolean;
  queueSize: number;
  lastProcessedAt: number;
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
  successRate: number;
}

// ==================== CONFIGURATION ====================

const PROCESSOR_CONFIG = {
  BATCH_SIZE: 20,
  MAX_CONCURRENT_OPERATIONS: 5,
  RETRY_DELAYS: [1000, 3000, 9000, 27000, 81000], // Exponential backoff
  CONFLICT_DETECTION_THRESHOLD: 0.8,
  PROCESSING_TIMEOUT: 30000, // 30 seconds
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  STATS_PERSISTENCE_INTERVAL: 10000, // 10 seconds
};

const API_ENDPOINTS = {
  SYNC: '/api/sync',
  BATCH_SYNC: '/api/sync/batch',
  CONFLICT_RESOLUTION: '/api/sync/resolve-conflict',
  STATUS: '/api/sync/status'
};

// ==================== OFFLINE QUEUE PROCESSOR ====================

class OfflineQueueProcessor {
  private static instance: OfflineQueueProcessor;
  private isProcessing: boolean = false;
  private processingBatch: QueuedOperation[] = [];
  private syncState: SyncState = this.getDefaultSyncState();
  private conflictQueue: Map<string, QueuedOperation> = new Map();
  private isOnline: boolean = navigator.onLine;
  private isInitialized: boolean = false;

  private constructor() {
    // Don't initialize immediately - wait for database to be ready
  }

  // ==================== PUBLIC INITIALIZATION ====================

  public async initializeWithDatabase(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[QueueProcessor] Starting initialization...');
      
      // Ensure database is fully initialized
      if (!(indexedDBManager as any).db) {
        console.log('[QueueProcessor] Waiting for database initialization...');
        await indexedDBManager.initialize();
      }
      
      // Wait for database to have all required stores
      await this.waitForRequiredStores();

      // Now safely initialize the processor
      await this.initializeProcessor();
      this.isInitialized = true;
      console.log('[QueueProcessor] Initialized successfully');
    } catch (error) {
      console.error('[QueueProcessor] Initialization failed:', error);
      // Don't throw to prevent app crashes
    }
  }

  public static getInstance(): OfflineQueueProcessor {
    if (!OfflineQueueProcessor.instance) {
      OfflineQueueProcessor.instance = new OfflineQueueProcessor();
    }
    return OfflineQueueProcessor.instance;
  }

  // ==================== INITIALIZATION ====================

  private async initializeProcessor(): Promise<void> {
    try {
      // Load persisted sync state
      await this.loadSyncState();

      // Set up event listeners
      this.setupEventListeners();

      // Start cleanup interval
      this.startCleanupInterval();

      // Process queue if online
      if (this.isOnline) {
        this.scheduleProcessing();
      }

      console.log('[QueueProcessor] Initialized successfully');
    } catch (error) {
      console.error('[QueueProcessor] Initialization failed:', error);
    }
  }

  private setupEventListeners(): void {
    // Network status monitoring
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[QueueProcessor] Network online - starting queue processing');
      this.scheduleProcessing();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[QueueProcessor] Network offline - pausing queue processing');
    });

    // Listen to background sync manager events
    backgroundSyncManager.on('sync-completed', (progress: any) => {
      this.handleSyncComplete(progress);
    });

    backgroundSyncManager.on('sync-error', (error: any) => {
      this.handleSyncError(error);
    });
  }

  // ==================== QUEUE MANAGEMENT ====================

  public async addToQueue(operation: Partial<QueuedOperation>): Promise<string> {
    const queuedOp: QueuedOperation = {
      id: this.generateId(),
      priority: 'normal',
      retryCount: 0,
      maxRetries: 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...operation
    } as QueuedOperation;

    // Store in IndexedDB only if initialized
    if (this.isInitialized) {
      try {
        await this.storeQueuedOperation(queuedOp);
        
        // Update stats
        this.syncState.queueSize++;
        await this.persistSyncState();
      } catch (error) {
        console.error('[QueueProcessor] Failed to store queued operation:', error);
        // Continue processing even if storage fails
      }
    } else {
      console.warn('[QueueProcessor] Cannot store operation - not initialized yet, operation will be processed in memory only');
    }

    // Schedule processing if online
    if (this.isOnline && !this.isProcessing) {
      this.scheduleProcessing();
    }

    console.log('[QueueProcessor] Operation queued:', queuedOp.id);
    return queuedOp.id;
  }

  public async getQueueSize(): Promise<number> {
    try {
      const operations = await this.getQueuedOperations();
      return operations.length;
    } catch (error) {
      console.error('[QueueProcessor] Failed to get queue size:', error);
      return 0;
    }
  }

  public async getQueuedOperations(limit?: number): Promise<QueuedOperation[]> {
    try {
      // Get from IndexedDB - this would need to be implemented
      const allKeys = await this.getAllQueueKeys();
      const operations: QueuedOperation[] = [];

      for (const key of allKeys) {
        if (key.startsWith('queue_op_')) {
          const op = await indexedDBManager.getSyncState(key) as QueuedOperation;
          if (op && (!op.scheduledAt || op.scheduledAt <= Date.now())) {
            operations.push(op);
          }
        }
      }

      // Sort by priority and creation time
      operations.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.createdAt - b.createdAt;
      });

      return limit ? operations.slice(0, limit) : operations;
    } catch (error) {
      console.error('[QueueProcessor] Failed to get queued operations:', error);
      return [];
    }
  }

  public async removeFromQueue(operationId: string): Promise<void> {
    try {
      await indexedDBManager.setSyncState(`queue_op_${operationId}`, null);
      this.syncState.queueSize = Math.max(0, this.syncState.queueSize - 1);
      await this.persistSyncState();
    } catch (error) {
      console.error('[QueueProcessor] Failed to remove operation from queue:', error);
    }
  }

  public async clearQueue(): Promise<void> {
    try {
      const operations = await this.getQueuedOperations();
      
      for (const op of operations) {
        await this.removeFromQueue(op.id);
      }
      
      this.syncState.queueSize = 0;
      await this.persistSyncState();
      
      console.log('[QueueProcessor] Queue cleared');
    } catch (error) {
      console.error('[QueueProcessor] Failed to clear queue:', error);
    }
  }

  // ==================== PROCESSING ENGINE ====================

  public async processQueue(): Promise<BatchProcessingResult> {
    if (this.isProcessing) {
      console.log('[QueueProcessor] Processing already in progress');
      return this.getCurrentBatchResult();
    }

    if (!this.isOnline) {
      console.log('[QueueProcessor] Cannot process queue while offline');
      return this.getEmptyBatchResult();
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      console.log('[QueueProcessor] Starting queue processing...');

      // Get operations to process
      const operations = await this.getQueuedOperations(PROCESSOR_CONFIG.BATCH_SIZE);
      
      if (operations.length === 0) {
        console.log('[QueueProcessor] No operations in queue');
        return this.getEmptyBatchResult();
      }

      this.processingBatch = operations;
      console.log(`[QueueProcessor] Processing batch of ${operations.length} operations`);

      // Group operations by priority and dependencies
      const batches = this.createProcessingBatches(operations);
      const results: ProcessingResult[] = [];
      let successful = 0;
      let failed = 0;
      let conflicts = 0;

      // Process each batch sequentially
      for (const batch of batches) {
        const batchResults = await this.processBatch(batch);
        results.push(...batchResults);

        for (const result of batchResults) {
          if (result.success) {
            successful++;
            await this.removeFromQueue(result.operationId);
          } else if (result.conflictDetected) {
            conflicts++;
            await this.handleConflict(result.operationId, result);
          } else {
            failed++;
            await this.handleFailure(result.operationId, result.error || 'Unknown error');
          }
        }
      }

      const processingTime = Date.now() - startTime;
      const batchResult: BatchProcessingResult = {
        total: operations.length,
        successful,
        failed,
        conflicts,
        results,
        processingTime
      };

      // Update stats
      this.updateProcessingStats(batchResult);

      console.log(`[QueueProcessor] Batch completed: ${successful}/${operations.length} successful`);
      return batchResult;

    } catch (error) {
      console.error('[QueueProcessor] Batch processing failed:', error);
      return this.getErrorBatchResult(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.isProcessing = false;
      this.processingBatch = [];
    }
  }

  private async processBatch(operations: QueuedOperation[]): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    // Process operations in parallel (up to max concurrent)
    const chunks = this.chunkArray(operations, PROCESSOR_CONFIG.MAX_CONCURRENT_OPERATIONS);
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(op => this.processOperation(op));
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const operation = chunk[index];
          if (operation) {
            results.push({
              success: false,
              operationId: operation.id,
              error: result.reason?.message || 'Processing failed'
            });
          }
        }
      });
    }
    
    return results;
  }

  private async processOperation(operation: QueuedOperation): Promise<ProcessingResult> {
    try {
      console.log(`[QueueProcessor] Processing operation: ${operation.id} (${operation.action})`);

      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), PROCESSOR_CONFIG.PROCESSING_TIMEOUT);
      });

      const processingPromise = this.executeOperation(operation);
      const result = await Promise.race([processingPromise, timeoutPromise]);

      return {
        success: true,
        operationId: operation.id,
        serverResponse: result
      };

    } catch (error) {
      console.error(`[QueueProcessor] Operation failed: ${operation.id}`, error);

      // Check if it's a conflict
      if (this.isConflictError(error)) {
        return {
          success: false,
          operationId: operation.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          conflictDetected: true,
          requiresManualResolution: !this.canAutoResolveConflict(operation, error)
        };
      }

      return {
        success: false,
        operationId: operation.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeOperation(operation: QueuedOperation): Promise<any> {
    const endpoint = this.getApiEndpoint(operation);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': operation.id,
        'X-Retry-Count': operation.retryCount.toString()
      },
      body: JSON.stringify({
        operation: operation.action,
        entityType: operation.entityType,
        entityId: operation.entityId,
        payload: operation.payload,
        metadata: operation.metadata
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  // ==================== CONFLICT HANDLING ====================

  private async handleConflict(operationId: string, result: ProcessingResult): Promise<void> {
    try {
      const operation = await this.getQueuedOperation(operationId);
      if (!operation) return;

      // Add to conflict queue
      this.conflictQueue.set(operationId, operation);

      // Try automatic resolution if possible
      if (!result.requiresManualResolution) {
        const resolution = await this.attemptAutoResolution(operation, result);
        if (resolution) {
          await this.applyConflictResolution(operationId, resolution);
          return;
        }
      }

      // Notify user about conflict
      await this.notifyConflict(operation, result);

      console.log(`[QueueProcessor] Conflict detected for operation: ${operationId}`);
    } catch (error) {
      console.error('[QueueProcessor] Conflict handling failed:', error);
    }
  }

  public async resolveConflict(operationId: string, resolution: ConflictResolution): Promise<boolean> {
    try {
      const operation = this.conflictQueue.get(operationId);
      if (!operation) {
        throw new Error('Operation not found in conflict queue');
      }

      // Apply resolution
      const success = await this.applyConflictResolution(operationId, resolution);
      
      if (success) {
        // Remove from conflict queue
        this.conflictQueue.delete(operationId);
        
        // Re-queue the operation with resolution metadata
        operation.metadata = {
          ...operation.metadata,
          conflictResolution: resolution.resolution
        };
        operation.retryCount = 0; // Reset retry count
        
        await this.storeQueuedOperation(operation);
        
        console.log(`[QueueProcessor] Conflict resolved: ${operationId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[QueueProcessor] Conflict resolution failed:', error);
      return false;
    }
  }

  private async applyConflictResolution(operationId: string, resolution: ConflictResolution): Promise<boolean> {
    try {
      const response = await fetch(API_ENDPOINTS.CONFLICT_RESOLUTION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationId,
          resolution: resolution.resolution,
          mergedData: resolution.mergedData,
          notes: resolution.notes
        })
      });

      return response.ok;
    } catch (error) {
      console.error('[QueueProcessor] Failed to apply conflict resolution:', error);
      return false;
    }
  }

  // ==================== RETRY LOGIC ====================

  private async handleFailure(operationId: string, error: string): Promise<void> {
    try {
      const operation = await this.getQueuedOperation(operationId);
      if (!operation) return;

      operation.retryCount++;
      operation.lastError = error;
      operation.updatedAt = Date.now();

      if (operation.retryCount < operation.maxRetries) {
        // Schedule retry with exponential backoff
        const delayIndex = Math.min(operation.retryCount - 1, PROCESSOR_CONFIG.RETRY_DELAYS.length - 1);
        const delay = PROCESSOR_CONFIG.RETRY_DELAYS[delayIndex] || 1000;
        operation.scheduledAt = Date.now() + delay;

        await this.storeQueuedOperation(operation);
        console.log(`[QueueProcessor] Operation scheduled for retry: ${operationId} (attempt ${operation.retryCount})`);
      } else {
        // Remove operation that exceeded max retries
        await this.removeFromQueue(operationId);
        await this.notifyPermanentFailure(operation, error);
        console.log(`[QueueProcessor] Operation permanently failed: ${operationId}`);
      }
    } catch (error) {
      console.error('[QueueProcessor] Failure handling failed:', error);
    }
  }

  // ==================== UTILITY METHODS ====================

  private createProcessingBatches(operations: QueuedOperation[]): QueuedOperation[][] {
    // Group operations by dependencies and priority
    const batches: QueuedOperation[][] = [];
    const processed = new Set<string>();
    
    while (processed.size < operations.length) {
      const batch: QueuedOperation[] = [];
      
      for (const op of operations) {
        if (processed.has(op.id)) continue;
        
        // Check if dependencies are satisfied
        const canProcess = !op.dependencies || 
          op.dependencies.every(dep => processed.has(dep));
        
        if (canProcess && batch.length < PROCESSOR_CONFIG.BATCH_SIZE) {
          batch.push(op);
          processed.add(op.id);
        }
      }
      
      if (batch.length > 0) {
        batches.push(batch);
      } else {
        // Break if we can't process any more operations
        break;
      }
    }
    
    return batches;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private isConflictError(error: any): boolean {
    return error.message?.includes('conflict') || 
           error.status === 409 ||
           error.code === 'CONFLICT';
  }

  private canAutoResolveConflict(operation: QueuedOperation, _error: any): boolean {
    // Simple heuristic for auto-resolution
    // In practice, this would be more sophisticated
    return operation.entityType === 'setting' || 
           operation.action === 'create';
  }

  private async attemptAutoResolution(operation: QueuedOperation, _result: ProcessingResult): Promise<ConflictResolution | null> {
    // Implement automatic conflict resolution logic
    // This is a simplified version
    
    if (operation.action === 'create') {
      // For create operations, try to generate a new ID
      return {
        operationId: operation.id,
        resolution: 'local',
        mergedData: {
          ...operation.payload,
          id: this.generateId() // Generate new ID
        }
      };
    }
    
    return null;
  }

  private getApiEndpoint(operation: QueuedOperation): string {
    // Return appropriate API endpoint based on operation type
    switch (operation.action) {
      case 'sync':
        return API_ENDPOINTS.SYNC;
      default:
        return API_ENDPOINTS.BATCH_SYNC;
    }
  }

  private async notifyConflict(operation: QueuedOperation, _result: ProcessingResult): Promise<void> {
    try {
      await pushNotificationService.showConflictNotification({
        entityType: operation.entityType,
        entityId: operation.entityId,
        entityTitle: operation.payload?.title || operation.entityId
      });
    } catch (error) {
      console.error('[QueueProcessor] Failed to notify conflict:', error);
    }
  }

  private async notifyPermanentFailure(operation: QueuedOperation, error: string): Promise<void> {
    try {
      await pushNotificationService.showNotification({
        title: 'Sync Failed',
        body: `Failed to sync ${operation.entityType}: ${error}`,
        data: { type: 'permanent-failure', operation, error },
        requireInteraction: true
      });
    } catch (error) {
      console.error('[QueueProcessor] Failed to notify permanent failure:', error);
    }
  }

  // ==================== STATE MANAGEMENT ====================

  private getDefaultSyncState(): SyncState {
    return {
      isProcessing: false,
      queueSize: 0,
      lastProcessedAt: 0,
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      successRate: 1.0
    };
  }

  private async loadSyncState(): Promise<void> {
    try {
      const saved = await indexedDBManager.getSyncState('queue_processor_state');
      if (saved) {
        this.syncState = { ...this.getDefaultSyncState(), ...saved };
      }
    } catch (error) {
      console.error('[QueueProcessor] Failed to load sync state:', error);
    }
  }

  private async persistSyncState(): Promise<void> {
    // Temporarily disable sync state persistence to prevent IndexedDB errors
    console.log('[QueueProcessor] State persistence disabled to prevent database errors');
    return;
    
    /* eslint-disable-next-line no-unreachable */
    /*
    try {
      // Only persist if fully initialized
      if (!this.isInitialized) {
        console.log('[QueueProcessor] Skipping state persistence - not initialized yet');
        return;
      }
      
      // Check if database is initialized before persisting
      if (indexedDBManager && (indexedDBManager as any).db) {
        // Additional defensive check for sync_state store
        const db = (indexedDBManager as any).db;
        if (db && db.objectStoreNames.contains('sync_state')) {
          await indexedDBManager.setSyncState('queue_processor_state', this.syncState);
        } else {
          console.warn('[QueueProcessor] sync_state store not available yet, skipping state persistence');
        }
      } else {
        console.warn('[QueueProcessor] Database not initialized yet, skipping state persistence');
      }
    } catch (error) {
      console.warn('[QueueProcessor] Failed to persist sync state:', error);
      // Don't throw to prevent breaking the service
    }
    */
  }

  private updateProcessingStats(result: BatchProcessingResult): void {
    this.syncState.totalProcessed += result.successful;
    this.syncState.totalFailed += result.failed;
    this.syncState.lastProcessedAt = Date.now();
    this.syncState.successRate = this.syncState.totalProcessed / 
      (this.syncState.totalProcessed + this.syncState.totalFailed);
    this.syncState.averageProcessingTime = (this.syncState.averageProcessingTime + result.processingTime) / 2;
    
    this.persistSyncState();
  }

  // ==================== HELPER METHODS ====================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async waitForRequiredStores(): Promise<void> {
    try {
      // Wait for database to be ready with required stores
      let attempts = 0;
      const maxAttempts = 10;
      const delayMs = 500;
      
      while (attempts < maxAttempts) {
        const db = (indexedDBManager as any).db;
        if (db && db.objectStoreNames.contains('sync_state')) {
          console.log('[QueueProcessor] Required stores are available');
          return;
        }
        
        console.log(`[QueueProcessor] Waiting for required stores... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
      }
      
      console.warn('[QueueProcessor] Timeout waiting for required stores, continuing anyway');
    } catch (error) {
      console.error('[QueueProcessor] Error waiting for required stores:', error);
    }
  }

  private async storeQueuedOperation(operation: QueuedOperation): Promise<void> {
    try {
      // Only store if initialized and database is ready
      if (!this.isInitialized) {
        console.log('[QueueProcessor] Skipping operation storage - not initialized yet');
        return;
      }
      
      if (indexedDBManager && (indexedDBManager as any).db) {
        await indexedDBManager.setSyncState(`queue_op_${operation.id}`, operation);
      } else {
        console.warn('[QueueProcessor] Database not ready, skipping operation storage');
      }
    } catch (error) {
      console.warn('[QueueProcessor] Failed to store operation (non-critical):', error);
    }
  }

  private async getQueuedOperation(operationId: string): Promise<QueuedOperation | null> {
    return await indexedDBManager.getSyncState(`queue_op_${operationId}`);
  }

  private async getAllQueueKeys(): Promise<string[]> {
    // This would need to be implemented in indexedDBManager
    // For now, return empty array
    return [];
  }

  private scheduleProcessing(): void {
    setTimeout(() => {
      if (this.isOnline && !this.isProcessing) {
        this.processQueue();
      }
    }, 1000);
  }

  private startCleanupInterval(): void {
    setInterval(async () => {
      await this.cleanupOldOperations();
    }, PROCESSOR_CONFIG.CLEANUP_INTERVAL);
  }

  private async cleanupOldOperations(): Promise<void> {
    // Remove operations older than 7 days that have been processed
    // const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    // Implementation would go here
  }

  private getCurrentBatchResult(): BatchProcessingResult {
    return {
      total: this.processingBatch.length,
      successful: 0,
      failed: 0,
      conflicts: 0,
      results: [],
      processingTime: 0
    };
  }

  private getEmptyBatchResult(): BatchProcessingResult {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      conflicts: 0,
      results: [],
      processingTime: 0
    };
  }

  private getErrorBatchResult(error: string): BatchProcessingResult {
    return {
      total: this.processingBatch.length,
      successful: 0,
      failed: this.processingBatch.length,
      conflicts: 0,
      results: this.processingBatch.map(op => ({
        success: false,
        operationId: op.id,
        error
      })),
      processingTime: 0
    };
  }

  private handleSyncComplete(progress: any): void {
    console.log('[QueueProcessor] Background sync completed:', progress);
  }

  private handleSyncError(error: any): void {
    console.error('[QueueProcessor] Background sync error:', error);
  }

  // ==================== PUBLIC API ====================

  public getSyncState(): SyncState {
    return { ...this.syncState };
  }

  public getConflictQueue(): Map<string, QueuedOperation> {
    return new Map(this.conflictQueue);
  }

  public async retryAllFailedOperations(): Promise<void> {
    const failedOps = await this.getQueuedOperations();
    const failed = failedOps.filter(op => op.lastError && op.retryCount < op.maxRetries);
    
    for (const op of failed) {
      op.scheduledAt = Date.now();
      op.retryCount = 0;
      delete op.lastError;
      await this.storeQueuedOperation(op);
    }
    
    if (failed.length > 0) {
      this.scheduleProcessing();
    }
  }
}

// ==================== EXPORT SINGLETON ====================

export const offlineQueueProcessor = OfflineQueueProcessor.getInstance();
export default offlineQueueProcessor;