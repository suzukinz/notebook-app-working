import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw } from 'lucide-react';

interface PomodoroSession {
  id: string;
  type: 'work' | 'short_break' | 'long_break';
  duration: number;
  completedAt: string;
  taskName?: string;
}

interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

interface PomodoroTimerProps {
  featured?: boolean;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ featured = false }) => {
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<'work' | 'short_break' | 'long_break'>('work');
  const [sessionCount, setSessionCount] = useState(0);
  const [breakCount, setBreakCount] = useState(0);
  const [completedSessions, setCompletedSessions] = useState<PomodoroSession[]>([]);
  const [flipClock, setFlipClock] = useState<any>(null);
  const [timerMode, setTimerMode] = useState<'month' | 'week' | 'day' | 'pomodoro'>('month');
  const [settings, setSettings] = useState<PomodoroSettings>({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: true,
    autoStartWork: true
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const clockRef = useRef<HTMLDivElement>(null);

  // Define all callback functions first
  const getTargetTime = useCallback((): number => {
    const now = new Date();
    let target = new Date();
    
    switch (timerMode) {
      case 'month':
        // 来月の0日目 = 今月の最終日
        target = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        target.setHours(23, 59, 59, 999);
        break;
      case 'week':
        // 日曜日を0として、土曜日(6)を週の最後とする
        const dayOfWeek = now.getDay();
        const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek; // 日曜日の場合は6日後、それ以外は土曜日まで
        target = new Date(now);
        target.setDate(now.getDate() + daysUntilSaturday);
        target.setHours(23, 59, 59, 999);
        break;
      case 'day':
        target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        target.setHours(23, 59, 59, 999);
        break;
      default:
        return now.getTime();
    }
    
    // 既に過ぎている場合は次の期間を設定
    if (target.getTime() <= now.getTime()) {
      switch (timerMode) {
        case 'month':
          target = new Date(now.getFullYear(), now.getMonth() + 2, 0);
          target.setHours(23, 59, 59, 999);
          break;
        case 'week':
          target.setDate(target.getDate() + 7);
          break;
        case 'day':
          target.setDate(target.getDate() + 1);
          break;
      }
    }
    
    return target.getTime();
  }, [timerMode]);

  const getDurationByType = useCallback((type: 'work' | 'short_break' | 'long_break'): number => {
    switch (type) {
      case 'work': return settings.workDuration;
      case 'short_break': return settings.shortBreakDuration;
      case 'long_break': return settings.longBreakDuration;
    }
  }, [settings.workDuration, settings.shortBreakDuration, settings.longBreakDuration]);

  const playNotificationSound = useCallback(() => {
    // 音を無効化（デバッグのため一時的にコメントアウト）
    return;
  }, []);

  const handleNextSession = useCallback(() => {
    if (currentSession === 'work') {
      const isLongBreak = (sessionCount + 1) % settings.sessionsUntilLongBreak === 0;
      const nextSession = isLongBreak ? 'long_break' : 'short_break';
      setCurrentSession(nextSession);
      setTime(getDurationByType(nextSession) * 60);
      setIsActive(true);
    } else {
      setCurrentSession('work');
      setTime(settings.workDuration * 60);
      setIsActive(true);
    }
  }, [currentSession, sessionCount, settings.sessionsUntilLongBreak, settings.workDuration, getDurationByType]);

  const handleSessionComplete = useCallback(() => {
    setIsActive(false);
    
    const session: PomodoroSession = {
      id: Date.now().toString(),
      type: currentSession,
      duration: getDurationByType(currentSession),
      completedAt: new Date().toISOString()
    };
    
    setCompletedSessions(prev => [session, ...prev]);
    
    if (currentSession === 'work') {
      setSessionCount(prev => prev + 1);
    } else {
      setBreakCount(prev => prev + 1);
    }

    playNotificationSound();
    handleNextSession();
  }, [currentSession, getDurationByType, playNotificationSound, handleNextSession]);


  const handleModeChange = useCallback((mode: 'month' | 'week' | 'day' | 'pomodoro') => {
    setTimerMode(mode);
    setIsActive(false);
  }, []);

  const toggleTimer = useCallback(() => {
    setIsActive(!isActive);
  }, [isActive]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    if (timerMode === 'pomodoro') {
      setTime(settings.workDuration * 60);
      setCurrentSession('work');
    } else {
      const targetTime = getTargetTime();
      const currentTime = new Date().getTime();
      const remainingSeconds = Math.max(1, Math.floor((targetTime - currentTime) / 1000)); // 最小1秒を保証
      setTime(remainingSeconds);
    }
  }, [timerMode, settings.workDuration, getTargetTime]);

  // Now define useEffect hooks
  useEffect(() => {
    const savedSessions = localStorage.getItem('pomodoro-sessions');
    const savedSettings = localStorage.getItem('pomodoro-settings');
    const savedSessionCount = localStorage.getItem('pomodoro-session-count');
    const savedBreakCount = localStorage.getItem('pomodoro-break-count');
    
    if (savedSessions) {
      setCompletedSessions(JSON.parse(savedSessions));
    }
    if (savedSettings) {
      const loadedSettings = JSON.parse(savedSettings);
      setSettings(loadedSettings);
      if (timerMode === 'pomodoro') {
        setTime(loadedSettings.workDuration * 60);
      }
    } else if (timerMode === 'pomodoro') {
      setTime(settings.workDuration * 60);
    }
    if (savedSessionCount) {
      setSessionCount(parseInt(savedSessionCount));
    }
    if (savedBreakCount) {
      setBreakCount(parseInt(savedBreakCount));
    }
  }, [timerMode, settings.workDuration]);

  useEffect(() => {
    if (timerMode === 'pomodoro') {
      setTime(settings.workDuration * 60);
      setIsActive(false);
    } else {
      const targetTime = getTargetTime();
      const currentTime = new Date().getTime();
      const remainingSeconds = Math.max(1, Math.floor((targetTime - currentTime) / 1000)); // 最小1秒を保証
      setTime(remainingSeconds);
      setIsActive(false);
    }
  }, [timerMode, settings.workDuration, getTargetTime]);

  useEffect(() => {
    const initializeClock = () => {
      if (clockRef.current && (window as any).$) {
        const $ = (window as any).$;
        
        // 既存のFlipClockを停止して削除
        if (flipClock) {
          try {
            flipClock.stop();
          } catch (error) {
            // FlipClock stop error handled silently
          }
        }
        
        // DOM要素をクリア
        $(clockRef.current).empty();
        
        // 新しいFlipClockインスタンスを作成
        setTimeout(() => {
          if (!clockRef.current) return;
          
          if (timerMode === 'pomodoro') {
            const clock = $(clockRef.current).FlipClock(time, {
              clockFace: 'MinuteCounter',
              countdown: true,
              autoStart: false
            });
            setFlipClock(clock);
          } else {
            const targetTime = getTargetTime();
            const currentTime = new Date().getTime();
            const remainingSeconds = Math.max(1, Math.floor((targetTime - currentTime) / 1000));
            
            const clock = $(clockRef.current).FlipClock(remainingSeconds, {
              clockFace: 'HourlyCounter',
              countdown: true,
              autoStart: false
            });
            
            setFlipClock(clock);
            setTime(remainingSeconds);
          }
          
        }, 100);
      }
    };

    if ((window as any).$) {
      initializeClock();
    } else {
      const checkForJQuery = setInterval(() => {
        if ((window as any).$) {
          clearInterval(checkForJQuery);
          initializeClock();
        }
      }, 100);
    }
    
    return () => {
      if (flipClock) {
        try {
          flipClock.stop();
        } catch (error) {
          // FlipClock stop error handled silently
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerMode]); // FlipClockはtimerModeが変わったときだけ再初期化

  useEffect(() => {
    if (flipClock && timerMode === 'pomodoro') {
      try {
        flipClock.setTime(time);
      } catch (error) {
        // FlipClock update error handled silently
      }
    }
  }, [time, flipClock, timerMode]);

  useEffect(() => {
    localStorage.setItem('pomodoro-sessions', JSON.stringify(completedSessions));
  }, [completedSessions]);

  useEffect(() => {
    localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('pomodoro-session-count', sessionCount.toString());
  }, [sessionCount]);

  useEffect(() => {
    localStorage.setItem('pomodoro-break-count', breakCount.toString());
  }, [breakCount]);

  useEffect(() => {
    if (isActive && time > 0) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => {
          const newTime = Math.max(0, prevTime - 1);
          
          if (timerMode !== 'pomodoro' && flipClock) {
            try {
              flipClock.setTime(newTime);
            } catch (error) {
              // FlipClock countdown update error handled silently
            }
          }
          
          return newTime;
        });
      }, 1000);
    } else if (time <= 0 && timerMode === 'pomodoro') {
      if (isActive) {
        handleSessionComplete();
      }
    } else if (time <= 0 && timerMode !== 'pomodoro') {
      setIsActive(false);
      playNotificationSound();
      // カウントダウン終了後、次の期間を自動的に設定
      setTimeout(() => {
        const targetTime = getTargetTime();
        const currentTime = new Date().getTime();
        const remainingSeconds = Math.max(1, Math.floor((targetTime - currentTime) / 1000));
        setTime(remainingSeconds);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, time, timerMode, flipClock, handleSessionComplete, playNotificationSound, getTargetTime]);

  const formatTime = (seconds: number) => {
    if (timerMode === 'pomodoro') {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (days > 0) {
        return `${days}日 ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    }
  };

  const getProgressPercentage = () => {
    if (timerMode === 'pomodoro') {
      const maxTime = getDurationByType(currentSession) * 60;
      return Math.max(0, Math.min(100, ((maxTime - time) / maxTime) * 100));
    } else {
      // カウントダウンモードでは、今日の開始時間から終了時間までの進行率を計算
      const now = new Date();
      const startOfPeriod = new Date();
      const targetTime = getTargetTime();
      
      switch (timerMode) {
        case 'day':
          startOfPeriod.setHours(0, 0, 0, 0);
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          const startOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜日を週の開始とする
          startOfPeriod.setDate(now.getDate() - startOfWeek);
          startOfPeriod.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startOfPeriod.setDate(1);
          startOfPeriod.setHours(0, 0, 0, 0);
          break;
      }
      
      const totalDuration = targetTime - startOfPeriod.getTime();
      const elapsed = now.getTime() - startOfPeriod.getTime();
      return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));
    }
  };


  const getSessionLabel = () => {
    switch (currentSession) {
      case 'work': return '作業時間';
      case 'short_break': return '短い休憩';
      case 'long_break': return '長い休憩';
    }
  };

  return (
    <div className={`${featured ? 'bg-transparent text-white relative' : 'bg-white dark:bg-gray-800'} rounded-lg shadow-sm ${featured ? 'p-4 sm:p-6 md:p-8' : 'p-4 sm:p-6'} h-full flex flex-col relative`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-center mb-6">
        <h3 className={`text-lg font-semibold ${featured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
          {timerMode === 'pomodoro' ? getSessionLabel() : 'カウントダウン'}
        </h3>
      </div>

      {/* モード切り替えスイッチ - 中央配置 */}
      <div className="flex justify-center mb-6">
        <div className="timer-switch-control">
          <div className="timer-switch-track">
            <div className="timer-switch-indicator"></div>
            <input 
              className="sr-only" 
              type="radio" 
              name="timer-mode" 
              id="month-mode" 
              checked={timerMode === 'month'} 
              onChange={() => handleModeChange('month')}
            />
            <label htmlFor="month-mode">月末</label>
            
            <input 
              className="sr-only" 
              type="radio" 
              name="timer-mode" 
              id="week-mode" 
              checked={timerMode === 'week'} 
              onChange={() => handleModeChange('week')}
            />
            <label htmlFor="week-mode">週末</label>
            
            <input 
              className="sr-only" 
              type="radio" 
              name="timer-mode" 
              id="day-mode" 
              checked={timerMode === 'day'} 
              onChange={() => handleModeChange('day')}
            />
            <label htmlFor="day-mode">今日</label>
            
            <input 
              className="sr-only" 
              type="radio" 
              name="timer-mode" 
              id="pomodoro-mode" 
              checked={timerMode === 'pomodoro'} 
              onChange={() => handleModeChange('pomodoro')}
            />
            <label htmlFor="pomodoro-mode">ポモ</label>
          </div>
        </div>
      </div>

      {/* FlipClock表示エリア - 完全中央配置 */}
      <div className="flex-1 flex items-center justify-center mb-6">
        <div className="w-full flex justify-center items-center">
          <div 
            ref={clockRef}
            className="text-4xl md:text-6xl font-bold text-center w-full flex justify-center items-center"
          >
            {/* フォールバック表示 */}
            <div className={`timer-display-fallback ${featured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
              {formatTime(time)}
            </div>
          </div>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="mb-6">
        <div className={`w-full h-2 rounded-full ${featured ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${
              featured ? 'bg-white' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, getProgressPercentage()))}%` }}
          />
        </div>
      </div>

      {/* コントロールボタン */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={toggleTimer}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            featured
              ? 'bg-white text-gray-900 hover:bg-gray-100'
              : 'bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700'
          }`}
        >
          {isActive ? '一時停止' : '開始'}
        </button>
        
        <button
          onClick={resetTimer}
          className={`p-2 rounded-lg transition-colors ${
            featured
              ? 'text-white hover:bg-white/20'
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* ポモドーロ統計 */}
      {timerMode === 'pomodoro' && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className={`text-2xl font-bold ${featured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {sessionCount}
              </div>
              <div className={`text-sm ${featured ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
                作業セッション
              </div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${featured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {breakCount}
              </div>
              <div className={`text-sm ${featured ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
                休憩回数
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;