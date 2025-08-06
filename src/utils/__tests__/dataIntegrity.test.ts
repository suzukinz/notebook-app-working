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
    (global as any).localStorage.clear();
  });

  describe('createBackup', () => {
    it('should create a backup successfully', () => {
      // Mock localStorage data
      (global as any).localStorage.getItem
        .mockReturnValueOnce(JSON.stringify(mockWorkspaces)) // workspaces
        .mockReturnValueOnce(JSON.stringify(mockNotebooks))  // notebooks
        .mockReturnValueOnce(JSON.stringify(mockNotes));     // notes

      const result = createBackup();

      expect(result).toBe(true);
      expect((global as any).localStorage.setItem).toHaveBeenCalled();
      
      // Check if backup was saved with correct structure
      const setItemCalls = (global as any).localStorage.setItem.mock.calls;
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
      (global as any).localStorage.setItem.mockImplementation(() => {
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

      (global as any).localStorage.getItem.mockReturnValue(JSON.stringify(backupData));

      const result = restoreFromBackup(timestamp);

      expect(result).toBe(true);
      expect((global as any).localStorage.setItem).toHaveBeenCalledWith(
        'notebook-workspaces',
        JSON.stringify(mockWorkspaces)
      );
      expect((global as any).localStorage.setItem).toHaveBeenCalledWith(
        'notebook-notebooks',
        JSON.stringify(mockNotebooks)
      );
      expect((global as any).localStorage.setItem).toHaveBeenCalledWith(
        'notebook-notes',
        JSON.stringify(mockNotes)
      );
    });

    it('should handle missing backup', () => {
      (global as any).localStorage.getItem.mockReturnValue(null);

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

      (global as any).localStorage.getItem.mockReturnValue(JSON.stringify(backupData));
      (global as any).localStorage.setItem.mockImplementation(() => {
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

      (global as any).localStorage.length = mockKeys.length;
      (global as any).localStorage.key = jest.fn((index) => mockKeys[index]);

      const backups = getAvailableBackups();

      expect(backups).toEqual([
        '2023-01-03T00:00:00.000Z',
        '2023-01-02T00:00:00.000Z',
        '2023-01-01T00:00:00.000Z'
      ]);
    });

    it('should handle empty localStorage', () => {
      (global as any).localStorage.length = 0;

      const backups = getAvailableBackups();

      expect(backups).toEqual([]);
    });

    it('should handle localStorage errors', () => {
      (global as any).localStorage.key = jest.fn(() => {
        throw new Error('Storage error');
      });

      const backups = getAvailableBackups();

      expect(backups).toEqual([]);
    });
  });

  describe('checkDataIntegrity', () => {
    it('should return valid result for correct data', () => {
      (global as any).localStorage.getItem
        .mockReturnValueOnce(JSON.stringify(mockWorkspaces))
        .mockReturnValueOnce(JSON.stringify(mockNotebooks))
        .mockReturnValueOnce(JSON.stringify(mockNotes));

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid workspace data', () => {
      const invalidWorkspaces = [
        { id: '', name: 'Invalid Workspace' } // Missing required fields
      ];

      (global as any).localStorage.getItem
        .mockReturnValueOnce(JSON.stringify(invalidWorkspaces))
        .mockReturnValueOnce(JSON.stringify({}))
        .mockReturnValueOnce(JSON.stringify({}));

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle corrupted JSON data', () => {
      (global as any).localStorage.getItem
        .mockReturnValueOnce('invalid json')
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

      (global as any).localStorage.getItem
        .mockReturnValueOnce(JSON.stringify(mockWorkspaces))
        .mockReturnValueOnce(JSON.stringify(invalidNotebooks))
        .mockReturnValueOnce(JSON.stringify({}));

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('存在しないワークスペースID'))).toBe(true);
    });

    it('should validate note data integrity', () => {
      const invalidNotes = {
        'folder1': [
          {
            id: 'invalid-id', // Should be number
            title: '', // Empty title
            pages: [] // Empty pages array
          }
        ]
      };

      (global as any).localStorage.getItem
        .mockReturnValueOnce(JSON.stringify(mockWorkspaces))
        .mockReturnValueOnce(JSON.stringify(mockNotebooks))
        .mockReturnValueOnce(JSON.stringify(invalidNotes));

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle general errors gracefully', () => {
      (global as any).localStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access error');
      });

      const result = checkDataIntegrity();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('データ整合性チェック中にエラーが発生しました'))).toBe(true);
    });
  });

  describe('repairData', () => {
    it('should succeed when data is already valid', () => {
      // Mock createBackup to succeed
      jest.spyOn(require('../dataIntegrity'), 'createBackup').mockReturnValue(true);
      
      // Mock checkDataIntegrity to return valid result
      jest.spyOn(require('../dataIntegrity'), 'checkDataIntegrity').mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        corruptedData: { workspaces: [], notebooks: [], subFolders: [], notes: [] }
      });

      const result = repairData();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle repair process with backup failure', () => {
      // Mock createBackup to fail
      jest.spyOn(require('../dataIntegrity'), 'createBackup').mockReturnValue(false);
      
      // Mock checkDataIntegrity to return invalid result
      jest.spyOn(require('../dataIntegrity'), 'checkDataIntegrity').mockReturnValue({
        isValid: false,
        errors: ['Some error'],
        warnings: [],
        corruptedData: { workspaces: [], notebooks: [], subFolders: [], notes: [] }
      });

      const result = repairData();

      expect(result.warnings).toContain('修復前のバックアップ作成に失敗しました');
    });

    it('should handle repair errors', () => {
      // Mock functions to throw errors
      jest.spyOn(require('../dataIntegrity'), 'createBackup').mockImplementation(() => {
        throw new Error('Backup error');
      });

      const result = repairData();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('データ修復中にエラーが発生しました');
    });
  });
});