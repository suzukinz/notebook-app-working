import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Clock, Grid } from 'lucide-react';
import { Note } from '../../types';

export type CalendarViewMode = 'month' | 'week' | 'day';

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  color?: string;
  noteId?: number;
}

interface CalendarViewProps {
  notes: Note[];
  onDateSelect: (date: Date, notes: Note[]) => void;
  selectedDate?: Date | null;
  viewMode?: CalendarViewMode;
  onViewModeChange?: (mode: CalendarViewMode) => void;
  onCalendarDateChange?: (date: Date) => void; // カレンダー表示日付の変更を通知
  scheduleEvents?: ScheduleEvent[];
  onEventAdd?: (event: Omit<ScheduleEvent, 'id'>) => void;
  onEventEdit?: (event: ScheduleEvent) => void;
  onEventDelete?: (eventId: string) => void;
  timelineDates?: Date[]; // タイムライン投稿がある日付
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  notes, 
  onDateSelect, 
  selectedDate,
  viewMode = 'month',
  onViewModeChange,
  onCalendarDateChange,
  scheduleEvents = [],
  onEventAdd,
  onEventEdit,
  onEventDelete: _onEventDelete,
  timelineDates = []
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // 日付ごとのノート数を集計
  const notesByDate = useMemo(() => {
    const dateMap = new Map<string, Note[]>();
    
    notes.forEach(note => {
      const dateKey = note.updatedAt || note.createdAt;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(note);
    });
    
    return dateMap;
  }, [notes]);
  
  // カレンダーの日付を生成
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);
  
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  

  const handlePrevPeriod = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (viewMode) {
        case 'month':
          newDate.setMonth(newDate.getMonth() - 1);
          break;
        case 'week':
          newDate.setDate(newDate.getDate() - 7);
          break;
        case 'day':
          newDate.setDate(newDate.getDate() - 1);
          break;
      }
      // 親コンポーネントに日付変更を通知
      if (onCalendarDateChange) {
        onCalendarDateChange(newDate);
      }
      return newDate;
    });
  };

  const handleNextPeriod = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (viewMode) {
        case 'month':
          newDate.setMonth(newDate.getMonth() + 1);
          break;
        case 'week':
          newDate.setDate(newDate.getDate() + 7);
          break;
        case 'day':
          newDate.setDate(newDate.getDate() + 1);
          break;
      }
      // 親コンポーネントに日付変更を通知
      if (onCalendarDateChange) {
        onCalendarDateChange(newDate);
      }
      return newDate;
    });
  };

  const cycleViewMode = () => {
    if (!onViewModeChange) return;
    
    const modes: CalendarViewMode[] = ['month', 'week', 'day'];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    if (nextMode) {
      onViewModeChange(nextMode);
    }
  };

  const getViewModeIcon = () => {
    switch (viewMode) {
      case 'month': return <Grid className="w-4 h-4" />;
      case 'week': return <Calendar className="w-4 h-4" />;
      case 'day': return <Clock className="w-4 h-4" />;
    }
  };

  const getViewModeLabel = () => {
    switch (viewMode) {
      case 'month': return '月間';
      case 'week': return '週間';
      case 'day': return '日間';
    }
  };

  const formatCurrentPeriod = () => {
    switch (viewMode) {
      case 'month':
        return `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`;
      case 'week':
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
      case 'day':
        return `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;
    }
  };
  
  const handleDateClick = (date: Date) => {
    const dateKey = formatDateKey(date);
    const notesForDate = notesByDate.get(dateKey) || [];
    onDateSelect(date, notesForDate);
  };
  
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const hasTimelineEntries = (date: Date): boolean => {
    return timelineDates.some(timelineDate => 
      timelineDate.toDateString() === date.toDateString()
    );
  };

  // 週間ビューの日付を生成
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  // 時間スロット (24時間)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // 日間ビュー用のイベント取得
  const getEventsForDay = (date: Date) => {
    const dateKey = formatDateKey(date);
    return scheduleEvents.filter(event => event.date === dateKey);
  };

  // 簡単なイベント追加（ダブルクリック）
  const handleDateDoubleClick = (date: Date) => {
    const title = window.prompt('予定のタイトルを入力してください:');
    if (title) {
      const startTime = window.prompt('開始時刻を入力してください (例: 14:00):', '09:00');
      if (startTime) {
        const endTime = window.prompt('終了時刻を入力してください (例: 15:00):', '10:00');
        if (endTime && onEventAdd) {
          onEventAdd({
            title,
            startTime,
            endTime,
            date: formatDateKey(date),
            color: '#3b82f6'
          });
        }
      }
    }
  };

  // 週間ビューのレンダリング
  const renderWeekView = () => (
    <div className="w-full">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-8 gap-1 mb-2">
        <div className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">時間</div>
        {weekDays.map((day, index) => (
          <div key={index} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
            <div>{['日', '月', '火', '水', '木', '金', '土'][index]}</div>
            <div className={`text-lg ${isToday(day) ? 'text-blue-600 font-bold' : ''}`}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* 週間カレンダー本体 */}
      <div className="max-h-96 overflow-y-auto">
        {timeSlots.map((time, timeIndex) => (
          <div key={timeIndex} className="grid grid-cols-8 gap-1 border-b border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 p-2 text-right">{time}</div>
            {weekDays.map((day, dayIndex) => {
              const eventsForSlot = getEventsForDay(day).filter(event => 
                event.startTime.startsWith(time.split(':')[0] || '')
              );
              return (
                <div
                  key={dayIndex}
                  className={`min-h-12 p-1 border-l border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                    isToday(day) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => handleDateClick(day)}
                >
                  {eventsForSlot.map(event => (
                    <div
                      key={event.id}
                      className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 p-1 rounded mb-1 truncate"
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  // 日間ビューのレンダリング
  const renderDayView = () => {
    const eventsForDay = getEventsForDay(currentDate);
    
    return (
      <div className="w-full">
        <div className="max-h-96 overflow-y-auto">
          {timeSlots.map((time, index) => {
            const eventsForSlot = eventsForDay.filter(event => 
              event.startTime.startsWith(time.split(':')[0] || '')
            );
            
            return (
              <div key={index} className="flex border-b border-gray-100 dark:border-gray-700">
                <div className="w-16 text-xs text-gray-500 p-3 text-right border-r border-gray-100 dark:border-gray-700">
                  {time}
                </div>
                <div 
                  className="flex-1 min-h-12 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => onEventAdd && onEventAdd({
                    title: 'New Event',
                    startTime: time,
                    endTime: `${(parseInt(time.split(':')[0] || '0') + 1).toString().padStart(2, '0')}:00`,
                    date: formatDateKey(currentDate),
                    color: '#3b82f6'
                  })}
                >
                  {eventsForSlot.map(event => (
                    <div
                      key={event.id}
                      className={`p-2 rounded mb-1 text-sm cursor-pointer hover:shadow-md transition-shadow`}
                      style={{ backgroundColor: event.color || '#3b82f6', color: 'white' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventEdit && onEventEdit(event);
                      }}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs opacity-90">{event.startTime} - {event.endTime}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full">
      {/* カレンダーヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPeriod}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold min-w-48 text-center">
            {formatCurrentPeriod()}
          </h3>
          <button
            onClick={handleNextPeriod}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* ビューモード切り替えボタン */}
        {onViewModeChange && (
          <button
            onClick={cycleViewMode}
            className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            title={`現在: ${getViewModeLabel()} (クリックで切り替え)`}
          >
            {getViewModeIcon()}
            <span className="text-sm font-medium">{getViewModeLabel()}</span>
          </button>
        )}
      </div>
      
      {/* ビューモードに応じたカレンダー表示 */}
      {viewMode === 'month' && (
        <>
          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '月', '火', '水', '木', '金', '土'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                {day}
              </div>
            ))}
          </div>
          
          {/* 月間カレンダー本体 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const dateKey = formatDateKey(date);
              const notesForDate = notesByDate.get(dateKey) || [];
              const eventsForDate = getEventsForDay(date);
              const hasNotes = notesForDate.length > 0;
              const hasEvents = eventsForDate.length > 0;
              const hasTimeline = hasTimelineEntries(date);
              
              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  onDoubleClick={() => handleDateDoubleClick(date)}
                  className={`
                    relative p-2 h-16 rounded-lg transition-colors
                    ${isCurrentMonth(date) ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'}
                    ${isToday(date) ? 'bg-blue-100 dark:bg-blue-900' : ''}
                    ${isSelected(date) ? 'bg-purple-200 dark:bg-purple-800 ring-2 ring-purple-500' : ''}
                    ${hasNotes || hasEvents || hasTimeline || isSelected(date) ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                    hover:bg-opacity-80
                  `}
                  title="ダブルクリックで予定を追加"
                >
                  <div className="text-sm font-medium">{date.getDate()}</div>
                  
                  {/* ノートインジケーター */}
                  {hasNotes && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className="flex space-x-0.5">
                        {notesForDate.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className="w-1 h-1 bg-blue-500 rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* イベントインジケーター */}
                  {hasEvents && (
                    <div className="absolute top-1 right-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                  
                  {/* タイムラインインジケーター */}
                  {hasTimeline && (
                    <div className="absolute top-1 left-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" title="タイムライン投稿があります"></div>
                    </div>
                  )}
                  
                  {/* イベント表示（最大2個） */}
                  <div className="absolute top-6 left-1 right-1">
                    {eventsForDate.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-1 rounded mb-0.5 truncate"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
    </div>
  );
};

export default CalendarView;