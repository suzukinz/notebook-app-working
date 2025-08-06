import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RichNoteEditor from '../RichNoteEditor';

// Mock the store
const mockStore = {
  selectedNote: null,
  currentPage: 0,
  setSelectedNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
  setShowMindMap: jest.fn(),
  setCurrentPage: jest.fn(),
};

jest.mock('../../../store/useNotebookStore', () => ({
  useNotebookStore: () => mockStore,
}));

// Mock image utils
jest.mock('../../../utils/imageUtils', () => ({
  isImageFile: jest.fn(() => true),
  resizeImage: jest.fn(() => Promise.resolve('data:image/jpeg;base64,mockdata')),
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('RichNoteEditor', () => {
  const mockNote = {
    id: 1,
    title: 'Test Note',
    tags: ['test', 'mock'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    isPinned: false,
    isFavorite: false,
    pages: [
      {
        id: 1,
        title: 'ページ1',
        content: '<p>Test content</p>',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.selectedNote = null;
    mockStore.currentPage = 0;
  });

  it('should show placeholder when no note is selected', () => {
    render(<RichNoteEditor />);

    expect(screen.getByText('ノートを選択してください')).toBeInTheDocument();
    expect(screen.getByText('左側のリストからノートを選択して編集を開始')).toBeInTheDocument();
  });

  it('should render selected note', () => {
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    expect(screen.getByDisplayValue('Test Note')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('mock')).toBeInTheDocument();
  });

  it('should handle title changes', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const titleInput = screen.getByDisplayValue('Test Note');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    expect(titleInput).toHaveValue('Updated Title');
  });

  it('should show validation error for long titles', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const titleInput = screen.getByDisplayValue('Test Note');
    const longTitle = 'a'.repeat(201); // Exceeds NOTE_TITLE_MAX (200)
    
    await user.clear(titleInput);
    await user.type(titleInput, longTitle);

    // Trigger validation
    const saveButton = screen.getByText('編集開始'); // Use the actual button text
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/200文字以内で入力してください/)).toBeInTheDocument();
    });
  });

  it('should handle tag addition', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const addTagButton = screen.getByText('タグを追加');
    await user.click(addTagButton);

    const tagInput = screen.getByPlaceholderText('タグを入力');
    await user.type(tagInput, 'newTag{Enter}');

    // The tag should be added (mocked store should be called)
    await waitFor(() => {
      expect(mockStore.updateNote).toHaveBeenCalled();
    });
  });

  it('should show validation error for invalid tags', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const addTagButton = screen.getByText('タグを追加');
    await user.click(addTagButton);

    const tagInput = screen.getByPlaceholderText('タグを入力');
    await user.type(tagInput, 'invalid@tag{Enter}');

    await waitFor(() => {
      expect(screen.getByText(/英数字、ひらがな、カタカナ、漢字、ハイフン、アンダースコア/)).toBeInTheDocument();
    });
  });

  it('should prevent duplicate tags', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const addTagButton = screen.getByText('タグを追加');
    await user.click(addTagButton);

    const tagInput = screen.getByPlaceholderText('タグを入力');
    await user.type(tagInput, 'test{Enter}'); // 'test' already exists

    await waitFor(() => {
      expect(screen.getByText('このタグは既に追加されています')).toBeInTheDocument();
    });
  });

  it('should limit number of tags', async () => {
    const user = userEvent.setup();
    const noteWithManyTags = {
      ...mockNote,
      tags: Array(20).fill(0).map((_, i) => `tag${i}`), // 20 tags (limit)
    };
    mockStore.selectedNote = noteWithManyTags;

    render(<RichNoteEditor />);

    const addTagButton = screen.getByText('タグを追加');
    await user.click(addTagButton);

    const tagInput = screen.getByPlaceholderText('タグを入力');
    await user.type(tagInput, 'oneMoreTag{Enter}');

    await waitFor(() => {
      expect(screen.getByText('タグは20個まで設定できます')).toBeInTheDocument();
    });
  });

  it('should handle tag removal', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    // Find tag remove button by testing ID or specific role
    const testTag = screen.getByText('test');
    expect(testTag).toBeInTheDocument();
    
    // Simulate tag removal by clicking the tag container
    await user.click(testTag);
    expect(mockStore.updateNote).toHaveBeenCalled();
  });

  it('should handle favorite toggle', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const favoriteButton = screen.getByRole('button', { name: /お気に入り/i });
    await user.click(favoriteButton);

    expect(mockStore.updateNote).toHaveBeenCalledWith(1, {
      isFavorite: true,
    });
  });

  it('should handle pin toggle', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const pinButton = screen.getByRole('button', { name: /ピン留め/i });
    await user.click(pinButton);

    expect(mockStore.updateNote).toHaveBeenCalledWith(1, {
      isPinned: true,
    });
  });

  it('should handle note deletion', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    // Mock window.confirm to return true
    global.confirm = jest.fn(() => true);

    render(<RichNoteEditor />);

    const deleteButton = screen.getByRole('button', { name: /削除/i });
    await user.click(deleteButton);

    expect(mockStore.deleteNote).toHaveBeenCalledWith(1);
    expect(mockStore.setSelectedNote).toHaveBeenCalledWith(null);
  });

  it('should not delete note when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    // Mock window.confirm to return false
    global.confirm = jest.fn(() => false);

    render(<RichNoteEditor />);

    const deleteButton = screen.getByRole('button', { name: /削除/i });
    await user.click(deleteButton);

    expect(mockStore.deleteNote).not.toHaveBeenCalled();
    expect(mockStore.setSelectedNote).not.toHaveBeenCalled();
  });

  it('should open mind map', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const mindMapButton = screen.getByRole('button', { title: /マインドマップ/i });
    await user.click(mindMapButton);

    expect(mockStore.setShowMindMap).toHaveBeenCalledWith(true);
  });

  it('should handle page addition for multi-page notes', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const addPageButton = screen.getByText('ページ追加');
    await user.click(addPageButton);

    expect(mockStore.updateNote).toHaveBeenCalledWith(1, expect.objectContaining({
      pages: expect.arrayContaining([
        expect.objectContaining({ title: 'ページ1' }),
        expect.objectContaining({ title: 'ページ2' }),
      ]),
    }));
  });

  it('should clear validation errors when they are dismissed', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    // Trigger a validation error first
    const titleInput = screen.getByDisplayValue('Test Note');
    const longTitle = 'a'.repeat(201);
    
    await user.clear(titleInput);
    await user.type(titleInput, longTitle);

    const saveButton = screen.queryByText('保存');
    if (saveButton) {
      await user.click(saveButton);
    }

    await waitFor(() => {
      expect(screen.getByText(/200文字以内で入力してください/)).toBeInTheDocument();
    });

    // Find and click the dismiss button
    const dismissButton = screen.getByText('✕');
    await user.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText(/200文字以内で入力してください/)).not.toBeInTheDocument();
    });
  });

  it('should handle drag and drop image validation', async () => {
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const editor = screen.getByRole('textbox', { hidden: true });
    
    // Create a mock file
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Simulate drag and drop
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [file],
      },
    });

    fireEvent(editor, dropEvent);

    // Should not show validation error for valid image
    await waitFor(() => {
      expect(screen.queryByText(/ファイルが無効です/)).not.toBeInTheDocument();
    });
  });
});