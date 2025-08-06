import React, { useState, useEffect } from 'react';
import { StickyNote, Save } from 'lucide-react';

interface DailyNote {
  date: string;
  content: string;
  updatedAt: string;
}

interface DailyNotesProps {
  selectedDate?: Date | null;
}

const DailyNotes: React.FC<DailyNotesProps> = ({ selectedDate }) => {
  const [dailyNotes, setDailyNotes] = useState<Record<string, DailyNote>>({});
  const [currentNote, setCurrentNote] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // 現在選択されている日付のキー
  const currentDateKey = selectedDate 
    ? selectedDate.toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  // ローカルストレージからメモを読み込む
  useEffect(() => {
    const savedNotes = localStorage.getItem('dashboard-daily-notes');
    if (savedNotes) {
      setDailyNotes(JSON.parse(savedNotes));
    }
  }, []);

  // 日付が変更されたら、その日のメモを読み込む
  useEffect(() => {
    const note = dailyNotes[currentDateKey];
    setCurrentNote(note?.content || '');
    setHasChanges(false);
  }, [currentDateKey, dailyNotes]);

  const saveNote = () => {
    const updatedNotes = {
      ...dailyNotes,
      [currentDateKey]: {
        date: currentDateKey,
        content: currentNote,
        updatedAt: new Date().toISOString()
      }
    };
    setDailyNotes(updatedNotes);
    localStorage.setItem('dashboard-daily-notes', JSON.stringify(updatedNotes));
    setHasChanges(false);
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentNote(e.target.value);
    setHasChanges(true);
  };

  // 自動保存（3秒後）
  useEffect(() => {
    if (hasChanges && currentNote !== (dailyNotes[currentDateKey]?.content || '')) {
      const timer = setTimeout(() => {
        saveNote();
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNote, hasChanges, currentDateKey]);

  return (
    <div className="h-full flex flex-col">
      {hasChanges && (
        <div className="flex justify-end mb-2">
          <button
            onClick={saveNote}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>
        </div>
      )}

      <div className="flex-1 relative">
        <textarea
          value={currentNote}
          onChange={handleNoteChange}
          placeholder="今日のメモを書く..."
          className="w-full h-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          style={{ minHeight: '200px' }}
        />
        {!currentNote && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <StickyNote className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                この日のメモを記録できます
              </p>
            </div>
          </div>
        )}
      </div>

      {dailyNotes[currentDateKey]?.updatedAt && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          最終更新: {new Date(dailyNotes[currentDateKey].updatedAt).toLocaleString('ja-JP')}
        </div>
      )}
    </div>
  );
};

export default DailyNotes;