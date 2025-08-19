// JavaScript to run in browser console to clear IndexedDB
// This will clear all existing database data to test fresh initialization

(async function clearIndexedDB() {
  try {
    console.log('🧹 Clearing IndexedDB...');
    
    // Delete the existing database
    const deleteRequest = indexedDB.deleteDatabase('notespace-db');
    
    deleteRequest.onsuccess = () => {
      console.log('✅ IndexedDB cleared successfully');
      console.log('🔄 Please refresh the page to test fresh initialization');
      console.log('📊 Watch the console for initialization messages');
    };
    
    deleteRequest.onerror = (event) => {
      console.error('❌ Failed to clear IndexedDB:', event);
    };
    
    deleteRequest.onblocked = () => {
      console.warn('⚠️ Database deletion blocked - close all tabs and try again');
    };
    
    deleteRequest.onupgradeneeded = () => {
      console.log('🔄 Database upgrade needed during deletion');
    };
    
  } catch (error) {
    console.error('💥 Error clearing IndexedDB:', error);
  }
})();

// Also clear localStorage and sessionStorage for clean start
console.log('🧽 Clearing storage...');
localStorage.clear();
sessionStorage.clear();
console.log('✨ Storage cleared');