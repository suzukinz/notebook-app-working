import React, { useMemo } from 'react';
import { 
  BarChart3, 
  FileText, 
  FolderOpen, 
  BookOpen, 
  Clock, 
  TrendingUp,
  Tag,
  Calendar,
  Activity,
  X,
  CheckSquare,
  StickyNote,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { calculateDashboardStats } from '../../utils/analytics';
import StatCard from './StatCard';
import RecentNotes from './RecentNotes';
import TagCloud from './TagCloud';
import ActivityChart from './ActivityChart';
import CalendarView, { CalendarViewMode } from './CalendarView';
import TodoList from './TodoList';
import DailyNotes from './DailyNotes';
import GoalsCarousel from './GoalsCarousel';
import AnimatedTimeSchedule from './AnimatedTimeSchedule';
import Timeline from './Timeline';
import PomodoroTimer from './PomodoroTimer';
import PhotoGallery from './PhotoGallery';

const Dashboard: React.FC = () => {
  const store = useNotebookStore();
  const { showDashboard, setShowDashboard, notesData } = store;
  const [selectedDateNotes, setSelectedDateNotes] = React.useState<any[]>([]);
  const [showDateModal, setShowDateModal] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [showAnalytics, setShowAnalytics] = React.useState(false);
  const [calendarViewMode, setCalendarViewMode] = React.useState<CalendarViewMode>('month');
  const [scheduleEvents, setScheduleEvents] = React.useState<any[]>([]);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [calendarViewDate, setCalendarViewDate] = React.useState(new Date()); // カレンダー表示用の日付状態
  
  // 30秒ごとに現在時刻を更新
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 30000); // 30秒ごと

    return () => clearInterval(timer);
  }, []);

  // ESCキーでダッシュボードを閉じる
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDashboard) {
        setShowDashboard(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showDashboard, setShowDashboard]);
  
  const stats = useMemo(() => {
    return calculateDashboardStats(store);
  }, [store]);
  
  // すべてのノートを平坦化
  const allNotes = useMemo(() => {
    const notes: any[] = [];
    Object.values(notesData).forEach(notesInFolder => {
      notes.push(...notesInFolder);
    });
    return notes;
  }, [notesData]);

  // スケジュールイベントのハンドラー
  const handleEventAdd = (event: any) => {
    const newEvent = {
      ...event,
      id: crypto.randomUUID()
    };
    setScheduleEvents(prev => [...prev, newEvent]);
  };

  const handleEventEdit = (event: any) => {
    setScheduleEvents(prev => prev.map(e => e.id === event.id ? event : e));
  };

  const handleEventDelete = (eventId: string) => {
    setScheduleEvents(prev => prev.filter(e => e.id !== eventId));
  };

  if (!showDashboard) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // 背景クリックで閉じる
        if (e.target === e.currentTarget) {
          setShowDashboard(false);
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-[95vw] w-full max-h-[95vh] flex">
        {/* サイドバー: タイムライン */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <Timeline selectedDate={selectedDate} />
        </div>

        {/* メインコンテンツエリア */}
        <div className="flex-1 overflow-y-auto relative bg-gray-50 dark:bg-gray-900">
          <div className="p-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ダッシュボード</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  あなたのノート活動の概要
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>{currentDate.toLocaleDateString('ja-JP', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    weekday: 'short'
                  })}</span>
                  <span className="text-xs">
                    {currentDate.toLocaleTimeString('ja-JP', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDashboard(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
                  aria-label="ダッシュボードを閉じる"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* メイングリッドレイアウト */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 auto-rows-auto">
              {/* 今月の目標 - フル幅 */}
              <div className="lg:col-span-3">
                <GoalsCarousel 
                  currentMonth={`${calendarViewDate.getFullYear()}年${calendarViewDate.getMonth() + 1}月`}
                />
              </div>

              {/* 猫アニメーション - フル幅 */}
              <div className="lg:col-span-3">
                <AnimatedTimeSchedule />
              </div>

              {/* フォトギャラリー - 2/3幅 */}
              <div className="lg:col-span-2">
                <PhotoGallery selectedDate={selectedDate} />
              </div>

              {/* ポモドーロタイマー - 1/3幅 */}
              <div className="lg:col-span-1">
                <PomodoroTimer />
              </div>

              {/* カレンダー */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-purple-500 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">カレンダー</h2>
                  </div>
                  {selectedDate && (
                    <div className="text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                      選択中: {selectedDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
                <CalendarView 
                  notes={allNotes}
                  selectedDate={selectedDate}
                  viewMode={calendarViewMode}
                  scheduleEvents={scheduleEvents}
                  onViewModeChange={setCalendarViewMode}
                  onDateSelect={(date, notes) => {
                    setSelectedDate(date);
                    setSelectedDateNotes(notes);
                  }}
                  onCalendarDateChange={setCalendarViewDate}
                  onEventAdd={handleEventAdd}
                  onEventEdit={handleEventEdit}
                  onEventDelete={handleEventDelete}
                />
              </div>

              {/* やることリスト */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CheckSquare className="w-5 h-5 text-green-500 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">やることリスト</h2>
                  </div>
                  {selectedDate && (
                    <div className="text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                      {selectedDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
                <TodoList selectedDate={selectedDate} />
              </div>

              {/* 日記メモ */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <StickyNote className="w-5 h-5 text-orange-500 mr-2" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">日記メモ</h2>
                  </div>
                  {selectedDate && (
                    <div className="text-sm bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
                      {selectedDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </div>
                <DailyNotes selectedDate={selectedDate} />
              </div>
            </div>

          {/* 統計・分析セクション */}
          <div className="space-y-6">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-gray-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">統計・分析</h3>
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    ({stats.totalNotes}ノート, {stats.totalPages}ページ)
                  </span>
                </div>
                {showAnalytics ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>

            {showAnalytics && (
              <div className="space-y-6">
                {/* 統計カード */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="ワークスペース"
                value={stats.totalWorkspaces}
                icon={<FolderOpen className="w-6 h-6" />}
                color="bg-blue-500"
                change={{ value: 0, isPositive: true }}
              />
              <StatCard
                title="ノートブック"
                value={stats.totalNotebooks}
                icon={<BookOpen className="w-6 h-6" />}
                color="bg-green-500"
                change={{ value: 0, isPositive: true }}
              />
              <StatCard
                title="ノート"
                value={stats.totalNotes}
                icon={<FileText className="w-6 h-6" />}
                color="bg-purple-500"
                change={{ value: stats.todayActivity.notesCreated, isPositive: true }}
              />
              <StatCard
                title="総ページ数"
                value={stats.totalPages}
                icon={<BarChart3 className="w-6 h-6" />}
                color="bg-orange-500"
                change={{ value: stats.todayActivity.pagesAdded, isPositive: true }}
              />
            </div>

            {/* 今日のアクティビティ */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Activity className="w-5 h-5 text-indigo-500 mr-2" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">今日のアクティビティ</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.todayActivity.notesCreated}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">作成されたノート</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stats.todayActivity.notesModified}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">更新されたノート</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.todayActivity.pagesAdded}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">追加されたページ</div>
                </div>
              </div>
            </div>

            {/* 下部のデータ・チャートエリア */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 最近のノート */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <Clock className="w-5 h-5 text-blue-500 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">最近のノート</h4>
                </div>
                <RecentNotes notes={stats.recentNotes} />
              </div>

              {/* 人気のタグ */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <Tag className="w-5 h-5 text-indigo-500 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">人気のタグ</h4>
                </div>
                <TagCloud tags={stats.mostUsedTags} />
              </div>

              {/* 週間アクティビティチャート */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-5 h-5 text-purple-500 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">週間アクティビティ</h4>
                </div>
                <ActivityChart data={stats.weekActivity} />
              </div>
                </div>
              </div>
            )}
          </div>
      </div>

      {/* 日付別ノートモーダル */}
      {showDateModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[60vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {selectedDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} のノート
              </h3>
              <button
                onClick={() => setShowDateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(60vh-80px)]">
              <RecentNotes 
                notes={selectedDateNotes.map(note => ({
                  ...note,
                  workspaceName: 'ワークスペース',
                  notebookName: 'ノートブック',
                  lastModified: note.updatedAt || note.createdAt
                }))}
              />
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;