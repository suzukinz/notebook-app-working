import React, { useState, useEffect, useRef } from 'react';
import { X, Save, MoreVertical, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useHaptics } from '../../hooks/useHaptics';
import { useKeyboardAwareLayout } from '../../hooks/useKeyboardAwareLayout';

interface MobileEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileEditor: React.FC<MobileEditorProps> = ({ isOpen, onClose }) => {
  const { selectedNote, updateNote, currentPage, setCurrentPage } = useNotebookStore();
  const { tapFeedback, successFeedback } = useHaptics();
  const { keyboardAwareStyle, adjustForFocusedElement } = useKeyboardAwareLayout({
    adjustForKeyboard: true,
    minVisibleHeight: 300,
    smoothTransition: true
  });
  
  // uncontrolled componentとして実装
  const [showMenu, setShowMenu] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const initializedRef = useRef<string | null>(null);

  // selectedNoteまたはcurrentPageが変更されたときのみ初期値を設定
  useEffect(() => {
    if (selectedNote && titleInputRef.current && contentTextareaRef.current) {
      const pageKey = `${selectedNote.id}-${currentPage}`;
      if (initializedRef.current !== pageKey) {
        titleInputRef.current.value = selectedNote.title || '';
        contentTextareaRef.current.value = selectedNote.pages[currentPage]?.content || '';
        initializedRef.current = pageKey;
      }
    }
  }, [selectedNote, currentPage]);

  // 保存処理 - DOM から直接値を取得
  const saveNote = () => {
    if (selectedNote && titleInputRef.current && contentTextareaRef.current) {
      const title = titleInputRef.current.value;
      const content = contentTextareaRef.current.value;
      
      tapFeedback();
      updateNote(selectedNote.id, {
        title,
        pages: selectedNote.pages.map((page, index) =>
          index === currentPage ? { ...page, content } : page
        )
      });
      successFeedback();
    }
  };

  // ページナビゲーション
  const handlePrevPage = () => {
    if (currentPage > 0) {
      saveNote(); // 現在のページを保存
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (selectedNote && currentPage < selectedNote.pages.length - 1) {
      saveNote(); // 現在のページを保存
      setCurrentPage(currentPage + 1);
    }
  };

  const handleAddPage = () => {
    if (selectedNote) {
      saveNote(); // 現在のページを保存
      const newPageId = (Math.max(...selectedNote.pages.map(p => parseInt(p.id) || 0)) + 1).toString(); // ✅ ID統一修正
      const newPage = {
        id: newPageId,
        title: `ページ ${newPageId}`,
        content: ''
      };
      
      const updatedPages = [...selectedNote.pages, newPage];
      updateNote(selectedNote.id, { pages: updatedPages });
      setCurrentPage(updatedPages.length - 1); // 新しいページに移動
      
      // 新しいページに移動した後、入力フィールドをクリア
      if (contentTextareaRef.current) {
        contentTextareaRef.current.value = '';
      }
    }
  };

  if (!isOpen || !selectedNote) return null;

  return (
    <div 
      className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col"
      style={keyboardAwareStyle}
    >
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => {
            saveNote();
            onClose();
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <X size={20} />
        </button>
        
        <h2 className="font-semibold text-gray-900 dark:text-white">ノート編集</h2>
        
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* ページナビゲーション */}
      {selectedNote && selectedNote.pages.length > 1 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              ページ {currentPage + 1} / {selectedNote.pages.length}
            </span>
            
            {/* ページ移動ボタン */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="前のページ"
              >
                <ChevronLeft size={14} />
              </button>
              
              <button
                onClick={handleNextPage}
                disabled={currentPage >= selectedNote.pages.length - 1}
                className="flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="次のページ"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            
            <button
              onClick={handleAddPage}
              className="flex items-center px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              title="新しいページを追加"
            >
              <Plus size={12} className="mr-1" />
              追加
            </button>
          </div>
        </div>
      )}

      {/* タイトル入力 */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <input
          ref={titleInputRef}
          type="text"
          defaultValue=""
          placeholder="タイトルを入力..."
          className="w-full text-xl font-semibold bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder-gray-400"
          onFocus={() => adjustForFocusedElement(titleInputRef.current!)}
        />
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 p-4">
        <textarea
          ref={contentTextareaRef}
          defaultValue=""
          placeholder="ここにテキストを入力してください..."
          className="w-full h-full resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none"
          onFocus={() => adjustForFocusedElement(contentTextareaRef.current!)}
          style={{ 
            fontSize: '16px',
            lineHeight: '1.5',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>

      {/* 保存ボタン */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={saveNote}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium"
        >
          保存
        </button>
      </div>

      {/* メニュー */}
      {showMenu && (
        <div className="absolute top-16 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
          <button
            onClick={() => {
              saveNote();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <Save size={16} className="mr-2" />
            保存
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileEditor;