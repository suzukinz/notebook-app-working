import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { 
  FileText, 
  MessageSquare, 
  Edit3, 
  Pin,
  Star,
  Calendar,
  Activity,
  Clock,
  FolderPlus,
  Briefcase
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { activityTracker, ActivityEntry } from '../../utils/activityTracker';

interface ActivityItem {
  id: string;
  type: 'note_created' | 'note_updated' | 'note_deleted' | 'folder_created' | 'workspace_created' | 'pomodoro_completed' | 'timeline-post';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  data?: any;
}

// マッピング関数：ActivityEntryをActivityItemに変換
const mapActivityEntryToItem = (entry: ActivityEntry): ActivityItem => {
  let icon: React.ComponentType<any> = FileText;
  let color = 'text-blue-600 dark:text-blue-400';
  let bgColor = 'bg-blue-100 dark:bg-blue-900/30';

  switch (entry.type) {
    case 'note_created':
      icon = FileText;
      color = 'text-blue-600 dark:text-blue-400';
      bgColor = 'bg-blue-100 dark:bg-blue-900/30';
      break;
    case 'note_updated':
      icon = Edit3;
      color = 'text-green-600 dark:text-green-400';
      bgColor = 'bg-green-100 dark:bg-green-900/30';
      break;
    case 'note_deleted':
      icon = FileText;
      color = 'text-red-600 dark:text-red-400';
      bgColor = 'bg-red-100 dark:bg-red-900/30';
      break;
    case 'folder_created':
      icon = FolderPlus;
      color = 'text-purple-600 dark:text-purple-400';
      bgColor = 'bg-purple-100 dark:bg-purple-900/30';
      break;
    case 'workspace_created':
      icon = Briefcase;
      color = 'text-indigo-600 dark:text-indigo-400';
      bgColor = 'bg-indigo-100 dark:bg-indigo-900/30';
      break;
    case 'pomodoro_completed':
      icon = Clock;
      color = 'text-orange-600 dark:text-orange-400';
      bgColor = 'bg-orange-100 dark:bg-orange-900/30';
      break;
  }

  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    description: entry.description,
    timestamp: entry.timestamp,
    icon,
    color,
    bgColor,
    data: entry.metadata
  };
};

interface TimelineEntry {
  id: string;
  text: string;
  timestamp: string;
  tags?: string[];
}

const RecentActivity: React.FC = () => {
  const { notesData, setSelectedNote, setViewMode } = useNotebookStore();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'notes' | 'pomodoro' | 'timeline'>('all');

  // すべてのノートを取得
  const allNotes = useMemo(() => {
    return Object.values(notesData).flat();
  }, [notesData]);

  // アクティビティを読み込む関数
  const loadActivities = useCallback(() => {
    const newActivities: ActivityItem[] = [];

    // 実際のアクティビティデータを取得
    const recentActivities = activityTracker.getWeekActivities();
    
    // ActivityEntryをActivityItemに変換
    recentActivities.forEach(entry => {
      newActivities.push(mapActivityEntryToItem(entry));
    });

    // 実際のアクティビティトラッカーデータのみを使用（フォールバック無し）
    // これにより、実際にアクティビティが記録された場合のみ表示される

    // 従来のタイムライン投稿も含める
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const timelineData: TimelineEntry[] = JSON.parse(localStorage.getItem('dashboard-timeline') || '[]');
      
      timelineData
        .filter(entry => new Date(entry.timestamp) >= sevenDaysAgo)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5)
        .forEach(entry => {
          newActivities.push({
            id: `timeline-${entry.id}`,
            type: 'timeline-post',
            title: entry.text,
            description: 'タイムラインに投稿',
            timestamp: entry.timestamp,
            icon: MessageSquare,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-100 dark:bg-purple-900/30',
            data: entry
          });
        });
    } catch (error) {
      console.error('Failed to load timeline data:', error);
    }

    // タイムスタンプでソート
    newActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setActivities(newActivities.slice(0, 15)); // 最新15件
  }, []);

  // 初期ロード
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  // リアルタイム更新の購読
  useEffect(() => {
    const unsubscribe = activityTracker.subscribe(() => {
      // 新しいアクティビティが追加されたら更新
      loadActivities();
    });

    return unsubscribe;
  }, [loadActivities]);

  // フィルタリングされたアクティビティ
  const filteredActivities = useMemo(() => {
    if (filter === 'all') return activities;
    if (filter === 'notes') return activities.filter(a => 
      a.type === 'note_created' || a.type === 'note_updated' || a.type === 'note_deleted'
    );
    if (filter === 'pomodoro') return activities.filter(a => a.type === 'pomodoro_completed');
    if (filter === 'timeline') return activities.filter(a => a.type === 'timeline-post');
    return activities;
  }, [activities, filter]);

  const handleActivityClick = (activity: ActivityItem) => {
    if ((activity.type === 'note_created' || activity.type === 'note_updated') && activity.data?.noteId) {
      // ノートIDから実際のノートを検索  
      const noteId = activity.data.noteId.toString(); // ✅ string IDとして処理
      const note = allNotes.find(n => n.id === noteId); // ✅ 両方string型で比較
      if (note) {
        setSelectedNote(note);
        setViewMode('notes');
      }
    } else if (activity.type === 'timeline-post') {
      setViewMode('dashboard');
    } else if (activity.type === 'pomodoro_completed') {
      // ポモドーロタイマーを開く
      setViewMode('dashboard');
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return '今';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}日前`;
    return time.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              最近のアクティビティ
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              過去7日間の活動
            </p>
          </div>
        </div>

        {/* フィルタ */}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          {[
            { key: 'all', label: 'すべて' },
            { key: 'notes', label: 'ノート' },
            { key: 'pomodoro', label: 'ポモドーロ' },
            { key: 'timeline', label: 'タイムライン' }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key as any)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === option.key
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* アクティビティリスト */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <div
                key={activity.id}
                onClick={() => handleActivityClick(activity)}
                className="group flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all"
              >
                {/* アイコン */}
                <div className={`flex-shrink-0 p-2 rounded-lg ${activity.bgColor}`}>
                  <IconComponent className={`w-4 h-4 ${activity.color}`} />
                </div>

                {/* コンテンツ */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {activity.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {activity.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-2 text-xs text-gray-400 dark:text-gray-500">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>

                  {/* 追加情報 */}
                  {activity.data && activity.type.includes('note') && (
                    <div className="flex items-center space-x-2 mt-2">
                      {activity.data.isPinned && (
                        <Pin className="w-3 h-3 text-yellow-500" />
                      )}
                      {activity.data.isFavorite && (
                        <Star className="w-3 h-3 text-yellow-500" />
                      )}
                      {activity.data.tags && activity.data.tags.length > 0 && (
                        <div className="flex space-x-1">
                          {activity.data.tags.slice(0, 2).map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {activity.data.tags.length > 2 && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              +{activity.data.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              {filter === 'all' 
                ? '最近のアクティビティはありません' 
                : `最近の${filter === 'notes' ? 'ノート' : 'タイムライン'}アクティビティはありません`}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              ノートを作成したり、タイムラインに投稿すると表示されます
            </p>
          </div>
        )}
      </div>

      {/* フッター統計 */}
      {filteredActivities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>過去7日間</span>
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <FileText className="w-3 h-3" />
                <span>{activities.filter(a => 
                  a.type === 'note_created' || a.type === 'note_updated' || a.type === 'note_deleted'
                ).length} ノート</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{activities.filter(a => a.type === 'pomodoro_completed').length} ポモドーロ</span>
              </span>
              <span className="flex items-center space-x-1">
                <MessageSquare className="w-3 h-3" />
                <span>{activities.filter(a => a.type === 'timeline-post').length} 投稿</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(RecentActivity);