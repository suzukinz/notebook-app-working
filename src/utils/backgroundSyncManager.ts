// Background Sync Manager for NoteSpace - Phase 4
// Manages background sync operations, queue processing, and conflict detection

import { indexedDBManager } from './indexedDBManager';

// ==================== TYPES ====================

export interface SyncTask {
  id: string;
  type: 'create' | 'update' | 'delete' | 'backup' | 'refresh';
  entityType: 'note' | 'workspace' | 'setting' | 'attachment' | 'system';
  entityId: string;
  payload: any;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  scheduledAt?: number;
  lastError?: string;
  dependencies?: string[]; // IDs of tasks that must complete first
}

export interface SyncBatch {
  id: string;
  tasks: SyncTask[];
  priority: 'high' | 'normal' | 'low';
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  currentTask?: SyncTask;
  batch?: SyncBatch;
  estimatedTimeRemaining?: number;
}

export interface ConflictDetection {
  entityType: string;
  entityId: string;
  localTimestamp: number;
  remoteTimestamp: number;
  conflictType: 'concurrent_edit' | 'offline_edit' | 'delete_conflict';
  autoResolvable: boolean;
  confidence: number; // 0-1
}

export interface SyncStats {
  totalSynced: number;
  totalFailed: number;
  averageSyncTime: number;
  lastSyncTime: number;
  successRate: number;
  queueSize: number;
}

// ==================== CONFIGURATION ====================

const SYNC_CONFIG = {
  BATCH_SIZE: 10,
  MAX_CONCURRENT_SYNCS: 3,
  RETRY_DELAYS: [1000, 5000, 15000, 30000, 60000], // ms
  CONFLICT_DETECTION_WINDOW: 5 * 60 * 1000, // 5 minutes
  STATS_UPDATE_INTERVAL: 30000, // 30 seconds
  BACKGROUND_SYNC_INTERVAL: 60000, // 1 minute
};

// Sync tags for background sync registration
// const SYNC_TAGS = {
//   IMMEDIATE: 'immediate-sync',
//   BATCH: 'batch-sync',
//   PERIODIC: 'periodic-sync',
//   RETRY: 'retry-sync'
// };

// ==================== BACKGROUND SYNC MANAGER CLASS ====================

class BackgroundSyncManager {
  private static instance: BackgroundSyncManager;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private currentBatch: SyncBatch | null = null;
  private syncStats: SyncStats = {
    totalSynced: 0,
    totalFailed: 0,
    averageSyncTime: 0,
    lastSyncTime: 0,
    successRate: 1.0,
    queueSize: 0
  };
  private eventListeners: { [key: string]: Function[] } = {};
  private serviceWorkerReady: boolean = false;
  private isInitialized: boolean = false;
  private statsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeEventListeners();
    this.initializeServiceWorker();
    // Don't start stats interval here - wait for proper database initialization
  }

  // Add cleanup method for the interval
  public destroy(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  // ==================== PUBLIC INITIALIZATION ====================

  public async initializeWithDatabase(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('[BackgroundSync] Starting initialization...');
      
      // Ensure database is fully initialized
      if (!(indexedDBManager as any).db) {
        console.log('[BackgroundSync] Waiting for database initialization...');
        await indexedDBManager.initialize();
      }
      
      // Wait for database to have all required stores
      await this.waitForRequiredStores();

      // Load existing stats if available
      try {
        const savedStats = await indexedDBManager.getSyncState('sync_stats');
        if (savedStats) {
          this.syncStats = { ...this.syncStats, ...savedStats };
          console.log('[BackgroundSync] Loaded existing stats:', savedStats);
        }
      } catch (error) {
        console.warn('[BackgroundSync] Failed to load existing stats:', error);
        // Use default stats and continue
      }

      // Clear any existing interval and start periodic stats update
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
      }
      this.statsInterval = setInterval(() => {
        // Only update stats if fully initialized and database is ready
        if (this.isInitialized && indexedDBManager && (indexedDBManager as any).db) {
          this.updateStats().catch(error => {
            console.warn('[BackgroundSync] Stats update failed (non-critical):', error);
          });
        }
      }, SYNC_CONFIG.STATS_UPDATE_INTERVAL);

      this.isInitialized = true;
      console.log('[BackgroundSync] Initialized successfully');
    } catch (error) {
      console.error('[BackgroundSync] Initialization failed:', error);
      // Don't throw to prevent app crashes
    }
  }

  public static getInstance(): BackgroundSyncManager {
    if (!BackgroundSyncManager.instance) {
      BackgroundSyncManager.instance = new BackgroundSyncManager();
    }
    return BackgroundSyncManager.instance;
  }

  // ==================== INITIALIZATION ====================

  private initializeEventListeners(): void {
    // Network status monitoring
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('network-status-changed', { isOnline: true });
      this.triggerSyncIfNeeded();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('network-status-changed', { isOnline: false });
    });

    // Service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });
    }

    // Periodic stats update will be started after database initialization
    // See initializeWithDatabase() method
  }

  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.ready;
        this.serviceWorkerReady = true;
        console.log('[BackgroundSync] Service worker ready');
        
        // Check for pending sync tasks
        this.triggerSyncIfNeeded();
      } catch (error) {
        console.error('[BackgroundSync] Service worker initialization failed:', error);
      }
    }
  }

  // ==================== PUBLIC API ====================

  public async registerSyncTask(taskData: Partial<SyncTask>): Promise<string> {
    const task: SyncTask = {
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      priority: 'normal',
      ...taskData
    } as SyncTask;

    // Store task in IndexedDB only if initialized
    if (this.isInitialized) {
      try {
        await this.storeSyncTask(task);
        // Update stats
        await this.updateStats();
      } catch (error) {
        console.error('[BackgroundSync] Failed to store sync task:', error);
        // Continue with registration even if storage fails
      }
    } else {
      console.warn('[BackgroundSync] Cannot register task - not initialized yet, task will be queued for processing only');
    }

    // Trigger sync if online
    if (this.isOnline) {
      this.scheduleSyncTask(task);
    } else {
      // Register with service worker for background sync
      this.registerBackgroundSync(task);
    }

    this.emit('task-registered', task);
    return task.id;
  }

  public async createSyncBatch(tasks: SyncTask[]): Promise<string> {
    const batch: SyncBatch = {
      id: this.generateId(),
      tasks: this.sortTasksByPriority(tasks),
      priority: this.getBatchPriority(tasks),
      createdAt: Date.now(),
      status: 'pending'
    };

    // Store batch
    await indexedDBManager.setSyncState(`batch_${batch.id}`, batch);

    this.emit('batch-created', batch);
    return batch.id;
  }

  public async processSyncQueue(): Promise<SyncProgress> {
    if (this.syncInProgress) {
      return this.getCurrentProgress();
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      // Get pending tasks
      const pendingTasks = await this.getPendingTasks();
      
      if (pendingTasks.length === 0) {
        this.syncInProgress = false;
        return { total: 0, completed: 0, failed: 0 };
      }

      // Create or use existing batch
      const batch = this.currentBatch || await this.createBatchFromTasks(pendingTasks);
      this.currentBatch = batch;

      const progress: SyncProgress = {
        total: batch.tasks.length,
        completed: 0,
        failed: 0,
        batch,
        estimatedTimeRemaining: this.estimateTimeRemaining(batch)
      };

      this.emit('sync-started', progress);

      // Process tasks in order
      for (const task of batch.tasks) {
        try {
          progress.currentTask = task;
          this.emit('sync-progress', progress);

          const success = await this.processSingleTask(task);
          if (success) {
            progress.completed++;
            await this.removeSyncTask(task.id);
          } else {
            progress.failed++;
            await this.handleTaskFailure(task);
          }
        } catch (error) {
          console.error('[BackgroundSync] Task processing error:', error);
          progress.failed++;
          await this.handleTaskFailure(task, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Update batch status
      batch.status = progress.failed === 0 ? 'completed' : 'failed';
      await indexedDBManager.setSyncState(`batch_${batch.id}`, batch);

      // Update stats
      this.syncStats.totalSynced += progress.completed;
      this.syncStats.totalFailed += progress.failed;
      this.syncStats.lastSyncTime = Date.now();
      this.syncStats.averageSyncTime = (this.syncStats.averageSyncTime + (Date.now() - startTime)) / 2;
      this.syncStats.successRate = this.syncStats.totalSynced / (this.syncStats.totalSynced + this.syncStats.totalFailed);

      await this.persistStats();

      this.emit('sync-completed', progress);
      return progress;

    } finally {
      this.syncInProgress = false;
      this.currentBatch = null;
    }
  }

  public async retryFailedTasks(): Promise<void> {
    const failedTasks = await this.getFailedTasks();
    
    for (const task of failedTasks) {
      if (task.retryCount < task.maxRetries) {
        // Calculate retry delay with exponential backoff
        const delayIndex = Math.min(task.retryCount, SYNC_CONFIG.RETRY_DELAYS.length - 1);
        const delay = SYNC_CONFIG.RETRY_DELAYS[delayIndex] || 1000;
        task.scheduledAt = Date.now() + delay;
        task.retryCount++;
        delete task.lastError;
        
        await this.storeSyncTask(task);
      } else {
        // Remove tasks that exceeded max retries
        await this.removeSyncTask(task.id);
        this.emit('task-max-retries-exceeded', task);
      }
    }
  }

  public async detectConflicts(): Promise<ConflictDetection[]> {
    const conflicts: ConflictDetection[] = [];
    const recentTasks = await this.getRecentTasks(SYNC_CONFIG.CONFLICT_DETECTION_WINDOW);

    // Group tasks by entity
    const entityGroups = this.groupTasksByEntity(recentTasks);

    for (const [entityKey, tasks] of entityGroups) {
      const parts = entityKey.split(':');
      const entityType = parts[0] || '';
      const entityId = parts[1] || '';
      
      // Check for concurrent modifications
      const conflictingTasks = tasks.filter(task => 
        task.type === 'update' && 
        tasks.some(other => 
          other !== task && 
          other.type === 'update' && 
          Math.abs(other.timestamp - task.timestamp) < 60000 // 1 minute
        )
      );

      if (conflictingTasks.length > 0) {
        conflicts.push({
          entityType,
          entityId,
          localTimestamp: Math.max(...conflictingTasks.map(t => t.timestamp)),
          remoteTimestamp: Date.now(), // Would be from server
          conflictType: 'concurrent_edit',
          autoResolvable: this.canAutoResolve(conflictingTasks),
          confidence: this.calculateConfidence(conflictingTasks)
        });
      }
    }

    return conflicts;
  }

  public async getSyncStatus(): Promise<{ stats: SyncStats; progress?: SyncProgress }> {
    await this.updateStats();
    
    const result: any = { stats: this.syncStats };
    
    if (this.syncInProgress) {
      result.progress = this.getCurrentProgress();
    }
    
    return result;
  }

  public async clearCompletedTasks(): Promise<void> {
    // This is handled automatically when tasks are processed successfully
    // But we can clean up any orphaned completed tasks
    const allKeys = await this.getAllSyncTaskKeys();
    
    for (const key of allKeys) {
      if (key.startsWith('batch_')) {
        const batch = await indexedDBManager.getSyncState(key) as SyncBatch;
        if (batch && batch.status === 'completed' && Date.now() - batch.createdAt > 24 * 60 * 60 * 1000) {
          await indexedDBManager.setSyncState(key, null); // Delete old completed batches
        }
      }
    }
  }

  // ==================== EVENT HANDLING ====================

  public on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event]!.push(callback);
  }

  public off(event: string, callback: Function): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event]!.filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data?: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event]!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[BackgroundSync] Event listener error:', error);
        }
      });
    }
  }

  // ==================== PRIVATE METHODS ====================

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
          console.log('[BackgroundSync] Required stores are available');
          return;
        }
        
        console.log(`[BackgroundSync] Waiting for required stores... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        attempts++;
      }
      
      console.warn('[BackgroundSync] Timeout waiting for required stores, continuing anyway');
    } catch (error) {
      console.error('[BackgroundSync] Error waiting for required stores:', error);
    }
  }

  private async storeSyncTask(task: SyncTask): Promise<void> {
    try {
      // Only store if initialized and database is ready
      if (!this.isInitialized) {
        console.log('[BackgroundSync] Skipping task storage - not initialized yet');
        return;
      }
      
      if (indexedDBManager && (indexedDBManager as any).db) {
        await indexedDBManager.setSyncState(`task_${task.id}`, task);
      } else {
        console.warn('[BackgroundSync] Database not ready, skipping task storage');
      }
    } catch (error) {
      console.warn('[BackgroundSync] Failed to store task (non-critical):', error);
    }
  }

  private async removeSyncTask(taskId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        console.log('[BackgroundSync] Skipping task removal - not initialized yet');
        return;
      }
      
      if (indexedDBManager && (indexedDBManager as any).db) {
        await indexedDBManager.setSyncState(`task_${taskId}`, null);
      } else {
        console.warn('[BackgroundSync] Database not ready, skipping task removal');
      }
    } catch (error) {
      console.warn('[BackgroundSync] Failed to remove task (non-critical):', error);
    }
  }

  private async getPendingTasks(): Promise<SyncTask[]> {
    const allKeys = await this.getAllSyncTaskKeys();
    const tasks: SyncTask[] = [];

    for (const key of allKeys) {
      if (key.startsWith('task_')) {
        const task = await indexedDBManager.getSyncState(key) as SyncTask;
        if (task && (!task.scheduledAt || task.scheduledAt <= Date.now())) {
          tasks.push(task);
        }
      }
    }

    return this.sortTasksByPriority(tasks);
  }

  private async getFailedTasks(): Promise<SyncTask[]> {
    const allKeys = await this.getAllSyncTaskKeys();
    const tasks: SyncTask[] = [];

    for (const key of allKeys) {
      if (key.startsWith('task_')) {
        const task = await indexedDBManager.getSyncState(key) as SyncTask;
        if (task && task.lastError && task.retryCount < task.maxRetries) {
          tasks.push(task);
        }
      }
    }

    return tasks;
  }

  private async getRecentTasks(timeWindow: number): Promise<SyncTask[]> {
    const cutoff = Date.now() - timeWindow;
    const allKeys = await this.getAllSyncTaskKeys();
    const tasks: SyncTask[] = [];

    for (const key of allKeys) {
      if (key.startsWith('task_')) {
        const task = await indexedDBManager.getSyncState(key) as SyncTask;
        if (task && task.timestamp >= cutoff) {
          tasks.push(task);
        }
      }
    }

    return tasks;
  }

  private async getAllSyncTaskKeys(): Promise<string[]> {
    // This would need to be implemented in indexedDBManager
    // For now, we'll use a workaround
    try {
      const keys = await indexedDBManager.getSyncState('sync_task_keys') || [];
      return keys;
    } catch {
      return [];
    }
  }

  private sortTasksByPriority(tasks: SyncTask[]): SyncTask[] {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    
    return tasks.sort((a, b) => {
      // First by priority
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      
      // Then by timestamp
      return a.timestamp - b.timestamp;
    });
  }

  private getBatchPriority(tasks: SyncTask[]): 'high' | 'normal' | 'low' {
    if (tasks.some(t => t.priority === 'high')) return 'high';
    if (tasks.some(t => t.priority === 'normal')) return 'normal';
    return 'low';
  }

  private async createBatchFromTasks(tasks: SyncTask[]): Promise<SyncBatch> {
    const batchTasks = tasks.slice(0, SYNC_CONFIG.BATCH_SIZE);
    const batchId = await this.createSyncBatch(batchTasks);
    return await indexedDBManager.getSyncState(`batch_${batchId}`) as SyncBatch;
  }

  private async processSingleTask(task: SyncTask): Promise<boolean> {
    try {
      // Send to service worker for actual sync
      if (this.serviceWorkerReady && 'serviceWorker' in navigator) {
        const messageChannel = new MessageChannel();
        
        return new Promise((resolve) => {
          messageChannel.port1.onmessage = (event) => {
            resolve(event.data.success);
          };
          
          navigator.serviceWorker.controller?.postMessage({
            type: 'PROCESS_SYNC_TASK',
            data: task
          }, [messageChannel.port2]);
          
          // Timeout after 30 seconds
          setTimeout(() => resolve(false), 30000);
        });
      } else {
        // Fallback: direct API call
        return await this.syncTaskDirectly(task);
      }
    } catch (error) {
      console.error('[BackgroundSync] Task processing failed:', error);
      return false;
    }
  }

  private async syncTaskDirectly(task: SyncTask): Promise<boolean> {
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task)
      });
      
      return response.ok;
    } catch (error) {
      console.error('[BackgroundSync] Direct sync failed:', error);
      return false;
    }
  }

  private async handleTaskFailure(task: SyncTask, error?: string): Promise<void> {
    task.lastError = error || 'Unknown error';
    task.retryCount++;
    
    if (task.retryCount < task.maxRetries) {
      // Schedule retry with exponential backoff
      const delayIndex = Math.min(task.retryCount - 1, SYNC_CONFIG.RETRY_DELAYS.length - 1);
      const delay = SYNC_CONFIG.RETRY_DELAYS[delayIndex] || 1000;
      task.scheduledAt = Date.now() + delay;
      await this.storeSyncTask(task);
    } else {
      // Remove task that exceeded max retries
      await this.removeSyncTask(task.id);
      this.emit('task-failed-permanently', task);
    }
  }

  private getCurrentProgress(): SyncProgress {
    if (!this.currentBatch) {
      return { total: 0, completed: 0, failed: 0 };
    }

    // This would be calculated based on current batch processing
    return {
      total: this.currentBatch.tasks.length,
      completed: 0, // Would track actual progress
      failed: 0,
      batch: this.currentBatch
    };
  }

  private estimateTimeRemaining(batch: SyncBatch): number {
    // Estimate based on average sync time and remaining tasks
    const avgTime = this.syncStats.averageSyncTime || 2000; // Default 2 seconds per task
    return batch.tasks.length * avgTime;
  }

  private groupTasksByEntity(tasks: SyncTask[]): Map<string, SyncTask[]> {
    const groups = new Map<string, SyncTask[]>();
    
    for (const task of tasks) {
      const key = `${task.entityType}:${task.entityId}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(task);
    }
    
    return groups;
  }

  private canAutoResolve(tasks: SyncTask[]): boolean {
    // Simple heuristic: can auto-resolve if all tasks are updates to different fields
    // This would need more sophisticated logic in practice
    return tasks.length <= 2;
  }

  private calculateConfidence(tasks: SyncTask[]): number {
    // Calculate confidence score for auto-resolution
    // Lower confidence for more complex conflicts
    const baseConfidence = 0.8;
    const complexityPenalty = Math.min(tasks.length * 0.1, 0.5);
    return Math.max(baseConfidence - complexityPenalty, 0.1);
  }

  private async scheduleSyncTask(task: SyncTask): Promise<void> {
    // For immediate sync tasks, process right away
    if (task.priority === 'high') {
      setTimeout(() => this.processSyncQueue(), 100);
    } else {
      // Schedule for next batch processing
      setTimeout(() => this.triggerSyncIfNeeded(), 1000);
    }
  }

  private async registerBackgroundSync(task: SyncTask): Promise<void> {
    if (this.serviceWorkerReady && 'serviceWorker' in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'QUEUE_OFFLINE_ACTION',
        data: task
      });
    }
  }

  private async triggerSyncIfNeeded(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    const pendingTasks = await this.getPendingTasks();
    if (pendingTasks.length > 0) {
      this.processSyncQueue();
    }
  }

  private async updateStats(): Promise<void> {
    try {
      if (!this.isInitialized) {
        console.log('[BackgroundSync] Skipping stats update - not initialized yet');
        return;
      }
      
      const pendingTasks = await this.getPendingTasks();
      this.syncStats.queueSize = pendingTasks.length;
      await this.persistStats();
    } catch (error) {
      console.warn('[BackgroundSync] Failed to update stats:', error);
    }
  }

  private async persistStats(): Promise<void> {
    // Temporarily disable stats persistence to prevent IndexedDB errors
    console.log('[BackgroundSync] Stats persistence disabled to prevent database errors');
    return;
    
    /* eslint-disable-next-line no-unreachable */
    /*
    try {
      // Only persist if fully initialized
      if (!this.isInitialized) {
        console.log('[BackgroundSync] Skipping stats persistence - not initialized yet');
        return;
      }
      
      // Check if database is initialized before persisting
      if (indexedDBManager && (indexedDBManager as any).db) {
        // Additional defensive check for sync_state store
        const db = (indexedDBManager as any).db;
        if (db && db.objectStoreNames.contains('sync_state')) {
          await indexedDBManager.setSyncState('sync_stats', this.syncStats);
        } else {
          console.warn('[BackgroundSync] sync_state store not available yet, skipping stats persistence');
        }
      } else {
        console.warn('[BackgroundSync] Database not initialized yet, skipping stats persistence');
      }
    } catch (error) {
      console.warn('[BackgroundSync] Failed to persist stats:', error);
      // Don't throw to prevent breaking the service
    }
    */
  }

  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'SYNC_STARTED':
        this.emit('sync-started', data);
        break;
      case 'SYNC_PROGRESS':
        this.emit('sync-progress', data);
        break;
      case 'SYNC_COMPLETED':
        this.emit('sync-completed', data);
        if (this.isInitialized) {
          this.updateStats();
        }
        break;
      case 'SYNC_ERROR':
        this.emit('sync-error', data);
        break;
    }
  }
}

// ==================== EXPORT SINGLETON ====================

export const backgroundSyncManager = BackgroundSyncManager.getInstance();
export default backgroundSyncManager;