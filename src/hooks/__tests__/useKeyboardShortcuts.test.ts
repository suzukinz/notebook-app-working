import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, useGlobalKeyboardShortcuts } from '../useKeyboardShortcuts';

// Mock the store
const mockStore = {
  selectedNote: null,
  selectedSubFolder: 'test-subfolder',
  addNoteToSubFolder: jest.fn(),
  setShowMindMap: jest.fn(),
  setViewMode: jest.fn(),
  exportAllData: jest.fn(),
  setSearchQuery: jest.fn(),
  searchQuery: '',
};

jest.mock('../../store/useNotebookStore', () => ({
  useNotebookStore: () => mockStore,
}));

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute shortcut action when key combination is pressed', () => {
    const shortcuts = [
      {
        key: 'n',
        ctrl: true,
        action: jest.fn(),
        description: 'Test shortcut',
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Simulate Ctrl+N keypress
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(shortcuts[0].action).toHaveBeenCalled();
  });

  it('should not execute action if key combination does not match', () => {
    const shortcuts = [
      {
        key: 'n',
        ctrl: true,
        action: jest.fn(),
        description: 'Test shortcut',
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Simulate just 'n' keypress (without Ctrl)
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(shortcuts[0].action).not.toHaveBeenCalled();
  });

  it('should handle shift modifier', () => {
    const shortcuts = [
      {
        key: 'N',
        ctrl: true,
        shift: true,
        action: jest.fn(),
        description: 'Test shortcut with shift',
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Simulate Ctrl+Shift+N keypress
    const event = new KeyboardEvent('keydown', {
      key: 'N',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(shortcuts[0].action).toHaveBeenCalled();
  });

  it('should handle alt modifier', () => {
    const shortcuts = [
      {
        key: 'm',
        alt: true,
        action: jest.fn(),
        description: 'Test shortcut with alt',
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Simulate Alt+M keypress
    const event = new KeyboardEvent('keydown', {
      key: 'm',
      altKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(shortcuts[0].action).toHaveBeenCalled();
  });

  it('should not execute disabled shortcuts', () => {
    const shortcuts = [
      {
        key: 'n',
        ctrl: true,
        action: jest.fn(),
        description: 'Test shortcut',
        disabled: true,
      },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // Simulate Ctrl+N keypress
    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(shortcuts[0].action).not.toHaveBeenCalled();
  });

  it('should clean up event listener on unmount', () => {
    const shortcuts = [
      {
        key: 'n',
        ctrl: true,
        action: jest.fn(),
        description: 'Test shortcut',
      },
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});

describe('useGlobalKeyboardShortcuts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should dispatch createNewNote event with Ctrl+N', () => {
    const eventSpy = jest.spyOn(window, 'dispatchEvent');
    
    renderHook(() => useGlobalKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'createNewNote'
      })
    );
    
    eventSpy.mockRestore();
  });

  it('should dispatch saveCurrentNote event with Ctrl+S', () => {
    const eventSpy = jest.spyOn(window, 'dispatchEvent');
    
    renderHook(() => useGlobalKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'saveCurrentNote'
      })
    );
    
    eventSpy.mockRestore();
  });

  it('should focus search with Ctrl+F', () => {
    const searchElement = document.createElement('input');
    searchElement.setAttribute('data-search-input', 'true');
    searchElement.focus = jest.fn();
    document.body.appendChild(searchElement);

    renderHook(() => useGlobalKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'f',
      ctrlKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(searchElement.focus).toHaveBeenCalled();

    document.body.removeChild(searchElement);
  });

  it('should dispatch openCommandPalette event with Ctrl+K', () => {
    const eventSpy = jest.spyOn(window, 'dispatchEvent');
    
    renderHook(() => useGlobalKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'openCommandPalette'
      })
    );
    
    eventSpy.mockRestore();
  });

  it('should dispatch closeModal event with Escape', () => {
    const eventSpy = jest.spyOn(window, 'dispatchEvent');
    
    renderHook(() => useGlobalKeyboardShortcuts());

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
    });

    document.dispatchEvent(event);

    expect(eventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'closeModal'
      })
    );
    
    eventSpy.mockRestore();
  });
});