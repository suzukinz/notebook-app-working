import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Target, CheckCircle, Clock } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  deadline: string;
  status: 'active' | 'completed' | 'paused';
  icon: string;
  coordinates?: string;
  timeStamp?: string;
}

interface GoalsCarouselProps {
  currentMonth: string;
}

const GoalsCarousel: React.FC<GoalsCarouselProps> = ({ currentMonth }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [theta, setTheta] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [radius, setRadius] = useState(400);
  const [userGoals, setUserGoals] = useState<Goal[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'WORK',
    deadline: '',
    icon: ''
  });
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null);

  // ローカルストレージから目標を読み込む（月ごと）
  useEffect(() => {
    const monthKey = currentMonth.replace(/[年月]/g, '-'); // "2025年9月" -> "2025-9-"
    const savedGoals = localStorage.getItem(`dashboard-goals-${monthKey}`);
    if (savedGoals) {
      try {
        setUserGoals(JSON.parse(savedGoals));
      } catch (error) {
        console.error('Error parsing saved goals:', error);
        setUserGoals([]); // 月ごとに空から始める
      }
    } else {
      // 初期状態は常に空に変更
      setUserGoals([]);
    }
  }, [currentMonth]);

  // 目標が変更されたらローカルストレージに保存（月ごと）
  useEffect(() => {
    const monthKey = currentMonth.replace(/[年月]/g, '-');
    localStorage.setItem(`dashboard-goals-${monthKey}`, JSON.stringify(userGoals));
  }, [userGoals, currentMonth]);

  const displayGoals = userGoals;
  const totalCards = displayGoals.length;
  const anglePerCard = totalCards > 0 ? 360 / totalCards : 0;

  useEffect(() => {
    const handleResize = () => {
      setRadius(window.innerWidth <= 768 ? 250 : 400);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 自動回転機能
  useEffect(() => {
    if (autoRotate && totalCards > 1) {
      autoRotateRef.current = setInterval(() => {
        setTheta(prev => prev - anglePerCard);
      }, 4000); // 4秒ごとに回転
    } else if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current);
      autoRotateRef.current = null;
    }

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [autoRotate, totalCards, anglePerCard]);

  useEffect(() => {
    if (carouselRef.current) {
      carouselRef.current.style.transform = `rotateY(${theta}deg)`;
      const newIndex = Math.round(Math.abs(theta / anglePerCard) % totalCards);
      setCurrentIndex(newIndex >= totalCards ? 0 : newIndex);
    }
  }, [theta, anglePerCard, totalCards]);

  const nextCard = () => {
    setTheta(prev => prev - anglePerCard);
    pauseAutoRotate();
  };

  const prevCard = () => {
    setTheta(prev => prev + anglePerCard);
    pauseAutoRotate();
  };

  const pauseAutoRotate = () => {
    setAutoRotate(false);
    setTimeout(() => setAutoRotate(true), 10000); // 10秒後に自動回転再開
  };

  const addGoal = () => {
    if (newGoal.title.trim()) { // 必須フィールドはタイトルのみ
      const goal: Goal = {
        id: Date.now().toString(),
        title: newGoal.title.trim(),
        description: newGoal.description.trim() || '目標に向けて頑張りましょう！', // デフォルト説明を設定
        category: newGoal.category as Goal['category'],
        progress: 0,
        deadline: newGoal.deadline,
        status: 'active',
        icon: '',
        coordinates: `${(Math.random() * 90).toFixed(4)}° N, ${(Math.random() * 180).toFixed(4)}° E`,
        timeStamp: new Date().toLocaleTimeString('ja-JP', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })
      };

      setUserGoals(prev => [...prev, goal]);
      setNewGoal({
        title: '',
        description: '',
        category: 'WORK',
        deadline: '',
        icon: ''
      });
      setShowAddForm(false);
      
      // 新しい目標追加後にカルーセルを更新
      setTimeout(() => {
        setTheta(0); // 最初のカードを正面に表示
      }, 100);
    }
  };

  const deleteGoal = (goalId: string) => {
    setUserGoals(prev => {
      const filtered = prev.filter(goal => goal.id !== goalId);
      console.log('削除後の目標:', filtered); // デバッグ用
      return filtered;
    });
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(goalId);
      return newSet;
    });
  };

  const updateGoalProgress = (goalId: string, progress: number) => {
    setUserGoals(prev => prev.map(goal => 
      goal.id === goalId 
        ? { ...goal, progress, status: progress === 100 ? 'completed' : 'active' }
        : goal
    ));
  };

  const flipCard = (goalId: string) => {
    const goalIndex = displayGoals.findIndex(g => g.id === goalId);
    if (goalIndex === currentIndex) {
      setFlippedCards(prev => {
        const newSet = new Set(prev);
        if (newSet.has(goalId)) {
          newSet.delete(goalId);
        } else {
          newSet.add(goalId);
        }
        return newSet;
      });
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
    pauseAutoRotate();
  };

  const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diffX = clientX - startX;
    const sensitivity = 0.5;
    const newTheta = theta + diffX * sensitivity;
    
    if (carouselRef.current) {
      carouselRef.current.style.transform = `rotateY(${newTheta}deg)`;
    }
  };

  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    let clientX: number;
    if ('changedTouches' in e && e.changedTouches) {
      clientX = e.changedTouches[0].clientX;
    } else if ('touches' in e && e.touches) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }
    const diffX = clientX - startX;
    
    if (Math.abs(diffX) > 20) {
      if (diffX > 0) {
        prevCard();
      } else {
        nextCard();
      }
    } else {
      const snapAngle = Math.round(theta / anglePerCard) * anglePerCard;
      setTheta(snapAngle);
    }
  };

  const getProgressColor = (progress: number, status: string) => {
    if (status === 'completed') return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'WORK': 'text-blue-600',
      'LEARNING': 'text-purple-600',
      'HEALTH': 'text-green-600',
      'PERSONAL': 'text-pink-600',
      'CAREER': 'text-indigo-600',
      'CREATIVE': 'text-yellow-600'
    };
    return colors[category as keyof typeof colors] || 'text-gray-600';
  };

  const getCategoryBgColor = (category: string) => {
    const colors = {
      'WORK': 'rgba(59, 130, 246, 0.1)',
      'LEARNING': 'rgba(147, 51, 234, 0.1)',
      'HEALTH': 'rgba(16, 185, 129, 0.1)',
      'PERSONAL': 'rgba(236, 72, 153, 0.1)',
      'CAREER': 'rgba(99, 102, 241, 0.1)',
      'CREATIVE': 'rgba(245, 158, 11, 0.1)'
    };
    return colors[category as keyof typeof colors] || 'rgba(107, 114, 128, 0.1)';
  };

  return (
    <div className="goals-carousel-container bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full relative">
      {/* Background with subtle pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none rounded-lg">
        <div className="stars-container"></div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentMonth}の目標
          </h2>
        </div>
        <div className="flex items-center space-x-2 relative z-20">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1 text-xs rounded-full transition-colors cursor-pointer ${
              autoRotate 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {autoRotate ? '自動回転中' : '手動操作'}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('目標追加ボタンがクリックされました');
              setShowAddForm(!showAddForm);
            }}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors cursor-pointer relative z-10"
          >
            目標追加
          </button>
        </div>
      </div>

      {/* 目標がない場合の表示 */}
      {displayGoals.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <div className="mb-4">
            <Target className="w-16 h-16 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            まだ目標がありません
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            新しい目標を追加して、{currentMonth}をもっと充実させましょう！
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            最初の目標を追加
          </button>
        </div>
      )}

      {/* 目標追加フォーム */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">新しい目標を追加</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  目標タイトル *
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                  placeholder="例: プロジェクト完成"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  カテゴリ
                </label>
                <select
                  value={newGoal.category}
                  onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="WORK">仕事</option>
                  <option value="LEARNING">学習</option>
                  <option value="HEALTH">健康</option>
                  <option value="PERSONAL">個人</option>
                  <option value="CAREER">キャリア</option>
                  <option value="CREATIVE">創作</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                期限
              </label>
              <input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                詳細説明
              </label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                placeholder="目標の詳細な説明を入力してください...(任意)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                maxLength={200}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewGoal({
                    title: '',
                    description: '',
                    category: 'WORK',
                    deadline: '',
                    icon: ''
                  });
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('追加ボタンがクリックされました');
                  addGoal();
                }}
                disabled={!newGoal.title.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* カルーセル表示（目標がある場合のみ） */}
      {displayGoals.length > 0 && (
        <div>
          <div className="relative h-96 perspective-1000">
            <div
              className="carousel-container"
              onMouseDown={handleDragStart}
              onMouseMove={handleDrag}
              onMouseUp={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDrag}
              onTouchEnd={handleDragEnd}
            >
              <div
                ref={carouselRef}
                className="carousel"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {displayGoals.map((goal, index) => {
                  const angle = anglePerCard * index;
                  const isFlipped = flippedCards.has(goal.id);
                  
                  return (
                    <div
                      key={goal.id}
                      className="goal-card"
                      style={{
                        transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                      }}
                      onClick={() => flipCard(goal.id)}
                    >
                      <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
                        {/* Front of card */}
                        <div className="card-front">
                          <div className="p-6 h-full flex flex-col bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4 ${getCategoryColor(goal.category)}`}
                                 style={{ backgroundColor: getCategoryBgColor(goal.category) }}>
                              {goal.category}
                            </div>
                            
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                              {goal.title}
                            </h3>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1 leading-relaxed">
                              {goal.description.length > 60 ? 
                                goal.description.substring(0, 60) + '...' : 
                                goal.description
                              }
                            </p>
                            
                            {/* Progress bar */}
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">進捗</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{goal.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div 
                                  className={`h-3 rounded-full transition-all duration-500 relative ${getProgressColor(goal.progress, goal.status)}`}
                                  style={{ width: `${goal.progress}%` }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(goal.deadline).toLocaleDateString('ja-JP')}
                              </div>
                              {goal.status === 'completed' && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Back of card */}
                        <div className="card-back">
                          <div className="p-6 h-full flex flex-col bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                              {goal.title}
                            </h3>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-1 leading-relaxed">
                              {goal.description}
                            </p>
                            
                            <div className="space-y-3">
                              <div className="flex items-center text-xs text-gray-500">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                {goal.coordinates}
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-2" />
                                {goal.timeStamp}
                              </div>
                              
                              {/* 進捗更新スライダー */}
                              <div className="mt-4">
                                <label className="block text-xs text-gray-500 mb-2">進捗を更新</label>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={goal.progress}
                                  onChange={(e) => updateGoalProgress(goal.id, parseInt(e.target.value))}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-1">
                                  <span>0%</span>
                                  <span>{goal.progress}%</span>
                                  <span>100%</span>
                                </div>
                              </div>
                              
                              {/* 削除ボタン */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (window.confirm('この目標を削除しますか？')) {
                                    deleteGoal(goal.id);
                                  }
                                }}
                                className="w-full mt-3 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                                type="button"
                              >
                                目標を削除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Navigation controls */}
            <div className="carousel-controls">
              <button
                onClick={prevCard}
                className="control-btn"
                aria-label="前のカード"
              >
                ‹
              </button>
              <button
                onClick={nextCard}
                className="control-btn"
                aria-label="次のカード"
              >
                ›
              </button>
            </div>
          </div>
          
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              カードをクリックして詳細を表示 • ドラッグまたは矢印で回転
            </p>
          </div>
        </div>
      )}

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .carousel-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          touch-action: none;
        }
        
        .carousel {
          position: relative;
          width: 400px;
          height: 400px;
          transform-style: preserve-3d;
          transition: transform 0.5s ease;
        }
        
        .goal-card {
          position: absolute;
          width: 280px;
          height: 380px;
          left: 50%;
          top: 50%;
          margin-left: -140px;
          margin-top: -190px;
          transform-style: preserve-3d;
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        
        .goal-card:hover {
          transform: scale(1.05) translateZ(420px);
        }
        
        .card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        
        .card-front,
        .card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 12px;
        }
        
        .card-back {
          transform: rotateY(180deg);
        }
        
        .carousel-controls {
          position: absolute;
          bottom: -60px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 20px;
          z-index: 10;
        }
        
        .control-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: white;
          border: 2px solid #e5e7eb;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          font-weight: bold;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .control-btn:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
          transform: scale(1.1);
        }
        
        .stars-container {
          width: 100%;
          height: 100%;
          background-image: 
            radial-gradient(1px 1px at 25% 25%, #e5e7eb, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 50% 50%, #e5e7eb, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 75% 75%, #e5e7eb, rgba(0,0,0,0));
          background-size: 200px 200px, 300px 300px, 400px 400px;
          background-repeat: repeat;
          animation: twinkle 15s linear infinite;
        }
        
        @keyframes twinkle {
          0% { background-position: 0 0, 0 0, 0 0; }
          100% { background-position: 200px 200px, 300px 300px, 400px 400px; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer {
          animation: shimmer 3s ease-out infinite;
        }
        
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 0 2px 0 #555;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 2px 0 #555;
        }
        
        @media (max-width: 768px) {
          .goal-card {
            width: 240px;
            height: 320px;
            margin-left: -120px;
            margin-top: -160px;
          }
          
          .carousel {
            width: 250px;
            height: 250px;
          }
        }
      `}</style>
    </div>
  );
};

export default GoalsCarousel;