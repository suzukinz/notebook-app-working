// IndexedDB-powered Notebook Store
// Replaces localStorage-based useNotebookStore with robust offline persistence

import React from 'react';
import { create } from 'zustand';
import { indexedDBManager, Note, Workspace } from '../utils/indexedDBManager';
import { performAutoMigration } from '../utils/dataMigration';

// ==================== TYPES ====================

interface NotebookState {
  // Data
  notes: Note[];
  workspaces: Workspace[];
  
  // UI State
  selectedWorkspace: string;
  selectedNotebook: string;
  selectedSubFolder: string;
  expandedNotebooks: string[];
  expandedSubFolders: string[];
  searchQuery: string;
  selectedTags: string[];
  showNoteList: boolean;
  viewMode: 'home' | 'notes' | 'dashboard';
  showMindMap: boolean;
  isSyncing: boolean;
  
  // Status
  isInitialized: boolean;
  isLoading: boolean;
  lastError: string | null;
  
  // Actions - Data Operations
  createNote: (noteData: Omit<Note, 'id' | 'version' | 'deleted' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getNote: (id: string) => Promise<Note | null>;
  
  createWorkspace: (workspaceData: Omit<Workspace, 'id' | 'version' | 'deleted' | 'createdAt' | 'updatedAt'>) => Promise<Workspace>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  
  // Actions - UI State
  setSelectedWorkspace: (workspace: string) => Promise<void>;
  setSelectedNotebook: (notebook: string) => Promise<void>;
  setSelectedSubFolder: (subFolder: string) => Promise<void>;
  toggleNotebookExpanded: (notebook: string) => Promise<void>;
  toggleSubFolderExpanded: (subFolder: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setShowNoteList: (show: boolean) => void;
  setViewMode: (mode: 'home' | 'notes' | 'dashboard') => void;
  setShowMindMap: (show: boolean) => void;
  
  // Actions - System
  initialize: () => Promise<void>;
  loadNotes: () => Promise<void>;
  loadWorkspaces: () => Promise<void>;
  loadUIState: () => Promise<void>;
  refreshData: () => Promise<void>;
  setSyncing: (syncing: boolean) => void;
}

// ==================== STORE IMPLEMENTATION ====================

export const useIndexedDBStore = create<NotebookState>((set, get) => ({
  // Initial state
  notes: [],
  workspaces: [],
  selectedWorkspace: 'default',
  selectedNotebook: 'general',
  selectedSubFolder: 'notes',
  expandedNotebooks: ['projects'],
  expandedSubFolders: ['general'],
  searchQuery: '',
  selectedTags: [],
  showNoteList: true,
  viewMode: 'notes', // デフォルトをnotesモードに変更
  showMindMap: false,
  isSyncing: false,
  isInitialized: false,
  isLoading: false,
  lastError: null,

  // ==================== INITIALIZATION ====================
  
  initialize: async () => {
    const state = get();
    if (state.isInitialized) {
      console.log('[Store] Already initialized');
      return;
    }

    set({ isLoading: true, lastError: null });

    try {
      console.log('[Store] Initializing IndexedDB store...');
      
      // Initialize IndexedDB
      await indexedDBManager.initialize();
      
      // Perform auto-migration if needed
      await performAutoMigration();
      
      // Load saved UI state
      await get().loadUIState();
      
      // Load data
      await Promise.all([
        get().loadWorkspaces(),
        get().loadNotes()
      ]);
      
      set({ isInitialized: true, isLoading: false });
      console.log('[Store] Initialization completed');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
      console.error('[Store] Initialization failed:', error);
      set({ lastError: errorMessage, isLoading: false });
    }
  },

  // ==================== DATA LOADING ====================
  
  loadNotes: async () => {
    try {
      const state = get();
      const notes = await indexedDBManager.getNotesByWorkspace(state.selectedWorkspace);
      set({ notes });
    } catch (error) {
      console.error('[Store] Failed to load notes:', error);
      set({ lastError: error instanceof Error ? error.message : 'Failed to load notes' });
    }
  },

  loadWorkspaces: async () => {
    try {
      const workspaces = await indexedDBManager.getAllWorkspaces();
      set({ workspaces });
    } catch (error) {
      console.error('[Store] Failed to load workspaces:', error);
      set({ lastError: error instanceof Error ? error.message : 'Failed to load workspaces' });
    }
  },

  refreshData: async () => {
    await Promise.all([
      get().loadWorkspaces(),
      get().loadNotes()
    ]);
  },

  // ==================== NOTE OPERATIONS ====================
  
  createNote: async (noteData) => {
    try {
      const note = await indexedDBManager.createNote(noteData);
      
      // Update local state
      set(state => ({
        notes: [...state.notes, note]
      }));
      
      return note;
    } catch (error) {
      console.error('[Store] Failed to create note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create note';
      set({ lastError: errorMessage });
      throw error;
    }
  },

  updateNote: async (id, updates) => {
    try {
      const updatedNote = await indexedDBManager.updateNote(id, updates);
      
      // Update local state
      set(state => ({
        notes: state.notes.map(note => note.id === id ? updatedNote : note)
      }));
    } catch (error) {
      console.error('[Store] Failed to update note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update note';
      set({ lastError: errorMessage });
      throw error;
    }
  },

  deleteNote: async (id) => {
    try {
      await indexedDBManager.deleteNote(id);
      
      // Update local state (remove from UI)
      set(state => ({
        notes: state.notes.filter(note => note.id !== id)
      }));
    } catch (error) {
      console.error('[Store] Failed to delete note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete note';
      set({ lastError: errorMessage });
      throw error;
    }
  },

  getNote: async (id) => {
    try {
      return await indexedDBManager.getNote(id);
    } catch (error) {
      console.error('[Store] Failed to get note:', error);
      set({ lastError: error instanceof Error ? error.message : 'Failed to get note' });
      return null;
    }
  },

  // ==================== WORKSPACE OPERATIONS ====================
  
  createWorkspace: async (workspaceData) => {
    try {
      const workspace = await indexedDBManager.createWorkspace(workspaceData);
      
      // Update local state
      set(state => ({
        workspaces: [...state.workspaces, workspace]
      }));
      
      return workspace;
    } catch (error) {
      console.error('[Store] Failed to create workspace:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create workspace';
      set({ lastError: errorMessage });
      throw error;
    }
  },

  updateWorkspace: async (id, updates) => {
    try {
      const updatedWorkspace = await indexedDBManager.updateWorkspace(id, updates);
      
      // Update local state
      set(state => ({
        workspaces: state.workspaces.map(workspace => 
          workspace.id === id ? updatedWorkspace : workspace
        )
      }));
    } catch (error) {
      console.error('[Store] Failed to update workspace:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update workspace';
      set({ lastError: errorMessage });
      throw error;
    }
  },

  deleteWorkspace: async (id) => {
    try {
      await indexedDBManager.deleteWorkspace(id);
      
      // Update local state
      set(state => ({
        workspaces: state.workspaces.filter(workspace => workspace.id !== id)
      }));
    } catch (error) {
      console.error('[Store] Failed to delete workspace:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete workspace';
      set({ lastError: errorMessage });
      throw error;
    }
  },

  // ==================== UI STATE MANAGEMENT ====================
  
  setSelectedWorkspace: async (workspace) => {
    set({ selectedWorkspace: workspace });
    await indexedDBManager.setSetting('selectedWorkspace', workspace);
    
    // レガシーストアと同期
    const legacyStore = (window as any).__legacyNotebookStore;
    if (legacyStore && legacyStore.setSelectedWorkspace) {
      legacyStore.setSelectedWorkspace(workspace);
    }
    
    // Reload notes for new workspace
    await get().loadNotes();
  },

  setSelectedNotebook: async (notebook) => {
    set({ selectedNotebook: notebook });
    await indexedDBManager.setSetting('selectedNotebook', notebook);
    
    // レガシーストアと同期
    const legacyStore = (window as any).__legacyNotebookStore;
    if (legacyStore && legacyStore.setSelectedNotebook) {
      legacyStore.setSelectedNotebook(notebook);
    }
  },

  setSelectedSubFolder: async (subFolder) => {
    set({ selectedSubFolder: subFolder });
    await indexedDBManager.setSetting('selectedSubFolder', subFolder);
    
    // レガシーストアと同期
    const legacyStore = (window as any).__legacyNotebookStore;
    if (legacyStore && legacyStore.setSelectedSubFolder) {
      legacyStore.setSelectedSubFolder(subFolder);
    }
  },

  toggleNotebookExpanded: async (notebook) => {
    set(state => {
      const expanded = state.expandedNotebooks.includes(notebook)
        ? state.expandedNotebooks.filter(n => n !== notebook)
        : [...state.expandedNotebooks, notebook];
      
      // Save to IndexedDB
      indexedDBManager.setSetting('expandedNotebooks', expanded);
      
      return { expandedNotebooks: expanded };
    });
  },

  toggleSubFolderExpanded: async (subFolder) => {
    set(state => {
      const expanded = state.expandedSubFolders.includes(subFolder)
        ? state.expandedSubFolders.filter(s => s !== subFolder)
        : [...state.expandedSubFolders, subFolder];
      
      // Save to IndexedDB
      indexedDBManager.setSetting('expandedSubFolders', expanded);
      
      return { expandedSubFolders: expanded };
    });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    // Don't persist search query as it's temporary
  },

  setSelectedTags: (tags) => {
    set({ selectedTags: tags });
    // Save to IndexedDB
    indexedDBManager.setSetting('selectedTags', tags);
  },

  setShowNoteList: (show) => {
    set({ showNoteList: show });
    indexedDBManager.setSetting('showNoteList', show);
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
    indexedDBManager.setSetting('viewMode', mode);
  },

  setShowMindMap: (show) => {
    set({ showMindMap: show });
    indexedDBManager.setSetting('showMindMap', show);
  },

  setSyncing: (syncing) => {
    set({ isSyncing: syncing });
  },

  // ==================== PRIVATE HELPERS ====================
  
  loadUIState: async () => {
    try {
      const [
        selectedWorkspace,
        selectedNotebook,
        selectedSubFolder,
        expandedNotebooks,
        expandedSubFolders,
        selectedTags,
        showNoteList,
        viewMode,
        showMindMap
      ] = await Promise.all([
        indexedDBManager.getSetting('selectedWorkspace'),
        indexedDBManager.getSetting('selectedNotebook'),
        indexedDBManager.getSetting('selectedSubFolder'),
        indexedDBManager.getSetting('expandedNotebooks'),
        indexedDBManager.getSetting('expandedSubFolders'),
        indexedDBManager.getSetting('selectedTags'),
        indexedDBManager.getSetting('showNoteList'),
        indexedDBManager.getSetting('viewMode'),
        indexedDBManager.getSetting('showMindMap')
      ]);

      set({
        selectedWorkspace: selectedWorkspace || 'work',
        selectedNotebook: selectedNotebook || 'projects',
        selectedSubFolder: selectedSubFolder || 'general',
        expandedNotebooks: expandedNotebooks || ['projects'],
        expandedSubFolders: expandedSubFolders || ['general'],
        selectedTags: selectedTags || [],
        showNoteList: showNoteList !== undefined ? showNoteList : true,
        viewMode: viewMode || 'notes', // デフォルトをnotesに変更
        showMindMap: showMindMap || false
      });
      
      console.log('[Store] UI state loaded from IndexedDB');
    } catch (error) {
      console.error('[Store] Failed to load UI state:', error);
      // Use defaults on error
    }
  }
}));

// ==================== COMPUTED SELECTORS ====================

// Selector hooks for better performance and derived state
export const useFilteredNotes = () => {
  return useIndexedDBStore(state => {
    let notes = state.notes;
    
    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      notes = notes.filter(note => 
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply tag filter
    if (state.selectedTags.length > 0) {
      notes = notes.filter(note =>
        state.selectedTags.some(tag => note.tags.includes(tag))
      );
    }
    
    // Sort by updated date (newest first)
    return notes.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });
};

export const useWorkspaceNotes = (workspaceId: string) => {
  return useIndexedDBStore(state => 
    state.notes.filter(note => note.workspaceId === workspaceId)
  );
};

export const useNotesByNotebook = (notebookId: string) => {
  return useIndexedDBStore(state =>
    state.notes.filter(note => note.notebookId === notebookId)
  );
};

// ==================== INITIALIZATION HOOK ====================

export const useInitializeStore = () => {
  const initialize = useIndexedDBStore(state => state.initialize);
  const isInitialized = useIndexedDBStore(state => state.isInitialized);
  const isLoading = useIndexedDBStore(state => state.isLoading);
  const lastError = useIndexedDBStore(state => state.lastError);
  
  React.useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);
  
  return { isInitialized, isLoading, lastError };
};

export default useIndexedDBStore;