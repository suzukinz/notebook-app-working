import React, { useState, useEffect, useRef } from 'react';
import { Save, Star, Pin, Trash2, Map, Edit3, Plus, X, Image } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import ImageUpload from '../ui/ImageUpload';
import { isImageFile, resizeImage, generateImageMarkdown } from '../../utils/imageUtils';
import { logger } from '../../utils/logger';

interface SimpleNoteEditorProps {
  className?: string;
}

const SimpleNoteEditor: React.FC<SimpleNoteEditorProps> = ({ className = '' }) => {
  const {
    selectedNote,
    currentPage,
    setSelectedNote,
    updateNote,
    deleteNote,
    setShowMindMap
  } = useNotebookStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // ノートが選択されたときの初期化
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setTags(selectedNote.tags || []);
      const currentPageData = selectedNote.pages[currentPage];
      if (currentPageData) {
        setContent(currentPageData.content);
      }
    }
  }, [selectedNote, currentPage]);

  // 保存処理
  const handleSave = () => {
    if (!selectedNote) return;

    const updatedPages = [...selectedNote.pages];
    updatedPages[currentPage] = {
      ...updatedPages[currentPage],
      id: updatedPages[currentPage]?.id || Date.now().toString(), // ✅ ID統一修正: string ID生成
      title: `ページ${currentPage + 1}`,
      content: content
    };

    updateNote(selectedNote.id, {
      title: title,
      pages: updatedPages,
      tags: tags,
      updatedAt: new Date().toISOString().split('T')[0] || ''
    });

    setIsEditing(false);
  };

  // お気に入り切り替え
  const handleToggleFavorite = () => {
    if (!selectedNote) return;
    updateNote(selectedNote.id, { isFavorite: !selectedNote.isFavorite });
  };

  // ピン切り替え
  const handleTogglePin = () => {
    if (!selectedNote) return;
    updateNote(selectedNote.id, { isPinned: !selectedNote.isPinned });
  };

  // 削除処理
  const handleDelete = () => {
    if (!selectedNote) return;
    
    if (window.confirm('このノートを削除しますか？')) {
      deleteNote(selectedNote.id);
      setSelectedNote(null);
    }
  };

  // タグの追加
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
      setIsEditing(true);
    }
  };

  // タグの削除
  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    setIsEditing(true);
  };

  // タグ入力のキーボード処理
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setNewTag('');
    }
  };

  // タグ入力フォーカス
  useEffect(() => {
    if (showTagInput && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [showTagInput]);

  // 画像挿入処理
  const handleImageInsert = (markdown: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // カーソル位置に画像のMarkdownを挿入
      const newContent = content.slice(0, start) + '\n' + markdown + '\n' + content.slice(end);
      setContent(newContent);
      setIsEditing(true);
      setShowImageUpload(false);
      
      // カーソル位置を調整
      setTimeout(() => {
        if (textarea) {
          const newCursorPos = start + markdown.length + 2;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }
      }, 0);
    }
  };

  // テキストエリアでのドラッグ&ドロップ処理
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      if (file && isImageFile(file)) {
        try {
          const base64 = await resizeImage(file, 800, 600, 0.8);
          const fileName = file?.name.replace(/\.[^/.]+$/, "") || 'unnamed';
          const markdown = generateImageMarkdown(base64, fileName, file?.name || 'unnamed');
          
          // カーソル位置に挿入
          if (textareaRef.current) {
            const textarea = textareaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            
            const newContent = content.slice(0, start) + '\n' + markdown + '\n' + content.slice(end);
            setContent(newContent);
            setIsEditing(true);
          }
        } catch (error) {
          logger.error('画像の処理に失敗しました:', error);
        }
      }
    }
  };

  // Markdownの簡単なレンダリング
  const renderMarkdown = (text: string) => {
    let html = text
      // 見出し
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mb-2 mt-4">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mb-2 mt-3">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-medium mb-2 mt-2">$1</h3>')
      
      // 太字・斜体
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      
      // 画像（data:image/で始まるBase64画像の場合、altテキストのみ表示）
      .replace(/!\[([^\]]*)\]\((data:image\/[^;]+;base64[^)]+)\)/g, '<div class="my-4"><img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-sm" /><p class="text-sm text-gray-600 mt-2 text-center">📷 $1</p></div>')
      // 通常の画像URL
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto my-4 rounded-lg shadow-sm" />')
      
      // リスト
      .replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>')
      
      // 改行
      .replace(/\n/g, '<br>');

    // リストをulで囲む
    html = html.replace(/(<li class="ml-4">• .+<\/li>)/g, '<ul class="mb-2">$1</ul>');
    
    return html;
  };

  // ノートが選択されていない場合
  if (!selectedNote) {
    return (
      <div className={`flex-1 flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <Edit3 size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-lg">ノートを選択してください</p>
          <p className="text-sm">左側のリストからノートを選択して編集を開始</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col bg-white ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsEditing(true);
            }}
            className="text-xl font-semibold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            placeholder="ノートタイトル"
          />
          
          {/* タグ */}
          <div className="flex items-center space-x-1 flex-wrap">
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-blue-900"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {showTagInput ? (
              <input
                ref={tagInputRef}
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => {
                  handleAddTag();
                  setShowTagInput(false);
                }}
                className="px-2 py-1 text-xs border border-gray-300 rounded-full outline-none focus:border-blue-500"
                placeholder="タグを入力..."
              />
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Plus size={12} className="inline mr-1" />
                タグを追加
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-lg transition-colors ${
              selectedNote.isFavorite 
                ? 'text-yellow-500 bg-yellow-50' 
                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
            }`}
          >
            <Star size={20} fill={selectedNote.isFavorite ? 'currentColor' : 'none'} />
          </button>
          
          <button
            onClick={handleTogglePin}
            className={`p-2 rounded-lg transition-colors ${
              selectedNote.isPinned 
                ? 'text-orange-500 bg-orange-50' 
                : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
            }`}
          >
            <Pin size={20} />
          </button>
          
          <button
            onClick={() => setShowMindMap(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Map size={20} />
          </button>
          
          
          {isEditing && (
            <button
              onClick={handleSave}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={16} />
            </button>
          )}
          
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 flex flex-col">
        {/* 編集ツールバー */}
        <div className="flex items-center space-x-2 p-2 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setShowImageUpload(!showImageUpload)}
            className={`p-2 rounded-lg transition-colors ${
              showImageUpload 
                ? 'bg-blue-100 text-blue-600' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
            title="画像を挿入"
          >
            <Image size={16} />
          </button>
          
          <div className="text-xs text-gray-500">
            画像をドラッグ&ドロップまたはクリックで追加
          </div>
        </div>
        
        {/* 画像アップロード */}
        {showImageUpload && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <ImageUpload onImageInsert={handleImageInsert} />
          </div>
        )}
        
        {/* エディタエリア - 常にプレビュー表示 */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div 
            className="min-h-full prose prose-sm max-w-none cursor-text"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              backgroundColor: isDragging ? '#eff6ff' : 'transparent',
              border: isDragging ? '2px dashed #3b82f6' : 'none',
              borderRadius: isDragging ? '8px' : '0'
            }}
          />
          
          {/* クリック時にテキスト編集ダイアログを表示 */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                const newContent = prompt('内容を編集してください:', content);
                if (newContent !== null) {
                  setContent(newContent);
                  setIsEditing(true);
                }
              }}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              📝 テキストを編集
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleNoteEditor;