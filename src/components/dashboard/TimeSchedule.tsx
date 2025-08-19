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

interface TimeScheduleProps {
  selectedDate?: Date | null;
}

const TimeSchedule: React.FC<TimeScheduleProps> = ({ selectedDate }) => {
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
        date: currentDateKey!,
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

  const updateEvent = (id: string, updatedEvent: Partial<ScheduleEvent>) => {
    setEvents(events.map(event =>
      event.id === id ? { ...event, ...updatedEvent } : event
    ));
    setEditingEvent(null);
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

  const getCategoryLabel = (category: ScheduleEvent['category']) => {
    switch (category) {
      case 'work': return '仕事';
      case 'personal': return '個人';
      case 'meeting': return '会議';
      case 'break': return '休憩';
      case 'learning': return '学習';
      default: return category;
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

  // 現在時刻のライン表示用
  const getCurrentTimePosition = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    return (totalMinutes / (24 * 60)) * 100; // 0-100%
  };

  const isToday = currentDateKey === new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock className="w-6 h-6 text-indigo-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">タイムスケジュール</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedDate ? selectedDate.toLocaleDateString('ja-JP', { 
                month: 'long', 
                day: 'numeric',
                weekday: 'short'
              }) : '今日'}のスケジュール
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddEvent(!showAddEvent)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>予定を追加</span>
        </button>
      </div>

      {/* 新しい予定追加フォーム */}
      {showAddEvent && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="space-y-4">
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              placeholder="予定のタイトル"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">開始時間</label>
                <input
                  type="time"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">終了時間</label>
                <input
                  type="time"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <select
              value={newEvent.category}
              onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value as ScheduleEvent['category'] })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="work">仕事</option>
              <option value="personal">個人</option>
              <option value="meeting">会議</option>
              <option value="break">休憩</option>
              <option value="learning">学習</option>
            </select>
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="詳細説明（任意）"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAddEvent(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={addEvent}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* タイムライン */}
      <div className="relative">
        {/* 現在時刻のライン（今日の場合のみ） */}
        {isToday && (
          <div 
            className="absolute left-16 right-0 border-t-2 border-red-500 z-10"
            style={{ top: `${getCurrentTimePosition()}%` }}
          >
            <div className="absolute -left-2 -top-1 w-4 h-4 bg-red-500 rounded-full"></div>
            <div className="absolute -left-12 -top-3 text-xs text-red-500 font-medium">
              {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}

        {/* 時間軸 */}
        <div className="space-y-1">
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="flex items-start">
              <div className="w-14 text-xs text-gray-500 dark:text-gray-400 pt-1">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 border-l border-gray-200 dark:border-gray-600 pl-4 pb-4 relative">
                {/* この時間のイベントを表示 */}
                {dayEvents
                  .filter(event => {
                    const eventHour = parseInt(event.startTime!.split(':')[0]!);
                    return eventHour === hour;
                  })
                  .map((event) => (
                    <div
                      key={event.id}
                      className="mb-2 p-3 rounded-lg border-l-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      style={{ borderLeftColor: event.color }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {editingEvent === event.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                defaultValue={event.title}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    updateEvent(event.id, { title: (e.target as HTMLInputElement).value });
                                  }
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">{event.title}</h4>
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                                  {getCategoryLabel(event.category)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                              </div>
                              {event.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{event.description}</p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={() => setEditingEvent(editingEvent === event.id ? null : event.id)}
                            className="p-1 text-gray-400 hover:text-indigo-500 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* 空の状態 */}
        {dayEvents.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {selectedDate ? 'この日' : '今日'}の予定はありません
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              上の「予定を追加」ボタンから新しい予定を作成できます
            </p>
          </div>
        )}
      </div>

      {/* サマリー */}
      {dayEvents.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>予定数: {dayEvents.length}件</span>
            <span>
              {dayEvents.length > 0 && 
                `${formatTime(dayEvents[0]!.startTime!)} - ${formatTime(dayEvents[dayEvents.length - 1]!.endTime!)}`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSchedule;