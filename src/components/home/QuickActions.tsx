import React, { memo } from 'react';
import { 
  Plus, 
  Search, 
  GitBranch, 
  MessageCircle, 
  Clock, 
  Zap
} from 'lucide-react';
import { useIndexedDBStore } from '../../store/useIndexedDBStore';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  action: () => void;
}

const QuickActions: React.FC = () => {
  const { 
    setViewMode, 
    setShowMindMap, 
    setShowNoteList,
    createNote,
    selectedWorkspace,
    selectedNotebook,
    selectedSubFolder 
  } = useIndexedDBStore();

  const quickActions: QuickAction[] = [
    {
      id: 'new-note',
      title: '新規ノート',
      description: '新しいノートを作成',
      icon: Plus,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50',
      action: async () => {
        if (selectedWorkspace && selectedNotebook && selectedSubFolder) {
          try {
            // 新しいノートを作成
            await createNote({
              workspaceId: selectedWorkspace,
              notebookId: selectedNotebook,
              subFolderId: selectedSubFolder,
              title: '新しいノート',
              content: '',
              tags: []
            });
            setViewMode('notes');
          } catch (error) {
            console.error('Failed to create note:', error);
          }
        } else {
          console.warn('Please select a workspace, notebook, and subfolder first');
        }
      }
    },
    {
      id: 'search',
      title: '検索',
      description: 'ノートを検索',
      icon: Search,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50',
      action: () => {
        setViewMode('notes');
        setShowNoteList(true);
        // フォーカスを検索バーに移動するために少し遅延
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="検索"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }, 100);
      }
    },
    {
      id: 'mindmap',
      title: 'マインドマップ',
      description: '視覚的に探索',
      icon: GitBranch,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50',
      action: () => {
        setShowMindMap(true);
        setViewMode('notes');
      }
    },
    {
      id: 'timeline',
      title: 'タイムライン',
      description: '活動を記録',
      icon: MessageCircle,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50',
      action: () => {
        setViewMode('dashboard');
      }
    },
    {
      id: 'recent',
      title: '最近のノート',
      description: '最近編集したノート',
      icon: Clock,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50',
      action: () => {
        setViewMode('notes');
        setShowNoteList(true);
        // 最近のノートでソートするロジックを実装
      }
    },
    {
      id: 'pomodoro',
      title: 'ポモドーロ',
      description: '集中タイマー',
      icon: Zap,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30 hover:bg-pink-200 dark:hover:bg-pink-900/50',
      action: () => {
        setViewMode('dashboard');
        // ポモドーロタイマーにフォーカス
        setTimeout(() => {
          const timerElement = document.querySelector('[data-timer-section]');
          if (timerElement) {
            timerElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg">
          <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            クイックアクション
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            よく使う機能にすばやくアクセス
          </p>
        </div>
      </div>

      {/* アクショングリッド */}
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <button
              key={action.id}
              onClick={action.action}
              className={`group p-4 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200 ${action.bgColor} hover:shadow-md hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                {/* アイコン */}
                <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm group-hover:shadow-md transition-shadow`}>
                  <IconComponent className={`w-5 h-5 ${action.color}`} />
                </div>
                
                {/* タイトル */}
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {action.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                    {action.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* フッター統計 */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>今日のアクション</span>
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>ノート: {getActionCount('notes')}</span>
            </span>
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>検索: {getActionCount('search')}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 今日のアクション回数を取得（簡易版）
function getActionCount(actionType: string): number {
  const today = new Date().toDateString();
  const storageKey = `action-count-${actionType}-${today}`;
  return parseInt(localStorage.getItem(storageKey) || '0');
}

// アクション回数を記録（将来的に使用）
export function recordAction(actionType: string): void {
  const today = new Date().toDateString();
  const storageKey = `action-count-${actionType}-${today}`;
  const currentCount = parseInt(localStorage.getItem(storageKey) || '0');
  localStorage.setItem(storageKey, (currentCount + 1).toString());
}

export default memo(QuickActions);