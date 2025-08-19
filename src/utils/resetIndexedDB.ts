// IndexedDB Reset Utility
// Development tool to reset and reinitialize the database

export async function resetIndexedDB(): Promise<void> {
  const DATABASE_NAME = 'NoteSpaceDB';
  
  console.log('[IndexedDB Reset] Starting database reset...');
  
  try {
    // Close all connections
    if ('databases' in indexedDB) {
      const databases = await (indexedDB as any).databases();
      console.log('[IndexedDB Reset] Found databases:', databases);
    }
    
    // Delete the database
    const deleteReq = indexedDB.deleteDatabase(DATABASE_NAME);
    
    await new Promise((resolve, reject) => {
      deleteReq.onsuccess = () => {
        console.log('[IndexedDB Reset] Database deleted successfully');
        resolve(undefined);
      };
      
      deleteReq.onerror = () => {
        console.error('[IndexedDB Reset] Failed to delete database:', deleteReq.error);
        reject(deleteReq.error);
      };
      
      deleteReq.onblocked = () => {
        console.warn('[IndexedDB Reset] Database deletion blocked - close all tabs');
      };
    });
    
    // Clear localStorage migration flags
    localStorage.removeItem('indexeddb_migration_completed');
    localStorage.removeItem('indexeddb_migration_attempted');
    
    console.log('[IndexedDB Reset] Reset complete. Please refresh the page.');
  } catch (error) {
    console.error('[IndexedDB Reset] Error during reset:', error);
    throw error;
  }
}

// Auto-execute in development if there's an error
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).resetIndexedDB = resetIndexedDB;
  
  // Check for reset flag in URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('resetdb') === 'true') {
    resetIndexedDB().then(() => {
      // Remove the flag from URL
      urlParams.delete('resetdb');
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
    });
  }
}