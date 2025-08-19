import React, { useState, useEffect } from 'react';
import { Target, Plus, Check, X, Edit3 } from 'lucide-react';

interface FocusItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

const TodaysFocus: React.FC = () => {
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // localStorage からデータを読み込み
  useEffect(() => {
    const stored = localStorage.getItem('todays-focus');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // 今日の日付のアイテムのみを読み込み
        const today = new Date().toDateString();
        const todaysItems = parsed.filter((item: FocusItem) => 
          new Date(item.createdAt).toDateString() === today
        );
        setFocusItems(todaysItems);
      } catch (error) {
        console.error('Failed to load focus items:', error);
      }
    }
  }, []);

  // データを localStorage に保存
  useEffect(() => {
    localStorage.setItem('todays-focus', JSON.stringify(focusItems));
  }, [focusItems]);

  const addFocusItem = () => {
    if (newItemText.trim() && focusItems.length < 3) {
      const newItem: FocusItem = {
        id: Date.now().toString(),
        text: newItemText.trim(),
        completed: false,
        priority: 'medium',
        createdAt: new Date().toISOString()
      };
      setFocusItems([...focusItems, newItem]);
      setNewItemText('');
      setIsAdding(false);
    }
  };

  const toggleComplete = (id: string) => {
    setFocusItems(items =>
      items.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const deleteFocusItem = (id: string) => {
    setFocusItems(items => items.filter(item => item.id !== id));
  };

  const startEdit = (item: FocusItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const saveEdit = () => {
    if (editText.trim() && editingId) {
      setFocusItems(items =>
        items.map(item =>
          item.id === editingId ? { ...item, text: editText.trim() } : item
        )
      );
    }
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const completedCount = focusItems.filter(item => item.completed).length;
  const progressPercentage = focusItems.length > 0 ? (completedCount / focusItems.length) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              今日のフォーカス
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {completedCount}/{focusItems.length} 完了
            </p>
          </div>
        </div>
        {focusItems.length < 3 && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>追加</span>
          </button>
        )}
      </div>

      {/* プログレスバー */}
      {focusItems.length > 0 && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            進捗: {Math.round(progressPercentage)}%
          </p>
        </div>
      )}

      {/* フォーカスアイテムリスト */}
      <div className="space-y-3">
        {focusItems.map((item) => (
          <div
            key={item.id}
            className={`group flex items-center space-x-3 p-3 rounded-lg border transition-all ${
              item.completed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            {/* チェックボックス */}
            <button
              onClick={() => toggleComplete(item.id)}
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                item.completed
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-300 dark:border-gray-500 hover:border-blue-500 dark:hover:border-blue-400'
              }`}
            >
              {item.completed && <Check className="w-3 h-3" />}
            </button>

            {/* テキスト */}
            {editingId === item.id ? (
              <div className="flex-1 flex items-center space-x-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit();
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={saveEdit}
                  className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <span
                  className={`flex-1 text-sm ${
                    item.completed
                      ? 'text-green-700 dark:text-green-300 line-through'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {item.text}
                </span>

                {/* アクションボタン */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteFocusItem(item.id)}
                    className="p-1 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* 新規追加フォーム */}
        {isAdding && (
          <div className="flex items-center space-x-3 p-3 rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20">
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-500 rounded flex-shrink-0" />
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addFocusItem();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewItemText('');
                }
              }}
              placeholder="今日のフォーカスを入力..."
              className="flex-1 px-2 py-1 text-sm border-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={addFocusItem}
              className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewItemText('');
              }}
              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 空の状態 */}
        {focusItems.length === 0 && !isAdding && (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-3">
              今日のフォーカスを設定しましょう
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>最初のフォーカスを追加</span>
            </button>
          </div>
        )}
      </div>

      {/* 達成時のお祝いメッセージ */}
      {focusItems.length > 0 && completedCount === focusItems.length && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 text-center font-medium">
            🎉 素晴らしい！今日のフォーカスをすべて達成しました！
          </p>
        </div>
      )}
    </div>
  );
};

export default TodaysFocus;