import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown, Home, Folder, BookOpen, FileText, MoreHorizontal } from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { useHaptics } from '../../hooks/useHaptics';

interface BreadcrumbItem {
  id: string;
  label: string;
  type: 'workspace' | 'notebook' | 'subfolder' | 'note';
  icon: React.ReactNode;
  onClick: () => void;
}

interface SmartBreadcrumbProps {
  currentView: 'workspace' | 'notebooks' | 'subfolders' | 'notes';
  onNavigate?: (view: string, id?: string) => void;
}

const SmartBreadcrumb: React.FC<SmartBreadcrumbProps> = ({ currentView, onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [visibleItems, setVisibleItems] = useState<BreadcrumbItem[]>([]);
  const [hiddenItems, setHiddenItems] = useState<BreadcrumbItem[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { tapFeedback, selectionFeedback } = useHaptics();
  
  const {
    workspaces,
    notebooks,
    subFoldersData,
    selectedWorkspace,
    selectedNotebook,
    selectedSubFolder,
    selectedNote,
    setSelectedNotebook,
    setSelectedSubFolder
  } = useNotebookStore();

  // ブレッドクラムアイテムを構築
  const buildBreadcrumbItems = useCallback((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [];

    // ワークスペース
    if (selectedWorkspace) {
      const workspace = workspaces.find(w => w.id === selectedWorkspace);
      if (workspace) {
        items.push({
          id: workspace.id,
          label: workspace.name,
          type: 'workspace',
          icon: <Home size={16} />,
          onClick: () => {
            selectionFeedback();
            onNavigate?.('workspace');
          }
        });
      }
    }

    // ノートブック
    if (selectedNotebook && currentView !== 'workspace') {
      const notebook = notebooks[selectedWorkspace]?.find(nb => nb.id === selectedNotebook);
      if (notebook) {
        items.push({
          id: notebook.id,
          label: notebook.name,
          type: 'notebook',
          icon: <BookOpen size={16} />,
          onClick: () => {
            selectionFeedback();
            setSelectedNotebook(notebook.id);
            onNavigate?.('notebooks', notebook.id);
          }
        });
      }
    }

    // サブフォルダー
    if (selectedSubFolder && (currentView === 'notes' || currentView === 'subfolders')) {
      const subFolder = subFoldersData[selectedNotebook]?.find(sf => sf.id === selectedSubFolder);
      if (subFolder) {
        items.push({
          id: subFolder.id,
          label: subFolder.name,
          type: 'subfolder',
          icon: <Folder size={16} />,
          onClick: () => {
            selectionFeedback();
            setSelectedSubFolder(subFolder.id);
            onNavigate?.('subfolders', subFolder.id);
          }
        });
      }
    }

    // ノート（選択されている場合）
    if (selectedNote && currentView === 'notes') {
      items.push({
        id: selectedNote.id.toString(),
        label: selectedNote.title || '無題のノート',
        type: 'note',
        icon: <FileText size={16} />,
        onClick: () => {
          selectionFeedback();
          // ノートの場合は特別な処理は不要
        }
      });
    }

    return items;
  }, [selectedWorkspace, workspaces, selectedNotebook, currentView, notebooks, selectedSubFolder, subFoldersData, selectedNote, selectionFeedback, onNavigate, setSelectedNotebook, setSelectedSubFolder]);

  // 利用可能な幅を計算
  const calculateAvailableWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const reservedSpace = 80; // ボタンやマージン用の予約領域
      setAvailableWidth(containerWidth - reservedSpace);
    }
  };

  // 表示可能なアイテムを計算
  const calculateVisibleItems = useCallback((items: BreadcrumbItem[]) => {
    if (!availableWidth || items.length === 0) {
      setVisibleItems(items);
      setHiddenItems([]);
      return;
    }

    // 各アイテムの推定幅を計算
    const estimateItemWidth = (item: BreadcrumbItem) => {
      const baseWidth = 40; // アイコン + パディング
      const textWidth = item.label.length * 8; // 1文字約8px
      return Math.min(baseWidth + textWidth, 150); // 最大150px
    };

    let totalWidth = 0;
    const visible: BreadcrumbItem[] = [];
    const hidden: BreadcrumbItem[] = [];

    // 最後のアイテム（現在の位置）は必ず表示
    const lastItem = items[items.length - 1];
    if (lastItem) {
      totalWidth += estimateItemWidth(lastItem);
      visible.push(lastItem);
    }

    // 残りのアイテムを逆順でチェック
    for (let i = items.length - 2; i >= 0; i--) {
      const item = items[i];
      if (!item) continue;
      
      const itemWidth = estimateItemWidth(item);
      
      if (totalWidth + itemWidth + 30 <= availableWidth) { // 30pxはセパレーター用
        totalWidth += itemWidth + 30;
        visible.unshift(item);
      } else {
        hidden.unshift(item);
      }
    }

    setVisibleItems(visible);
    setHiddenItems(hidden);
  }, [availableWidth, setVisibleItems, setHiddenItems]);

  // リサイズ監視
  useEffect(() => {
    const handleResize = () => {
      calculateAvailableWidth();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    handleResize();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // ブレッドクラムアイテムが変更されたときに表示を更新
  useEffect(() => {
    const items = buildBreadcrumbItems();
    calculateVisibleItems(items);
  }, [selectedWorkspace, selectedNotebook, selectedSubFolder, selectedNote, currentView, availableWidth, buildBreadcrumbItems, calculateVisibleItems]);

  const handleDropdownToggle = () => {
    tapFeedback();
    setIsExpanded(!isExpanded);
  };

  const handleDropdownItemClick = (item: BreadcrumbItem) => {
    tapFeedback();
    item.onClick();
    setIsExpanded(false);
  };

  return (
    <div ref={containerRef} className="relative flex items-center text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
      {/* 非表示アイテムのドロップダウン */}
      {hiddenItems.length > 0 && (
        <div className="relative">
          <button
            onClick={handleDropdownToggle}
            className="flex items-center px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <MoreHorizontal size={16} />
            <ChevronDown size={14} className={`ml-1 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* ドロップダウンメニュー */}
          {isExpanded && (
            <>
              {/* バックドロップ */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsExpanded(false)}
              />
              
              {/* メニュー内容 */}
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 min-w-48">
                {hiddenItems.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleDropdownItemClick(item)}
                    className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                  >
                    <span className="text-gray-500 dark:text-gray-400 mr-2">
                      {item.icon}
                    </span>
                    <span className="text-gray-900 dark:text-white truncate">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 表示されているブレッドクラムアイテム */}
      <div className="flex items-center flex-1 overflow-hidden">
        {visibleItems.map((item, index) => (
          <React.Fragment key={`${item.type}-${item.id}`}>
            {/* セパレーター */}
            {(index > 0 || hiddenItems.length > 0) && (
              <ChevronRight size={14} className="mx-1 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            )}
            
            {/* ブレッドクラムアイテム */}
            <button
              onClick={item.onClick}
              className={`flex items-center px-2 py-1 rounded-md transition-colors flex-shrink-0 ${
                index === visibleItems.length - 1
                  ? 'text-gray-900 dark:text-white font-medium' // 現在の位置
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
              disabled={index === visibleItems.length - 1} // 現在の位置は無効
            >
              <span className="mr-2 flex-shrink-0">
                {item.icon}
              </span>
              <span className="truncate max-w-32">
                {item.label}
              </span>
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* 現在のビュー表示 */}
      <div className="ml-2 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
        {currentView === 'workspace' && 'ワークスペース'}
        {currentView === 'notebooks' && 'ノートブック'}
        {currentView === 'subfolders' && 'サブフォルダー'}
        {currentView === 'notes' && 'ノート'}
      </div>
    </div>
  );
};

export default SmartBreadcrumb;