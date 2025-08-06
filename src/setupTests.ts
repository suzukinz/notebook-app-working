// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

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

// Mock window.getSelection for rich text editor tests
Object.defineProperty(window, 'getSelection', {
  value: jest.fn(() => ({
    toString: jest.fn(() => ''),
    removeAllRanges: jest.fn(),
    addRange: jest.fn(),
    getRangeAt: jest.fn(() => ({
      deleteContents: jest.fn(),
      insertNode: jest.fn(),
      createContextualFragment: jest.fn(() => ({ querySelector: jest.fn() })),
      setStart: jest.fn(),
      collapse: jest.fn(),
    })),
    rangeCount: 0,
  })),
});

// Mock document.execCommand
Object.defineProperty(document, 'execCommand', {
  value: jest.fn(),
});

// Mock console for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});