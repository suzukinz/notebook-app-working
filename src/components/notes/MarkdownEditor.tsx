import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github.css';
import { 
  Bold, Italic, List, ListOrdered, Link2, Image, Code, 
  Quote, Minus, Table, Hash, Eye, EyeOff, FileText
} from 'lucide-react';

interface MarkdownEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  isEditing: boolean;
}

interface ToolbarButton {
  icon: React.ReactNode;
  label: string;
  action: () => void;
  shortcut?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  content, 
  onContentChange,
  isEditing 
}) => {
  const [isPreview, setIsPreview] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 初期コンテンツの設定
  useEffect(() => {
    if (textareaRef.current && content !== textareaRef.current.value) {
      // フォーカスがある場合は更新しない
      if (document.activeElement !== textareaRef.current) {
        textareaRef.current.value = content;
      }
    }
  }, [content]);

  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = before + selectedText + after;
    
    const newValue = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    textarea.value = newValue;
    onContentChange(newValue);
    
    // カーソル位置を調整
    const cursorPosition = selectedText ? start + newText.length : start + before.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
    textarea.focus();
  }, [onContentChange]);

  const insertLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || 'リンクテキスト';
    const url = prompt('URLを入力してください:', 'https://');
    
    if (url) {
      const linkText = `[${selectedText}](${url})`;
      const newValue = textarea.value.substring(0, start) + linkText + textarea.value.substring(end);
      textarea.value = newValue;
      onContentChange(newValue);
      textarea.focus();
    }
  }, [onContentChange]);

  const insertImage = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const url = prompt('画像のURLを入力してください:', 'https://');
    if (url) {
      const alt = prompt('代替テキストを入力してください:', '画像');
      insertText(`![${alt || '画像'}](${url})\n`);
    }
  }, [insertText]);

  const insertTable = useCallback(() => {
    const cols = prompt('列数を入力してください:', '3');
    const rows = prompt('行数を入力してください:', '3');
    
    if (cols && rows) {
      const colCount = parseInt(cols, 10);
      const rowCount = parseInt(rows, 10);
      
      let table = '\n';
      // Header
      table += '| ' + Array(colCount).fill('Header').join(' | ') + ' |\n';
      table += '| ' + Array(colCount).fill('---').join(' | ') + ' |\n';
      // Rows
      for (let i = 0; i < rowCount; i++) {
        table += '| ' + Array(colCount).fill('Cell').join(' | ') + ' |\n';
      }
      
      insertText(table);
    }
  }, [insertText]);

  const toolbarButtons: ToolbarButton[] = [
    { icon: <Bold size={18} />, label: '太字', action: () => insertText('**', '**'), shortcut: 'Ctrl+B' },
    { icon: <Italic size={18} />, label: '斜体', action: () => insertText('*', '*'), shortcut: 'Ctrl+I' },
    { icon: <List size={18} />, label: '箇条書き', action: () => insertText('\n- ') },
    { icon: <ListOrdered size={18} />, label: '番号付きリスト', action: () => insertText('\n1. ') },
    { icon: <Link2 size={18} />, label: 'リンク', action: insertLink, shortcut: 'Ctrl+K' },
    { icon: <Image size={18} />, label: '画像', action: insertImage },
    { icon: <Code size={18} />, label: 'コード', action: () => insertText('`', '`') },
    { icon: <Quote size={18} />, label: '引用', action: () => insertText('\n> ') },
    { icon: <Minus size={18} />, label: '水平線', action: () => insertText('\n---\n') },
    { icon: <Table size={18} />, label: 'テーブル', action: insertTable },
    { icon: <Hash size={18} />, label: '見出し', action: () => insertText('\n## ') },
  ];

  // 目次の生成
  const generateToc = useCallback(() => {
    const lines = content.split('\n');
    const headings = lines.filter(line => line.match(/^#{1,6}\s/));
    return headings.map((heading, index) => {
      const level = heading.match(/^#+/)?.[0].length || 1;
      const text = heading.replace(/^#+\s/, '');
      return { level, text, id: `heading-${index}` };
    });
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(e.target.value);
  };

  if (!isEditing) {
    return (
      <div className="p-6 prose prose-lg max-w-none dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* ツールバー */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1">
            {toolbarButtons.map((button, index) => (
              <button
                key={index}
                onClick={button.action}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title={`${button.label}${button.shortcut ? ` (${button.shortcut})` : ''}`}
              >
                {button.icon}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowToc(!showToc)}
              className={`p-2 rounded transition-colors ${
                showToc ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 
                'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="目次"
            >
              <FileText size={18} />
            </button>
            
            <button
              onClick={() => setIsPreview(!isPreview)}
              className={`p-2 rounded transition-colors ${
                isPreview ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 
                'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={isPreview ? '編集モード' : 'プレビュー'}
            >
              {isPreview ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* 目次サイドバー */}
        {showToc && (
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">目次</h3>
            <div className="space-y-1">
              {generateToc().map((heading, index) => (
                <div
                  key={index}
                  className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                  onClick={() => {
                    // 見出しへスクロール
                    const element = document.getElementById(heading.id);
                    element?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <span className="text-sm">{heading.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* エディタ/プレビュー */}
        <div className="flex-1 overflow-hidden">
          {isPreview ? (
            <div className="h-full overflow-y-auto p-6 prose prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({children, ...props}) => <h1 id={`heading-${props.key}`} {...props}>{children}</h1>,
                  h2: ({children, ...props}) => <h2 id={`heading-${props.key}`} {...props}>{children}</h2>,
                  h3: ({children, ...props}) => <h3 id={`heading-${props.key}`} {...props}>{children}</h3>,
                  h4: ({children, ...props}) => <h4 id={`heading-${props.key}`} {...props}>{children}</h4>,
                  h5: ({children, ...props}) => <h5 id={`heading-${props.key}`} {...props}>{children}</h5>,
                  h6: ({children, ...props}) => <h6 id={`heading-${props.key}`} {...props}>{children}</h6>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              className="w-full h-full p-4 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-0 resize-none focus:outline-none"
              placeholder="Markdownで記述..."
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkdownEditor;