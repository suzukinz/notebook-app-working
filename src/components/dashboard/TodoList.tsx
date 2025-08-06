import React, { useState, useEffect, useRef } from 'react';
import { CheckSquare, Plus, Calendar, Trash2, Circle, CheckCircle, Edit2 } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  dueDate?: string | undefined;
  createdAt: string;
  priority?: 'high' | 'medium' | 'low' | undefined;
}

interface TodoListProps {
  selectedDate?: Date | null;
}

const TodoList: React.FC<TodoListProps> = ({ selectedDate }) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // ローカルストレージからTODOを読み込む
  useEffect(() => {
    const savedTodos = localStorage.getItem('dashboard-todos');
    if (savedTodos) {
      try {
        setTodos(JSON.parse(savedTodos));
      } catch (error) {
        console.error('Error parsing saved todos:', error);
        localStorage.removeItem('dashboard-todos');
      }
    }
  }, []);

  // TODOが変更されたらローカルストレージに保存
  useEffect(() => {
    try {
      localStorage.setItem('dashboard-todos', JSON.stringify(todos));
    } catch (error) {
      console.error('Error saving todos:', error);
    }
  }, [todos]);

  // 選択された日付が変更されたら、期限日を更新
  useEffect(() => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setDueDate(`${year}-${month}-${day}`);
    }
  }, [selectedDate]);

  // スクロールアニメーション効果
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      
      const items = scrollRef.current.querySelectorAll('.scroll-list__item');
      const scrollTop = scrollRef.current.scrollTop;
      const containerHeight = scrollRef.current.clientHeight;
      const containerCenter = scrollTop + containerHeight / 2;
      
      items.forEach((item) => {
        const element = item as HTMLElement;
        const itemTop = element.offsetTop - scrollRef.current!.offsetTop;
        const itemHeight = element.offsetHeight;
        const itemCenter = itemTop + itemHeight / 2;
        
        // 中央からの距離を計算
        const distance = Math.abs(itemCenter - containerCenter);
        const maxDistance = containerHeight / 2;
        const proximity = Math.max(0, 1 - distance / maxDistance);
        
        // すべてのクラスをリセット
        element.classList.remove('item-hide', 'item-focus', 'item-next');
        
        // 距離に基づいてクラスを適用
        if (proximity > 0.8) {
          element.classList.add('item-focus');
        } else if (proximity > 0.4) {
          element.classList.add('item-next');
        } else {
          element.classList.add('item-hide');
        }
      });
    };

    const scrollContainer = scrollRef.current;
    if (scrollContainer && todos.length > 0) {
      // 初期状態を設定
      setTimeout(() => {
        handleScroll();
      }, 100);
      
      // スクロールイベントを追加
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }
    
    return undefined;
  }, [todos]);

  const addTodo = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (newTodo.trim()) {
      const todo: Todo = {
        id: Date.now().toString(),
        text: newTodo.trim(),
        description: newDescription.trim() || undefined,
        completed: false,
        createdAt: new Date().toISOString(),
        priority: selectedPriority,
        dueDate: dueDate || undefined
      };
      
      setTodos(prevTodos => [...prevTodos, todo]);
      setNewTodo('');
      setNewDescription('');
      setDueDate('');
      setShowAddForm(false);
    }
  };

  const updateTodo = (id: string, updates: Partial<Todo>) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, ...updates } : todo
    ));
    setEditingTodo(null);
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 border-red-300 text-red-200';
      case 'medium': return 'bg-blue-500/20 border-blue-300 text-blue-200';
      case 'low': return 'bg-green-500/20 border-green-300 text-green-200';
      default: return 'bg-gray-500/20 border-gray-300 text-gray-200';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '中';
    }
  };

  const currentMonth = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });

  // 期限による分類
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const classifyTodos = () => {
    const overdue: Todo[] = [];
    const upcoming: Todo[] = [];
    const noDueDate: Todo[] = [];
    
    todos.forEach(todo => {
      if (!todo.dueDate) {
        noDueDate.push(todo);
      } else {
        const dueDate = new Date(todo.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        if (dueDate < today) {
          overdue.push(todo);
        } else {
          upcoming.push(todo);
        }
      }
    });
    
    // 期限切れは日付の古い順、期限内は日付の近い順でソート
    overdue.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    upcoming.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    
    return { overdue, upcoming, noDueDate };
  };
  
  const { overdue, upcoming, noDueDate } = classifyTodos();
  const displayTodos = [...overdue, ...upcoming, ...noDueDate];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CheckSquare className="w-6 h-6 text-indigo-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentMonth}のやることリスト</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>タスク追加</span>
        </button>
      </div>

      {/* 新しいタスク追加フォーム */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <form onSubmit={addTodo} className="space-y-4">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="タスクのタイトル"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="詳細説明（任意）"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex space-x-4">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">低優先度</option>
                <option value="medium">中優先度</option>
                <option value="high">高優先度</option>
              </select>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                追加
              </button>
            </div>
          </form>
        </div>
      )}

      {/* スクロールリスト */}
      <div className="wrapper">
        <div className="scroll-list">
          <div 
            ref={scrollRef}
            className="scroll-list__wrp js-scroll-content js-scroll-list"
          >
            {todos.length === 0 ? (
              <div className="text-center py-16">
                <CheckSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">タスクがありません</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">新しいタスクを追加してみましょう</p>
              </div>
            ) : (
              <>
                {displayTodos.map((todo, index) => {
                  const isOverdue = todo.dueDate && new Date(todo.dueDate) < today;
                  return (
                  <div
                    key={todo.id}
                    className={`scroll-list__item js-scroll-list-item ${index === 0 ? 'item-focus' : 'item-next'} ${isOverdue ? 'overdue' : ''}`}
                  >
                    <div className="h-full p-6 flex flex-col justify-between">
                      <div className="flex items-start space-x-4">
                        <button
                          onClick={() => toggleTodo(todo.id)}
                          className={`mt-1 transition-colors ${
                            todo.completed ? 'text-green-300' : 'text-white/70 hover:text-white'
                          }`}
                        >
                          {todo.completed ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          {editingTodo === todo.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                defaultValue={todo.text}
                                onBlur={(e) => updateTodo(todo.id, { text: e.target.value })}
                                onKeyPress={(e) => e.key === 'Enter' && updateTodo(todo.id, { text: (e.target as HTMLInputElement).value })}
                                className="w-full px-2 py-1 text-lg font-medium bg-white/20 border border-white/30 rounded text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <h3 className={`text-lg font-medium text-white ${
                                  todo.completed ? 'line-through opacity-70' : ''
                                }`}>
                                  {todo.text}
                                </h3>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(todo.priority)}`}>
                                    {getPriorityLabel(todo.priority)}
                                  </span>
                                  <button
                                    onClick={() => setEditingTodo(todo.id)}
                                    className="text-white/70 hover:text-white transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteTodo(todo.id)}
                                    className="text-white/70 hover:text-red-300 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              
                              {todo.description && (
                                <p className={`text-sm text-white/80 mb-3 ${
                                  todo.completed ? 'line-through opacity-70' : ''
                                }`}>
                                  {todo.description}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-white/60 mt-4">
                        <div className="flex items-center space-x-4">
                          <span>
                            {new Date(todo.createdAt).toLocaleDateString('ja-JP', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          {todo.dueDate && (
                            <div className={`flex items-center ${isOverdue ? 'text-red-300 font-bold' : ''}`}>
                              <Calendar className="w-3 h-3 mr-1" />
                              {new Date(todo.dueDate).toLocaleDateString('ja-JP', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                              {isOverdue && <span className="ml-1">(期限切れ)</span>}
                            </div>
                          )}
                        </div>
                        <span className={todo.completed ? 'text-green-300' : 'text-white/60'}>
                          {todo.completed ? '完了' : '進行中'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
                })}
                {/* スペーサー */}
                <div style={{ height: '155px' }} />
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .wrapper {
          display: flex;
          align-items: center;
          width: 100%;
        }

        .scroll-list {
          width: 100%;
          max-width: 100%;
          padding: 0;
          margin: 0;
        }
        
        .scroll-list__wrp {
          width: 100%;
          height: 500px;
          overflow: auto;
          padding: 20px 25px;
          box-shadow: 0px 7px 46px 0px rgba(41, 53, 108, 0.15);
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;
          scroll-behavior: smooth;
        }

        .scroll-list__wrp::-webkit-scrollbar {
          width: 6px;
        }

        .scroll-list__wrp::-webkit-scrollbar-track {
          background: #f7fafc;
          border-radius: 3px;
        }

        .scroll-list__wrp::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 3px;
        }

        .scroll-list__wrp::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }

        .dark .scroll-list__wrp {
          background: #1f2937;
          border: 1px solid #374151;
        }

        .dark .scroll-list__wrp::-webkit-scrollbar-track {
          background: #374151;
        }

        .dark .scroll-list__wrp::-webkit-scrollbar-thumb {
          background: #6b7280;
        }

        .scroll-list__item {
          width: 100%;
          height: 155px;
          display: block;
          margin-bottom: 15px;
          border-radius: 12px;
          background: linear-gradient(147deg, #6366f1 0%, #8b5cf6 74%);
          transition: all 0.35s ease-in-out;
          opacity: 1;
          transform: scale(1);
          box-shadow: 0px 7px 16px 0px rgba(99, 102, 241, 0.25);
        }
        
        .scroll-list__item.overdue {
          background: linear-gradient(147deg, #ef4444 0%, #dc2626 74%);
          box-shadow: 0px 7px 16px 0px rgba(239, 68, 68, 0.25);
        }

        .scroll-list__item.item-hide {
          opacity: 0.3;
          transform: scale(0.7);
        }

        .scroll-list__item.item-focus {
          opacity: 1;
          transform: scale(1);
          box-shadow: 0px 12px 24px 0px rgba(99, 102, 241, 0.4);
          z-index: 10;
          position: relative;
        }

        .scroll-list__item.item-next {
          opacity: 0.8;
          transform: scale(0.95);
          box-shadow: 0px 5px 12px 0px rgba(99, 102, 241, 0.2);
        }

        .scroll-list__item:last-child {
          margin-bottom: 155px;
        }

        .scroll-list__item:first-child {
          margin-top: 50px;
        }
      `}</style>
    </div>
  );
};

export default TodoList;