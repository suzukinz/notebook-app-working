import React, { useState, useEffect } from 'react';
import { safeReload } from '../../utils/safeReload';
import { useNotebookStore } from '../../store/useNotebookStore';
import TodaysFocus from './TodaysFocus';
import ProductivityStats from './ProductivityStats';
import QuickActions from './QuickActions';
import RecentActivity from './RecentActivity';
import SmartRecommendations from './SmartRecommendations';
import TimeBasedWidgets from './TimeBasedWidgets';

interface HomePageProps {
  className?: string;
}

const HomePage: React.FC<HomePageProps> = ({ className = '' }) => {
  const { selectedWorkspace, workspaces } = useNotebookStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  // 時間を1分ごとに更新
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const currentWorkspace = workspaces.find(w => w.id === selectedWorkspace);
  const greeting = getGreeting();

  return (
    <div className={`flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="max-w-7xl mx-auto p-6">
        {/* ヘッダーセクション */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {greeting}! ホーム画面
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentWorkspace?.name || 'ワークスペース'} • {formatDate(currentTime)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                💡 左側のアイコンからホーム、ノート、ダッシュボード、グラフビューに移動できます
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatTime(currentTime)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {formatDayOfWeek(currentTime)}
              </div>
            </div>
          </div>
        </div>

        {/* Success indicator */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">✅ HomePage is Loading Successfully!</h3>
            <p className="text-xs text-green-600 dark:text-green-300">If you see this, the home routing is working correctly.</p>
            <button
              onClick={() => {
                console.log('🧹 Clearing localStorage to reset viewMode...');
                localStorage.removeItem('notebook-store');
                safeReload();
              }}
              className="mt-2 px-3 py-1 text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded hover:bg-green-300 dark:hover:bg-green-700"
            >
              Clear LocalStorage & Reload
            </button>
          </div>
        )}

        {/* メインダッシュボードグリッド */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左カラム */}
          <div className="lg:col-span-2 space-y-6">
            {/* 今日のフォーカス */}
            <TodaysFocus />
            
            {/* 生産性統計 */}
            <ProductivityStats />
            
            {/* 最近のアクティビティ */}
            <RecentActivity />
          </div>

          {/* 右カラム */}
          <div className="space-y-6">
            {/* クイックアクション */}
            <QuickActions />
            
            {/* 時間ベースウィジェット */}
            <TimeBasedWidgets />
            
            {/* スマート推奨 */}
            <SmartRecommendations />
          </div>
        </div>
      </div>
    </div>
  );
};

// ヘルパー関数
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'おはようございます';
  if (hour < 18) return 'こんにちは';
  return 'お疲れ様です';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDayOfWeek(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    weekday: 'long'
  });
}

export default HomePage;