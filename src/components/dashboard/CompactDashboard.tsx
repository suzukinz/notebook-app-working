import React, { useMemo } from 'react';
import { 
  BarChart3, 
  FileText, 
  FolderOpen, 
  BookOpen, 
  Clock, 
  TrendingUp,
  Tag,
  Activity
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { calculateDashboardStats } from '../../utils/analytics';

const CompactDashboard: React.FC = () => {
  const store = useNotebookStore();
  
  const stats = useMemo(() => {
    return calculateDashboardStats(store);
  }, [store]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">使用統計</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          あなたのノート作成活動の概要です。
        </p>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="flex items-center">
            <FolderOpen className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">ワークスペース</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalWorkspaces}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-green-600 dark:text-green-400">ノートブック</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.totalNotebooks}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400">ノート</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.totalNotes}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <div className="flex items-center">
            <BarChart3 className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-orange-600 dark:text-orange-400">総ページ数</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.totalPages}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 今日のアクティビティ */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <div className="flex items-center mb-3">
          <Activity className="w-5 h-5 text-indigo-500 mr-2" />
          <h4 className="text-md font-semibold text-gray-900 dark:text-white">今日のアクティビティ</h4>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {stats.todayActivity.notesCreated}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">作成</div>
          </div>
          <div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {stats.todayActivity.notesModified}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">更新</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {stats.todayActivity.pagesAdded}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">ページ追加</div>
          </div>
        </div>
      </div>

      {/* 最近のノート（上位5件） */}
      <div>
        <div className="flex items-center mb-3">
          <Clock className="w-5 h-5 text-blue-500 mr-2" />
          <h4 className="text-md font-semibold text-gray-900 dark:text-white">最近のノート</h4>
        </div>
        {stats.recentNotes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">最近のノートがありません</p>
        ) : (
          <div className="space-y-2">
            {stats.recentNotes.slice(0, 5).map((note) => (
              <div 
                key={note.id}
                className="flex items-start space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <div className="bg-blue-100 dark:bg-blue-900 p-1 rounded">
                  <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {note.title}
                  </h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {note.workspaceName} / {note.notebookName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 人気のタグ（上位5件） */}
      <div>
        <div className="flex items-center mb-3">
          <Tag className="w-5 h-5 text-green-500 mr-2" />
          <h4 className="text-md font-semibold text-gray-900 dark:text-white">人気のタグ</h4>
        </div>
        {stats.mostUsedTags.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">タグが見つかりません</p>
        ) : (
          <div className="space-y-2">
            {stats.mostUsedTags.slice(0, 5).map((tag) => (
              <div 
                key={tag.tag}
                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  #{tag.tag}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {tag.count}回
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 週間アクティビティ概要 */}
      <div>
        <div className="flex items-center mb-3">
          <TrendingUp className="w-5 h-5 text-purple-500 mr-2" />
          <h4 className="text-md font-semibold text-gray-900 dark:text-white">週間アクティビティ</h4>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.weekActivity.reduce((sum, d) => sum + d.activity, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              今週の総アクティビティ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactDashboard;