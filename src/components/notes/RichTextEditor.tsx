import React, { useState, useRef, useCallback, useEffect } from 'react';
import RichTextToolbar from './RichTextToolbar';
import { isImageFile, resizeImage } from '../../utils/imageUtils';
import { validateImageFile, validateBase64Image } from '../../utils/validation';

interface RichTextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  isEditing: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = React.memo(({ 
  content, 
  onContentChange,
  isEditing 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // contentが変更されたら初期化フラグをリセット
  useEffect(() => {
    if (document.activeElement !== editorRef.current) {
      setIsInitialized(false);
    }
  }, [content]);

  // 初期コンテンツの設定と更新
  useEffect(() => {
    if (editorRef.current) {
      if (!isInitialized) {
        console.log(`🎬 エディタを初期化: "${content.substring(0, 50)}..."`);
        editorRef.current.innerHTML = content;
        setIsInitialized(true);
        editorRef.current.focus();
        
        // 既存の画像のドラッグを無効化
        const images = editorRef.current.querySelectorAll('img');
        images.forEach(img => {
          (img as HTMLImageElement).draggable = false;
          (img as HTMLImageElement).style.cursor = 'pointer';
          (img as HTMLImageElement).title = 'クリックしてサイズ変更';
        });
      } else if (document.activeElement !== editorRef.current && editorRef.current.innerHTML !== content) {
        console.log(`🔄 フォーカス外エディタ更新: "${content.substring(0, 50)}..."`);
        editorRef.current.innerHTML = content;
        
        // 既存の画像のドラッグを無効化
        const images = editorRef.current.querySelectorAll('img');
        images.forEach(img => {
          (img as HTMLImageElement).draggable = false;
          (img as HTMLImageElement).style.cursor = 'pointer';
          (img as HTMLImageElement).title = 'クリックしてサイズ変更';
        });
      }
    }
  }, [content, isInitialized]);

  // リアルタイムコンテンツ変更（パフォーマンス最優先）
  const handleContentChange = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      const startTime = performance.now();
      console.log(`✏️ コンテンツ変更検出: "${newContent.substring(0, 30)}..."`);
      
      // 即座に親コンポーネントに通知
      onContentChange(newContent);
      
      const endTime = performance.now();
      console.log(`⚡ コンテンツ更新完了: ${(endTime - startTime).toFixed(2)}ms`);
    }
  }, [onContentChange]);

  // 画像クリック時のリサイズ処理
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    if (target.tagName === 'IMG') {
      e.preventDefault();
      const img = target as HTMLImageElement;
      
      // リサイズオプションを表示
      const sizes = [
        { label: '小 (25%)', scale: 0.25 },
        { label: '中 (50%)', scale: 0.5 },
        { label: '大 (75%)', scale: 0.75 },
        { label: '原寸 (100%)', scale: 1 },
      ];
      
      // シンプルなポップアップメニュー
      const menu = document.createElement('div');
      menu.className = 'absolute bg-white border border-gray-300 rounded-lg shadow-lg p-1 z-50';
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      
      // クリック外で閉じる関数を先に定義
      const closeMenu = (e: MouseEvent) => {
        if (!menu.contains(e.target as Node)) {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
          document.removeEventListener('click', closeMenu);
        }
      };
      
      sizes.forEach(size => {
        const button = document.createElement('button');
        button.className = 'block w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm';
        button.textContent = size.label;
        button.onclick = () => {
          const originalWidth = img.naturalWidth || 800;
          const newWidth = Math.round(originalWidth * size.scale);
          img.style.width = `${newWidth}px`;
          img.style.height = 'auto';
          img.style.maxWidth = '100%';
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
          document.removeEventListener('click', closeMenu);
          handleContentChange();
        };
        menu.appendChild(button);
      });
      
      document.body.appendChild(menu);
      
      // 次のティックでイベントリスナーを追加
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
    }
  }, [handleContentChange]);

  // 画像アップロード処理
  const handleImageUpload = useCallback(async (file: File) => {
    try {
      if (!validateImageFile(file)) {
        console.warn('Invalid image file:', file.name);
        return;
      }

      const resizedBase64 = await resizeImage(file, 800, 600);
      if (validateBase64Image(resizedBase64)) {
        // カーソル位置に画像を挿入
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const img = document.createElement('img');
          img.src = resizedBase64;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.cursor = 'pointer';
          img.title = 'クリックしてサイズ変更';
          img.draggable = false;
          
          range.deleteContents();
          range.insertNode(img);
          range.collapse(false);
          
          handleContentChange();
        }
      }
    } catch (error) {
      console.error('Image upload failed:', error);
    }
  }, [handleContentChange]);

  // ドラッグ&ドロップ処理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (isImageFile(file)) {
        handleImageUpload(file);
      }
    });
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // ファイルがドラッグされている場合のみドラッグ状態にする
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isImageFile(file)) {
      handleImageUpload(file);
    }
    e.target.value = '';
  }, [handleImageUpload]);

  return (
    <div className="flex-1 flex flex-col relative">
      <div className="border-b border-gray-200 p-2">
        <div className="flex items-center gap-2">
          <RichTextToolbar 
            contentEditableRef={editorRef}
            onContentChange={handleContentChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            title="画像を挿入"
          >
            📷
          </button>
        </div>
      </div>
      
      <div
        ref={editorRef}
        className={`flex-1 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-y-auto ${
          isDragging ? 'border-blue-400 bg-blue-50' : ''
        }`}
        contentEditable={isEditing}
        onInput={handleContentChange}
        onCompositionEnd={handleContentChange}
        onClick={handleImageClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={(e) => {
          // 矢印キーのイベント伝播を停止
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.stopPropagation();
          }
          
          // Enterキーの処理
          if (e.key === 'Enter') {
            e.preventDefault();
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const br = document.createElement('br');
              range.deleteContents();
              range.insertNode(br);
              range.setStartAfter(br);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
              handleContentChange();
            }
          }
        }}
        style={{ minHeight: '300px' }}
      />
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {isDragging && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-75 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-dashed border-blue-400">
            <div className="text-blue-600 text-lg font-semibold text-center">
              📸 画像をここにドロップ
            </div>
            <div className="text-sm text-gray-600 mt-2">
              新しい画像をアップロードします
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;