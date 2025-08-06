import React, { useState, useEffect, useRef } from 'react';
import { Target, Plus, CheckCircle, Circle, Trash2, MessageCircle, Send } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  progress: number;
  targetDate?: string;
  createdAt: string;
  category: 'writing' | 'learning' | 'reading' | 'project' | 'habit';
  comments: string[];
}

interface MonthlyGoalsProps {
  selectedDate?: Date | null;
}

const MonthlyGoals: React.FC<MonthlyGoalsProps> = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'writing' as Goal['category'],
    targetDate: ''
  });
  
  const cardRef = useRef<HTMLDivElement | null>(null);
  
  // マウス追跡用のハンドラー
  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;
    
    const dx = x - centerX;
    const dy = y - centerY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    const adjustedAngle = angle < 0 ? angle + 360 : angle;
    
    // エッジからの距離を計算
    const distanceToEdge = Math.min(
      Math.abs(dx) / centerX,
      Math.abs(dy) / centerY
    );
    const edgeProximity = Math.min(distanceToEdge * 100, 100);
    
    card.style.setProperty('--pointer-x', `${percentX}%`);
    card.style.setProperty('--pointer-y', `${percentY}%`);
    card.style.setProperty('--pointer-angle', `${adjustedAngle}deg`);
    card.style.setProperty('--edge-proximity', `${edgeProximity}`);
  };

  const currentMonth = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM

  // ローカルストレージから目標を読み込む
  useEffect(() => {
    const savedGoals = localStorage.getItem(`monthly-goals-${monthKey}`);
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
  }, [monthKey]);

  // 目標が変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(`monthly-goals-${monthKey}`, JSON.stringify(goals));
  }, [goals, monthKey]);

  const addGoal = () => {
    if (newGoal.title.trim()) {
      const goal: Goal = {
        id: Date.now().toString(),
        title: newGoal.title,
        description: newGoal.description,
        completed: false,
        progress: 0,
        category: newGoal.category,
        targetDate: newGoal.targetDate || undefined,
        createdAt: new Date().toISOString(),
        comments: []
      };
      setGoals([...goals, goal]);
      setNewGoal({ title: '', description: '', category: 'writing', targetDate: '' });
      setShowAddGoal(false);
    }
  };

  const addComment = (goalId: string) => {
    if (newComment.trim()) {
      setGoals(goals.map(goal =>
        goal.id === goalId
          ? { ...goal, comments: [...goal.comments, newComment.trim()] }
          : goal
      ));
      setNewComment('');
      setShowComments(null);
    }
  };

  const toggleComments = (goalId: string) => {
    setShowComments(showComments === goalId ? null : goalId);
    setNewComment('');
  };

  const updateProgress = (id: string, progress: number) => {
    setGoals(goals.map(goal =>
      goal.id === id ? { ...goal, progress, completed: progress >= 100 } : goal
    ));
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(goal => goal.id !== id));
  };


  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="w-6 h-6 text-indigo-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentMonth}の目標</h2>
        </div>
        <button
          onClick={() => setShowAddGoal(!showAddGoal)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>目標を追加</span>
        </button>
      </div>


      {/* 新しい目標追加フォーム */}
      {showAddGoal && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="space-y-4">
            <input
              type="text"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              placeholder="目標のタイトル"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              value={newGoal.description}
              onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
              placeholder="詳細説明（任意）"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex space-x-4">
              <select
                value={newGoal.category}
                onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value as Goal['category'] })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="writing">執筆</option>
                <option value="learning">学習</option>
                <option value="reading">読書</option>
                <option value="project">プロジェクト</option>
                <option value="habit">習慣</option>
              </select>
              <input
                type="date"
                value={newGoal.targetDate}
                onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAddGoal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={addGoal}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* タブ式グローエフェクトカード */}
      <div 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className="glow-card w-full"
        style={{
          '--glow-color': '280deg 60% 70%', // 紫系
          position: 'relative',
          isolation: 'isolate',
          borderRadius: '1.5rem',
          background: 'linear-gradient(8deg, rgb(248, 250, 252) 75%, color-mix(in hsl, rgb(248, 250, 252), black 2.5%) 75.5%)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          minHeight: '280px',
          maxHeight: '350px',
          boxShadow: `
            rgba(0, 0, 0, 0.1) 0px 1px 2px,
            rgba(0, 0, 0, 0.1) 0px 2px 4px,
            rgba(0, 0, 0, 0.1) 0px 4px 8px,
            rgba(0, 0, 0, 0.1) 0px 8px 16px,
            rgba(0, 0, 0, 0.1) 0px 16px 32px
          `
        } as React.CSSProperties}
      >
        {/* グロー効果要素 */}
        <span className="glow-effect" />
        <div className="glow-border" />
        <div className="glow-background" />
        
        <div className="glow-card-inner">
          {goals.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-300 text-base">目標を追加しましょう</p>
            </div>
          ) : (
            <div className="worko-tabs h-full">
              {/* タブヘッダー */}
              <div className="tabs flex-tabs border-b border-gray-600/50 px-4 pt-4">
                {goals.map((goal, index) => (
                  <button
                    key={goal.id}
                    onClick={() => setActiveTab(index)}
                    className={`tab px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 truncate max-w-[120px] ${
                      activeTab === index
                        ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-400'
                        : 'text-gray-400 hover:text-purple-300 hover:bg-purple-500/10'
                    }`}
                    title={goal.title}
                  >
                    {goal.title}
                  </button>
                ))}
              </div>

              {/* タブコンテンツ */}
              <div className="tab-content p-4 overflow-y-auto" style={{ maxHeight: '220px' }}>
                {goals[activeTab] && (
                  <div className="panel active">
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={() => updateProgress(goals[activeTab].id, goals[activeTab].completed ? 0 : 100)}
                        className={`mt-0.5 transition-colors flex-shrink-0 ${
                          goals[activeTab].completed ? 'text-green-400' : 'text-gray-400 hover:text-purple-400'
                        }`}
                      >
                        {goals[activeTab].completed ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`text-lg font-medium ${
                            goals[activeTab].completed 
                              ? 'text-green-300 line-through' 
                              : 'text-white'
                          }`}>
                            {goals[activeTab].title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {goals[activeTab].comments.length > 0 && (
                              <span className="text-xs text-gray-400">
                                {goals[activeTab].comments.length}
                              </span>
                            )}
                            <button
                              onClick={() => toggleComments(goals[activeTab].id)}
                              className="text-gray-400 hover:text-purple-400 transition-colors"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteGoal(goals[activeTab].id)}
                              className="text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {goals[activeTab].description && (
                          <p className={`text-sm mb-3 ${
                            goals[activeTab].completed 
                              ? 'text-green-400/80' 
                              : 'text-gray-300'
                          }`}>
                            {goals[activeTab].description}
                          </p>
                        )}
                        
                        {!goals[activeTab].completed && goals[activeTab].progress > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">進捗</span>
                              <span className="text-xs text-purple-400">{goals[activeTab].progress}%</span>
                            </div>
                            <div className="bg-gray-700 rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${goals[activeTab].progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* コメント表示・追加 */}
                        {showComments === goals[activeTab].id && (
                          <div className="mt-3 space-y-2">
                            {goals[activeTab].comments.length > 0 && (
                              <div className="space-y-1">
                                {goals[activeTab].comments.map((comment, index) => (
                                  <div key={index} className="text-sm text-gray-300 bg-gray-700/50 p-2 rounded">
                                    {comment}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex space-x-2">
                              <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addComment(goals[activeTab].id)}
                                placeholder="コメントを追加..."
                                className="flex-1 px-2 py-1 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                              />
                              <button
                                onClick={() => addComment(goals[activeTab].id)}
                                disabled={!newComment.trim()}
                                className="px-2 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>


      <style>{`
        .sr-only {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border-width: 0 !important;
        }

        .glow-card {
          --glow-sens: 30;
          --color-sens: calc(var(--glow-sens) + 20);
          transform: translate3d(0, 0, 0.01px);
        }

        .glow-card::before,
        .glow-card::after,
        .glow-card .glow-effect {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          transition: opacity 0.25s ease-out;
          z-index: -1;
        }

        .glow-card:not(:hover) .glow-effect,
        .glow-card:not(:hover)::before,
        .glow-card:not(:hover)::after {
          opacity: 0;
          transition: opacity 0.75s ease-in-out;
        }

        .glow-card::before {
          border: 1px solid transparent;
          background:
            linear-gradient(var(--card-bg, transparent) 0 100%) padding-box,
            linear-gradient(rgb(255 255 255 / 0%) 0% 100%) border-box,
            radial-gradient(at 80% 55%, hsl(268, 100%, 76%) 0px, transparent 50%) border-box,
            radial-gradient(at 69% 34%, hsl(349, 100%, 74%) 0px, transparent 50%) border-box,
            radial-gradient(at 8% 6%, hsl(136, 100%, 78%) 0px, transparent 50%) border-box,
            radial-gradient(at 41% 38%, hsl(192, 100%, 64%) 0px, transparent 50%) border-box,
            radial-gradient(at 86% 85%, hsl(186, 100%, 74%) 0px, transparent 50%) border-box,
            radial-gradient(at 82% 18%, hsl(52, 100%, 65%) 0px, transparent 50%) border-box;
          opacity: calc((var(--edge-proximity) - var(--color-sens)) / (100 - var(--color-sens)));
          mask-image: 
            conic-gradient(
              from var(--pointer-angle) at center, 
              black 25%, transparent 40%, transparent 60%, black 75%
            );
        }

        .glow-card::after {
          border: 1px solid transparent;
          background:
            radial-gradient(at 80% 55%, hsl(268, 100%, 76%) 0px, transparent 50%) padding-box,
            radial-gradient(at 69% 34%, hsl(349, 100%, 74%) 0px, transparent 50%) padding-box,
            radial-gradient(at 8% 6%, hsl(136, 100%, 78%) 0px, transparent 50%) padding-box,
            radial-gradient(at 41% 38%, hsl(192, 100%, 64%) 0px, transparent 50%) padding-box,
            radial-gradient(at 86% 85%, hsl(186, 100%, 74%) 0px, transparent 50%) padding-box,
            radial-gradient(at 82% 18%, hsl(52, 100%, 65%) 0px, transparent 50%) padding-box;
          mask-image:
            linear-gradient(to bottom, black, black),
            radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%),
            radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%),
            radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%),
            radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%),
            radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%),
            conic-gradient(from var(--pointer-angle) at center, transparent 5%, black 15%, black 85%, transparent 95%);
          mask-composite: subtract, add, add, add, add, add;
          opacity: calc((var(--edge-proximity) - var(--color-sens)) / (100 - var(--color-sens)));
          mix-blend-mode: soft-light;
        }

        .glow-card .glow-effect {
          --outset: 2rem;
          inset: calc(var(--outset) * -1);
          pointer-events: none;
          z-index: 1;
          mask-image: 
            conic-gradient(
              from var(--pointer-angle) at center, 
              black 2.5%, transparent 10%, transparent 90%, black 97.5%
            );
          opacity: calc((var(--edge-proximity) - var(--glow-sens)) / (100 - var(--glow-sens)));
          mix-blend-mode: plus-lighter;
        }

        .glow-card .glow-effect::before {
          content: "";
          position: absolute;
          inset: var(--outset);
          border-radius: inherit;
          box-shadow: 
            inset 0 0 0 1px hsl(var(--glow-color) / 100%),
            inset 0 0 2px 2px hsl(var(--glow-color) / 90%),
            inset 0 0 5px 1px hsl(var(--glow-color) / 75%),
            inset 0 0 8px 1px hsl(var(--glow-color) / 66%),
            inset 0 0 15px 0 hsl(var(--glow-color) / 50%),
            inset 0 0 25px 2px hsl(var(--glow-color) / 30%),
            0 0 2px 2px hsl(var(--glow-color) / 90%),
            0 0 5px 1px hsl(var(--glow-color) / 75%),
            0 0 8px 1px hsl(var(--glow-color) / 66%),
            0 0 15px 0 hsl(var(--glow-color) / 50%),
            0 0 25px 2px hsl(var(--glow-color) / 30%);
        }

        .glow-card-inner {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.3);
        }

        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.3);
        }
      `}</style>
    </div>
  );
};

export default MonthlyGoals;