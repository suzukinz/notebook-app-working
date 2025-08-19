import React from 'react';
import { render, screen } from '@testing-library/react';
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

// Mock logger
jest.mock('../../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock validation
jest.mock('../../../utils/validation', () => ({
  validateNoteTitle: jest.fn(() => ({ isValid: true, errors: [] })),
}));

// Mock debounce
jest.mock('../../../utils/debounce', () => ({
  debounce: jest.fn((fn) => {
    const debouncedFn = (...args: any[]) => fn(...args);
    debouncedFn.flush = jest.fn(() => fn());
    debouncedFn.cancel = jest.fn();
    return debouncedFn;
  }),
}));

// Mock lazy loading components
jest.mock('../RichTextEditor', () => {
  return function MockRichTextEditor(props: any) {
    return <div data-testid="rich-text-editor" {...props} />;
  };
});

jest.mock('../MarkdownEditor', () => {
  return function MockMarkdownEditor(props: any) {
    return <div data-testid="markdown-editor" {...props} />;
  };
});

jest.mock('../NoteMetadata', () => {
  return function MockNoteMetadata(props: any) {
    return (
      <div data-testid="note-metadata">
        <input 
          value={props.title} 
          onChange={(e) => props.onTitleChange(e.target.value)}
          data-testid="title-input"
        />
        <button onClick={props.onToggleFavorite}>お気に入り</button>
        <button onClick={props.onTogglePin}>ピン留め</button>
        <button onClick={props.onDelete}>削除</button>
        <button onClick={props.onShowMindMap} title="マインドマップ">マインドマップ</button>
      </div>
    );
  };
});

describe('RichNoteEditor', () => {
  const mockNote = {
    id: 1,
    title: 'Test Note',
    tags: ['test', 'mock'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    isPinned: false,
    isFavorite: false,
    editorType: 'rich' as const,
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
    expect(screen.getByText('左のサイドバーからノートを選択して編集を開始できます')).toBeInTheDocument();
  });

  it('should render selected note', () => {
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    expect(screen.getByTestId('title-input')).toHaveValue('Test Note');
    expect(screen.getByTestId('note-metadata')).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
  });

  it('should handle title changes', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const titleInput = screen.getByTestId('title-input');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    expect(titleInput).toHaveValue('Updated Title');
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

  it('should open mind map', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;

    render(<RichNoteEditor />);

    const mindMapButton = screen.getByRole('button', { name: /マインドマップ/i });
    await user.click(mindMapButton);

    expect(mockStore.setShowMindMap).toHaveBeenCalledWith(true);
  });
});