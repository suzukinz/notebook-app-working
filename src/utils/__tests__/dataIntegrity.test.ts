import {
  createBackup,
  restoreFromBackup,
  getAvailableBackups,
  checkDataIntegrity,
  repairData
} from '../dataIntegrity';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Data Integrity Utils', () => {
  const mockWorkspaces = [
    { id: 'ws1', name: 'Workspace 1', icon: '💼', color: 'blue' }
  ];

  const mockNotebooks = {
    'ws1': [
      { id: 'nb1', name: 'Notebook 1', workspaceId: 'ws1', count: 0, color: 'blue' }
    ]
  };

  const mockNotes = {
    'folder1': [
      {
        id: 1,
        title: 'Test Note',
        tags: ['test'],
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01',
        isPinned: false,
        isFavorite: false,
        pages: [{ id: 1, title: 'Page 1', content: 'Test content' }]
      }
    ]
  };

  beforeEach(() => {
    // Clear localStorage mock before each test
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();
    localStorageMock.length = 0;
    localStorageMock.key.mockReset();
  });

  describe('createBackup', () => {
    it('should create a backup successfully', () => {
      // Mock localStorage data
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockWorkspaces)) // workspaces
        .mockReturnValueOnce(JSON.stringify(mockNotebooks))  // notebooks
        .mockReturnValueOnce(JSON.stringify({}))             // subfolders
        .mockReturnValueOnce(JSON.stringify(mockNotes));     // notes

      const result = createBackup();

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // Check if backup was saved with correct structure
      const setItemCalls = localStorageMock.setItem.mock.calls;
      const backupCall = setItemCalls.find(call => call[0].startsWith('notebook-backup-'));
      expect(backupCall).toBeDefined();
      
      const backup = JSON.parse(backupCall[1]);
      expect(backup.workspaces).toEqual(mockWorkspaces);
      expect(backup.notebooks).toEqual(mockNotebooks);
      expect(backup.notes).toEqual(mockNotes);
      expect(backup.version).toBe('1.0.1');
      expect(backup.timestamp).toBeDefined();
    });

    it('should handle backup creation failure', () => {
      // Mock localStorage to throw an error
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const result = createBackup();

      expect(result).toBe(false);
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore from backup successfully', () => {
      const timestamp = '2023-01-01T00:00:00.000Z';
      const backupData = {
        timestamp,
        version: '1.0.1',
        workspaces: mockWorkspaces,
        notebooks: mockNotebooks,
        notes: mockNotes
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(backupData));

      const result = restoreFromBackup(timestamp);

      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'notebook-workspaces',
        JSON.stringify(mockWorkspaces)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'notebook-notebooks',
        JSON.stringify(mockNotebooks)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'notebook-notes',
        JSON.stringify(mockNotes)
      );
    });

    it('should handle missing backup', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = restoreFromBackup('invalid-timestamp');

      expect(result).toBe(false);
    });

    it('should handle restore failure', () => {
      const timestamp = '2023-01-01T00:00:00.000Z';
      const backupData = {
        timestamp,
        version: '1.0.1',
        workspaces: mockWorkspaces,
        notebooks: mockNotebooks,
        notes: mockNotes
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(backupData));
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Restore failed');
      });

      const result = restoreFromBackup(timestamp);

      expect(result).toBe(false);
    });
  });

  describe('getAvailableBackups', () => {
    it('should return available backups sorted by timestamp', () => {
      const mockKeys = [
        'notebook-backup-2023-01-01T00:00:00.000Z',
        'notebook-backup-2023-01-02T00:00:00.000Z',
        'notebook-backup-2023-01-03T00:00:00.000Z',
        'other-key'
      ];

      localStorageMock.length = mockKeys.length;
      localStorageMock.key.mockImplementation((index) => mockKeys[index]);

      const backups = getAvailableBackups();

      expect(backups).toEqual([
        '2023-01-03T00:00:00.000Z',
        '2023-01-02T00:00:00.000Z',
        '2023-01-01T00:00:00.000Z'
      ]);
    });

    it('should handle empty localStorage', () => {
      localStorageMock.length = 0;

      const backups = getAvailableBackups();

      expect(backups).toEqual([]);
    });

    it('should handle localStorage errors', () => {
      localStorageMock.key.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const backups = getAvailableBackups();

      expect(backups).toEqual([]);
    });
  });

  describe('checkDataIntegrity', () => {
    it('should return valid result for correct data', () => {
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockWorkspaces))
        .mockReturnValueOnce(JSON.stringify(mockNotebooks))
        .mockReturnValueOnce(JSON.stringify({}))
        .mockReturnValueOnce(JSON.stringify(mockNotes));

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid workspace data', () => {
      const invalidWorkspaces = [
        { id: '', name: 'Invalid Workspace' } // Missing required fields
      ];

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(invalidWorkspaces))
        .mockReturnValueOnce(JSON.stringify({}))
        .mockReturnValueOnce(JSON.stringify({}))
        .mockReturnValueOnce(JSON.stringify({}));

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle corrupted JSON data', () => {
      localStorageMock.getItem
        .mockReturnValueOnce('invalid json')
        .mockReturnValueOnce(JSON.stringify({}))
        .mockReturnValueOnce(JSON.stringify({}))
        .mockReturnValueOnce(JSON.stringify({}));

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ワークスペースデータのパースに失敗しました');
      expect(result.corruptedData.workspaces).toContain('parse-error');
    });

    it('should validate notebook data integrity', () => {
      const invalidNotebooks = {
        'nonexistent-workspace': [
          { id: 'nb1', name: 'Notebook', workspaceId: 'nonexistent-workspace' }
        ]
      };

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockWorkspaces))
        .mockReturnValueOnce(JSON.stringify(invalidNotebooks))
        .mockReturnValueOnce(JSON.stringify({}))
        .mockReturnValueOnce(JSON.stringify({}));

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('存在しないワークスペースID'))).toBe(true);
    });

    it('should validate note data integrity', () => {
      const invalidNotes = {
        'folder1': [
          {
            id: -1, // Invalid negative ID
            title: '', // Empty title
            tags: [],
            createdAt: '',
            updatedAt: '',
            isPinned: false,
            isFavorite: false,
            editorType: 'rich',
            pages: [] // Empty pages array - this should trigger validation error
          }
        ]
      };

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockWorkspaces))
        .mockReturnValueOnce(JSON.stringify(mockNotebooks))
        .mockReturnValueOnce(JSON.stringify({}))
        .mockReturnValueOnce(JSON.stringify(invalidNotes));

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle general errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage access error');
      });

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('データ整合性チェック中にエラーが発生しました'))).toBe(true);
    });
  });

  describe('repairData', () => {
    it('should succeed when data is already valid', () => {
      // Mock valid data in localStorage
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockWorkspaces)) // workspaces
        .mockReturnValueOnce(JSON.stringify(mockNotebooks))  // notebooks
        .mockReturnValueOnce(JSON.stringify({}))             // subfolders
        .mockReturnValueOnce(JSON.stringify(mockNotes));     // notes

      const result = repairData();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle repair process with backup failure', () => {
      // Mock localStorage to fail on setItem (backup failure)
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify([]))             // workspaces (empty)
        .mockReturnValueOnce(JSON.stringify({}))             // notebooks
        .mockReturnValueOnce(JSON.stringify({}))             // subfolders  
        .mockReturnValueOnce(JSON.stringify({}));            // notes
      
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const result = repairData();

      expect(result.warnings).toContain('修復前のバックアップ作成に失敗しました');
    });

    it('should handle repair errors', () => {
      // Create a scenario where createBackup succeeds but checkDataIntegrity throws
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockWorkspaces)) // For createBackup - workspaces
        .mockReturnValueOnce(JSON.stringify(mockNotebooks))  // For createBackup - notebooks
        .mockReturnValueOnce(JSON.stringify({}))             // For createBackup - subfolders
        .mockReturnValueOnce(JSON.stringify(mockNotes))      // For createBackup - notes
        .mockImplementationOnce(() => {                       // For checkDataIntegrity
          throw new Error('Storage access error');
        });

      const result = repairData();

      // Check that the error was caught and added to the result
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('データ修復中にエラーが発生しました');
    });
  });
});