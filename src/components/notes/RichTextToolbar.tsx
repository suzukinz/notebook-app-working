import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Quote, Code, Code2,
  Link, Image, Table,
  Type, Palette, Highlighter,
  Heading1, Heading2, Heading3,
  Indent, Outdent,
  Undo, Redo,
  Copy, Scissors, Clipboard,
  MoreHorizontal
} from 'lucide-react';
import InputDialog from '../ui/InputDialog';
import ColorPicker from '../ui/ColorPicker';
import HighlightColorPicker from '../ui/HighlightColorPicker';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface RichTextToolbarProps {
  contentEditableRef?: React.RefObject<HTMLDivElement>;
  onContentChange?: () => void;
  className?: string;
}

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ 
  contentEditableRef,
  onContentChange,
  className = '' 
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const fontSizeButtonRef = useRef<HTMLButtonElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const highlightButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [visibleButtons, setVisibleButtons] = useState<number>(20);
  const [isToolbarHidden, setIsToolbarHidden] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const overflowButtonRef = useRef<HTMLButtonElement>(null);

  // レスポンシブ対応：実際のツールバー幅に応じて表示するボタン数を動的調整
  useEffect(() => {
    const updateVisibleButtons = () => {
      if (!toolbarRef.current) return;
      
      const toolbarWidth = toolbarRef.current.clientWidth;
      const buttonWidth = 44; // ボタン1つあたりの幅（padding + icon + margin）
      const overflowButtonWidth = 50; // オーバーフローボタンの幅
      const marginSpace = 80; // 余裕のためのマージンを減らす
      
      // 画面幅が非常に狭い場合はツールバー全体を隠す（UpNote風）
      if (toolbarWidth < 350) {
        setIsToolbarHidden(true);
        setVisibleButtons(0);
        return;
      }
      
      setIsToolbarHidden(false);
      
      // 利用可能な幅からオーバーフローボタンとマージンを引いた分でボタン数を計算
      const availableWidth = toolbarWidth - overflowButtonWidth - marginSpace;
      const maxButtons = Math.max(2, Math.floor(availableWidth / buttonWidth)); // 最低2つは表示
      
      setVisibleButtons(maxButtons);
    };

    // 初期計算
    setTimeout(updateVisibleButtons, 100); // DOMの描画完了を待つ
    
    // ResizeObserverでツールバーのサイズ変更を監視
    const resizeObserver = new ResizeObserver(updateVisibleButtons);
    if (toolbarRef.current) {
      resizeObserver.observe(toolbarRef.current);
    }
    
    // フォールバックとしてwindow resizeも監視
    window.addEventListener('resize', updateVisibleButtons);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateVisibleButtons);
    };
  }, []);

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.toolbar-dropdown') && !target.closest('button')) {
        setShowFontSizePicker(false);
        setShowColorPicker(false);
        setShowHighlightPicker(false);
        setShowOverflowMenu(false);
      }
    };

    if (showFontSizePicker || showColorPicker || showHighlightPicker || showOverflowMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return;
  }, [showFontSizePicker, showColorPicker, showHighlightPicker, showOverflowMenu]);

  // 実行コマンド
  const execCommand = (command: string, value?: string) => {
    if (contentEditableRef?.current) {
      contentEditableRef.current.focus();
      document.execCommand(command, false, value);
      if (onContentChange) {
        onContentChange();
      }
    }
  };

  // 書式設定関数
  const formatBold = () => execCommand('bold');
  const formatItalic = () => execCommand('italic');
  const formatUnderline = () => execCommand('underline');
  const formatStrikethrough = () => execCommand('strikeThrough');
  const formatHighlight = (color: string = '#FFFF00') => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      execCommand('insertHTML', `<mark style="background-color: ${color}; padding: 2px;">${selection.toString()}</mark>`);
    }
  };

  // 見出し
  const formatHeading = (level: number) => {
    if (contentEditableRef?.current) {
      contentEditableRef.current.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 選択されたテキストまたは現在行を取得
        let text = selection.toString();
        if (!text) {
          const lineStart = range.startContainer.textContent || '';
          text = lineStart || `見出し${level}`;
        }
        
        // 見出しのスタイルを定義
        const headingStyles = {
          1: 'font-size: 2em; font-weight: bold; margin: 0.67em 0; line-height: 1.2;',
          2: 'font-size: 1.5em; font-weight: bold; margin: 0.83em 0; line-height: 1.2;',
          3: 'font-size: 1.17em; font-weight: bold; margin: 1em 0; line-height: 1.2;',
          4: 'font-size: 1em; font-weight: bold; margin: 1.33em 0; line-height: 1.2;',
          5: 'font-size: 0.83em; font-weight: bold; margin: 1.67em 0; line-height: 1.2;',
          6: 'font-size: 0.67em; font-weight: bold; margin: 2.33em 0; line-height: 1.2;'
        };
        
        // 見出しのHTMLを作成
        const headingHTML = `<h${level} style="${headingStyles[level as keyof typeof headingStyles] || headingStyles[1]}">${text}</h${level}>`;
        
        if (selection.toString()) {
          range.deleteContents();
        }
        
        const fragment = range.createContextualFragment(headingHTML);
        range.insertNode(fragment);
        
        // カーソル位置を調整
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      if (onContentChange) onContentChange();
    }
  };

  // リスト
  const formatUnorderedList = () => {
    if (contentEditableRef?.current) {
      contentEditableRef.current.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 選択されたテキストを取得
        let text = selection.toString().trim();
        if (!text) {
          text = ''; // 空のリストアイテムを作成
        }
        
        // リスト項目のHTMLを作成
        const listHTML = `<ul style="margin: 8px 0; padding-left: 24px;"><li style="margin: 4px 0; list-style-type: disc;">${text || '<br>'}</li></ul>`;
        
        if (selection.toString()) {
          range.deleteContents();
        }
        
        const fragment = range.createContextualFragment(listHTML);
        range.insertNode(fragment);
        
        // カーソル位置をリスト項目内に設定
        const li = fragment.querySelector('li');
        if (li) {
          range.setStart(li, li.childNodes.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
      if (onContentChange) onContentChange();
    }
  };
  
  const formatOrderedList = () => {
    if (contentEditableRef?.current) {
      contentEditableRef.current.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 選択されたテキストを取得
        let text = selection.toString().trim();
        if (!text) {
          text = ''; // 空のリストアイテムを作成
        }
        
        // リスト項目のHTMLを作成（CSSカウンターを使用して正しい連番を確保）
        const listHTML = `<ol style="margin: 8px 0; padding-left: 24px; counter-reset: list-counter;"><li style="margin: 4px 0; display: list-item; list-style-type: decimal;">${text || '<br>'}</li></ol>`;
        
        if (selection.toString()) {
          range.deleteContents();
        }
        
        const fragment = range.createContextualFragment(listHTML);
        range.insertNode(fragment);
        
        // カーソル位置をリスト項目内に設定
        const li = fragment.querySelector('li');
        if (li) {
          range.setStart(li, li.childNodes.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
      
      if (onContentChange) onContentChange();
    }
  };

  // テーブル
  const insertTable = () => {
    const tableHTML = `
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tr>
          <td style="border: 1px solid #e5e7eb; padding: 8px;">セル1</td>
          <td style="border: 1px solid #e5e7eb; padding: 8px;">セル2</td>
          <td style="border: 1px solid #e5e7eb; padding: 8px;">セル3</td>
        </tr>
        <tr>
          <td style="border: 1px solid #e5e7eb; padding: 8px;">セル4</td>
          <td style="border: 1px solid #e5e7eb; padding: 8px;">セル5</td>
          <td style="border: 1px solid #e5e7eb; padding: 8px;">セル6</td>
        </tr>
      </table>
    `;
    execCommand('insertHTML', tableHTML);
  };

  // リンク
  const insertLink = () => {
    setShowLinkDialog(true);
  };

  const handleLinkConfirm = (url: string) => {
    if (url) {
      const selection = window.getSelection();
      const text = selection && selection.toString() ? selection.toString() : 'リンクテキスト';
      execCommand('insertHTML', `<a href="${url}" style="color: #3b82f6; text-decoration: underline;" target="_blank">${text}</a>`);
    }
    setShowLinkDialog(false);
  };

  // 画像（簡単バージョン）
  const insertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          const alt = file.name.replace(/\.[^/.]+$/, '') || '画像';
          if (contentEditableRef?.current) {
            contentEditableRef.current.focus();
            execCommand('insertHTML', `<img src="${base64}" alt="${alt}" style="max-width: 100%; height: auto; margin: 16px 0; border-radius: 8px;">`);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };


  // 色設定
  const applyColor = (color: string) => {
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  // ハイライト設定
  const applyHighlight = (color: string) => {
    formatHighlight(color);
    setShowHighlightPicker(false);
  };

  // フォントサイズ
  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

  const applyFontSize = (size: string) => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      execCommand('insertHTML', `<span style="font-size: ${size}">${selection.toString()}</span>`);
    }
    setShowFontSizePicker(false);
  };

  // アライメント
  const formatAlign = (alignment: string) => {
    const command = alignment === 'left' ? 'justifyLeft' :
                   alignment === 'center' ? 'justifyCenter' :
                   alignment === 'right' ? 'justifyRight' : 'justifyFull';
    execCommand(command);
  };

  // インデント
  const formatIndent = () => execCommand('indent');
  const formatOutdent = () => execCommand('outdent');

  // 引用
  const formatQuote = () => {
    if (contentEditableRef?.current) {
      contentEditableRef.current.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 選択されたテキストまたは現在行を取得
        let text = selection.toString();
        if (!text) {
          const lineStart = range.startContainer.textContent || '';
          text = lineStart || '引用文';
        }
        
        // 引用のHTMLを作成
        const quoteHTML = `
          <blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0; font-style: italic; color: #6b7280; background: #f9fafb; padding: 12px 16px; border-radius: 4px;">
            ${text}
          </blockquote>
        `;
        
        if (selection.toString()) {
          range.deleteContents();
        }
        
        const fragment = range.createContextualFragment(quoteHTML);
        range.insertNode(fragment);
        
        // カーソル位置を調整
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      if (onContentChange) onContentChange();
    }
  };
  
  // コードブロック
  const formatCodeBlock = () => {
    if (contentEditableRef?.current) {
      contentEditableRef.current.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 選択されたテキストまたは現在行を取得
        let text = selection.toString();
        if (!text) {
          const lineStart = range.startContainer.textContent || '';
          text = lineStart || 'console.log("Hello World");';
        }
        
        // コードブロックのHTMLを作成
        const codeHTML = `
          <pre style="background: #1f2937; color: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; font-family: 'Courier New', monospace; font-size: 14px;"><code>${text}</code></pre>
        `;
        
        if (selection.toString()) {
          range.deleteContents();
        }
        
        const fragment = range.createContextualFragment(codeHTML);
        range.insertNode(fragment);
        
        // カーソル位置を調整
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      if (onContentChange) onContentChange();
    }
  };

  // インラインコード
  const formatInlineCode = () => {
    if (contentEditableRef?.current) {
      contentEditableRef.current.focus();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 選択されたテキストを取得
        let text = selection.toString();
        if (!text) {
          text = 'code';
        }
        
        // インラインコードのHTMLを作成
        const inlineCodeHTML = `<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9em; color: #e11d48;">${text}</code>`;
        
        if (selection.toString()) {
          range.deleteContents();
        }
        
        const fragment = range.createContextualFragment(inlineCodeHTML);
        range.insertNode(fragment);
        
        // カーソル位置を調整
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      if (onContentChange) onContentChange();
    }
  };

  // ドロップダウン位置計算
  const calculatePosition = (buttonRef: React.RefObject<HTMLButtonElement>, dropdownHeight: number) => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    
    // 画面右端を超えないよう調整
    const maxLeft = window.innerWidth - 250; // ドロップダウンの幅を考慮
    const left = Math.min(rect.left, maxLeft);
    
    if (spaceAbove > dropdownHeight && spaceAbove > spaceBelow) {
      setDropdownPosition({ top: rect.top - dropdownHeight - 8, left });
    } else {
      setDropdownPosition({ top: rect.bottom + 8, left });
    }
  };

  // キーボードショートカット設定（関数定義の後）
  const editorShortcuts = [
    {
      key: 'b',
      ctrl: true,
      action: formatBold,
      description: '太字'
    },
    {
      key: 'i',
      ctrl: true,
      action: formatItalic,
      description: '斜体'
    },
    {
      key: 'u',
      ctrl: true,
      action: formatUnderline,
      description: '下線'
    },
    {
      key: '1',
      ctrl: true,
      alt: true,
      action: () => formatHeading(1),
      description: '見出し1'
    },
    {
      key: '2',
      ctrl: true,
      alt: true,
      action: () => formatHeading(2),
      description: '見出し2'
    },
    {
      key: '3',
      ctrl: true,
      alt: true,
      action: () => formatHeading(3),
      description: '見出し3'
    },
    {
      key: 'l',
      ctrl: true,
      shift: true,
      action: formatUnorderedList,
      description: '箇条書きリスト'
    },
    {
      key: 'o',
      ctrl: true,
      shift: true,
      action: formatOrderedList,
      description: '番号付きリスト'
    },
    {
      key: 'q',
      ctrl: true,
      shift: true,
      action: formatQuote,
      description: '引用'
    },
    {
      key: '`',
      ctrl: true,
      action: formatInlineCode,
      description: 'インラインコード'
    }
  ];

  useKeyboardShortcuts(editorShortcuts);

  // ツールバーのボタン定義
  const toolbarButtons = [
    // 元に戻す・やり直し
    { group: 'undo', buttons: [
      { icon: Undo, onClick: () => execCommand('undo'), title: '元に戻す (Ctrl+Z)' },
      { icon: Redo, onClick: () => execCommand('redo'), title: 'やり直し (Ctrl+Y)' },
    ]},
    // クリップボード操作
    { group: 'clipboard', buttons: [
      { icon: Scissors, onClick: () => execCommand('cut'), title: '切り取り (Ctrl+X)' },
      { icon: Copy, onClick: () => execCommand('copy'), title: 'コピー (Ctrl+C)' },
      { icon: Clipboard, onClick: () => execCommand('paste'), title: '貼り付け (Ctrl+V)' },
    ]},
    // フォントサイズ
    { group: 'font', buttons: [
      { icon: Type, onClick: () => { calculatePosition(fontSizeButtonRef, 120); setShowFontSizePicker(!showFontSizePicker); }, title: 'フォントサイズ', ref: fontSizeButtonRef },
    ]},
    // 基本書式
    { group: 'format', buttons: [
      { icon: Bold, onClick: formatBold, title: '太字 (Ctrl+B)' },
      { icon: Italic, onClick: formatItalic, title: '斜体 (Ctrl+I)' },
      { icon: Underline, onClick: formatUnderline, title: '下線 (Ctrl+U)' },
      { icon: Strikethrough, onClick: formatStrikethrough, title: '取り消し線' },
    ]},
    // 色・ハイライト
    { group: 'color', buttons: [
      { icon: Palette, onClick: () => { calculatePosition(colorButtonRef, 150); setShowColorPicker(!showColorPicker); }, title: 'テキスト色', ref: colorButtonRef },
      { icon: Highlighter, onClick: () => { calculatePosition(highlightButtonRef, 120); setShowHighlightPicker(!showHighlightPicker); }, title: 'ハイライト', ref: highlightButtonRef },
    ]},
    // 見出し
    { group: 'heading', buttons: [
      { icon: Heading1, onClick: () => formatHeading(1), title: '見出し1' },
      { icon: Heading2, onClick: () => formatHeading(2), title: '見出し2' },
      { icon: Heading3, onClick: () => formatHeading(3), title: '見出し3' },
    ]},
    // 配置
    { group: 'align', buttons: [
      { icon: AlignLeft, onClick: () => formatAlign('left'), title: '左揃え' },
      { icon: AlignCenter, onClick: () => formatAlign('center'), title: '中央揃え' },
      { icon: AlignRight, onClick: () => formatAlign('right'), title: '右揃え' },
      { icon: AlignJustify, onClick: () => formatAlign('justify'), title: '両端揃え' },
    ]},
    // リスト・インデント
    { group: 'list', buttons: [
      { icon: List, onClick: formatUnorderedList, title: '箇条書きリスト' },
      { icon: ListOrdered, onClick: formatOrderedList, title: '番号付きリスト' },
      { icon: Indent, onClick: formatIndent, title: 'インデント' },
      { icon: Outdent, onClick: formatOutdent, title: 'インデント解除' },
    ]},
    // 特殊書式
    { group: 'special', buttons: [
      { icon: Quote, onClick: formatQuote, title: '引用' },
      { icon: Code2, onClick: formatCodeBlock, title: 'コードブロック' },
      { icon: Code, onClick: formatInlineCode, title: 'インラインコード' },
    ]},
    // 挿入
    { group: 'insert', buttons: [
      { icon: Link, onClick: insertLink, title: 'リンク挿入 (Ctrl+K)' },
      { icon: Image, onClick: insertImage, title: '画像挿入' },
      { icon: Table, onClick: insertTable, title: 'テーブル挿入' },
    ]},
  ];

  // 表示するボタンとオーバーフローメニューに入れるボタンを分ける
  let buttonCount = 0;
  const visibleGroups: typeof toolbarButtons = [];
  const overflowGroups: typeof toolbarButtons = [];

  toolbarButtons.forEach(group => {
    if (buttonCount + group.buttons.length <= visibleButtons) {
      visibleGroups.push(group);
      buttonCount += group.buttons.length;
    } else {
      overflowGroups.push(group);
    }
  });

  // ツールバーが隠れている場合はフローティングボタンを表示
  if (isToolbarHidden) {
    return (
      <div className={`sticky top-0 z-10 p-2 ${className}`}>
        <div className="flex justify-end">
          <button
            ref={overflowButtonRef}
            onClick={() => {
              setShowOverflowMenu(!showOverflowMenu);
              if (!showOverflowMenu && overflowButtonRef.current) {
                const rect = overflowButtonRef.current.getBoundingClientRect();
                setDropdownPosition({ 
                  top: rect.bottom + 8, 
                  left: Math.min(rect.left, window.innerWidth - 300)
                });
              }
            }}
            className="p-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition-all text-gray-600 hover:text-gray-800 min-w-[40px] h-10 flex items-center justify-center"
            title="書式設定オプション"
            aria-label="書式設定オプションを表示"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
        
        {/* フローティング状態でもオーバーフローメニューを表示 */}
        {showOverflowMenu && ReactDOM.createPortal(
          <div 
            className="toolbar-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-[999999] max-w-xs"
            style={{ 
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <div className="space-y-2">
              {toolbarButtons.map((group, groupIndex) => (
                <div key={group.group} className={`${groupIndex > 0 ? 'border-t border-gray-200 pt-2' : ''}`}>
                  <div className="grid grid-cols-4 gap-1">
                    {group.buttons.map((button, buttonIndex) => (
                      <button
                        key={buttonIndex}
                        onClick={() => {
                          button.onClick();
                          setShowOverflowMenu(false);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600 hover:text-gray-800 flex items-center justify-center"
                        title={button.title}
                        aria-label={button.title}
                      >
                        <button.icon size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
        
        {/* その他のドロップダウンメニューも表示 */}
        {/* フォントサイズピッカー */}
        {showFontSizePicker && ReactDOM.createPortal(
          <div 
            className="toolbar-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-[999999]"
            style={{ 
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {fontSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => applyFontSize(size)}
                  className="px-3 py-2 text-sm hover:bg-gray-100 rounded text-gray-600 hover:text-gray-800 min-w-[60px] border border-transparent hover:border-gray-300"
                >
                  {size}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
        
        {/* カラーピッカー */}
        {showColorPicker && ReactDOM.createPortal(
          <div 
            className="toolbar-dropdown fixed z-[999999]"
            style={{ 
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <ColorPicker onColorSelect={applyColor} />
          </div>,
          document.body
        )}

        {/* ハイライトピッカー */}
        {showHighlightPicker && ReactDOM.createPortal(
          <div 
            className="toolbar-dropdown fixed z-[999999]"
            style={{ 
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <HighlightColorPicker onColorSelect={applyHighlight} />
          </div>,
          document.body
        )}
        
        {/* リンクダイアログ */}
        <InputDialog
          isOpen={showLinkDialog}
          title="リンクを挿入"
          placeholder="URLを入力してください"
          onConfirm={handleLinkConfirm}
          onCancel={() => setShowLinkDialog(false)}
        />
      </div>
    );
  }

  return (
    <div ref={toolbarRef} className={`bg-gray-50/80 backdrop-blur-sm border-b border-gray-200/60 p-2 sticky top-0 z-10 transition-all duration-200 ${className}`}>
      <div className="flex items-center gap-1 min-h-[44px] overflow-hidden">
        {/* 表示するボタングループ */}
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.group} className={`flex items-center flex-shrink-0 ${groupIndex < visibleGroups.length - 1 ? 'border-r border-gray-200 pr-2 mr-2' : ''}`}>
            {group.buttons.map((button, buttonIndex) => (
              <button
                key={buttonIndex}
                ref={'ref' in button ? button.ref : undefined}
                onClick={button.onClick}
                className="p-2 hover:bg-white/60 rounded-md transition-colors text-gray-600 hover:text-gray-800 min-w-[40px] h-10 flex items-center justify-center flex-shrink-0"
                title={button.title}
                aria-label={button.title}
              >
                <button.icon size={16} />
              </button>
            ))}
          </div>
        ))}

        {/* オーバーフローメニューボタン - 常に表示 */}
        <div className="relative ml-auto flex-shrink-0">
          <button
            ref={overflowButtonRef}
            onClick={() => {
              setShowOverflowMenu(!showOverflowMenu);
              if (!showOverflowMenu && overflowButtonRef.current) {
                const rect = overflowButtonRef.current.getBoundingClientRect();
                setDropdownPosition({ 
                  top: rect.bottom + 8, 
                  left: Math.min(rect.left, window.innerWidth - 300)
                });
              }
            }}
            className="p-2 hover:bg-white/60 rounded-md transition-colors text-gray-600 hover:text-gray-800 min-w-[40px] h-10 flex items-center justify-center border border-gray-300"
            title="その他のオプション"
            aria-label="その他のオプションを表示"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* オーバーフローメニュー */}
      {showOverflowMenu && overflowGroups.length > 0 && ReactDOM.createPortal(
        <div 
          className="toolbar-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-[999999] max-w-xs"
          style={{ 
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className="space-y-2">
            {overflowGroups.map((group, groupIndex) => (
              <div key={group.group} className={`${groupIndex > 0 ? 'border-t border-gray-200 pt-2' : ''}`}>
                <div className="grid grid-cols-4 gap-1">
                  {group.buttons.map((button, buttonIndex) => (
                    <button
                      key={buttonIndex}
                      onClick={() => {
                        button.onClick();
                        setShowOverflowMenu(false);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600 hover:text-gray-800 flex items-center justify-center"
                      title={button.title}
                      aria-label={button.title}
                    >
                      <button.icon size={16} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* ダイアログ */}
      <InputDialog
        isOpen={showLinkDialog}
        title="リンクを挿入"
        placeholder="URLを入力してください"
        onConfirm={handleLinkConfirm}
        onCancel={() => setShowLinkDialog(false)}
      />
      
      {/* ポータルでドロップダウンを表示 */}
      {showFontSizePicker && ReactDOM.createPortal(
        <div 
          className="toolbar-dropdown fixed bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-[999999]"
          style={{ 
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {fontSizes.map((size) => (
              <button
                key={size}
                onClick={() => applyFontSize(size)}
                className="px-3 py-2 text-sm hover:bg-gray-100 rounded text-gray-600 hover:text-gray-800 min-w-[60px] border border-transparent hover:border-gray-300"
              >
                {size}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
      
      {/* カラーピッカー */}
      {showColorPicker && ReactDOM.createPortal(
        <div 
          className="toolbar-dropdown fixed z-[999999]"
          style={{ 
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <ColorPicker onColorSelect={applyColor} />
        </div>,
        document.body
      )}

      {/* ハイライトピッカー */}
      {showHighlightPicker && ReactDOM.createPortal(
        <div 
          className="toolbar-dropdown fixed z-[999999]"
          style={{ 
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <HighlightColorPicker onColorSelect={applyHighlight} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default RichTextToolbar;