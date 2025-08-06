import React, { useEffect, useState } from 'react';
import { Hash, Bold, Italic, Code, Link, Image, List, CheckSquare, Table, Quote, Zap, FileText, Smile, Star, AlertTriangle } from 'lucide-react';
import { AutoCompleteItem } from '../../utils/markdownAutoComplete';
import { useHaptics } from '../../hooks/useHaptics';

interface MarkdownAutoCompleteDropdownProps {
  suggestions: AutoCompleteItem[];
  onSelect: (item: AutoCompleteItem) => void;
  onClose: () => void;
  isVisible: boolean;
  position: { x: number; y: number };
  selectedIndex: number;
  onSelectionChange: (index: number) => void;
}

const MarkdownAutoCompleteDropdown: React.FC<MarkdownAutoCompleteDropdownProps> = ({
  suggestions,
  onSelect,
  onClose: _onClose,
  isVisible,
  position,
  selectedIndex,
  onSelectionChange
}) => {
  const { tapFeedback, selectionFeedback } = useHaptics();
  const [visibleItems, setVisibleItems] = useState<AutoCompleteItem[]>([]);

  useEffect(() => {
    setVisibleItems(suggestions.slice(0, 8)); // 最大8件表示
  }, [suggestions]);

  const getItemIcon = (item: AutoCompleteItem) => {
    const iconProps = { size: 16, className: "text-gray-600 dark:text-gray-400" };
    
    switch (item.id) {
      case 'heading1':
      case 'heading2':
      case 'heading3':
        return <Hash {...iconProps} />;
      case 'bold':
        return <Bold {...iconProps} />;
      case 'italic':
        return <Italic {...iconProps} />;
      case 'code':
      case 'codeblock':
        return <Code {...iconProps} />;
      case 'link':
        return <Link {...iconProps} />;
      case 'image':
        return <Image {...iconProps} />;
      case 'list':
      case 'orderedlist':
        return <List {...iconProps} />;
      case 'checkbox':
      case 'checkedbox':
        return <CheckSquare {...iconProps} />;
      case 'table':
        return <Table {...iconProps} />;
      case 'quote':
        return <Quote {...iconProps} />;
      case 'warning':
        return <AlertTriangle {...iconProps} />;
      default:
        if (item.type === 'emoji') {
          return <Smile {...iconProps} />;
        } else if (item.type === 'snippet') {
          return <FileText {...iconProps} />;
        } else if (item.type === 'symbol') {
          return <Star {...iconProps} />;
        }
        return <Zap {...iconProps} />;
    }
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      '見出し': 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      '装飾': 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      'コード': 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      'リンク': 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
      'メディア': 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      '構造': 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400',
      'リスト': 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
      'テーブル': 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      'テンプレート': 'bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
      '感情': 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
      'ジェスチャー': 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
      'オブジェクト': 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
      'シンボル': 'bg-violet-100 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
      '言語': 'bg-teal-100 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
    };
    return colorMap[category] || 'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400';
  };

  const handleItemClick = (item: AutoCompleteItem, index: number) => {
    tapFeedback();
    onSelectionChange(index);
    setTimeout(() => {
      selectionFeedback();
      onSelect(item);
    }, 50);
  };

  if (!isVisible || visibleItems.length === 0) {
    return null;
  }

  // スクリーン境界を考慮した位置調整
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 320), // ドロップダウンの幅を考慮
    y: position.y + 30 > window.innerHeight - 300 ? position.y - 250 : position.y + 30
  };

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 max-w-sm"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        minWidth: '280px',
        maxHeight: '320px',
        overflowY: 'auto'
      }}
    >
      {/* ヘッダー */}
      <div className="px-3 py-1 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            オートコンプリート
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {visibleItems.length}件
          </span>
        </div>
      </div>

      {/* 候補リスト */}
      <div className="py-1">
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item, index)}
            className={`px-3 py-2 cursor-pointer transition-colors border-l-2 ${
              index === selectedIndex
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent'
            }`}
          >
            <div className="flex items-start space-x-3">
              {/* アイコン */}
              <div className="flex-shrink-0 mt-0.5">
                {getItemIcon(item)}
              </div>
              
              {/* メインコンテンツ */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {item.type === 'emoji' ? (
                      <span className="flex items-center space-x-2">
                        <span className="text-lg">{item.replacement}</span>
                        <span>{item.description}</span>
                      </span>
                    ) : (
                      item.description
                    )}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                </div>
                
                {/* トリガー文字・プレビュー */}
                <div className="flex items-center justify-between">
                  <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-gray-700 dark:text-gray-300">
                    {item.trigger}
                  </code>
                  {item.type === 'snippet' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      テンプレート
                    </span>
                  )}
                </div>
                
                {/* スニペットプレビュー */}
                {item.type === 'snippet' && (
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                    {item.replacement.split('\n').slice(0, 3).join('\n')}
                    {item.replacement.split('\n').length > 3 && '...'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* フッター */}
      {suggestions.length > visibleItems.length && (
        <div className="px-3 py-1 border-t border-gray-100 dark:border-gray-700">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            他 {suggestions.length - visibleItems.length} 件...
          </span>
        </div>
      )}

      {/* ヘルプテキスト */}
      <div className="px-3 py-1 border-t border-gray-100 dark:border-gray-700">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          タップで挿入 • Escでキャンセル
        </span>
      </div>
    </div>
  );
};

export default MarkdownAutoCompleteDropdown;