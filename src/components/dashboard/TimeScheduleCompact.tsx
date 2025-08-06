import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Edit3 } from 'lucide-react';

interface ScheduleEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  color: string;
  date: string; // YYYY-MM-DD format
  category: 'work' | 'personal' | 'meeting' | 'break' | 'learning';
}

interface TimeScheduleCompactProps {
  selectedDate?: Date | null;
}

const TimeScheduleCompact: React.FC<TimeScheduleCompactProps> = ({ selectedDate }) => {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    startTime: '',
    endTime: '',
    description: '',
    category: 'work' as ScheduleEvent['category']
  });

  const currentDateKey = selectedDate 
    ? selectedDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // ローカルストレージからイベントを読み込む
  useEffect(() => {
    const savedEvents = localStorage.getItem('dashboard-schedule');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }
  }, []);

  // イベントが変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('dashboard-schedule', JSON.stringify(events));
  }, [events]);

  const addEvent = () => {
    if (newEvent.title.trim() && newEvent.startTime && newEvent.endTime) {
      const event: ScheduleEvent = {
        id: Date.now().toString(),
        title: newEvent.title,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        description: newEvent.description,
        color: getCategoryColor(newEvent.category),
        date: currentDateKey,
        category: newEvent.category
      };
      setEvents([...events, event]);
      setNewEvent({ title: '', startTime: '', endTime: '', description: '', category: 'work' });
      setShowAddEvent(false);
    }
  };

  const deleteEvent = (id: string) => {
    setEvents(events.filter(event => event.id !== id));
  };

  const getCategoryColor = (category: ScheduleEvent['category']) => {
    switch (category) {
      case 'work': return '#3b82f6'; // blue
      case 'personal': return '#10b981'; // green
      case 'meeting': return '#f59e0b'; // amber
      case 'break': return '#8b5cf6'; // purple
      case 'learning': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };


  // 選択された日付のイベントをフィルタリング
  const dayEvents = events
    .filter(event => event.date === currentDateKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // 時間を表示用にフォーマット
  const formatTime = (time: string) => {
    return time.slice(0, 5); // HH:MM
  };

  // 現在時刻のライン表示用（横向き用）
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return (totalMinutes / (24 * 60)) * 100; // 0-100%
  };

  const getCurrentTimeString = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const isToday = currentDateKey === new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock className="w-6 h-6 text-indigo-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">スケジュール</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedDate ? selectedDate.toLocaleDateString('ja-JP', { 
                month: 'short', 
                day: 'numeric',
                weekday: 'short'
              }) : '今日'}
              {isToday && (
                <span className="ml-2 text-indigo-500 font-medium">
                  {getCurrentTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddEvent(!showAddEvent)}
          className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 新しい予定追加フォーム */}
      {showAddEvent && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="space-y-3">
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="予定のタイトル"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="time"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={newEvent.category}
              onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value as ScheduleEvent['category'] })}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="work">仕事</option>
              <option value="personal">個人</option>
              <option value="meeting">会議</option>
              <option value="break">休憩</option>
              <option value="learning">学習</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAddEvent(false)}
                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={addEvent}
                className="px-3 py-1 text-sm bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 横向きタイムライン */}
      <div className="flex-1 relative">
        {/* 時間軸 */}
        <div className="h-full overflow-x-auto">
          <div className="relative min-w-[800px] h-full">
            {/* 現在時刻のライン（今日の場合のみ） */}
            {isToday && (
              <div 
                className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10"
                style={{ left: `${getCurrentTimePosition()}%` }}
              >
                <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-full"></div>
                <div className="absolute -top-6 -left-6 text-xs text-red-500 font-medium bg-white dark:bg-gray-800 px-1 rounded">
                  {getCurrentTimeString()}
                </div>
              </div>
            )}

            {/* 時間軸のヘッダー */}
            <div className="flex h-8 border-b border-gray-200 dark:border-gray-600 mb-2">
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className="flex-1 text-xs text-gray-500 dark:text-gray-400 text-center border-r border-gray-100 dark:border-gray-700 px-1"
                  style={{ minWidth: '33px' }}
                >
                  {hour.toString().padStart(2, '0')}
                </div>
              ))}
            </div>

            {/* イベント表示エリア */}
            <div className="relative h-[160px] overflow-y-auto">
              {dayEvents.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Clock className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {selectedDate ? 'この日' : '今日'}の予定はありません
                    </p>
                  </div>
                </div>
              ) : (
                dayEvents.map((event, index) => {
                  const startHour = parseInt(event.startTime.split(':')[0]);
                  const startMinute = parseInt(event.startTime.split(':')[1]);
                  const endHour = parseInt(event.endTime.split(':')[0]);
                  const endMinute = parseInt(event.endTime.split(':')[1]);
                  
                  const startPercent = ((startHour * 60 + startMinute) / (24 * 60)) * 100;
                  const endPercent = ((endHour * 60 + endMinute) / (24 * 60)) * 100;
                  const width = endPercent - startPercent;
                  
                  return (
                    <div
                      key={event.id}
                      className="absolute rounded px-2 py-1 text-xs text-white shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                      style={{
                        left: `${startPercent}%`,
                        width: `${Math.max(width, 8)}%`,
                        top: `${(index % 4) * 35}px`,
                        backgroundColor: event.color,
                        height: '30px',
                        minWidth: '60px'
                      }}
                    >
                      <div className="flex items-center justify-between h-full">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="text-xs opacity-90">
                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingEvent(editingEvent === event.id ? null : event.id)}
                            className="p-0.5 hover:bg-white hover:bg-opacity-20 rounded"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="p-0.5 hover:bg-white hover:bg-opacity-20 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* サマリー */}
      {dayEvents.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{dayEvents.length}件の予定</span>
            {dayEvents.length > 0 && (
              <span>
                {formatTime(dayEvents[0].startTime)} - {formatTime(dayEvents[dayEvents.length - 1].endTime)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeScheduleCompact;