// IndexedDB Manager for NoteSpace
// Implements robust offline-first data persistence with sync capabilities

// ==================== TYPE DEFINITIONS ====================

export interface Note {
  id: string;
  workspaceId: string;
  notebookId: string;
  subFolderId: string;
  title: string;
  content: string;
  tags: string[];
  version: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
  // ✅ 永続化拡張: ピン/お気に入り状態を追加
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  icon: string;
  color: string;
  version: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
}

export interface Setting {
  id: string;
  key: string;
  value: any;
  version: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
}

export interface Attachment {
  id: string;
  noteId: string;
  filename: string;
  mimeType: string;
  size: number;
  data: ArrayBuffer;
  version: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncAt?: string;
}

export interface Change {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'note' | 'workspace' | 'setting' | 'attachment';
  entityId: string;
  payload: any;
  clientSeq: number;
  createdAt: string;
  updatedAt: string;
  version: number;
  status: 'queued' | 'sending' | 'acked' | 'error';
  lastError?: string;
}

export interface SyncState {
  key: string;
  value: any;
}

export interface Meta {
  key: string;
  value: any;
}

// ==================== DATABASE SCHEMA VERSIONS ====================

const DATABASE_NAME = 'NoteSpaceDB';
const DATABASE_VERSION = 6;

const SCHEMA_MIGRATIONS = {
  1: (db: IDBDatabase) => {
    // v1: Base schema
    console.log('[IndexedDB] Creating v1 schema...');
    
    // workspaces store
    const workspacesStore = db.createObjectStore('workspaces', { keyPath: 'id' });
    workspacesStore.createIndex('updatedAt', 'updatedAt');
    workspacesStore.createIndex('deleted', 'deleted');
    
    // notes store  
    const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
    notesStore.createIndex('workspaceId', 'workspaceId');
    notesStore.createIndex('notebookId', 'notebookId');
    notesStore.createIndex('subFolderId', 'subFolderId');
    notesStore.createIndex('updatedAt', 'updatedAt');
    notesStore.createIndex('deleted', 'deleted');
    
    // settings store
    const settingsStore = db.createObjectStore('settings', { keyPath: 'id' });
    settingsStore.createIndex('key', 'key', { unique: true });
    
    // changes store (outbox pattern)
    const changesStore = db.createObjectStore('changes', { keyPath: 'id' });
    changesStore.createIndex('status', 'status');
    changesStore.createIndex('createdAt', 'createdAt');
    changesStore.createIndex('entityType', 'entityType');
    
    // sync_state store
    db.createObjectStore('sync_state', { keyPath: 'key' });
    
    // meta store
    db.createObjectStore('meta', { keyPath: 'key' });
  },
  
  2: (db: IDBDatabase, transaction: IDBTransaction) => {
    // v2: Add attachments and tags to notes
    console.log('[IndexedDB] Upgrading to v2...');
    
    try {
      // Ensure meta store exists (for databases created with incomplete v1)
      if (!db.objectStoreNames.contains('meta')) {
        console.log('[IndexedDB] Creating meta store in v2 migration');
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      
      // attachments store
      if (!db.objectStoreNames.contains('attachments')) {
        console.log('[IndexedDB] Creating attachments store');
        const attachmentsStore = db.createObjectStore('attachments', { keyPath: 'id' });
        attachmentsStore.createIndex('noteId', 'noteId');
        attachmentsStore.createIndex('updatedAt', 'updatedAt');
        attachmentsStore.createIndex('deleted', 'deleted');
        console.log('[IndexedDB] Attachments store created successfully');
      }
      
      // Add tags field to existing notes (default to [])
      if (db.objectStoreNames.contains('notes')) {
        const notesStore = transaction.objectStore('notes');
        const notesRequest = notesStore.getAll();
        
        notesRequest.onsuccess = () => {
          const notes = notesRequest.result;
          notes.forEach(note => {
            if (!note.tags) {
              note.tags = [];
              notesStore.put(note);
            }
          });
          console.log(`[IndexedDB] Added tags field to ${notes.length} notes`);
        };
        
        notesRequest.onerror = () => {
          console.warn('[IndexedDB] Failed to update notes with tags field');
        };
      }
    } catch (error) {
      console.error('[IndexedDB] Error in v2 migration:', error);
      throw error;
    }
  },
  
  3: (db: IDBDatabase, transaction: IDBTransaction) => {
    // v3: Add version field to all entities
    console.log('[IndexedDB] Upgrading to v3...');
    
    // Ensure meta store exists (safety check)
    if (!db.objectStoreNames.contains('meta')) {
      console.log('[IndexedDB] Creating meta store in v3 migration');
      db.createObjectStore('meta', { keyPath: 'key' });
    }
    
    // Only include stores that should exist at this point
    const stores = ['notes', 'workspaces', 'settings'];
    
    // Add attachments store if it was created in v2
    if (db.objectStoreNames.contains('attachments')) {
      stores.push('attachments');
    }
    
    stores.forEach(storeName => {
      if (db.objectStoreNames.contains(storeName)) {
        try {
          const store = transaction.objectStore(storeName);
          const request = store.getAll();
          
          request.onsuccess = () => {
            const records = request.result;
            records.forEach(record => {
              if (record.version === undefined) {
                record.version = 1;
                store.put(record);
              }
            });
          };
          
          request.onerror = () => {
            console.warn(`[IndexedDB] Failed to update version for store: ${storeName}`);
          };
        } catch (error) {
          console.warn(`[IndexedDB] Error accessing store ${storeName}:`, error);
        }
      }
    });
  },
  
  4: (db: IDBDatabase, transaction: IDBTransaction) => {
    // v4: Optimize indexes
    console.log('[IndexedDB] Upgrading to v4...');
    
    try {
      // Ensure meta store exists (final safety check)
      if (!db.objectStoreNames.contains('meta')) {
        console.log('[IndexedDB] Creating meta store in v4 migration');
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      // Add composite index for better query performance
      if (db.objectStoreNames.contains('notes')) {
        const notesStore = transaction.objectStore('notes');
        
        if (!notesStore.indexNames.contains('workspaceId_updatedAt')) {
          notesStore.createIndex('workspaceId_updatedAt', ['workspaceId', 'updatedAt']);
        }
        
        if (!notesStore.indexNames.contains('deleted_updatedAt')) {
          notesStore.createIndex('deleted_updatedAt', ['deleted', 'updatedAt']);
        }
      }
    } catch (error) {
      console.warn('[IndexedDB] Failed to create indexes in v4:', error);
    }
  },
  
  5: (db: IDBDatabase, transaction: IDBTransaction) => {
    // v5: Phase 4 compatibility - ensure sync_state store exists and add error handling
    console.log('[IndexedDB] Upgrading to v5 - Phase 4 compatibility...');
    
    try {
      // Ensure sync_state store exists for Phase 4 services
      if (!db.objectStoreNames.contains('sync_state')) {
        console.log('[IndexedDB] Creating sync_state store in v5 migration');
        db.createObjectStore('sync_state', { keyPath: 'key' });
      }
      
      // Ensure meta store exists (final safety check)
      if (!db.objectStoreNames.contains('meta')) {
        console.log('[IndexedDB] Creating meta store in v5 migration');
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      
      // Initialize Phase 4 specific sync state entries
      const syncStateStore = transaction.objectStore('sync_state');
      
      // Initialize sync stats if not exists
      const syncStatsRequest = syncStateStore.get('sync_stats');
      syncStatsRequest.onsuccess = () => {
        if (!syncStatsRequest.result) {
          const defaultSyncStats = {
            key: 'sync_stats',
            value: {
              totalSynced: 0,
              totalFailed: 0,
              averageSyncTime: 0,
              lastSyncTime: 0,
              successRate: 1.0,
              queueSize: 0
            }
          };
          syncStateStore.put(defaultSyncStats);
        }
      };
      
      // Initialize queue processor state if not exists
      const queueStateRequest = syncStateStore.get('queue_processor_state');
      queueStateRequest.onsuccess = () => {
        if (!queueStateRequest.result) {
          const defaultQueueState = {
            key: 'queue_processor_state',
            value: {
              isProcessing: false,
              queueSize: 0,
              lastProcessedAt: 0,
              totalProcessed: 0,
              totalFailed: 0,
              averageProcessingTime: 0,
              successRate: 1.0
            }
          };
          syncStateStore.put(defaultQueueState);
        }
      };
      
      console.log('[IndexedDB] v5 migration completed - Phase 4 sync_state store ready');
    } catch (error) {
      console.error('[IndexedDB] Error in v5 migration:', error);
      throw error;
    }
  },
  
  6: (db: IDBDatabase, _transaction: IDBTransaction) => {
    // v6: Ensure 'changes' store exists (self-healing for older installs)
    console.log('[IndexedDB] Upgrading to v6 - Ensuring changes store exists...');
    try {
      if (!db.objectStoreNames.contains('changes')) {
        const changesStore = db.createObjectStore('changes', { keyPath: 'id' });
        changesStore.createIndex('status', 'status');
        changesStore.createIndex('createdAt', 'createdAt');
        changesStore.createIndex('entityType', 'entityType');
        console.log('[IndexedDB] Created missing changes store in v6');
      }
    } catch (error) {
      console.error('[IndexedDB] Error in v6 migration (changes store):', error);
      // Non-fatal; leave migration flow to continue
    }
  }
};

// ==================== INDEXED DB MANAGER CLASS ====================

class IndexedDBManager {
  private static instance: IndexedDBManager;
  private db: IDBDatabase | null = null;
  private clientSeq = 0;
  private initializingPromise: Promise<void> | null = null;

  private constructor() {
    this.initializeClientSeq();
  }

  public static getInstance(): IndexedDBManager {
    if (!IndexedDBManager.instance) {
      IndexedDBManager.instance = new IndexedDBManager();
    }
    return IndexedDBManager.instance;
  }

  // ==================== DATABASE INITIALIZATION ====================

  public async initialize(): Promise<void> {
    if (this.db) {
      console.log('[IndexedDB] Already initialized');
      return;
    }

    if (this.initializingPromise) {
      return this.initializingPromise;
    }

    console.log('[IndexedDB] Starting database initialization...');
    
    this.initializingPromise = new Promise((resolve, reject) => {
      console.log(`[IndexedDB] Opening database ${DATABASE_NAME} v${DATABASE_VERSION}`);
      
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        this.initializingPromise = null;
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('[IndexedDB] Database upgrade blocked by another open tab or service worker. Waiting for it to close...');
        // Keep promise pending; the open will continue once blockers close.
      };

      request.onsuccess = async () => {
        this.db = request.result;
        console.log('[IndexedDB] Database opened successfully');

        // Proactively release the connection on future upgrades
        this.db.onversionchange = () => {
          console.warn('[IndexedDB] Database version change detected. Closing old connection.');
          try {
            this.db?.close();
          } catch {}
        };
        
        // Initialize instance ID if not exists
        try {
          await this.initializeMeta();
        } catch (error) {
          console.error('[IndexedDB] Failed to initialize meta:', error);
          // Non-critical error, continue
        }
        
        console.log('[IndexedDB] Initialization completed successfully');
        this.initializingPromise = null;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || DATABASE_VERSION;

        console.log(`[IndexedDB] Upgrading from version ${oldVersion} to ${newVersion}`);
        console.log(`[IndexedDB] Current object stores:`, Array.from(db.objectStoreNames));

        try {
          // Run migrations sequentially
          for (let version = oldVersion + 1; version <= newVersion; version++) {
            if (SCHEMA_MIGRATIONS[version as keyof typeof SCHEMA_MIGRATIONS]) {
              console.log(`[IndexedDB] Running migration for version ${version}`);
              try {
                SCHEMA_MIGRATIONS[version as keyof typeof SCHEMA_MIGRATIONS](db, transaction);
                console.log(`[IndexedDB] Migration v${version} completed successfully`);
              } catch (migrationError) {
                console.error(`[IndexedDB] Migration v${version} failed:`, migrationError);
                throw migrationError;
              }
            }
          }
        } catch (error) {
          console.error('[IndexedDB] Migration failed:', error);
          // For development, we might want to reset and try again
          if (process.env.NODE_ENV === 'development') {
            console.log('[IndexedDB] Development mode: attempting to reset database');
          }
          this.initializingPromise = null;
          reject(error);
        }
      };
    });

    return this.initializingPromise;
  }

  private async initializeMeta(): Promise<void> {
    try {
      // Check if meta store exists
      const db = this.ensureDatabase();
      if (!db.objectStoreNames.contains('meta')) {
        console.warn('[IndexedDB] Meta store does not exist yet, skipping initialization');
        return;
      }
      
      // Set schema version
      await this.setMeta('schemaVersion', DATABASE_VERSION);
      
      // Set instance ID if not exists
      const instanceId = await this.getMeta('instanceId');
      if (!instanceId) {
        await this.setMeta('instanceId', this.generateId());
      }
    } catch (error) {
      console.error('[IndexedDB] Error in initializeMeta:', error);
      // Non-critical error, don't throw
    }
  }

  private async initializeClientSeq(): Promise<void> {
    // Initialize client sequence from last saved value
    try {
      const lastSeq = await this.getMeta('lastClientSeq');
      this.clientSeq = lastSeq ? parseInt(lastSeq) + 1 : 1;
    } catch {
      this.clientSeq = 1;
    }
  }

  // ==================== UTILITY METHODS ====================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getNextClientSeq(): number {
    return ++this.clientSeq;
  }

  private async saveClientSeq(): Promise<void> {
    await this.setMeta('lastClientSeq', this.clientSeq.toString());
  }

  private ensureDatabase(): IDBDatabase {
    if (!this.db) {
      console.error('[IndexedDB] Database is not initialized!');
      console.error('[IndexedDB] Current state:', {
        db: this.db,
        isInitialized: !!this.db
      });
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // ==================== GENERIC CRUD OPERATIONS ====================

  private async get<T>(storeName: string, id: string): Promise<T | null> {
    if (!this.db) {
      await this.initialize();
    }
    const db = this.ensureDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async getAll<T>(
    storeName: string, 
    indexName?: string, 
    query?: IDBValidKey | IDBKeyRange,
    direction?: IDBCursorDirection
  ): Promise<T[]> {
    try {
      // Wait for database to be fully initialized if not ready
      if (!this.db) {
        console.log('[IndexedDB] Database not ready, waiting for initialization before getAll:', storeName);
        await this.initialize();
      }
      
      const db = this.ensureDatabase();
      
      // Check if store exists
      if (!db.objectStoreNames.contains(storeName)) {
        console.warn('[IndexedDB] Store does not exist:', storeName);
        return [];
      }
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const source = indexName ? store.index(indexName) : store;
          const request = source.getAll(query);

          request.onsuccess = () => {
            let results = request.result;
            
            // Apply direction sorting if specified
            if (direction === 'prev') {
              results = results.reverse();
            }
            
            resolve(results);
          };
          
          request.onerror = () => reject(request.error);
        } catch (transactionError) {
          console.warn('[IndexedDB] Transaction failed for getAll:', storeName, transactionError);
          resolve([]); // Return empty array to prevent breaking the application
        }
      });
    } catch (error) {
      console.warn('[IndexedDB] Failed to getAll (non-critical):', storeName, error);
      return []; // Return empty array to allow the application to continue
    }
  }

  private async put<T extends { id: string; updatedAt: string; version: number }>(
    storeName: string, 
    data: T
  ): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    const db = this.ensureDatabase();
    
    // デバッグ情報を追加
    console.log('[IndexedDB] Database stores:', Array.from(db.objectStoreNames));
    console.log('[IndexedDB] Trying to access store:', storeName);
    console.log('[IndexedDB] Database version:', db.version);
    
    if (!db.objectStoreNames.contains(storeName)) {
      throw new Error(`Object store '${storeName}' does not exist. Available stores: ${Array.from(db.objectStoreNames).join(', ')}`);
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Update metadata (only increment version if it's an update, not a create)
      data.updatedAt = new Date().toISOString();
      // Don't increment version if it's a new record (version = 1)
      if (data.version !== 1) {
        data.version += 1;
      }
      
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('[IndexedDB] Put operation failed:', {
          storeName,
          data,
          error: request.error
        });
        reject(request.error);
      };
      
      transaction.onerror = () => {
        console.error('[IndexedDB] Transaction failed:', {
          storeName,
          error: transaction.error
        });
        reject(transaction.error);
      };
    });
  }

  private async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    const db = this.ensureDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== CHANGE TRACKING ====================

  private async putChange(change: Change): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
    const db = this.ensureDatabase();
    
    // Check if changes store exists
    if (!db.objectStoreNames.contains('changes')) {
      console.warn('[IndexedDB] changes store does not exist, skipping change recording');
      return;
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['changes'], 'readwrite');
      const store = transaction.objectStore('changes');
      const request = store.put(change);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async recordChange(
    action: Change['action'],
    entityType: Change['entityType'],
    entityId: string,
    payload: any
  ): Promise<void> {
    const now = new Date().toISOString();
    const change: Change = {
      id: this.generateId(),
      action,
      entityType,
      entityId,
      payload,
      clientSeq: this.getNextClientSeq(),
      createdAt: now,
      updatedAt: now,
      version: 1,
      status: 'queued'
    };

    await this.putChange(change);
    await this.saveClientSeq();
  }

  // ==================== NOTES OPERATIONS ====================

  public async createNote(noteData: Omit<Note, 'id' | 'version' | 'deleted' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    try {
      console.log('[IndexedDB] Creating note with data:', noteData);
      
      const now = new Date().toISOString();
      const note: Note = {
        id: this.generateId(),
        version: 1,
        deleted: false,
        createdAt: now,
        updatedAt: now,
        // Default flags for new notes
        isPinned: (noteData as any).isPinned ?? false,
        isFavorite: (noteData as any).isFavorite ?? false,
        ...noteData
      };

      console.log('[IndexedDB] Note object created:', note);
      
      await this.put('notes', note);
      console.log('[IndexedDB] Note saved to database');
      
      await this.recordChange('create', 'note', note.id, note);
      console.log('[IndexedDB] Change recorded');
      
      return note;
    } catch (error) {
      console.error('[IndexedDB] Error creating note:', error);
      console.error('[IndexedDB] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        noteData
      });
      throw error;
    }
  }

  public async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const existing = await this.get<Note>('notes', id);
    if (!existing) {
      throw new Error(`Note ${id} not found`);
    }

    const updated: Note = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      version: existing.version, // Will be incremented by put()
      updatedAt: new Date().toISOString()
    };

    await this.put('notes', updated);
    await this.recordChange('update', 'note', id, updates);
    
    return updated;
  }

  public async deleteNote(id: string, hardDelete = false): Promise<void> {
    if (hardDelete) {
      await this.delete('notes', id);
    } else {
      // Soft delete
      await this.updateNote(id, { deleted: true });
    }
    
    await this.recordChange('delete', 'note', id, { hardDelete });
  }

  public async getNote(id: string): Promise<Note | null> {
    return this.get<Note>('notes', id);
  }

  public async getNotesByWorkspace(workspaceId: string, includeDeleted = false): Promise<Note[]> {
    const allNotes = await this.getAll<Note>('notes', 'workspaceId', workspaceId);
    
    if (includeDeleted) {
      return allNotes;
    }
    
    return allNotes.filter(note => !note.deleted);
  }

  public async getNotesByNotebook(notebookId: string, includeDeleted = false): Promise<Note[]> {
    const allNotes = await this.getAll<Note>('notes', 'notebookId', notebookId);
    
    if (includeDeleted) {
      return allNotes;
    }
    
    return allNotes.filter(note => !note.deleted);
  }

  public async searchNotes(query: string, workspaceId?: string): Promise<Note[]> {
    const notes = workspaceId 
      ? await this.getNotesByWorkspace(workspaceId)
      : await this.getAll<Note>('notes');
    
    const searchTerm = query.toLowerCase();
    
    return notes.filter(note => 
      !note.deleted && (
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.toLowerCase().includes(searchTerm) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    );
  }

  // ==================== WORKSPACES OPERATIONS ====================

  public async createWorkspace(workspaceData: Omit<Workspace, 'id' | 'version' | 'deleted' | 'createdAt' | 'updatedAt'>): Promise<Workspace> {
    const now = new Date().toISOString();
    const workspace: Workspace = {
      id: this.generateId(),
      version: 1,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      ...workspaceData
    };

    await this.put('workspaces', workspace);
    await this.recordChange('create', 'workspace', workspace.id, workspace);
    
    return workspace;
  }

  public async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace> {
    const existing = await this.get<Workspace>('workspaces', id);
    if (!existing) {
      throw new Error(`Workspace ${id} not found`);
    }

    const updated: Workspace = {
      ...existing,
      ...updates,
      id: existing.id,
      version: existing.version,
      updatedAt: new Date().toISOString()
    };

    await this.put('workspaces', updated);
    await this.recordChange('update', 'workspace', id, updates);
    
    return updated;
  }

  public async deleteWorkspace(id: string, hardDelete = false): Promise<void> {
    if (hardDelete) {
      await this.delete('workspaces', id);
    } else {
      await this.updateWorkspace(id, { deleted: true });
    }
    
    await this.recordChange('delete', 'workspace', id, { hardDelete });
  }

  public async getWorkspace(id: string): Promise<Workspace | null> {
    return this.get<Workspace>('workspaces', id);
  }

  public async getAllWorkspaces(includeDeleted = false): Promise<Workspace[]> {
    const workspaces = await this.getAll<Workspace>('workspaces');
    
    if (includeDeleted) {
      return workspaces;
    }
    
    return workspaces.filter(workspace => !workspace.deleted);
  }

  // ==================== SETTINGS OPERATIONS ====================

  public async setSetting(key: string, value: any): Promise<void> {
    try {
      // Wait for database to be fully initialized if not ready
      if (!this.db) {
        console.log('[IndexedDB] Database not ready, waiting for initialization before setSetting:', key);
        await this.initialize();
      }
      
      const db = this.ensureDatabase();
      
      // Check if settings store exists
      if (!db.objectStoreNames.contains('settings')) {
        console.warn('[IndexedDB] settings store does not exist, skipping setting:', key);
        return;
      }
      
      const existing = await this.getAll<Setting>('settings', 'key', key);
      const now = new Date().toISOString();
    
    if (existing.length > 0 && existing[0]) {
      // Update existing
      const setting = existing[0];
      setting.value = value;
      setting.updatedAt = now;
      await this.put('settings', setting);
      await this.recordChange('update', 'setting', setting.id, { key, value });
    } else {
      // Create new
      const setting: Setting = {
        id: this.generateId(),
        key,
        value,
        version: 1,
        deleted: false,
        createdAt: now,
        updatedAt: now
      };
      
      await this.put('settings', setting);
      await this.recordChange('create', 'setting', setting.id, setting);
    }
    } catch (error) {
      console.warn('[IndexedDB] Failed to set setting (non-critical):', key, error);
      // Don't throw - allow the application to continue running
    }
  }

  public async getSetting(key: string): Promise<any> {
    try {
      // Wait for database to be fully initialized if not ready
      if (!this.db) {
        console.log('[IndexedDB] Database not ready, waiting for initialization before getSetting:', key);
        await this.initialize();
      }
      
      const db = this.ensureDatabase();
      
      // Check if settings store exists
      if (!db.objectStoreNames.contains('settings')) {
        console.warn('[IndexedDB] settings store does not exist, returning undefined for:', key);
        return undefined;
      }
      
      const settings = await this.getAll<Setting>('settings', 'key', key);
      return settings.length > 0 && settings[0] && !settings[0].deleted ? settings[0].value : undefined;
    } catch (error) {
      console.warn('[IndexedDB] Failed to get setting (non-critical):', key, error);
      return undefined; // Return undefined to allow the application to continue
    }
  }

  public async deleteSetting(key: string): Promise<void> {
    const settings = await this.getAll<Setting>('settings', 'key', key);
    if (settings.length > 0 && settings[0]) {
      const setting = settings[0];
      setting.deleted = true;
      setting.updatedAt = new Date().toISOString();
      await this.put('settings', setting);
      await this.recordChange('delete', 'setting', setting.id, { key });
    }
  }

  // ==================== SYNC STATE MANAGEMENT ====================

  public async getSyncState(key: string): Promise<any> {
    try {
      // Wait for database to be fully initialized if not ready
      if (!this.db) {
        console.log('[IndexedDB] Database not ready, waiting for initialization before getting sync state:', key);
        await this.initialize();
      }
      
      const db = this.ensureDatabase();
      
      // Check if sync_state store exists
      if (!db.objectStoreNames.contains('sync_state')) {
        console.warn('[IndexedDB] sync_state store does not exist, cannot get:', key);
        return undefined;
      }
      
      const result = await this.get<SyncState>('sync_state', key);
      return result?.value;
    } catch (error) {
      console.error('[IndexedDB] Error getting sync state:', key, error);
      return undefined;
    }
  }

  public async setSyncState(key: string, value: any): Promise<void> {
    try {
      // Wait for database to be fully initialized if not ready
      if (!this.db) {
        console.log('[IndexedDB] Database not ready, waiting for initialization before setting sync state:', key);
        await this.initialize();
      }
      
      const db = this.ensureDatabase();
      
      // Check if sync_state store exists
      if (!db.objectStoreNames.contains('sync_state')) {
        console.warn('[IndexedDB] sync_state store does not exist, cannot set:', key);
        return;
      }
      
      const syncState: SyncState = { key, value };
      
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(['sync_state'], 'readwrite');
          const store = transaction.objectStore('sync_state');
        
          // Handle null values as deletion
          if (value === null || value === undefined) {
            const deleteRequest = store.delete(key);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
          } else {
            const request = store.put(syncState);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          }
        } catch (transactionError) {
          console.warn('[IndexedDB] Transaction failed for sync_state store:', key, transactionError);
          resolve(); // Resolve to prevent breaking the application
        }
      });
    } catch (error) {
      console.warn('[IndexedDB] Failed to set sync state (non-critical):', key, error);
      // Don't throw - allow the application to continue running
      return;
    }
  }

  // ==================== META MANAGEMENT ====================

  public async getMeta(key: string): Promise<any> {
    try {
      // Wait for database to be fully initialized if not ready
      if (!this.db) {
        console.log('[IndexedDB] Database not ready, waiting for initialization before getting meta:', key);
        await this.initialize();
      }
      
      const db = this.ensureDatabase();
      
      // Check if meta store exists
      if (!db.objectStoreNames.contains('meta')) {
        console.warn('[IndexedDB] Meta store does not exist, cannot get meta:', key);
        return undefined;
      }
      
      const result = await this.get<Meta>('meta', key);
      return result?.value;
    } catch (error) {
      console.error('[IndexedDB] Error getting meta:', key, error);
      return undefined;
    }
  }

  public async setMeta(key: string, value: any): Promise<void> {
    try {
      // Wait for database to be fully initialized if not ready
      if (!this.db) {
        console.log('[IndexedDB] Database not ready, waiting for initialization before setting meta:', key);
        await this.initialize();
      }
      
      const meta: Meta = { key, value };
      
      return new Promise((resolve, reject) => {
        const db = this.ensureDatabase();
        
        // Check if meta store exists
        if (!db.objectStoreNames.contains('meta')) {
          console.warn('[IndexedDB] Meta store does not exist, cannot set meta:', key);
          resolve();
          return;
        }
        
        const transaction = db.transaction(['meta'], 'readwrite');
        const store = transaction.objectStore('meta');
        const request = store.put(meta);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[IndexedDB] Error setting meta:', key, error);
      throw error;
    }
  }

  // ==================== CHANGE QUEUE MANAGEMENT ====================

  public async getQueuedChanges(): Promise<Change[]> {
    try {
      // Wait for database to be fully initialized if not ready
      if (!this.db) {
        console.log('[IndexedDB] Database not ready, waiting for initialization before getting queued changes');
        await this.initialize();
      }
      const db = this.ensureDatabase();
      if (!db.objectStoreNames.contains('changes')) {
        console.warn('[IndexedDB] changes store does not exist');
        return [];
      }
      return this.getAll<Change>('changes', 'status', 'queued');
    } catch (error) {
      console.warn('[IndexedDB] Failed to get queued changes:', error);
      return [];
    }
  }

  public async markChangeAsSending(changeId: string): Promise<void> {
    const change = await this.get<Change>('changes', changeId);
    if (change) {
      change.status = 'sending';
      delete change.lastError;
      change.updatedAt = new Date().toISOString();
      await this.putChange(change);
    }
  }

  public async markChangeAsAcked(changeId: string): Promise<void> {
    // Remove acknowledged changes
    await this.delete('changes', changeId);
  }

  public async markChangeAsError(changeId: string, error: string): Promise<void> {
    const change = await this.get<Change>('changes', changeId);
    if (change) {
      change.status = 'error';
      change.lastError = error;
      change.updatedAt = new Date().toISOString();
      await this.putChange(change);
    }
  }

  public async clearAckedChanges(): Promise<void> {
    // This method is for cleanup if needed
    const ackedChanges = await this.getAll<Change>('changes', 'status', 'acked');
    
    for (const change of ackedChanges) {
      await this.delete('changes', change.id);
    }
  }

  // ==================== MAINTENANCE & DIAGNOSTICS ====================

  public async getStats(): Promise<any> {
    const [notes, workspaces, settings, changes] = await Promise.all([
      this.getAll<Note>('notes'),
      this.getAll<Workspace>('workspaces'),  
      this.getAll<Setting>('settings'),
      this.getAll<Change>('changes')
    ]);

    return {
      notes: {
        total: notes.length,
        active: notes.filter(n => !n.deleted).length,
        deleted: notes.filter(n => n.deleted).length
      },
      workspaces: {
        total: workspaces.length,
        active: workspaces.filter(w => !w.deleted).length,
        deleted: workspaces.filter(w => w.deleted).length
      },
      settings: {
        total: settings.length,
        active: settings.filter(s => !s.deleted).length
      },
      changes: {
        total: changes.length,
        queued: changes.filter(c => c.status === 'queued').length,
        sending: changes.filter(c => c.status === 'sending').length,
        error: changes.filter(c => c.status === 'error').length
      }
    };
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[IndexedDB] Database connection closed');
    }
  }

  // ==================== SYNC METADATA TRACKING ====================

  public async updateSyncMetadata(entityType: string, entityId: string, syncData: any): Promise<void> {
    try {
      const metadata = {
        entityType,
        entityId,
        lastSyncAt: new Date().toISOString(),
        syncVersion: syncData.version || 1,
        serverTimestamp: syncData.serverTimestamp,
        syncStatus: 'completed',
        ...syncData
      };

      await this.setSyncState(`sync_meta_${entityType}_${entityId}`, metadata);
    } catch (error) {
      console.error('[IndexedDB] Failed to update sync metadata:', error);
    }
  }

  public async getSyncMetadata(entityType: string, entityId: string): Promise<any> {
    try {
      return await this.getSyncState(`sync_meta_${entityType}_${entityId}`);
    } catch (error) {
      console.error('[IndexedDB] Failed to get sync metadata:', error);
      return null;
    }
  }

  public async getUnsyncedEntities(entityType: string): Promise<any[]> {
    try {
      const entities = await this.getAll(entityType as any);
      const unsynced = [];

      for (const entity of entities) {
        const typedEntity = entity as any;
        const metadata = await this.getSyncMetadata(entityType, typedEntity.id);
        if (!metadata || !typedEntity.lastSyncAt || typedEntity.updatedAt > (metadata.lastSyncAt || '')) {
          unsynced.push(entity);
        }
      }

      return unsynced;
    } catch (error) {
      console.error('[IndexedDB] Failed to get unsynced entities:', error);
      return [];
    }
  }

  public async markEntitySynced(entityType: string, entityId: string, serverData?: any): Promise<void> {
    try {
      // Update the entity's lastSyncAt timestamp
      const entity = await this.get(entityType as any, entityId) as any;
      if (entity) {
        entity.lastSyncAt = new Date().toISOString();
        if (serverData) {
          // Update with server data if provided
          Object.assign(entity, serverData);
        }
        await this.put(entityType as any, entity);
      }

      // Update sync metadata
      await this.updateSyncMetadata(entityType, entityId, {
        syncStatus: 'completed',
        serverVersion: serverData?.version,
        serverTimestamp: serverData?.updatedAt
      });
    } catch (error) {
      console.error('[IndexedDB] Failed to mark entity as synced:', error);
    }
  }

  public async getSyncStatusSummary(): Promise<any> {
    try {
      const summary = {
        notes: { total: 0, synced: 0, unsynced: 0 },
        workspaces: { total: 0, synced: 0, unsynced: 0 },
        settings: { total: 0, synced: 0, unsynced: 0 },
        lastSyncTime: null as string | null
      };

      // Count notes
      const notes = await this.getAll<Note>('notes');
      summary.notes.total = notes.filter(n => !n.deleted).length;
      summary.notes.synced = notes.filter(n => !n.deleted && n.lastSyncAt).length;
      summary.notes.unsynced = summary.notes.total - summary.notes.synced;

      // Count workspaces
      const workspaces = await this.getAll<Workspace>('workspaces');
      summary.workspaces.total = workspaces.filter(w => !w.deleted).length;
      summary.workspaces.synced = workspaces.filter(w => !w.deleted && w.lastSyncAt).length;
      summary.workspaces.unsynced = summary.workspaces.total - summary.workspaces.synced;

      // Count settings
      const settings = await this.getAll<Setting>('settings');
      summary.settings.total = settings.filter(s => !s.deleted).length;
      summary.settings.synced = settings.filter(s => !s.deleted && s.lastSyncAt).length;
      summary.settings.unsynced = summary.settings.total - summary.settings.synced;

      // Get last sync time
      summary.lastSyncTime = await this.getSyncState('lastFullSyncTime');

      return summary;
    } catch (error) {
      console.error('[IndexedDB] Failed to get sync status summary:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  public async setLastSyncTime(timestamp: string): Promise<void> {
    await this.setSyncState('lastFullSyncTime', timestamp);
  }

  // ==================== OFFLINE QUEUE UTILITIES ====================

  public async getAllSyncStateKeys(): Promise<string[]> {
    try {
      // Wait for database to be fully initialized if not ready
      if (!this.db) {
        console.log('[IndexedDB] Database not ready, waiting for initialization before getting sync state keys');
        await this.initialize();
      }
      
      const db = this.ensureDatabase();
      
      // Check if sync_state store exists
      if (!db.objectStoreNames.contains('sync_state')) {
        console.warn('[IndexedDB] sync_state store does not exist, returning empty keys array');
        return [];
      }
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sync_state'], 'readonly');
        const store = transaction.objectStore('sync_state');
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve(request.result.map(key => key.toString()));
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[IndexedDB] Failed to get all sync state keys:', error);
      return [];
    }
  }

  public async getSyncStateByPrefix(prefix: string): Promise<{ [key: string]: any }> {
    try {
      const allKeys = await this.getAllSyncStateKeys();
      const matchingKeys = allKeys.filter(key => key.startsWith(prefix));
      const result: { [key: string]: any } = {};

      for (const key of matchingKeys) {
        const value = await this.getSyncState(key);
        if (value !== undefined) {
          result[key] = value;
        }
      }

      return result;
    } catch (error) {
      console.error('[IndexedDB] Failed to get sync state by prefix:', error);
      return {};
    }
  }

  public async clearSyncStateByPrefix(prefix: string): Promise<void> {
    try {
      const allKeys = await this.getAllSyncStateKeys();
      const matchingKeys = allKeys.filter(key => key.startsWith(prefix));

      for (const key of matchingKeys) {
        await this.setSyncState(key, null); // This deletes the key
      }

      console.log(`[IndexedDB] Cleared ${matchingKeys.length} sync state entries with prefix: ${prefix}`);
    } catch (error) {
      console.error('[IndexedDB] Failed to clear sync state by prefix:', error);
    }
  }

  // ==================== ENHANCED STATISTICS ====================

  public async getDetailedStats(): Promise<any> {
    try {
      const basicStats = await this.getStats();
      const syncSummary = await this.getSyncStatusSummary();
      const allKeys = await this.getAllSyncStateKeys();
      
      // Count different types of sync state entries
      const syncStateTypes = {
        syncMeta: allKeys.filter(k => k.startsWith('sync_meta_')).length,
        queueOps: allKeys.filter(k => k.startsWith('queue_op_')).length,
        batches: allKeys.filter(k => k.startsWith('batch_')).length,
        other: allKeys.filter(k => !k.startsWith('sync_meta_') && !k.startsWith('queue_op_') && !k.startsWith('batch_')).length
      };

      return {
        ...basicStats,
        syncSummary,
        syncStateTypes,
        totalSyncStateEntries: allKeys.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[IndexedDB] Failed to get detailed stats:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ==================== DEVELOPMENT & DEBUG ====================

  public async resetDatabase(): Promise<void> {
    console.log('[IndexedDB] Resetting database...');
    
    // Close current connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DATABASE_NAME);
      
      deleteRequest.onsuccess = () => {
        console.log('[IndexedDB] Database reset successfully');
        this.clientSeq = 0;
        resolve();
      };
      
      deleteRequest.onerror = () => {
        console.error('[IndexedDB] Failed to reset database:', deleteRequest.error);
        reject(deleteRequest.error);
      };
      
      deleteRequest.onblocked = () => {
        console.warn('[IndexedDB] Database reset blocked - close all tabs');
      };
    });
  }

  public async getDebugInfo(): Promise<any> {
    const stats = await this.getDetailedStats().catch(() => ({ error: 'Failed to get detailed stats' }));
    
    return {
      databaseName: DATABASE_NAME,
      version: DATABASE_VERSION,
      stats,
      objectStores: this.db ? Array.from(this.db.objectStoreNames) : [],
      isInitialized: !!this.db,
      clientSeq: this.clientSeq
    };
  }
}

// ==================== EXPORT SINGLETON ====================

export const indexedDBManager = IndexedDBManager.getInstance();
export default indexedDBManager;