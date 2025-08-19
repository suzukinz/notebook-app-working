import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Star, Pin, Clock, Trash2, MoreHorizontal } from 'lucide-react';
import TagBadge from '../ui/TagBadge';
import { Note } from '../../types';

interface NoteCardProps {
  note: Note;
  isSelected: boolean;
  onClick: () => void;
  onToggleFavorite: (id: string) => void; // ✅ ID統一修正: number → string
  onTogglePin: (id: string) => void; // ✅ ID統一修正: number → string
  onDelete: (id: string) => void; // ✅ ID統一修正: number → string
  onUpdateNote?: (id: string, updates: Partial<Note>) => void; // ✅ ID統一修正: number → string
  className?: string;
  listViewMode?: 'list' | 'grid';
}

const NoteCard: React.FC<NoteCardProps> = memo(({
  note,
  isSelected,
  onClick,
  onToggleFavorite,
  onTogglePin,
  onDelete,
  onUpdateNote,
  className = '',
  listViewMode = 'list'
}) => {
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showAdvancedColors, setShowAdvancedColors] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  // 日付フォーマット処理をメモ化
  const formattedDate = useMemo(() => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
      if (diffDays === 1) return '今日';
      if (diffDays === 2) return '昨日';
      if (diffDays <= 7) return `${diffDays - 1}日前`;
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    };
    return formatDate(note.updatedAt);
  }, [note.updatedAt]);

  // プレビューテキストをメモ化
  const previewText = useMemo(() => {
    if (note.pages.length > 0) {
      const content = note.pages[0]?.content || '';
      // HTMLタグやMarkdownフォーマットを除去してプレビューテキストを生成
      const plainText = content
        .replace(/<[^>]*>/g, '') // HTMLタグを除去
        .replace(/#{1,6}\s/g, '') // Markdownヘッダーを除去
        .replace(/\*\*(.*?)\*\*/g, '$1') // 太字を除去
        .replace(/\*(.*?)\*/g, '$1') // イタリックを除去
        .replace(/`(.*?)`/g, '$1') // インラインコードを除去
        .replace(/\n/g, ' ') // 改行を空白に変換
        .trim();
      return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText;
    }
    return '';
  }, [note.pages]);

  // ホバー時のプレビューテキスト（10文字以内、改行対応）
  const hoverPreviewText = useMemo(() => {
    if (note.pages.length > 0) {
      const content = note.pages[0]?.content || '';
      // HTMLタグやMarkdownフォーマットを除去
      const plainText = content
        .replace(/<[^>]*>/g, '') // HTMLタグを除去
        .replace(/#{1,6}\s/g, '') // Markdownヘッダーを除去
        .replace(/\*\*(.*?)\*\*/g, '$1') // 太字を除去
        .replace(/\*(.*?)\*/g, '$1') // イタリックを除去
        .replace(/`(.*?)`/g, '$1') // インラインコードを除去
        .trim();
      
      if (plainText.length <= 10) {
        return plainText;
      }
      
      // 10文字ごとに改行を入れて最大3行まで表示
      const lines = [];
      for (let i = 0; i < Math.min(plainText.length, 30); i += 10) {
        lines.push(plainText.substring(i, i + 10));
      }
      
      return lines.join('\n') + (plainText.length > 30 ? '...' : '');
    }
    return '';
  }, [note.pages]);

  // タイトル表示の判定
  const isTitleLong = useMemo(() => note.title.length > 30, [note.title]);
  const displayTitle = useMemo(() => {
    if (!isTitleLong || showFullTitle) {
      return note.title;
    }
    return note.title.substring(0, 30) + '...';
  }, [note.title, isTitleLong, showFullTitle]);

  // イベントハンドラーをメモ化
  const handleToggleFavorite = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(note.id);
  }, [onToggleFavorite, note.id]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(note.id);
  }, [onDelete, note.id]);

  const handleTogglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(note.id);
  }, [onTogglePin, note.id]);

  const handleToggleTitle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFullTitle(!showFullTitle);
  }, [showFullTitle]);

  const handleColorChange = useCallback((e: React.MouseEvent, color: string) => {
    e.stopPropagation();
    if (onUpdateNote) {
      onUpdateNote(note.id, { color });
    }
    setShowContextMenu(false);
  }, [onUpdateNote, note.id]);

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  const handleContextDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(note.id);
    setShowContextMenu(false);
  }, [onDelete, note.id]);

  // コンテキストメニューを外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return undefined;
  }, [showContextMenu]);

  // 基本カラーパレット
  const colors = [
    { name: 'デフォルト', value: '', class: 'bg-white' },
    { name: '赤', value: 'red', class: 'bg-red-100' },
    { name: 'オレンジ', value: 'orange', class: 'bg-orange-100' },
    { name: '黄', value: 'yellow', class: 'bg-yellow-100' },
    { name: '緑', value: 'green', class: 'bg-green-100' },
    { name: '青', value: 'blue', class: 'bg-blue-100' },
    { name: '紫', value: 'purple', class: 'bg-purple-100' },
    { name: 'ピンク', value: 'pink', class: 'bg-pink-100' },
  ];

  // 拡張カラーパレット
  const advancedColors = [
    // 原色（プライマリーカラー）
    { name: '原色赤', value: 'primary-red', class: 'bg-red-500' },
    { name: '原色緑', value: 'primary-green', class: 'bg-green-500' },
    { name: '原色青', value: 'primary-blue', class: 'bg-blue-500' },
    { name: '原色黄', value: 'primary-yellow', class: 'bg-yellow-400' },
    { name: '原色マゼンタ', value: 'primary-magenta', class: 'bg-fuchsia-500' },
    { name: '原色シアン', value: 'primary-cyan', class: 'bg-cyan-400' },
    
    // 暖色系
    { name: '薄いピンク', value: 'rose', class: 'bg-rose-100' },
    { name: '薄い赤', value: 'red-light', class: 'bg-red-50' },
    { name: '濃い赤', value: 'red-dark', class: 'bg-red-200' },
    { name: '薄いオレンジ', value: 'orange-light', class: 'bg-orange-50' },
    { name: '濃いオレンジ', value: 'orange-dark', class: 'bg-orange-200' },
    { name: 'アンバー', value: 'amber', class: 'bg-amber-100' },
    { name: '薄い黄', value: 'yellow-light', class: 'bg-yellow-50' },
    { name: '濃い黄', value: 'yellow-dark', class: 'bg-yellow-200' },
    
    // 寒色系
    { name: 'ライム', value: 'lime', class: 'bg-lime-100' },
    { name: '薄い緑', value: 'green-light', class: 'bg-green-50' },
    { name: '濃い緑', value: 'green-dark', class: 'bg-green-200' },
    { name: 'エメラルド', value: 'emerald', class: 'bg-emerald-100' },
    { name: 'ティール', value: 'teal', class: 'bg-teal-100' },
    { name: 'シアン', value: 'cyan', class: 'bg-cyan-100' },
    { name: '薄い青', value: 'blue-light', class: 'bg-blue-50' },
    { name: '濃い青', value: 'blue-dark', class: 'bg-blue-200' },
    
    // 中性色・紫系
    { name: 'インディゴ', value: 'indigo', class: 'bg-indigo-100' },
    { name: '薄い紫', value: 'purple-light', class: 'bg-purple-50' },
    { name: '濃い紫', value: 'purple-dark', class: 'bg-purple-200' },
    { name: 'バイオレット', value: 'violet', class: 'bg-violet-100' },
    { name: 'フューシャ', value: 'fuchsia', class: 'bg-fuchsia-100' },
    { name: '薄いピンク', value: 'pink-light', class: 'bg-pink-50' },
    { name: '濃いピンク', value: 'pink-dark', class: 'bg-pink-200' },
    { name: 'グレー', value: 'gray', class: 'bg-gray-100' },
    { name: '黒', value: 'black', class: 'bg-gray-800' },
  ];

  // ノートの背景スタイルを取得（動的スタイル）
  const getBackgroundStyle = (color?: string): React.CSSProperties => {
    if (!color) return {};
    const colorMap: Record<string, string> = {
      // 基本色
      red: '#fef2f2',
      orange: '#fff7ed',
      yellow: '#fefce8',
      green: '#f0fdf4',
      blue: '#eff6ff',
      purple: '#faf5ff',
      pink: '#fdf2f8',
      // 原色
      'primary-red': '#fee2e2',
      'primary-green': '#dcfce7',
      'primary-blue': '#dbeafe',
      'primary-yellow': '#fef3c7',
      'primary-magenta': '#fae8ff',
      'primary-cyan': '#cffafe',
      // 拡張色
      rose: '#fff1f2',
      'red-light': '#fef2f2',
      'red-dark': '#fee2e2',
      'orange-light': '#fff7ed',
      'orange-dark': '#fed7aa',
      amber: '#fffbeb',
      'yellow-light': '#fefce8',
      'yellow-dark': '#fef08a',
      lime: '#f7fee7',
      'green-light': '#f0fdf4',
      'green-dark': '#bbf7d0',
      emerald: '#ecfdf5',
      teal: '#f0fdfa',
      cyan: '#ecfeff',
      'blue-light': '#eff6ff',
      'blue-dark': '#bfdbfe',
      indigo: '#eef2ff',
      'purple-light': '#faf5ff',
      'purple-dark': '#e9d5ff',
      violet: '#f5f3ff',
      fuchsia: '#fdf4ff',
      'pink-light': '#fdf2f8',
      'pink-dark': '#fbcfe8',
      gray: '#f9fafb',
      black: '#1f2937',
    };
    return { backgroundColor: colorMap[color] || '#ffffff' };
  };

  // ボーダースタイルを取得（動的スタイル）
  const getBorderStyle = (color?: string): React.CSSProperties => {
    if (!color) return { borderColor: '#e5e7eb' };
    const colorMap: Record<string, string> = {
      // 基本色
      red: '#fecaca',
      orange: '#fed7aa',
      yellow: '#fde68a',
      green: '#a7f3d0',
      blue: '#bfdbfe',
      purple: '#ddd6fe',
      pink: '#fbcfe8',
      // 原色
      'primary-red': '#fca5a5',
      'primary-green': '#86efac',
      'primary-blue': '#93c5fd',
      'primary-yellow': '#fcd34d',
      'primary-magenta': '#f0abfc',
      'primary-cyan': '#67e8f9',
      // 拡張色
      rose: '#fecdd3',
      'red-light': '#fecaca',
      'red-dark': '#fca5a5',
      'orange-light': '#fed7aa',
      'orange-dark': '#fdba74',
      amber: '#fcd34d',
      'yellow-light': '#fde68a',
      'yellow-dark': '#fbbf24',
      lime: '#bef264',
      'green-light': '#a7f3d0',
      'green-dark': '#4ade80',
      emerald: '#6ee7b7',
      teal: '#5eead4',
      cyan: '#67e8f9',
      'blue-light': '#bfdbfe',
      'blue-dark': '#60a5fa',
      indigo: '#c7d2fe',
      'purple-light': '#ddd6fe',
      'purple-dark': '#c084fc',
      violet: '#ddd6fe',
      fuchsia: '#f5d0fe',
      'pink-light': '#fbcfe8',
      'pink-dark': '#f472b6',
      gray: '#e5e7eb',
      black: '#374151',
    };
    return { borderColor: colorMap[color] || '#e5e7eb' };
  };

  // 黒の場合のテキスト色
  const getTextColor = (color?: string): string => {
    if (color === 'black') return 'text-white';
    return 'text-gray-900';
  };

  // ビューモードに応じたスタイル
  const cardStyle = listViewMode === 'grid' ? {
    minHeight: '160px', 
    maxHeight: '160px', 
    minWidth: '220px',
    maxWidth: '220px',
    width: '220px',
    height: '160px'
  } : {
    minHeight: '50px',
    width: '100%'
  };

  if (listViewMode === 'list') {
    // リスト表示：デフォルトはタイトルのみ、ホバー時に詳細表示
    return (
      <>
        <div
          onClick={onClick}
          onContextMenu={handleRightClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`group p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md flex items-center relative ${
            isSelected ? 'ring-2 ring-blue-500' : ''
          } ${className}`}
          style={{
            ...cardStyle,
            ...getBackgroundStyle(note.color),
            ...getBorderStyle(note.color)
          }}
        >
        {/* 左側：タイトルとピン */}
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {note.isPinned && (
            <Pin size={12} className="text-orange-500 flex-shrink-0" />
          )}
          <h3 className={`font-medium truncate text-sm ${getTextColor(note.color)}`}>{note.title}</h3>
        </div>

        {/* 右側：アクションボタン（常に表示） */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={handleToggleFavorite}
            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
              note.isFavorite ? 'text-yellow-500' : 'text-gray-400'
            }`}
            aria-label={note.isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
          >
            <Star size={12} fill={note.isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="ノートを削除"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* ホバー時の詳細情報（下に表示） */}
      {isHovered && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
          {/* プレビューテキスト */}
          <div className="min-w-0">
            <p className="text-xs text-gray-500 whitespace-pre-line">
              {hoverPreviewText}
            </p>
          </div>

          {/* タグと日付 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* タグ（1つだけ） */}
              {note.tags.length > 0 && (
                <TagBadge tag={note.tags[0]!} color="blue" size="sm" />
              )}
            </div>
            
            {/* 日付 */}
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock size={10} />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      )}

        {/* コンテキストメニュー */}
        {showContextMenu && (
          <div
            ref={contextMenuRef}
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[9999]"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
              minWidth: '200px'
            }}
          >
            {/* カラー選択セクション */}
            <div className="px-3 py-2">
              <div className="text-sm font-medium text-gray-700 mb-2">カラーを選択</div>
              
              {/* 基本カラーパレット */}
              <div className="grid grid-cols-4 gap-2 mb-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    onClick={(e) => handleColorChange(e, color.value)}
                    className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
                      color.class
                    } ${
                      note.color === color.value ? 'border-gray-600' : 'border-gray-300'
                    }`}
                    title={color.name}
                  />
                ))}
              </div>

              {/* もっと見るボタン */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAdvancedColors(!showAdvancedColors);
                }}
                className="w-full text-xs text-blue-600 hover:text-blue-800 py-1 hover:bg-blue-50 rounded transition-colors"
              >
                {showAdvancedColors ? '▲ 基本色のみ' : '▼ もっと見る'}
              </button>

              {/* 拡張カラーパレット */}
              {showAdvancedColors && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-600 mb-2">拡張カラー</div>
                  <div className="grid grid-cols-6 gap-1 max-h-24 overflow-y-auto">
                    {advancedColors.map((color) => (
                      <button
                        key={color.value}
                        onClick={(e) => handleColorChange(e, color.value)}
                        className={`w-6 h-6 rounded border hover:scale-110 transition-transform ${
                          color.class
                        } ${
                          note.color === color.value ? 'border-gray-600 border-2' : 'border-gray-300'
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <hr className="border-gray-200" />
            
            {/* 削除セクション */}
            <button
              onClick={handleContextDelete}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
            >
              <Trash2 size={14} className="mr-2" />
              ノートを削除
            </button>
          </div>
        )}
      </>
    );
  }

  // グリッド表示：手描き風デザイン
  return (
    <>
      {/* SVGフィルター定義 */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="squiggly-note">
            <feTurbulence id="turbulence" baseFrequency="0.04" numOctaves="4" result="noise" seed="2" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" />
          </filter>
        </defs>
      </svg>

      <div
        onClick={onClick}
        onContextMenu={handleRightClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`handdrawn-card group cursor-pointer transition-all flex flex-col relative ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        } ${className}`}
        style={{
          ...cardStyle,
          ...getBackgroundStyle(note.color),
          width: '180px',
          height: '240px',
          aspectRatio: '3/4',
          padding: '1.5rem',
          borderRadius: '16px',
          position: 'relative',
          transition: 'all 0.5s cubic-bezier(0.2, 1.1, 0.86, 1)',
          backgroundColor: getBackgroundStyle(note.color).backgroundColor || '#fff'
        }}
      >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {note.isPinned && (
            <Pin size={14} className="text-orange-500 flex-shrink-0" />
          )}
          <div className="flex items-center space-x-1 flex-1 min-w-0">
            <h3 className={`font-medium flex-1 min-w-0 break-words ${getTextColor(note.color)}`}>{displayTitle}</h3>
            {isTitleLong && (
              <button
                onClick={handleToggleTitle}
                className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                title={showFullTitle ? 'タイトルを短縮表示' : 'タイトル全文を表示'}
                aria-label={showFullTitle ? 'タイトルを短縮表示' : 'タイトル全文を表示'}
              >
                <MoreHorizontal size={12} />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleToggleFavorite}
            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
              note.isFavorite ? 'text-yellow-500' : 'text-gray-400'
            }`}
            aria-label={note.isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}
          >
            <Star size={14} fill={note.isFavorite ? 'currentColor' : 'none'} />
          </button>
          
          <button
            onClick={handleTogglePin}
            className={`p-1 rounded hover:bg-gray-200 transition-colors ${
              note.isPinned ? 'text-orange-500' : 'text-gray-400'
            }`}
            aria-label={note.isPinned ? 'ピン留めを解除' : 'ピン留めする'}
          >
            <Pin size={14} />
          </button>

          
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="ノートを削除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <p className={`text-sm mb-3 line-clamp-2 overflow-hidden flex-1 ${note.color === 'black' ? 'text-gray-300' : 'text-gray-600'}`}>
        {previewText}
      </p>

      <div className="mt-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {note.tags.slice(0, 2).map(tag => (
              <TagBadge key={tag} tag={tag} color="blue" size="sm" />
            ))}
            {note.tags.length > 2 && (
              <span className="text-xs text-gray-500">+{note.tags.length - 2}</span>
            )}
          </div>
          
          <div className={`flex items-center space-x-2 text-xs flex-shrink-0 ${note.color === 'black' ? 'text-gray-400' : 'text-gray-500'}`}>
            <Clock size={12} />
            <span>{formattedDate}</span>
          </div>
        </div>
        
        {note.pages.length > 1 && (
          <div className={`text-xs text-center ${note.color === 'black' ? 'text-gray-400' : 'text-gray-500'}`}>
            {note.pages.length} ページ
          </div>
        )}
      </div>
      </div>

      {/* コンテキストメニュー */}
      {showContextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-[9999]"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            minWidth: '200px'
          }}
        >
          {/* カラー選択セクション */}
          <div className="px-3 py-2">
            <div className="text-sm font-medium text-gray-700 mb-2">カラーを選択</div>
            
            {/* 基本カラーパレット */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={(e) => handleColorChange(e, color.value)}
                  className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
                    color.class
                  } ${
                    note.color === color.value ? 'border-gray-600' : 'border-gray-300'
                  }`}
                  title={color.name}
                />
              ))}
            </div>

            {/* もっと見るボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAdvancedColors(!showAdvancedColors);
              }}
              className="w-full text-xs text-blue-600 hover:text-blue-800 py-1 hover:bg-blue-50 rounded transition-colors"
            >
              {showAdvancedColors ? '▲ 基本色のみ' : '▼ もっと見る'}
            </button>

            {/* 拡張カラーパレット */}
            {showAdvancedColors && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">拡張カラー</div>
                <div className="grid grid-cols-6 gap-1 max-h-24 overflow-y-auto">
                  {advancedColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={(e) => handleColorChange(e, color.value)}
                      className={`w-6 h-6 rounded border hover:scale-110 transition-transform ${
                        color.class
                      } ${
                        note.color === color.value ? 'border-gray-600 border-2' : 'border-gray-300'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <hr className="border-gray-200" />
          
          {/* 削除セクション */}
          <button
            onClick={handleContextDelete}
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
          >
            <Trash2 size={14} className="mr-2" />
            ノートを削除
          </button>
        </div>
      )}

      {/* 手描き風カード用CSS */}
      <style>{`
        .handdrawn-card {
          transform: translate3d(0, 0, 0.01px);
        }

        .handdrawn-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border: 4px solid #000;
          border-radius: 12px;
          filter: url(#squiggly-note);
          background: transparent;
          z-index: -1;
        }

        .handdrawn-card:hover {
          transform: translateY(-10px);
          filter: drop-shadow(0px 10px 0px #000);
        }

        .handdrawn-card:hover::before {
          box-shadow: 0px 10px 0px #000;
        }
      `}</style>
    </>
  );
});

NoteCard.displayName = 'NoteCard';

export default NoteCard;