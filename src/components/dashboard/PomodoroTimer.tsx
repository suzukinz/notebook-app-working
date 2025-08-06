import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Settings } from 'lucide-react';

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

const PomodoroTimer: React.FC = () => {
  const [time, setTime] = useState(25 * 60); // 25分 in seconds
  const [isActive, setIsActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<'work' | 'short_break' | 'long_break'>('work');
  const [sessionCount, setSessionCount] = useState(0);
  const [breakCount, setBreakCount] = useState(0);
  const [completedSessions, setCompletedSessions] = useState<PomodoroSession[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [timerMode, setTimerMode] = useState<'countdown' | 'pomodoro'>('countdown'); // カウントダウン or ポモドーロ
  const [flipClock, setFlipClock] = useState<any>(null);
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

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    const savedSessions = localStorage.getItem('pomodoro-sessions');
    const savedSettings = localStorage.getItem('pomodoro-settings');
    const savedSessionCount = localStorage.getItem('pomodoro-session-count');
    const savedBreakCount = localStorage.getItem('pomodoro-break-count');
    
    if (savedSessions) {
      setCompletedSessions(JSON.parse(savedSessions));
    }
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    if (savedSessionCount) {
      setSessionCount(parseInt(savedSessionCount));
    }
    if (savedBreakCount) {
      setBreakCount(parseInt(savedBreakCount));
    }
  }, []);

  // FlipClock初期化
  useEffect(() => {
    const initializeClock = () => {
      if (clockRef.current && (window as any).$) {
        const $ = (window as any).$;
        
        // 既存のFlipClockを停止・削除
        if (flipClock) {
          try {
            flipClock.stop();
            setFlipClock(null);
          } catch (error) {
            console.log('FlipClock stop error:', error);
          }
        }
        
        // DOMを完全にクリア
        $(clockRef.current).empty();
        
        // 少し待ってから新しいFlipClockを初期化
        setTimeout(() => {
          if (timerMode === 'countdown') {
            initCountdownClock($);
          } else {
            initPomodoroClock($);
          }
        }, 100);
      }
    };

    // jQueryとFlipClockが利用可能になるまで待つ
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
          console.log('FlipClock stop error:', error);
        }
      }
    };
  }, [timerMode]);

  const initCountdownClock = ($: any) => {
    // 月末まで・週末までの残り時間を計算
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay())); // 次の日曜日
    endOfWeek.setHours(23, 59, 59, 999);
    
    // 月末までの残り時間（秒）
    const diffMonth = Math.floor((endOfMonth.getTime() - now.getTime()) / 1000);
    
    try {
      const clock = $(clockRef.current).FlipClock(diffMonth, {
        clockFace: 'HourlyCounter',
        countdown: true,
        autoStart: true
      });
      
      setFlipClock(clock);
    } catch (error) {
      console.error('FlipClock initialization error:', error);
    }
  };

  const initPomodoroClock = ($: any) => {
    // ポモドーロモード: MM:SS形式で表示
    try {
      const clock = $(clockRef.current).FlipClock(time, {
        clockFace: 'MinuteCounter',
        countdown: true,
        autoStart: false
      });
      
      setFlipClock(clock);
    } catch (error) {
      console.error('FlipClock initialization error:', error);
    }
  };

  // ポモドーロモードでFlipClockを更新
  useEffect(() => {
    if (flipClock && timerMode === 'pomodoro') {
      try {
        // FlipClockの表示を更新（秒で）
        flipClock.setTime(time);
      } catch (error) {
        console.log('FlipClock update error:', error);
      }
    }
  }, [time, timerMode, flipClock]);

  // データをローカルストレージに保存
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

  // タイマーの実行（ポモドーロモードのみ）
  useEffect(() => {
    if (timerMode === 'pomodoro' && isActive && time > 0) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => {
          const newTime = prevTime - 1;
          return newTime;
        });
      }, 1000);
    } else if (time === 0) {
      handleSessionComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, time, timerMode]);

  const handleSessionComplete = () => {
    setIsActive(false);
    
    // 完了したセッションを記録
    const session: PomodoroSession = {
      id: Date.now().toString(),
      type: currentSession,
      duration: getDurationByType(currentSession),
      completedAt: new Date().toISOString()
    };
    
    setCompletedSessions(prev => [session, ...prev]);
    
    // セッション数を更新
    if (currentSession === 'work') {
      setSessionCount(prev => prev + 1);
    } else {
      setBreakCount(prev => prev + 1);
    }

    // 通知音を再生
    playNotificationSound();
    
    // 次のセッションを開始
    handleNextSession();
  };

  const handleNextSession = () => {
    if (currentSession === 'work') {
      const isLongBreak = (sessionCount + 1) % settings.sessionsUntilLongBreak === 0;
      const nextSession = isLongBreak ? 'long_break' : 'short_break';
      setCurrentSession(nextSession);
      setTime(getDurationByType(nextSession) * 60);
      
      // 自動で次のセッションを開始
      setIsActive(true);
    } else {
      setCurrentSession('work');
      setTime(settings.workDuration * 60);
      
      // 自動で次のセッションを開始
      setIsActive(true);
    }
  };

  const getDurationByType = (type: 'work' | 'short_break' | 'long_break'): number => {
    switch (type) {
      case 'work': return settings.workDuration;
      case 'short_break': return settings.shortBreakDuration;
      case 'long_break': return settings.longBreakDuration;
    }
  };

  const playNotificationSound = () => {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTime(getDurationByType(currentSession) * 60);
  };


  const getSessionLabel = () => {
    switch (currentSession) {
      case 'work': return '作業時間';
      case 'short_break': return '短い休憩';
      case 'long_break': return '長い休憩';
    }
  };

  const todaysSessions = completedSessions.filter(session => 
    new Date(session.completedAt).toDateString() === new Date().toDateString()
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">ポモドーロタイマー</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{getSessionLabel()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* タイマーモード切り替え */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-xs text-gray-600 dark:text-gray-400">カウントダウン</span>
            <button
              onClick={() => setTimerMode(timerMode === 'countdown' ? 'pomodoro' : 'countdown')}
              className="relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{
                backgroundColor: timerMode === 'countdown' ? '#3b82f6' : '#f59e0b'
              }}
            >
              <span className="sr-only">タイマーモード切り替え</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                  timerMode === 'countdown' ? 'translate-x-1' : 'translate-x-7'
                }`}
              />
            </button>
            <span className="text-xs text-gray-600 dark:text-gray-400">ポモドーロ</span>
          </div>
          {/* リセットボタン（ポモドーロモードのみ） */}
          {timerMode === 'pomodoro' && (
            <button
              onClick={resetTimer}
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              title="リセット"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 設定パネル */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">作業時間（分）</label>
              <input
                type="number"
                value={settings.workDuration}
                onChange={(e) => setSettings({...settings, workDuration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min="1"
                max="60"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">短い休憩（分）</label>
              <input
                type="number"
                value={settings.shortBreakDuration}
                onChange={(e) => setSettings({...settings, shortBreakDuration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min="1"
                max="30"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">長い休憩（分）</label>
              <input
                type="number"
                value={settings.longBreakDuration}
                onChange={(e) => setSettings({...settings, longBreakDuration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min="1"
                max="60"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">長い休憩までのセッション数</label>
              <input
                type="number"
                value={settings.sessionsUntilLongBreak}
                onChange={(e) => setSettings({...settings, sessionsUntilLongBreak: parseInt(e.target.value)})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min="1"
                max="10"
              />
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
            ※ セッションは自動で切り替わります
          </div>
        </div>
      )}

      {/* FlipClock タイマー表示部分 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {timerMode === 'countdown' ? '残り時間' : 'ポモドーロタイマー'}
            </h3>
            {timerMode === 'pomodoro' && (
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>{getSessionLabel()}</p>
                <div className="flex justify-center space-x-4">
                  <span className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded text-sm font-medium">
                    セッション: {sessionCount}
                  </span>
                  <span className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded text-sm font-medium">
                    休憩: {breakCount}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* FlipClock */}
          <div 
            ref={clockRef} 
            className="clock"
            style={{
              width: '100%',
              maxWidth: '650px',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'center'
            }}
          />
          
          {timerMode === 'pomodoro' && (
            <div className="mt-6 flex justify-center space-x-4">
              <button
                onClick={toggleTimer}
                className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 ${
                  isActive
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isActive ? '⏸ Stop' : '▶ Start'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 統計情報 */}
      {timerMode === 'pomodoro' && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-500">{sessionCount}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">今日の完了</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{breakCount}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">休憩回数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-500">
                {Math.round(todaysSessions.filter(s => s.type === 'work').reduce((sum, s) => sum + s.duration, 0) / 60)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">集中時間(分)</div>
            </div>
          </div>
        </div>
      )}

      {/* FlipClock カスタマイズCSS */}
      <style>{`
        .clock {
          position: relative !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
        }
        
        /* FlipClockのカスタマイズ */
        .flip-clock-wrapper {
          text-align: center !important;
          margin: 0 auto !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: 100% !important;
        }
        
        .flip-clock-wrapper .flip-clock-digit {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }
        
        .flip-clock-wrapper .flip-clock-digit .flip-clock-digit-top {
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .flip-clock-wrapper .flip-clock-digit .flip-clock-digit-bottom {
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .flip-clock-wrapper .flip-clock-divider {
          color: #667eea;
        }
        
        .flip-clock-wrapper .flip-clock-divider .flip-clock-dot {
          background: #667eea;
        }
      `}</style>
    </div>
  );
};

export default PomodoroTimer;