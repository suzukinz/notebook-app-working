import { useState, useCallback, useEffect } from 'react';

const NOTE_LIST_WIDTH_KEY = 'note-list-width';
const DEFAULT_NOTE_LIST_WIDTH = 384; // w-96 equivalent (24rem = 384px)
const MIN_NOTE_LIST_WIDTH = 250;
const MAX_NOTE_LIST_WIDTH = 800;

export const useNoteListResize = () => {
  const [noteListWidth, setNoteListWidth] = useState<number>(() => {
    const saved = localStorage.getItem(NOTE_LIST_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_NOTE_LIST_WIDTH;
  });

  const updateNoteListWidth = useCallback((width: number) => {
    const clampedWidth = Math.max(MIN_NOTE_LIST_WIDTH, Math.min(MAX_NOTE_LIST_WIDTH, width));
    setNoteListWidth(clampedWidth);
  }, []);

  // LocalStorageに保存
  useEffect(() => {
    localStorage.setItem(NOTE_LIST_WIDTH_KEY, noteListWidth.toString());
  }, [noteListWidth]);

  return {
    noteListWidth,
    updateNoteListWidth,
    minWidth: MIN_NOTE_LIST_WIDTH,
    maxWidth: MAX_NOTE_LIST_WIDTH
  };
};