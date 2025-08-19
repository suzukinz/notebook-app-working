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
  StickyNote,
  ArrowLeft
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
import PomodoroTimer from './PomodoroTimer';
import PhotoGallery from './PhotoGallery';
import DashboardTabs from './DashboardTabs';

interface InlineDashboardProps {
  timelineDates?: Date[];
  onDateSelect?: (date: Date | null) => void;
}

const InlineDashboard: React.FC<InlineDashboardProps> = ({ timelineDates = [], onDateSelect }) => {
  const store = useNotebookStore();
  const { setViewMode, notesData } = store;
  const [selectedDateNotes, setSelectedDateNotes] = React.useState<any[]>([]);
  const [showDateModal, setShowDateModal] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [calendarViewMode, setCalendarViewMode] = React.useState<CalendarViewMode>('month');
  const [scheduleEvents, setScheduleEvents] = React.useState<any[]>([]);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [, setCalendarViewDate] = React.useState(new Date());
  const [activeTab, setActiveTab] = React.useState('dashboard');
  
  // 30秒ごとに現在時刻を更新
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 30000);

    return () => clearInterval(timer);
  }, []);
  
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

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      {/* 新しいタブナビゲーション */}
      <DashboardTabs 
        onTabChange={setActiveTab}
        onBackClick={() => setViewMode('notes')}
        currentDate={currentDate}
      />
      
      <div className="p-6">{/* padding-topを削除してスペースを節約 */}
        {/* タブに応じてコンテンツを表示 */}
        {activeTab === 'dashboard' && (
          <>
            {/* メイングリッドレイアウト */}
            <div className="space-y-6">
              {/* 猫アニメーション - 一番上に配置 */}
              <div className="w-full">
                <AnimatedTimeSchedule />
              </div>

              {/* ポモドーロタイマー - 電球スイッチデザイン */}
              <div className="w-full">
                <div className="bg-gray-900 rounded-xl p-8 md:p-10 text-center shadow-2xl">
                  <PomodoroTimer featured={true} />
                </div>
              </div>

              {/* 下部グリッド: カレンダーとやることリスト */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* カレンダー - 左側 */}
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
                    timelineDates={timelineDates}
                    onViewModeChange={setCalendarViewMode}
                    onDateSelect={(date, notes) => {
                      setSelectedDate(date);
                      setSelectedDateNotes(notes);
                      if (onDateSelect) {
                        onDateSelect(date);
                      }
                    }}
                    onCalendarDateChange={setCalendarViewDate}
                    onEventAdd={handleEventAdd}
                    onEventEdit={handleEventEdit}
                    onEventDelete={handleEventDelete}
                  />
                </div>

                {/* やることリスト - 右側 */}
                <TodoList selectedDate={selectedDate} />
              </div>


              {/* 日記メモ - 絶対幅 */}
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
          </>
        )}

        {/* 統計・分析セクションはアクティビティタブに移動 */}

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
                  <ArrowLeft className="w-5 h-5" />
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
        
        {/* 他のタブのコンテンツ (将来的に実装) */}
        {activeTab === 'goals' && (
          <div className="grid grid-cols-1 gap-4">
            <GoalsCarousel />
          </div>
        )}
        
        {activeTab === 'gallery' && (
          <div className="grid grid-cols-1 gap-4">
            <PhotoGallery selectedDate={selectedDate} />
          </div>
        )}
        
        {activeTab === 'activity' && (
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
  );
};

export default InlineDashboard;