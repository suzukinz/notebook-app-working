import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RichNoteEditor from '../RichNoteEditor';

// Mock the store with more sophisticated page management
const mockStore = {
  selectedNote: null,
  currentPage: 0,
  setSelectedNote: jest.fn(),
  updateNote: jest.fn().mockResolvedValue(undefined), // Return a resolved Promise
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
    const mockFn = jest.fn(fn);
    const debouncedFn = (...args: any[]) => mockFn(...args);
    debouncedFn.flush = jest.fn(() => mockFn());
    debouncedFn.cancel = jest.fn();
    return debouncedFn;
  }),
  DebouncedFunction: jest.fn(),
}));

// Mock components
jest.mock('../RichTextEditor', () => {
  return function MockRichTextEditor(props: any) {
    return (
      <div data-testid="rich-text-editor">
        <textarea
          value={props.content}
          onChange={(e) => props.onContentChange(e.target.value)}
          data-testid="content-editor"
        />
      </div>
    );
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
      </div>
    );
  };
});

describe('RichNoteEditor Page Synchronization', () => {
  const mockNote = {
    id: 1,
    title: 'Test Note',
    tags: ['test'],
    createdAt: '2023-01-01',
    updatedAt: '2023-01-01',
    isPinned: false,
    isFavorite: false,
    editorType: 'rich' as const,
    pages: [
      {
        id: 1,
        title: 'ページ1',
        content: 'First page content',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.selectedNote = null;
    mockStore.currentPage = 0;
  });

  it('should display correct page count initially', () => {
    mockStore.selectedNote = mockNote;
    
    render(<RichNoteEditor />);
    
    // Should show "ページ 1 / 1"
    expect(screen.getByText(/ページ 1 \/ 1/)).toBeInTheDocument();
  });

  it('should update page count immediately when adding a page', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;
    
    // Mock updateNote to simulate adding a page
    mockStore.updateNote.mockImplementation(async (noteId, updates) => {
      if (updates.pages) {
        // Simulate store update
        mockStore.selectedNote = {
          ...mockStore.selectedNote!,
          pages: updates.pages,
        };
      }
    });
    
    render(<RichNoteEditor />);
    
    // Initially should show 1/1
    expect(screen.getByText(/ページ 1 \/ 1/)).toBeInTheDocument();
    
    // Click add page button
    const addButton = screen.getByRole('button', { name: /追加/ });
    await act(async () => {
      await user.click(addButton);
    });
    
    // Should immediately show 2/2 (not 2/1)
    await waitFor(() => {
      expect(screen.getByText(/ページ 2 \/ 2/)).toBeInTheDocument();
    });
  });

  it('should maintain page content after adding new page', async () => {
    const user = userEvent.setup();
    mockStore.selectedNote = mockNote;
    
    render(<RichNoteEditor />);
    
    // Add some content to the first page
    const contentEditor = screen.getByTestId('content-editor');
    await user.clear(contentEditor);
    await user.type(contentEditor, 'Modified first page content');
    
    // Add a new page
    const addButton = screen.getByRole('button', { name: /追加/ });
    await act(async () => {
      await user.click(addButton);
    });
    
    // updateNote should have been called with the correct pages
    await waitFor(() => {
      expect(mockStore.updateNote).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          pages: expect.arrayContaining([
            expect.objectContaining({
              content: 'Modified first page content',
            }),
            expect.objectContaining({
              content: '',
              title: expect.stringMatching(/ページ/),
            }),
          ]),
        })
      );
    });
  });

  it('should handle page navigation correctly', async () => {
    const user = userEvent.setup();
    
    // Mock note with 2 pages
    const multiPageNote = {
      ...mockNote,
      pages: [
        { id: 1, title: 'ページ1', content: 'Page 1 content' },
        { id: 2, title: 'ページ2', content: 'Page 2 content' },
      ],
    };
    
    mockStore.selectedNote = multiPageNote;
    
    render(<RichNoteEditor />);
    
    // Should show page 1/2
    expect(screen.getByText(/ページ 1 \/ 2/)).toBeInTheDocument();
    
    // Navigate to next page
    const nextButton = screen.getByTitle('次のページ');
    await act(async () => {
      await user.click(nextButton);
    });
    
    // Should call setCurrentPage with 1 (second page)
    expect(mockStore.setCurrentPage).toHaveBeenCalledWith(1);
  });

  it('should sync actualPageCount with store changes', async () => {
    mockStore.selectedNote = mockNote;
    
    const { rerender } = render(<RichNoteEditor />);
    
    // Initially shows 1/1
    expect(screen.getByText(/ページ 1 \/ 1/)).toBeInTheDocument();
    
    // Simulate store update with more pages
    const updatedNote = {
      ...mockNote,
      pages: [
        ...mockNote.pages,
        { id: 2, title: 'ページ2', content: 'New page' },
      ],
    };
    
    mockStore.selectedNote = updatedNote;
    
    // Re-render with updated store
    rerender(<RichNoteEditor />);
    
    // Should now show 1/2
    await waitFor(() => {
      expect(screen.getByText(/ページ 1 \/ 2/)).toBeInTheDocument();
    });
  });
});