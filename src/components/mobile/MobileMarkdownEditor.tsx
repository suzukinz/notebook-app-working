import React, { useState, useCallback, useRef } from 'react';
import { X, Save, Eye, EyeOff, MoreVertical, Bold, Italic, Link, List, CheckSquare, Hash, Quote, Image, Columns, Zap, Table, Search, Keyboard } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useHaptics } from '../../hooks/useHaptics';
import { useKeyboardAwareLayout } from '../../hooks/useKeyboardAwareLayout';
import MarkdownSyntaxHighlightEditor from './MarkdownSyntaxHighlightEditor';
import MarkdownTableEditorComponent from './MarkdownTableEditor';
import MarkdownSearchReplaceComponent from './MarkdownSearchReplace';
import MarkdownShortcutHelp from './MarkdownShortcutHelp';
import { MarkdownTableEditor, MarkdownTable } from '../../utils/tableEditor';

interface MobileMarkdownEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMarkdownEditor: React.FC<MobileMarkdownEditorProps> = ({ isOpen, onClose }) => {
  const { selectedNote, updateNote } = useNotebookStore();
  const { tapFeedback, successFeedback } = useHaptics();
  const { keyboardAwareStyle, adjustForFocusedElement } = useKeyboardAwareLayout({
    adjustForKeyboard: true,
    minVisibleHeight: 300,
    smoothTransition: true
  });
  
  const [title, setTitle] = useState(selectedNote?.title || '');
  const [content, setContent] = useState(selectedNote?.pages[0]?.content || '');
  const [showPreview, setShowPreview] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [syntaxHighlight, setSyntaxHighlight] = useState(true);
  const [showTableEditor, setShowTableEditor] = useState(false);
  const [editingTable, setEditingTable] = useState<MarkdownTable | null>(null);
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 保存処理
  const handleSave = useCallback(() => {
    if (selectedNote) {
      tapFeedback();
      updateNote(selectedNote.id, {
        title,
        pages: [{
          id: selectedNote.pages[0]?.id || 1,
          title,
          content
        }],
        editorType: 'markdown'
      });
      successFeedback();
    }
  }, [selectedNote, title, content, updateNote, tapFeedback, successFeedback]);

  // 自動保存
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedNote && (title !== selectedNote.title || content !== selectedNote.pages[0]?.content)) {
        handleSave();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [title, content, selectedNote, handleSave]);

  // Markdown記法の挿入
  const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = selectedText || placeholder;
    
    const newContent = content.substring(0, start) + before + replacement + after + content.substring(end);
    setContent(newContent);

    // カーソル位置を調整
    setTimeout(() => {
      const newCursorPos = start + before.length + replacement.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    tapFeedback();
  };

  // テーブル作成
  const createTable = () => {
    const newTable = MarkdownTableEditor.createEmptyTable(3, 3);
    const tableMarkdown = MarkdownTableEditor.tableToMarkdown(newTable);
    const newContent = content + '\n\n' + tableMarkdown + '\n\n';
    setContent(newContent);
    tapFeedback();
  };

  // テーブル編集を開始
  const editTableAtCursor = () => {
    try {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart;
      const tableInfo = MarkdownTableEditor.detectTableAtCursor(content, cursorPosition);
      
      if (tableInfo) {
        setEditingTable(tableInfo.table);
        setShowTableEditor(true);
      } else {
        // カーソル位置にテーブルがない場合は新しいテーブルを作成
        createTable();
      }
      tapFeedback();
    } catch (error) {
      console.warn('Failed to edit table at cursor:', error);
      // フォールバック: 単純にテーブルを作成
      createTable();
    }
  };

  // テーブル編集完了
  const handleTableSave = (updatedTable: MarkdownTable) => {
    try {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart;
      const tableInfo = MarkdownTableEditor.detectTableAtCursor(content, cursorPosition);
      
      if (tableInfo) {
        // 既存のテーブルを置換
        const newMarkdown = MarkdownTableEditor.tableToMarkdown(updatedTable);
        const newContent = content.substring(0, tableInfo.start) + newMarkdown + content.substring(tableInfo.end);
        setContent(newContent);
      }

      setShowTableEditor(false);
      setEditingTable(null);
      successFeedback();
    } catch (error) {
      console.warn('Failed to save table:', error);
      setShowTableEditor(false);
      setEditingTable(null);
    }
  };

  // テーブル編集キャンセル
  const handleTableCancel = () => {
    setShowTableEditor(false);
    setEditingTable(null);
    tapFeedback();
  };

  // 検索・置換を開く
  const openSearchReplace = () => {
    setShowSearchReplace(true);
    tapFeedback();
  };

  // 検索・置換を閉じる
  const closeSearchReplace = () => {
    setShowSearchReplace(false);
    tapFeedback();
  };

  // ショートカットヘルプを開く
  const openShortcutHelp = () => {
    setShowShortcutHelp(true);
    tapFeedback();
  };

  // ショートカットヘルプを閉じる
  const closeShortcutHelp = () => {
    setShowShortcutHelp(false);
    tapFeedback();
  };

  // 指定位置にジャンプ
  const jumpToPosition = (position: number) => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(position, position);
      
      // スクロールして見えるようにする
      const textarea = textareaRef.current;
      const lines = content.substring(0, position).split('\n');
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
      const scrollTop = (lines.length - 1) * lineHeight;
      textarea.scrollTop = Math.max(0, scrollTop - textarea.clientHeight / 2);
    }
  };

  const markdownActions = [
    { icon: <Hash size={18} />, label: '見出し', action: () => insertMarkdown('# ', '', 'ここに見出し') },
    { icon: <Bold size={18} />, label: '太字', action: () => insertMarkdown('**', '**', '太字テキスト') },
    { icon: <Italic size={18} />, label: '斜体', action: () => insertMarkdown('*', '*', '斜体テキスト') },
    { icon: <Link size={18} />, label: 'リンク', action: () => insertMarkdown('[', '](URL)', 'リンクテキスト') },
    { icon: <Quote size={18} />, label: '引用', action: () => insertMarkdown('> ', '', '引用文') },
    { icon: <List size={18} />, label: 'リスト', action: () => insertMarkdown('- ', '', 'リスト項目') },
    { icon: <CheckSquare size={18} />, label: 'チェック', action: () => insertMarkdown('- [ ] ', '', 'タスク項目') },
    { icon: <Table size={18} />, label: 'テーブル', action: editTableAtCursor },
    { icon: <Search size={18} />, label: '検索・置換', action: openSearchReplace },
    { icon: <Image size={18} />, label: '画像', action: () => insertMarkdown('![', '](画像URL)', '画像の説明') }
  ];

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
            tapFeedback();
            handleSave();
            onClose();
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Markdown
          </span>
          <button
            onClick={() => {
              tapFeedback();
              setSplitView(!splitView);
              if (!splitView) {
                setShowPreview(false); // 分割モードに入るときは単体プレビューを無効化
              }
            }}
            className={`p-2 rounded-lg ${splitView ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="分割ビュー"
          >
            <Columns size={20} />
          </button>
          <button
            onClick={() => {
              tapFeedback();
              setShowPreview(!showPreview);
              if (showPreview && splitView) {
                setSplitView(false); // プレビューを閉じるときは分割も無効化
              }
            }}
            className={`p-2 rounded-lg ${showPreview ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            disabled={splitView}
            title={splitView ? '分割ビューモードです' : 'プレビュー'}
          >
            {showPreview ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        
        <button
          onClick={() => {
            tapFeedback();
            setShowMenu(!showMenu);
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* タイトル入力 */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="タイトルを入力..."
          className="w-full text-xl font-semibold bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder-gray-400"
          onFocus={(e) => adjustForFocusedElement(e.target)}
        />
      </div>

      {/* メインエディタエリア */}
      <div className="flex-1 overflow-hidden">
        {splitView ? (
          // 分割ビューモード
          <div className="h-full flex">
            {/* エディット側 */}
            <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
              {syntaxHighlight ? (
                <MarkdownSyntaxHighlightEditor
                  value={content}
                  onChange={setContent}
                  onFocus={(e) => adjustForFocusedElement(e.target)}
                  placeholder={`# Markdownで書こう！

**太字** や *斜体* を使ったり、

- リスト
- 項目

> 引用文

\`\`\`
コードブロック
\`\`\`

などが使えます。`}
                  className="w-full h-full"
                  onSpecialAction={(action) => {
                    if (action === 'find') {
                      openSearchReplace();
                    } else if (action === 'replace') {
                      openSearchReplace();
                    }
                  }}
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`# Markdownで書こう！

**太字** や *斜体* を使ったり、

- リスト
- 項目

> 引用文

\`\`\`
コードブロック
\`\`\`

などが使えます。`}
                  className="w-full h-full p-4 resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none font-mono text-sm leading-relaxed"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace' }}
                />
              )}
            </div>
            
            {/* プレビュー側 */}
            <div className="w-1/2 h-full overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50">
              <div className="prose dark:prose-invert max-w-none">
                <div className="text-gray-900 dark:text-white">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content || '*プレビューするコンテンツがありません*'}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ) : showPreview ? (
          // プレビューモード
          <div className="h-full overflow-y-auto p-4">
            <div className="prose dark:prose-invert max-w-none">
              <div className="text-gray-900 dark:text-white">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content || '*プレビューするコンテンツがありません*'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          // エディットモード
          <div className="w-full h-full">
            {syntaxHighlight ? (
              <MarkdownSyntaxHighlightEditor
                value={content}
                onChange={setContent}
                onFocus={(e) => adjustForFocusedElement(e.target)}
                placeholder={`# Markdownで書こう！

**太字** や *斜体* を使ったり、

- リスト
- 項目

> 引用文

\`\`\`
コードブロック
\`\`\`

などが使えます。`}
                className="w-full h-full"
                onSpecialAction={(action) => {
                  if (action === 'find') {
                    openSearchReplace();
                  } else if (action === 'replace') {
                    openSearchReplace();
                  }
                }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`# Markdownで書こう！

**太字** や *斜体* を使ったり、

- リスト
- 項目

> 引用文

\`\`\`
コードブロック
\`\`\`

などが使えます。`}
                className="w-full h-full p-4 resize-none border-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none font-mono text-sm leading-relaxed"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace' }}
              />
            )}
          </div>
        )}
      </div>

      {/* Markdownツールバー */}
      {showToolbar && !showPreview && !splitView && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-2">
          <div className="flex items-center space-x-1 overflow-x-auto">
            {markdownActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="flex-shrink-0 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={action.label}
              >
                {action.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 分割ビュー用固定ツールバー */}
      {splitView && showToolbar && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 overflow-x-auto flex-1">
              {markdownActions.slice(0, 7).map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={action.label}
                >
                  {action.icon}
                </button>
              ))}
            </div>
            <div className="flex items-center ml-2">
              <button
                onClick={() => {
                  tapFeedback();
                  handleSave();
                }}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                title="保存"
              >
                <Save size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メニュー */}
      {showMenu && (
        <div className="absolute top-16 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-10">
          <button
            onClick={() => {
              tapFeedback();
              setShowToolbar(!showToolbar);
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <span className="text-sm">ツールバー{showToolbar ? '非表示' : '表示'}</span>
          </button>
          
          <button
            onClick={() => {
              tapFeedback();
              setSplitView(!splitView);
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <Columns size={16} className="mr-2" />
            <span className="text-sm">分割ビュー{splitView ? '無効' : '有効'}</span>
          </button>
          
          <button
            onClick={() => {
              tapFeedback();
              setSyntaxHighlight(!syntaxHighlight);
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <Zap size={16} className="mr-2" />
            <span className="text-sm">シンタックスハイライト{syntaxHighlight ? '無効' : '有効'}</span>
          </button>
          
          <button
            onClick={() => {
              tapFeedback();
              openSearchReplace();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <Search size={16} className="mr-2" />
            <span className="text-sm">検索・置換</span>
          </button>
          
          <button
            onClick={() => {
              tapFeedback();
              openShortcutHelp();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <Keyboard size={16} className="mr-2" />
            <span className="text-sm">キーボードショートカット</span>
          </button>
          
          <button
            onClick={() => {
              tapFeedback();
              handleSave();
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
          >
            <Save size={16} className="mr-2" />
            <span className="text-sm">保存</span>
          </button>
        </div>
      )}

      {/* テーブルエディタ */}
      {editingTable && (
        <MarkdownTableEditorComponent
          table={editingTable}
          onSave={handleTableSave}
          onCancel={handleTableCancel}
          isOpen={showTableEditor}
        />
      )}

      {/* 検索・置換 */}
      <MarkdownSearchReplaceComponent
        isOpen={showSearchReplace}
        onClose={closeSearchReplace}
        text={content}
        onTextChange={setContent}
        onJumpToPosition={jumpToPosition}
        currentPosition={textareaRef.current?.selectionStart || 0}
      />

      {/* ショートカットヘルプ */}
      <MarkdownShortcutHelp
        isOpen={showShortcutHelp}
        onClose={closeShortcutHelp}
      />
    </div>
  );
};

export default MobileMarkdownEditor;