import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee,
  Calendar,
  TrendingUp,
  Timer,
  BarChart3
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';
import { activityTracker } from '../../utils/activityTracker';

interface PomodoroSession {
  id: string;
  startTime: string;
  duration: number; // minutes
  type: 'work' | 'break';
  completed: boolean;
}

interface TimeStats {
  today: {
    work: number;
    break: number;
    total: number;
  };
  week: {
    work: number;
    break: number;
    total: number;
  };
}

const TimeBasedWidgets: React.FC = () => {
  const { setViewMode } = useNotebookStore();
  const [time, setTime] = useState(25 * 60); // 25分 in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [timeStats, setTimeStats] = useState<TimeStats>({
    today: { work: 0, break: 0, total: 0 },
    week: { work: 0, break: 0, total: 0 }
  });

  // loadTimeStats function definition moved to top
  const loadTimeStats = useCallback(() => {
    try {
      const sessions: PomodoroSession[] = JSON.parse(localStorage.getItem('pomodoro-sessions') || '[]');
      const now = new Date();
      const today = now.toDateString();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const todaySessions = sessions.filter(s => 
        new Date(s.startTime).toDateString() === today && s.completed
      );

      const weekSessions = sessions.filter(s => 
        new Date(s.startTime) >= weekStart && s.completed
      );

      const calculateStats = (sessions: PomodoroSession[]) => {
        const work = sessions.filter(s => s.type === 'work').reduce((sum, s) => sum + s.duration, 0);
        const breakTime = sessions.filter(s => s.type === 'break').reduce((sum, s) => sum + s.duration, 0);
        return { work, break: breakTime, total: work + breakTime };
      };

      setTimeStats({
        today: calculateStats(todaySessions),
        week: calculateStats(weekSessions)
      });
    } catch (error) {
      console.error('Failed to load time stats:', error);
    }
  }, []);

  // recordSession function moved to top
  const recordSession = useCallback((type: 'work' | 'break', duration: number) => {
    const session: PomodoroSession = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      duration,
      type,
      completed: true
    };

    // セッションを保存
    const sessions = JSON.parse(localStorage.getItem('pomodoro-sessions') || '[]');
    sessions.push(session);
    localStorage.setItem('pomodoro-sessions', JSON.stringify(sessions));

    // 統計を更新
    loadTimeStats();

    // 総セッション数を更新
    const totalSessions = parseInt(localStorage.getItem('pomodoro-session-count') || '0');
    localStorage.setItem('pomodoro-session-count', (totalSessions + 1).toString());
    
    // アクティビティを記録
    activityTracker.recordPomodoroCompleted(duration, type);
  }, [loadTimeStats]);

  // タイマー機能
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && time > 0) {
      interval = setInterval(() => {
        setTime(time => time - 1);
      }, 1000);
    } else if (time === 0) {
      // タイマー終了時の処理
      setIsRunning(false);
      const sessionType = isBreak ? 'break' : 'work';
      recordSession(sessionType, isBreak ? 5 : 25);
      
      // 次のセッションタイプに切り替え
      setIsBreak(!isBreak);
      setTime(isBreak ? 25 * 60 : 5 * 60);
      
      // 完了通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(
          isBreak ? '休憩時間終了！' : 'ポモドーロ完了！',
          {
            body: isBreak ? '作業時間を開始しましょう' : '5分間の休憩を取りましょう',
            icon: '/favicon.ico'
          }
        );
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, time, isBreak, recordSession]);

  // 統計を読み込み
  useEffect(() => {
    loadTimeStats();
  }, [loadTimeStats]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}時間${mins}分`;
    }
    return `${mins}分`;
  };

  const startTimer = () => {
    setIsRunning(true);
    // 通知許可をリクエスト
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTime(isBreak ? 5 * 60 : 25 * 60);
  };

  const toggleMode = () => {
    setIsBreak(!isBreak);
    setIsRunning(false);
    setTime(!isBreak ? 5 * 60 : 25 * 60);
  };

  const progressPercentage = isBreak 
    ? ((5 * 60 - time) / (5 * 60)) * 100
    : ((25 * 60 - time) / (25 * 60)) * 100;

  return (
    <div className="space-y-4">
      {/* ミニポモドーロタイマー */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <Timer className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              ミニタイマー
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isBreak ? '休憩時間' : '作業時間'}
            </p>
          </div>
        </div>

        {/* タイマー表示 */}
        <div className="text-center mb-4">
          <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white mb-2">
            {formatTime(time)}
          </div>
          
          {/* プログレスバー */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${
                isBreak 
                  ? 'bg-gradient-to-r from-green-500 to-blue-500'
                  : 'bg-gradient-to-r from-red-500 to-orange-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* コントロールボタン */}
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={isRunning ? pauseTimer : startTimer}
              className={`p-2 rounded-lg transition-colors ${
                isRunning
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <button
              onClick={resetTimer}
              className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button
              onClick={toggleMode}
              className={`p-2 rounded-lg transition-colors ${
                isBreak
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50'
              }`}
            >
              {isBreak ? <Clock className="w-4 h-4" /> : <Coffee className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* フルタイマーへのリンク */}
        <button
          onClick={() => setViewMode('dashboard')}
          className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          フルサイズタイマーを開く →
        </button>
      </div>

      {/* 時間使用統計 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              時間統計
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              集中時間の記録
            </p>
          </div>
        </div>

        {/* 今日の統計 */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">今日</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatMinutes(timeStats.today.total)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">作業時間</span>
            <span className="text-gray-700 dark:text-gray-300">
              {formatMinutes(timeStats.today.work)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">休憩時間</span>
            <span className="text-gray-700 dark:text-gray-300">
              {formatMinutes(timeStats.today.break)}
            </span>
          </div>
        </div>

        {/* 今週の統計 */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">今週</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {formatMinutes(timeStats.week.total)}
            </span>
          </div>

          {/* 週間プログレス */}
          <div className="flex items-center space-x-2 text-xs">
            <TrendingUp className="w-3 h-3 text-green-500" />
            <span className="text-gray-500 dark:text-gray-400">
              日平均: {formatMinutes(Math.round(timeStats.week.total / 7))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeBasedWidgets;