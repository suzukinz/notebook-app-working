import React, { useState, useCallback, useRef, useEffect } from 'react';
import AIAssistantPanel from '../ai/AIAssistantPanel';
import SmartSearch from '../ai/SmartSearch';
import AutoSuggestions from '../ai/AutoSuggestions';
import './NoteEditorWithAI.css';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface NoteEditorWithAIProps {
  note: Note;
  allNotes: Note[];
  onSave: (note: Note) => void;
  onTagsChange?: (tags: string[]) => void;
  onRelatedNoteSelect?: (note: Note) => void;
}

export const NoteEditorWithAI: React.FC<NoteEditorWithAIProps> = ({
  note,
  allNotes,
  onSave,
  onTagsChange,
  onRelatedNoteSelect
}) => {
  const [content, setContent] = useState(note.content);
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState(note.tags);
  const [selectedText, setSelectedText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [aiPanelPosition, setAIPanelPosition] = useState<'sidebar' | 'floating' | 'bottom'>('sidebar');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start !== end) {
        setSelectedText(content.slice(start, end));
      } else {
        setSelectedText('');
      }
      
      setCursorPosition(start);
    }
  }, [content]);

  // Handle content change
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    
    // Auto-save after 2 seconds of inactivity
    const timeoutId = setTimeout(() => {
      const updatedNote = {
        ...note,
        title,
        content: newContent,
        tags,
        updatedAt: new Date()
      };
      onSave(updatedNote);
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [note, title, tags, onSave]);

  // Handle title change
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  // Handle tag changes
  const handleTagsUpdate = useCallback((newTags: string[]) => {
    setTags(newTags);
    if (onTagsChange) {
      onTagsChange(newTags);
    }
  }, [onTagsChange]);

  // Add new tag
  const handleAddTag = useCallback((tag: string) => {
    if (!tags.includes(tag)) {
      const newTags = [...tags, tag];
      handleTagsUpdate(newTags);
    }
  }, [tags, handleTagsUpdate]);

  // Remove tag
  const handleRemoveTag = useCallback((tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    handleTagsUpdate(newTags);
  }, [tags, handleTagsUpdate]);

  // Insert text at cursor position
  const handleInsertText = useCallback((text: string, position?: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const insertPosition = position !== undefined ? position : cursorPosition;
    const newContent = content.slice(0, insertPosition) + text + content.slice(insertPosition);
    
    setContent(newContent);
    handleContentChange(newContent);

    // Move cursor to end of inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(insertPosition + text.length, insertPosition + text.length);
    }, 0);
  }, [content, cursorPosition, handleContentChange]);

  // Handle AI suggestion application
  const handleApplySuggestion = useCallback((suggestion: any) => {
    console.log('Applied AI suggestion:', suggestion);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K: Open search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
      }
      
      // Ctrl/Cmd + Shift + A: Toggle AI panel
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        setIsAIPanelOpen(prev => !prev);
      }
      
      // Ctrl/Cmd + Shift + S: Toggle suggestions
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        setShowSuggestions(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  return (
    <div className="note-editor-with-ai">
      {/* Header with controls */}
      <div className="editor-header">
        <div className="editor-title-section">
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Note title..."
            className="editor-title-input"
          />
        </div>
        
        <div className="editor-controls">
          {/* Search Toggle */}
          <button
            className={`control-btn ${isSearchOpen ? 'control-btn--active' : ''}`}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            title="Smart Search (⌘K)"
          >
            🔍
          </button>
          
          {/* AI Panel Toggle */}
          <button
            className={`control-btn ${isAIPanelOpen ? 'control-btn--active' : ''}`}
            onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
            title="AI Assistant (⌘⇧A)"
          >
            🤖
          </button>
          
          {/* Suggestions Toggle */}
          <button
            className={`control-btn ${showSuggestions ? 'control-btn--active' : ''}`}
            onClick={() => setShowSuggestions(!showSuggestions)}
            title="Auto Suggestions (⌘⇧S)"
          >
            💡
          </button>
          
          {/* AI Panel Position */}
          <select
            value={aiPanelPosition}
            onChange={(e) => setAIPanelPosition(e.target.value as any)}
            className="position-select"
            title="AI Panel Position"
          >
            <option value="sidebar">Sidebar</option>
            <option value="floating">Floating</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>
      </div>

      {/* Smart Search */}
      {isSearchOpen && onRelatedNoteSelect && (
        <div className="search-section">
          <SmartSearch
            notes={allNotes}
            onSelectNote={onRelatedNoteSelect}
            placeholder="Search notes with AI..."
            position="top"
            enableSemanticSearch={true}
          />
        </div>
      )}

      {/* Main editor area */}
      <div className="editor-main">
        <div className="editor-content">
          {/* Tags section */}
          <div className="tags-section">
            <div className="tags-list">
              {tags.map((tag) => (
                <span key={tag} className="tag">
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="tag-remove"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Content editor */}
          <div className="content-editor-container">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onSelect={handleTextSelection}
              onKeyUp={handleTextSelection}
              placeholder="Start writing your note..."
              className="content-editor"
            />
            
            {/* Auto Suggestions Overlay */}
            {showSuggestions && (
              <AutoSuggestions
                content={content}
                cursorPosition={cursorPosition}
                selectedText={selectedText}
                onApplySuggestion={handleApplySuggestion}
                onInsertText={handleInsertText}
                onAddTag={handleAddTag}
                position="floating"
                isEnabled={showSuggestions}
              />
            )}
          </div>

          {/* Status bar */}
          <div className="editor-status">
            <div className="status-info">
              <span className="word-count">
                {content.split(/\s+/).filter(Boolean).length} words
              </span>
              <span className="char-count">
                {content.length} characters
              </span>
              {selectedText && (
                <span className="selection-info">
                  {selectedText.length} selected
                </span>
              )}
            </div>
            
            <div className="keyboard-shortcuts">
              <span className="shortcut-hint">⌘K Search</span>
              <span className="shortcut-hint">⌘⇧A AI</span>
              <span className="shortcut-hint">⌘⇧S Suggestions</span>
            </div>
          </div>
        </div>

        {/* AI Assistant Panel */}
        {isAIPanelOpen && (
          <div className={`ai-panel-container ai-panel-container--${aiPanelPosition}`}>
            <AIAssistantPanel
              selectedText={selectedText}
              noteContent={content}
              onInsertText={handleInsertText}
              onApplyTags={(newTags) => {
                const uniqueTags = [...new Set([...tags, ...newTags])];
                handleTagsUpdate(uniqueTags);
              }}
              position={aiPanelPosition}
            />
          </div>
        )}
      </div>

      {/* Floating action button for mobile */}
      <div className="mobile-fab">
        <button
          className="fab-btn"
          onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
        >
          🤖
        </button>
      </div>
    </div>
  );
};

export default NoteEditorWithAI;