import { renderHook, act } from '@testing-library/react';
import { useNotebookStore } from '../useNotebookStore';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock other dependencies
jest.mock('../../utils/dataManager', () => ({
  exportData: jest.fn(),
  importData: jest.fn(),
  downloadData: jest.fn(),
  uploadFile: jest.fn(),
}));

jest.mock('../../utils/offlineManager', () => ({
  offlineManager: {
    queueAction: jest.fn(),
  },
}));

jest.mock('../../utils/debounce', () => ({
  debounce: jest.fn((fn) => {
    const debouncedFn = (...args: any[]) => fn(...args);
    debouncedFn.flush = jest.fn();
    debouncedFn.cancel = jest.fn();
    return debouncedFn;
  }),
}));

jest.mock('../../utils/autoSyncManager', () => ({
  autoSyncManager: {
    isRunning: jest.fn(() => false),
    broadcastStateChange: jest.fn(),
    broadcastNoteUpdate: jest.fn(),
    broadcastFolderCreate: jest.fn(),
    broadcastWorkspaceAdd: jest.fn(),
  },
}));

jest.mock('../../utils/searchIndex', () => ({
  searchIndex: {
    rebuild: jest.fn(),
  },
  saveSearchIndex: jest.fn(),
  loadSearchIndex: jest.fn(),
}));

jest.mock('../../utils/supabaseSync', () => ({
  supabase: null,
}));

describe('useNotebookStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useNotebookStore());

    expect(result.current.selectedWorkspace).toBe('');
    expect(result.current.selectedNotebook).toBe('');
    expect(result.current.selectedSubFolder).toBe('');
    expect(result.current.selectedNote).toBeNull();
    expect(result.current.workspaces).toEqual([]);
    expect(result.current.notebooks).toEqual({});
    expect(result.current.notesData).toEqual({});
  });

  it('should set selected workspace', () => {
    const { result } = renderHook(() => useNotebookStore());

    act(() => {
      result.current.setSelectedWorkspace('test-workspace');
    });

    expect(result.current.selectedWorkspace).toBe('test-workspace');
  });

  it('should set selected notebook', () => {
    const { result } = renderHook(() => useNotebookStore());

    act(() => {
      result.current.setSelectedNotebook('test-notebook');
    });

    expect(result.current.selectedNotebook).toBe('test-notebook');
  });

  it('should set selected subfolder', () => {
    const { result } = renderHook(() => useNotebookStore());

    act(() => {
      result.current.setSelectedSubFolder('test-subfolder');
    });

    expect(result.current.selectedSubFolder).toBe('test-subfolder');
  });

  it('should add workspace', () => {
    const { result } = renderHook(() => useNotebookStore());

    const newWorkspace = {
      name: 'Test Workspace',
      icon: '📁',
      color: 'blue',
    };

    act(() => {
      result.current.addWorkspace(newWorkspace);
    });

    expect(result.current.workspaces).toHaveLength(1);
    expect(result.current.workspaces[0]).toMatchObject(newWorkspace);
    expect(result.current.selectedWorkspace).toBe(result.current.workspaces[0].id);
  });

  it('should add notebook', () => {
    const { result } = renderHook(() => useNotebookStore());

    // First add a workspace
    act(() => {
      result.current.addWorkspace({
        name: 'Test Workspace',
        icon: '📁',
        color: 'blue',
      });
    });

    const workspaceId = result.current.workspaces[0].id;

    const newNotebook = {
      name: 'Test Notebook',
      color: 'red',
      description: 'Test description',
    };

    act(() => {
      result.current.addNotebook(newNotebook);
    });

    expect(result.current.notebooks[workspaceId]).toHaveLength(1);
    expect(result.current.notebooks[workspaceId][0]).toMatchObject({
      ...newNotebook,
      workspaceId,
      count: 0,
    });
  });

  it('should add subfolder', () => {
    const { result } = renderHook(() => useNotebookStore());

    // Setup workspace and notebook
    act(() => {
      result.current.addWorkspace({
        name: 'Test Workspace',
        icon: '📁',
        color: 'blue',
      });
    });

    act(() => {
      result.current.addNotebook({
        name: 'Test Notebook',
        color: 'red',
      });
    });

    const workspaceId = result.current.workspaces[0].id;
    const notebookId = result.current.notebooks[workspaceId][0].id;

    const newSubFolder = {
      name: 'Test SubFolder',
      color: 'green',
      count: 0,
    };

    act(() => {
      result.current.addSubFolder(notebookId, newSubFolder);
    });

    expect(result.current.subFoldersData[notebookId]).toHaveLength(1);
    expect(result.current.subFoldersData[notebookId][0]).toMatchObject({
      name: 'Test SubFolder',
      color: 'green',
    });
  });

  it('should add note to subfolder', () => {
    const { result } = renderHook(() => useNotebookStore());

    // Setup workspace, notebook, and subfolder
    act(() => {
      result.current.addWorkspace({
        name: 'Test Workspace',
        icon: '📁',
        color: 'blue',
      });
    });

    act(() => {
      result.current.addNotebook({
        name: 'Test Notebook',
        color: 'red',
      });
    });

    const workspaceId = result.current.workspaces[0].id;
    const notebookId = result.current.notebooks[workspaceId][0].id;

    act(() => {
      result.current.addSubFolder(notebookId, {
        name: 'Test SubFolder',
        color: 'green',
        count: 0,
      });
    });

    const subFolderId = result.current.subFoldersData[notebookId][0].id;

    act(() => {
      result.current.addNoteToSubFolder(subFolderId, 'rich');
    });

    expect(result.current.notesData[subFolderId]).toHaveLength(1);
    expect(result.current.notesData[subFolderId][0]).toMatchObject({
      title: '新しいノート',
      editorType: 'rich',
      pages: [
        {
          id: 1,
          title: '新しいページ',
          content: '',
        },
      ],
    });
  });

  it('should update note', () => {
    const { result } = renderHook(() => useNotebookStore());

    // Setup note
    act(() => {
      result.current.addWorkspace({
        name: 'Test Workspace',
        icon: '📁',
        color: 'blue',
      });
    });

    act(() => {
      result.current.addNotebook({
        name: 'Test Notebook',
        color: 'red',
      });
    });

    const workspaceId = result.current.workspaces[0].id;
    const notebookId = result.current.notebooks[workspaceId][0].id;

    act(() => {
      result.current.addSubFolder(notebookId, {
        name: 'Test SubFolder',
        color: 'green',
        count: 0,
      });
    });

    const subFolderId = result.current.subFoldersData[notebookId][0].id;

    act(() => {
      result.current.addNoteToSubFolder(subFolderId, 'rich');
    });

    const noteId = result.current.notesData[subFolderId][0].id;

    // Update the note
    act(() => {
      result.current.updateNote(noteId, {
        title: 'Updated Title',
        isFavorite: true,
      });
    });

    const updatedNote = result.current.notesData[subFolderId][0];
    expect(updatedNote.title).toBe('Updated Title');
    expect(updatedNote.isFavorite).toBe(true);
  });

  it('should delete note', () => {
    const { result } = renderHook(() => useNotebookStore());

    // Setup note
    act(() => {
      result.current.addWorkspace({
        name: 'Test Workspace',
        icon: '📁',
        color: 'blue',
      });
    });

    act(() => {
      result.current.addNotebook({
        name: 'Test Notebook',
        color: 'red',
      });
    });

    const workspaceId = result.current.workspaces[0].id;
    const notebookId = result.current.notebooks[workspaceId][0].id;

    act(() => {
      result.current.addSubFolder(notebookId, {
        name: 'Test SubFolder',
        color: 'green',
        count: 0,
      });
    });

    const subFolderId = result.current.subFoldersData[notebookId][0].id;

    act(() => {
      result.current.addNoteToSubFolder(subFolderId, 'rich');
    });

    const noteId = result.current.notesData[subFolderId][0].id;

    // Delete the note
    act(() => {
      result.current.deleteNote(noteId);
    });

    expect(result.current.notesData[subFolderId]).toHaveLength(0);
  });

  it('should toggle notebook expanded state', () => {
    const { result } = renderHook(() => useNotebookStore());

    expect(result.current.expandedNotebooks).toEqual([]);

    act(() => {
      result.current.toggleNotebookExpanded('test-notebook');
    });

    expect(result.current.expandedNotebooks).toContain('test-notebook');

    act(() => {
      result.current.toggleNotebookExpanded('test-notebook');
    });

    expect(result.current.expandedNotebooks).not.toContain('test-notebook');
  });

  it('should set view mode', () => {
    const { result } = renderHook(() => useNotebookStore());

    act(() => {
      result.current.setViewMode('notes');
    });

    expect(result.current.viewMode).toBe('notes');

    act(() => {
      result.current.setViewMode('dashboard');
    });

    expect(result.current.viewMode).toBe('dashboard');
  });
});