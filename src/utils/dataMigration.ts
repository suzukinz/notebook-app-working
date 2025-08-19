// Data Migration Utility
// Migrates data from localStorage to IndexedDB

import { indexedDBManager } from './indexedDBManager';

interface LocalStorageNotebookState {
  selectedWorkspace: string;
  selectedNotebook: string;
  selectedSubFolder: string;
  notes: { [key: string]: any };
  notebooks: { [key: string]: any };
  workspaces: { [key: string]: any };
  settings: { [key: string]: any };
  expandedNotebooks: string[];
  expandedSubFolders: string[];
  searchQuery: string;
  selectedTags: string[];
}

class DataMigration {
  private static instance: DataMigration;

  private constructor() {}

  public static getInstance(): DataMigration {
    if (!DataMigration.instance) {
      DataMigration.instance = new DataMigration();
    }
    return DataMigration.instance;
  }

  // ==================== MIGRATION STATUS ====================

  public async isMigrationNeeded(): Promise<boolean> {
    // Check if there's data in localStorage but not in IndexedDB
    const hasLocalStorageData = this.hasLocalStorageData();
    
    if (!hasLocalStorageData) {
      return false;
    }

    // Check if IndexedDB already has data
    const stats = await indexedDBManager.getStats();
    const hasIndexedDBData = stats.notes.total > 0 || stats.workspaces.total > 0;
    
    // Migration needed if localStorage has data but IndexedDB doesn't
    return hasLocalStorageData && !hasIndexedDBData;
  }

  private hasLocalStorageData(): boolean {
    try {
      const storeData = localStorage.getItem('notebook-store');
      if (!storeData) return false;

      const parsed = JSON.parse(storeData);
      return !!(parsed?.state?.notes && Object.keys(parsed.state.notes).length > 0);
    } catch {
      return false;
    }
  }

  // ==================== MAIN MIGRATION PROCESS ====================

  public async migrateFromLocalStorage(): Promise<{
    success: boolean;
    migratedNotes: number;
    migratedWorkspaces: number;
    migratedSettings: number;
    errors: string[];
  }> {
    console.log('[Migration] Starting data migration from localStorage to IndexedDB...');
    
    const result = {
      success: false,
      migratedNotes: 0,
      migratedWorkspaces: 0,
      migratedSettings: 0,
      errors: [] as string[]
    };

    try {
      // Initialize IndexedDB first
      await indexedDBManager.initialize();

      // Get localStorage data
      const localData = this.getLocalStorageData();
      if (!localData) {
        result.errors.push('No localStorage data found');
        return result;
      }

      console.log('[Migration] Found localStorage data, starting migration...');

      // Migrate workspaces first (notes depend on workspaces)
      result.migratedWorkspaces = await this.migrateWorkspaces(localData);
      
      // Migrate notes
      result.migratedNotes = await this.migrateNotes(localData);
      
      // Migrate settings
      result.migratedSettings = await this.migrateSettings(localData);

      // Set migration completion flag
      await indexedDBManager.setMeta('migrationCompleted', true);
      await indexedDBManager.setMeta('migrationDate', new Date().toISOString());

      result.success = true;
      console.log(`[Migration] Completed successfully: ${result.migratedNotes} notes, ${result.migratedWorkspaces} workspaces, ${result.migratedSettings} settings`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Migration failed: ${errorMessage}`);
      console.error('[Migration] Failed:', error);
    }

    return result;
  }

  private getLocalStorageData(): LocalStorageNotebookState | null {
    try {
      const storeData = localStorage.getItem('notebook-store');
      if (!storeData) return null;

      const parsed = JSON.parse(storeData);
      return parsed?.state || null;
    } catch (error) {
      console.error('[Migration] Failed to parse localStorage data:', error);
      return null;
    }
  }

  // ==================== WORKSPACE MIGRATION ====================

  private async migrateWorkspaces(localData: LocalStorageNotebookState): Promise<number> {
    let migratedCount = 0;

    // Create default workspaces if they don't exist in localStorage
    const defaultWorkspaces = [
      { id: 'work', name: 'Work', icon: '💼', color: '#3b82f6' },
      { id: 'personal', name: 'Personal', icon: '🏠', color: '#10b981' },
      { id: 'learning', name: 'Learning', icon: '📚', color: '#f59e0b' }
    ];

    for (const workspace of defaultWorkspaces) {
      try {
        await indexedDBManager.createWorkspace({
          name: workspace.name,
          icon: workspace.icon,
          color: workspace.color
        });
        migratedCount++;
        console.log(`[Migration] Migrated workspace: ${workspace.name}`);
      } catch (error) {
        console.error(`[Migration] Failed to migrate workspace ${workspace.name}:`, error);
      }
    }

    // Migrate any custom workspaces from localStorage if they exist
    if (localData.workspaces) {
      for (const [id, workspaceData] of Object.entries(localData.workspaces)) {
        try {
          const workspace = workspaceData as any;
          await indexedDBManager.createWorkspace({
            name: workspace.name || id,
            icon: workspace.icon || '📁',
            color: workspace.color || '#6b7280'
          });
          migratedCount++;
          console.log(`[Migration] Migrated custom workspace: ${workspace.name || id}`);
        } catch (error) {
          console.error(`[Migration] Failed to migrate custom workspace ${id}:`, error);
        }
      }
    }

    return migratedCount;
  }

  // ==================== NOTES MIGRATION ====================

  private async migrateNotes(localData: LocalStorageNotebookState): Promise<number> {
    let migratedCount = 0;

    if (!localData.notes) {
      console.log('[Migration] No notes found in localStorage');
      return migratedCount;
    }

    for (const [noteId, noteData] of Object.entries(localData.notes)) {
      try {
        const note = noteData as any;
        
        // Map localStorage note structure to IndexedDB structure
        const migratedNote = {
          workspaceId: note.workspaceId || localData.selectedWorkspace || 'work',
          notebookId: note.notebookId || localData.selectedNotebook || 'projects',
          subFolderId: note.subFolderId || localData.selectedSubFolder || 'general',
          title: note.title || 'Untitled Note',
          content: note.content || '',
          tags: Array.isArray(note.tags) ? note.tags : []
        };

        await indexedDBManager.createNote(migratedNote);
        migratedCount++;
        
        console.log(`[Migration] Migrated note: ${migratedNote.title}`);
      } catch (error) {
        console.error(`[Migration] Failed to migrate note ${noteId}:`, error);
      }
    }

    return migratedCount;
  }

  // ==================== SETTINGS MIGRATION ====================

  private async migrateSettings(localData: LocalStorageNotebookState): Promise<number> {
    let migratedCount = 0;

    // Migrate UI state settings
    const settingsToMigrate = [
      { key: 'selectedWorkspace', value: localData.selectedWorkspace || 'work' },
      { key: 'selectedNotebook', value: localData.selectedNotebook || 'projects' },
      { key: 'selectedSubFolder', value: localData.selectedSubFolder || 'general' },
      { key: 'expandedNotebooks', value: localData.expandedNotebooks || [] },
      { key: 'expandedSubFolders', value: localData.expandedSubFolders || [] },
      { key: 'searchQuery', value: localData.searchQuery || '' },
      { key: 'selectedTags', value: localData.selectedTags || [] }
    ];

    // Add any custom settings from localStorage
    if (localData.settings) {
      for (const [key, value] of Object.entries(localData.settings)) {
        settingsToMigrate.push({ key: `custom_${key}`, value });
      }
    }

    for (const setting of settingsToMigrate) {
      try {
        await indexedDBManager.setSetting(setting.key, setting.value);
        migratedCount++;
        console.log(`[Migration] Migrated setting: ${setting.key}`);
      } catch (error) {
        console.error(`[Migration] Failed to migrate setting ${setting.key}:`, error);
      }
    }

    return migratedCount;
  }

  // ==================== BACKUP & CLEANUP ====================

  public async backupLocalStorageData(): Promise<boolean> {
    try {
      const storeData = localStorage.getItem('notebook-store');
      if (!storeData) return true; // Nothing to backup

      // Save backup in IndexedDB meta store
      await indexedDBManager.setMeta('localStorageBackup', {
        data: storeData,
        timestamp: new Date().toISOString()
      });

      console.log('[Migration] localStorage data backed up to IndexedDB');
      return true;
    } catch (error) {
      console.error('[Migration] Failed to backup localStorage data:', error);
      return false;
    }
  }

  public async cleanupLocalStorageData(): Promise<boolean> {
    try {
      // Only cleanup if migration was successful
      const migrationCompleted = await indexedDBManager.getMeta('migrationCompleted');
      if (!migrationCompleted) {
        console.log('[Migration] Skipping cleanup - migration not completed');
        return false;
      }

      // Backup first
      await this.backupLocalStorageData();

      // Remove the main notebook store
      localStorage.removeItem('notebook-store');
      
      console.log('[Migration] localStorage data cleaned up');
      return true;
    } catch (error) {
      console.error('[Migration] Failed to cleanup localStorage data:', error);
      return false;
    }
  }

  // ==================== RECOVERY ====================

  public async recoverFromBackup(): Promise<boolean> {
    try {
      const backup = await indexedDBManager.getMeta('localStorageBackup');
      if (!backup) {
        console.log('[Migration] No backup found');
        return false;
      }

      localStorage.setItem('notebook-store', backup.data);
      console.log('[Migration] localStorage data recovered from backup');
      return true;
    } catch (error) {
      console.error('[Migration] Failed to recover from backup:', error);
      return false;
    }
  }

  // ==================== VALIDATION ====================

  public async validateMigration(): Promise<{
    success: boolean;
    issues: string[];
    stats: any;
  }> {
    const result = {
      success: true,
      issues: [] as string[],
      stats: {} as any
    };

    try {
      // Get migration stats
      result.stats = await indexedDBManager.getStats();

      // Validate basic data integrity
      const stats = result.stats as any;
      if (stats?.workspaces?.active === 0) {
        result.issues.push('No active workspaces found');
        result.success = false;
      }

      // Check if there are any changes in the queue (should be none after migration)
      if (stats?.changes?.total > 0) {
        result.issues.push(`${stats.changes.total} pending changes found`);
      }

      console.log('[Migration] Validation completed:', result);
    } catch (error) {
      result.success = false;
      result.issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}

// ==================== AUTO-MIGRATION HELPER ====================

export async function performAutoMigration(): Promise<boolean> {
  const migration = DataMigration.getInstance();
  
  try {
    console.log('[Migration] Checking if migration is needed...');
    
    const isNeeded = await migration.isMigrationNeeded();
    if (!isNeeded) {
      console.log('[Migration] No migration needed');
      return true;
    }

    console.log('[Migration] Starting auto-migration...');
    const result = await migration.migrateFromLocalStorage();
    
    if (result.success) {
      console.log('[Migration] Auto-migration completed successfully');
      
      // Validate the migration
      const validation = await migration.validateMigration();
      if (!validation.success) {
        console.warn('[Migration] Validation issues found:', validation.issues);
      }
      
      return true;
    } else {
      console.error('[Migration] Auto-migration failed:', result.errors);
      return false;
    }
  } catch (error) {
    console.error('[Migration] Auto-migration error:', error);
    return false;
  }
}

export const dataMigration = DataMigration.getInstance();
export default dataMigration;