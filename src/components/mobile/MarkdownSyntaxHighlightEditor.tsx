import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MarkdownSyntaxHighlighter } from '../../utils/markdownSyntaxHighlight';
import { MarkdownAutoCompleter, AutoCompleteItem } from '../../utils/markdownAutoComplete';
import { markdownKeyboardShortcuts } from '../../utils/markdownKeyboardShortcuts';
import MarkdownAutoCompleteDropdown from './MarkdownAutoCompleteDropdown';

interface MarkdownSyntaxHighlightEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  onCursorPositionChange?: (position: number) => void;
  onSpecialAction?: (action: string) => void;
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
}

const MarkdownSyntaxHighlightEditor: React.FC<MarkdownSyntaxHighlightEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  style = {},
  onCursorPositionChange,
  onSpecialAction,
  onFocus
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [, setCursorPosition] = useState(0);
  
  // オートコンプリート関連の状態
  const [showAutoComplete, setShowAutoComplete] = useState(false);
  const [autoCompleteSuggestions, setAutoCompleteSuggestions] = useState<AutoCompleteItem[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [autocompletePosition, setAutoCompletePosition] = useState({ x: 0, y: 0 });

  // シンタックスハイライトを更新
  const updateHighlight = useCallback(() => {
    if (highlightRef.current) {
      const highlightedHtml = MarkdownSyntaxHighlighter.getHighlightedHtml(value || placeholder);
      highlightRef.current.innerHTML = highlightedHtml;
    }
  }, [value, placeholder]);

  // オートコンプリートの表示・非表示を制御
  const updateAutoComplete = useCallback((text: string, cursorPos: number) => {
    try {
      const suggestions = MarkdownAutoCompleter.getSuggestions(text, cursorPos, 8);
      
      if (suggestions.length > 0) {
        setAutoCompleteSuggestions(suggestions);
        setSelectedSuggestionIndex(0);
        
        // カーソル位置を計算してドロップダウンの位置を決定
        if (textareaRef.current) {
          const textarea = textareaRef.current;
          const { left, top } = getCaretCoordinates(textarea, cursorPos);
          setAutoCompletePosition({ x: left, y: top });
        }
        
        setShowAutoComplete(true);
      } else {
        setShowAutoComplete(false);
      }
    } catch (error) {
      console.warn('Failed to update autocomplete:', error);
      setShowAutoComplete(false);
    }
  }, []);

  // テキストエリアの変更処理
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // カーソル位置を記録
    const position = e.target.selectionStart;
    setCursorPosition(position);
    onCursorPositionChange?.(position);
    
    // オートコンプリートを更新
    updateAutoComplete(newValue, position);
  };

  // スクロール同期
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // カーソル位置の変更を監視
  const handleSelectionChange = () => {
    if (textareaRef.current) {
      const position = textareaRef.current.selectionStart;
      setCursorPosition(position);
      onCursorPositionChange?.(position);
      
      // カーソル移動時はオートコンプリートを非表示
      setShowAutoComplete(false);
    }
  };

  // キーボードイベント処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // オートコンプリートが表示されている場合の処理
    if (showAutoComplete && autoCompleteSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex((prev) => 
            prev < autoCompleteSuggestions.length - 1 ? prev + 1 : 0
          );
          return;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex((prev) => 
            prev > 0 ? prev - 1 : autoCompleteSuggestions.length - 1
          );
          return;
        case 'Enter':
        case 'Tab':
          e.preventDefault();
          if (autoCompleteSuggestions[selectedSuggestionIndex]) {
            handleAutoCompleteSelect(autoCompleteSuggestions[selectedSuggestionIndex]);
          }
          return;
        case 'Escape':
          e.preventDefault();
          setShowAutoComplete(false);
          return;
      }
    }

    // キーボードショートカットの処理
    const textarea = e.target as HTMLTextAreaElement;
    const handled = markdownKeyboardShortcuts.handleKeyDown(
      e.nativeEvent,
      value,
      textarea.selectionStart,
      textarea.selectionEnd,
      (newText, newCursorPosition) => {
        onChange(newText);
        // カーソル位置を設定
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
            setCursorPosition(newCursorPosition);
            onCursorPositionChange?.(newCursorPosition);
          }
        }, 0);
      },
      onSpecialAction
    );

    // ショートカットが処理された場合は早期リターン
    if (handled) {
      return;
    }
  };

  // オートコンプリート選択処理
  const handleAutoCompleteSelect = (item: AutoCompleteItem) => {
    try {
      if (!textareaRef.current) return;
      
      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart;
      const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
      
      const { newText, newCursorPosition } = MarkdownAutoCompleter.applySuggestion(
        value, 
        cursorPos, 
        item, 
        selectedText
      );
      
      onChange(newText);
      setShowAutoComplete(false);
      
      // カーソル位置を設定
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    } catch (error) {
      console.warn('Failed to apply autocomplete suggestion:', error);
      setShowAutoComplete(false);
    }
  };

  // カーソル位置の座標を取得するヘルパー関数
  const getCaretCoordinates = (textarea: HTMLTextAreaElement, position: number) => {
    try {
      const div = document.createElement('div');
      const span = document.createElement('span');
      const computed = getComputedStyle(textarea);
      
      div.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre-wrap;
        word-wrap: break-word;
        top: 0;
        left: 0;
      `;
      
      // テキストエリアのスタイルをコピー
      for (const prop of ['font-size', 'font-family', 'line-height', 'padding', 'border', 'box-sizing']) {
        div.style.setProperty(prop, computed.getPropertyValue(prop));
      }
      
      div.textContent = textarea.value.substring(0, position);
      span.textContent = textarea.value.substring(position) || '.';
      div.appendChild(span);
      document.body.appendChild(div);
      
      const rect = textarea.getBoundingClientRect();
      const spanRect = span.getBoundingClientRect();
      const coordinates = {
        left: Math.max(0, rect.left + spanRect.left - div.getBoundingClientRect().left),
        top: Math.max(0, rect.top + spanRect.top - div.getBoundingClientRect().top)
      };
      
      document.body.removeChild(div);
      return coordinates;
    } catch (error) {
      console.warn('Failed to get caret coordinates:', error);
      // フォールバック座標
      const rect = textarea.getBoundingClientRect();
      return {
        left: rect.left + 10,
        top: rect.top + 30
      };
    }
  };

  // エフェクト: ハイライト更新
  useEffect(() => {
    updateHighlight();
  }, [updateHighlight]);

  // エフェクト: スタイル注入
  useEffect(() => {
    const styleId = 'markdown-syntax-highlight-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = MarkdownSyntaxHighlighter.getCssStyles();
      document.head.appendChild(styleElement);
    }

    return () => {
      // クリーンアップは他のコンポーネントも使用している可能性があるため行わない
    };
  }, []);

  const editorStyle: React.CSSProperties = {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
    fontSize: '14px',
    lineHeight: '1.6',
    ...style
  };

  return (
    <div className={`relative ${className}`} style={{ position: 'relative' }}>
      {/* ハイライト表示用のdiv */}
      <div
        ref={highlightRef}
        className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words p-4 text-transparent markdown-editor-highlighted"
        style={{
          ...editorStyle,
          color: 'transparent',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          zIndex: 1
        }}
        aria-hidden="true"
      />
      
      {/* 実際のテキストエリア */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onScroll={handleScroll}
        onSelect={handleSelectionChange}
        onClick={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        placeholder={placeholder}
        className="relative w-full h-full p-4 resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none"
        style={{
          ...editorStyle,
          backgroundColor: 'transparent',
          color: 'rgba(0, 0, 0, 0.8)', // 薄い色でテキストを表示
          zIndex: 2
        }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      
      {/* オートコンプリートドロップダウン */}
      <MarkdownAutoCompleteDropdown
        suggestions={autoCompleteSuggestions}
        onSelect={handleAutoCompleteSelect}
        onClose={() => setShowAutoComplete(false)}
        isVisible={showAutoComplete}
        position={autocompletePosition}
        selectedIndex={selectedSuggestionIndex}
        onSelectionChange={setSelectedSuggestionIndex}
      />
    </div>
  );
};

export default MarkdownSyntaxHighlightEditor;