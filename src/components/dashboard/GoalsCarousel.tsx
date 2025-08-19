import React, { useEffect, useState } from 'react';
import { Target, Plus, Edit3, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';

// プリセット画像の定義
const PRESET_IMAGES = [
  {
    id: 'mountain',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop',
    name: '山頂への挑戦',
    position: 'center'
  },
  {
    id: 'ocean',
    url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&h=800&fit=crop',
    name: '海への冒険',
    position: 'center'
  },
  {
    id: 'forest',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&h=800&fit=crop',
    name: '森の静寂',
    position: 'center'
  },
  {
    id: 'city',
    url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&h=800&fit=crop',
    name: '都市の輝き',
    position: 'center bottom'
  },
  {
    id: 'book',
    url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&h=800&fit=crop',
    name: '知識の探求',
    position: 'center'
  },
  {
    id: 'fitness',
    url: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=1200&h=800&fit=crop',
    name: '健康への道',
    position: 'center'
  }
];

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  deadline: string;
  status: 'active' | 'completed' | 'paused';
  images?: string[] | undefined;
  videos?: string[] | undefined;
  subtitle?: string | undefined;
  buttonText?: string | undefined;
}

const GoalsCarousel: React.FC = () => {
  const [userGoals, setUserGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Goal>>({});
  const [editShowImageSelector, setEditShowImageSelector] = useState(false);
  const [editSelectedPresetImage, setEditSelectedPresetImage] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newGoal, setNewGoal] = useState({
    title: '',
    subtitle: '',
    description: '',
    category: 'WORK',
    deadline: '',
    buttonText: '',
    images: [] as string[],
    videos: [] as string[]
  });
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [selectedPresetImage, setSelectedPresetImage] = useState<string | null>(null);
  
  // TypeScript警告を回避するための一時的な使用
  if (false) { console.log(showImageSelector, selectedPresetImage); }

  // ローカルストレージから目標を読み込む
  useEffect(() => {
    const savedGoals = localStorage.getItem('dashboard-goals-active');
    const savedCompleted = localStorage.getItem('dashboard-goals-completed');
    
    if (savedGoals) {
      try {
        const goals = JSON.parse(savedGoals);
        setUserGoals(goals);
        if (goals.length > 0) {
          setCurrentSlide(0);
        }
      } catch (error) {
        console.error('Error parsing saved goals:', error);
      }
    }
    
    if (savedCompleted) {
      try {
        setCompletedGoals(JSON.parse(savedCompleted));
      } catch (error) {
        console.error('Error parsing completed goals:', error);
      }
    }
  }, []);

  // 目標が変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('dashboard-goals-active', JSON.stringify(userGoals));
  }, [userGoals]);
  
  useEffect(() => {
    localStorage.setItem('dashboard-goals-completed', JSON.stringify(completedGoals));
  }, [completedGoals]);

  const addGoal = () => {
    if (!newGoal.title.trim()) {
      alert('目標のタイトルを入力してください。');
      return;
    }

    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title.trim(),
      subtitle: newGoal.subtitle.trim() || 'My Goal',
      description: newGoal.description.trim() || 'Let\'s achieve this amazing goal together!',
      category: newGoal.category,
      progress: 0,
      deadline: newGoal.deadline,
      status: 'active',
      buttonText: newGoal.buttonText.trim() || 'Start working',
      ...(newGoal.images.length > 0 && { images: [...newGoal.images] }),
      ...(newGoal.videos.length > 0 && { videos: [...newGoal.videos] })
    };

    setUserGoals(prev => [...prev, goal]);
    
    // フォームリセット
    setNewGoal({
      title: '',
      subtitle: '',
      description: '',
      category: 'WORK',
      deadline: '',
      buttonText: '',
      images: [],
      videos: []
    });
    
    setShowAddForm(false);
  };

  const deleteGoal = (goalId: string) => {
    const goalIndex = userGoals.findIndex(g => g.id === goalId);
    setUserGoals(prev => prev.filter(goal => goal.id !== goalId));
    setCompletedGoals(prev => prev.filter(goal => goal.id !== goalId));
    
    // 現在のスライドを調整
    if (goalIndex <= currentSlide && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    } else if (currentSlide >= userGoals.length - 1 && userGoals.length > 1) {
      setCurrentSlide(userGoals.length - 2);
    }
  };

  const startEditGoal = (goal: Goal) => {
    setEditingGoal(goal.id);
    setEditForm({
      title: goal.title,
      subtitle: goal.subtitle || undefined,
      description: goal.description,
      category: goal.category,
      deadline: goal.deadline,
      buttonText: goal.buttonText || undefined,
      images: goal.images || [],
      videos: goal.videos || []
    });
    setEditShowImageSelector(false);
    const firstImage = goal.images?.[0];
    const isPresetImage = firstImage && PRESET_IMAGES.some(p => p.url === firstImage);
    setEditSelectedPresetImage(isPresetImage ? firstImage : null);
  };

  const saveGoalEdit = () => {
    if (!editingGoal || !editForm.title?.trim()) {
      alert('タイトルを入力してください。');
      return;
    }

    setUserGoals(prev => prev.map(goal => 
      goal.id === editingGoal 
        ? { 
            ...goal, 
            title: editForm.title!.trim(),
            subtitle: editForm.subtitle?.trim() || 'My Goal',
            description: editForm.description?.trim() || 'Let\'s achieve this amazing goal together!',
            category: editForm.category || 'WORK',
            deadline: editForm.deadline || '',
            buttonText: editForm.buttonText?.trim() || 'Start working',
            ...(editForm.images && editForm.images.length > 0 && { images: [...editForm.images] }),
            ...(editForm.videos && editForm.videos.length > 0 && { videos: [...editForm.videos] })
          }
        : goal
    ));
    
    setEditingGoal(null);
    setEditForm({});
    setEditShowImageSelector(false);
    setEditSelectedPresetImage(null);
  };

  const updateGoalProgress = (goalId: string, progress: number) => {
    setUserGoals(prev => {
      const updatedGoals = prev.map(goal => 
        goal.id === goalId 
          ? { ...goal, progress, status: (progress === 100 ? 'completed' : 'active') as Goal['status'] }
          : goal
      );
      
      // 100%になった目標を完了リストに移動
      if (progress === 100) {
        const completedGoal = updatedGoals.find(g => g.id === goalId);
        if (completedGoal) {
          setCompletedGoals(prevCompleted => [...prevCompleted, { ...completedGoal, status: 'completed' }]);
          return updatedGoals.filter(g => g.id !== goalId);
        }
      }
      
      return updatedGoals;
    });
  };

  const moveSlide = (direction: 'left' | 'right') => {
    const total = userGoals.length;
    if (total === 0) return;

    if (direction === 'right') {
      setCurrentSlide(prev => (prev + 1) % total);
    } else {
      setCurrentSlide(prev => (prev - 1 + total) % total);
    }
  };

  const handleNewGoalImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const promises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(promises).then(results => {
        setNewGoal(prev => ({
          ...prev,
          images: [...prev.images, ...results]
        }));
      });
    }
  };

  const handleNewGoalVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const promises = Array.from(files).map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(promises).then(results => {
        setNewGoal(prev => ({
          ...prev,
          videos: [...prev.videos, ...results]
        }));
      });
    }
  };

  // removeNewGoalImage関数は新しい画像選択方式では不要
  // const removeNewGoalImage = (index: number) => {
  //   setNewGoal(prev => ({
  //     ...prev,
  //     images: prev.images.filter((_, i) => i !== index)
  //   }));
  // };

  const removeNewGoalVideo = (index: number) => {
    setNewGoal(prev => ({
      ...prev,
      videos: prev.videos.filter((_, i) => i !== index)
    }));
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'WORK': '#4d4dff',
      'LEARNING': '#9333ea',
      'HEALTH': '#10b981',
      'PERSONAL': '#ec4899',
      'CAREER': '#6366f1',
      'CREATIVE': '#f59e0b'
    };
    return colors[category as keyof typeof colors] || '#6b7280';
  };

  const getCategoryName = (category: string) => {
    const names = {
      'WORK': '仕事',
      'LEARNING': '学習',
      'HEALTH': '健康',
      'PERSONAL': '個人',
      'CAREER': 'キャリア',
      'CREATIVE': '創作'
    };
    return names[category as keyof typeof names] || category;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css?family=Playfair+Display:400,400i,700,700i,900,900i');
        @import url('https://fonts.googleapis.com/css?family=Open+Sans:300,300i,400,400i,600,600i,700,700i,800,800i');
        
        .goals-carousel {
          width: 100%;
          height: 700px;
          display: flex;
          max-width: 1400px;
          margin: 0 auto;
          overflow: hidden;
          position: relative;
          background-color: transparent;
          border-radius: 0;
          box-shadow: none;
        }
        
        .carousel-item {
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
          justify-content: flex-end;
          position: absolute;
          background-color: transparent;
          flex-shrink: 0;
          z-index: 0;
          transition: 0.6s all linear;
          opacity: 0;
          visibility: hidden;
        }
        
        .carousel-item.active {
          z-index: 1;
          opacity: 1;
          visibility: visible;
        }
        
        .carousel-item__info {
          height: 100%;
          display: flex;
          justify-content: center;
          flex-direction: column;
          order: 1;
          left: 0;
          margin: auto;
          padding: 0 60px;
          width: 50%;
          background-color: #fff;
          box-shadow: 2px 0 10px rgba(0,0,0,0.1);
          z-index: 2;
          position: relative;
        }
        
        .carousel-item__image {
          width: 50%;
          height: 100%;
          order: 2;
          align-self: flex-end;
          flex-basis: 50%;
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
          position: relative;
          transform: translateX(100%);
          transition: 0.6s all ease-in-out;
          background-color: #f8f9fa;
        }
        
        .carousel-item.active .carousel-item__image {
          transform: translateX(0);
        }
        
        .carousel-item__subtitle {
          font-family: 'Open Sans', sans-serif;
          letter-spacing: 3px;
          font-size: 10px;
          text-transform: uppercase;
          margin: 0;
          color: #7E7E7E;
          font-weight: 700;
          transform: translateY(25%);
          opacity: 0;
          visibility: hidden;
          transition: 0.4s all ease-in-out;
        }
        
        .carousel-item__title {
          margin: 15px 0 0 0;
          font-family: 'Playfair Display', serif;
          font-size: 56px;
          line-height: 60px;
          letter-spacing: 3px;
          font-weight: 700;
          color: #2C2C2C;
          transform: translateY(25%);
          opacity: 0;
          visibility: hidden;
          transition: 0.6s all ease-in-out;
        }
        
        .carousel-item__description {
          transform: translateY(25%);
          opacity: 0;
          visibility: hidden;
          transition: 0.6s all ease-in-out;
          margin-top: 35px;
          font-family: 'Open Sans', sans-serif;
          font-size: 18px;
          color: #7e7e7e;
          line-height: 30px;
          margin-bottom: 35px;
        }
        
        .carousel-item__progress {
          transform: translateY(25%);
          opacity: 0;
          visibility: hidden;
          transition: 0.6s all ease-in-out;
          margin-bottom: 25px;
        }
        
        .carousel-item__btn {
          color: #2C2C2C;
          font-family: 'Open Sans', sans-serif;
          letter-spacing: 3px;
          font-size: 11px;
          text-transform: uppercase;
          margin: 0;
          font-weight: 700;
          text-decoration: none;
          transform: translateY(25%);
          opacity: 0;
          visibility: hidden;
          transition: 0.6s all ease-in-out;
          border: 2px solid #2C2C2C;
          padding: 12px 24px;
          display: inline-block;
          cursor: pointer;
          background: transparent;
          transition: 0.3s all ease;
        }
        
        .carousel-item__btn:hover {
          background: #2C2C2C;
          color: #fff;
        }
        
        .carousel-item.active .carousel-item__subtitle,
        .carousel-item.active .carousel-item__title,
        .carousel-item.active .carousel-item__description,
        .carousel-item.active .carousel-item__progress,
        .carousel-item.active .carousel-item__btn {
          transform: translateY(0);
          opacity: 1;
          visibility: visible;
          transition: 0.6s all ease-in-out;
        }
        
        .carousel__nav {
          position: absolute;
          right: 0;
          z-index: 2;
          background-color: #fff;
          bottom: 0;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        }
        
        .carousel__arrow {
          cursor: pointer;
          display: inline-block;
          padding: 15px 20px;
          position: relative;
          transition: 0.3s all ease;
        }
        
        .carousel__arrow:hover {
          background-color: #f5f5f5;
        }
        
        .carousel__arrow:nth-child(1):after {
          content: '';
          right: -1px;
          position: absolute;
          width: 1px;
          background-color: #e0e0e0;
          height: 20px;
          top: 50%;
          margin-top: -10px;
        }
        
        .progress-bar {
          width: 100%;
          height: 4px;
          background-color: #f0f0f0;
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4d4dff, #9333ea);
          transition: width 0.3s ease;
          border-radius: 2px;
        }
        
        .progress-text {
          font-family: 'Open Sans', sans-serif;
          font-size: 12px;
          color: #7e7e7e;
          margin-bottom: 8px;
        }
        
        .progress-slider {
          width: 100%;
          margin-top: 8px;
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: #f0f0f0;
          outline: none;
          border-radius: 2px;
        }
        
        .progress-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #4d4dff;
          cursor: pointer;
          border-radius: 50%;
        }
        
        .progress-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #4d4dff;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
        
        
        .deadline-badge {
          font-family: 'Open Sans', sans-serif;
          font-size: 10px;
          color: #7e7e7e;
          background: rgba(255,255,255,0.9);
          padding: 4px 12px;
          border-radius: 12px;
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 3;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        @media (max-width: 768px) {
          .goals-carousel {
            height: 600px;
            margin: 0 1rem;
            max-width: 100%;
          }
          
          .carousel-item__info {
            width: 50%;
            padding: 0 35px;
            background-color: #fff;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
          }
          
          .carousel-item__image {
            width: 50%;
          }
          
          .carousel-item__title {
            font-size: 32px;
            line-height: 36px;
          }
        }
        
        @media (max-width: 480px) {
          .goals-carousel {
            height: 550px;
            flex-direction: column;
            margin: 0 0.5rem;
          }
          
          .carousel-item {
            flex-direction: column;
          }
          
          .carousel-item__info {
            width: 100%;
            order: 2;
            padding: 20px;
            height: 55%;
            background-color: #fff;
            box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
          }
          
          .carousel-item__image {
            width: 100%;
            order: 1;
            height: 45%;
            transform: translateY(-100%);
          }
          
          .carousel-item.active .carousel-item__image {
            transform: translateY(0);
          }
        }
      `}</style>

      <div style={{ 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
        minHeight: 'auto', 
        padding: '2rem 2rem 1rem 2rem',
        boxSizing: 'border-box' 
      }}>
        {/* ヘッダー */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '2rem' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '1rem',
            marginBottom: '1rem' 
          }}>
            <Target size={32} color="#4d4dff" />
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '300', 
              color: '#2C2C2C', 
              margin: '0',
              fontFamily: "'Playfair Display', serif"
            }}>
              Goal Journey
            </h1>
          </div>
          <p style={{
            fontFamily: "'Open Sans', sans-serif",
            fontSize: '14px',
            color: '#7e7e7e',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            margin: '0 0 2rem 0'
          }}>
            Discover your path to success
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'linear-gradient(135deg, #4d4dff, #9333ea)',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              padding: '0.75rem 2rem',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto',
              fontFamily: "'Open Sans', sans-serif",
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: '600',
              transition: '0.3s all ease',
              boxShadow: '0 4px 15px rgba(77, 77, 255, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(77, 77, 255, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(77, 77, 255, 0.3)';
            }}
          >
            <Plus size={20} />
            Create New Goal
          </button>
        </div>

        {/* 美しいカルーセル */}
        {userGoals.length > 0 && (
          <div className="goals-carousel">
            {userGoals.map((goal, index) => (
              <div
                key={goal.id}
                className={`carousel-item ${index === currentSlide ? 'active' : ''}`}
              >
                {/* 期限バッジ */}
                {goal.deadline && (
                  <div className="deadline-badge">
                    Due: {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}

                {/* アクションボタン - 左上に移動 */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  zIndex: 3,
                  display: 'flex',
                  gap: '8px'
                }}>
                  <button
                    onClick={() => startEditGoal(goal)}
                    style={{
                      background: 'rgba(255,255,255,0.9)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px',
                      cursor: 'pointer',
                      transition: '0.2s all ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,1)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    title="編集"
                  >
                    <Edit3 size={16} color="#666" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('この目標を削除しますか？')) {
                        deleteGoal(goal.id);
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.9)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px',
                      cursor: 'pointer',
                      transition: '0.2s all ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,1)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    title="削除"
                  >
                    <Trash2 size={16} color="#666" />
                  </button>
                </div>

                <div className="carousel-item__info">
                  <div className="carousel-item__container">
                    <h2 className="carousel-item__subtitle">{getCategoryName(goal.category)}</h2>
                    <h1 className="carousel-item__title">{goal.title}</h1>
                    <p className="carousel-item__description">{goal.description}</p>
                    
                    <div className="carousel-item__progress">
                      <div className="progress-text">Progress: {goal.progress}%</div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={goal.progress}
                        onChange={(e) => updateGoalProgress(goal.id, parseInt(e.target.value))}
                        className="progress-slider"
                      />
                    </div>
                    
                    <div className="carousel-item__btn">
                      {goal.buttonText || 'Start working'}
                    </div>
                  </div>
                </div>
                
                <div 
                  className="carousel-item__image"
                  style={{
                    backgroundImage: goal.images && goal.images.length > 0 
                      ? `url(${goal.images[0]})` 
                      : `linear-gradient(135deg, ${getCategoryColor(goal.category)}15, ${getCategoryColor(goal.category)}30)`,
                    backgroundColor: goal.images && goal.images.length > 0 ? '#f8f9fa' : getCategoryColor(goal.category),
                    backgroundPosition: goal.images && goal.images.length > 0 
                      ? (PRESET_IMAGES.find(p => p.url === goal.images![0])?.position || 'center')
                      : 'center'
                  }}
                >
                  {(!goal.images || goal.images.length === 0) && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center'
                    }}>
                      <Target size={64} color="rgba(255,255,255,0.3)" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* ナビゲーションアローズ */}
            <div className="carousel__nav">
              <span 
                className="carousel__arrow" 
                onClick={() => moveSlide('left')}
              >
                <ArrowLeft size={20} color="#5d5d5d" />
              </span>
              <span 
                className="carousel__arrow" 
                onClick={() => moveSlide('right')}
              >
                <ArrowRight size={20} color="#5d5d5d" />
              </span>
            </div>
          </div>
        )}

        {/* 目標がない場合の表示 */}
        {userGoals.length === 0 && !showAddForm && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem 2rem 1rem 2rem',
            color: '#7e7e7e' 
          }}>
            <Target size={96} color="#e0e0e0" style={{ marginBottom: '1rem' }} />
            <h3 style={{ 
              fontSize: '2rem', 
              fontWeight: '300', 
              marginBottom: '1rem',
              fontFamily: "'Playfair Display', serif",
              color: '#2C2C2C'
            }}>
              Begin Your Journey
            </h3>
            <p style={{ 
              marginBottom: '1rem',
              fontFamily: "'Open Sans', sans-serif",
              fontSize: '14px',
              letterSpacing: '1px',
              lineHeight: '24px',
              maxWidth: '400px',
              margin: '0 auto 1rem'
            }}>
              Create your first goal and start building the life you've always dreamed of. Every great achievement begins with a single step.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                background: 'linear-gradient(135deg, #4d4dff, #9333ea)',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                padding: '0.75rem 2rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontFamily: "'Open Sans', sans-serif",
                letterSpacing: '2px',
                textTransform: 'uppercase',
                fontWeight: '600',
                transition: '0.3s all ease',
                boxShadow: '0 4px 15px rgba(77, 77, 255, 0.3)'
              }}
            >
              Create First Goal
            </button>
          </div>
        )}

        {/* 目標編集フォーム */}
        {editingGoal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '2rem'
            }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '300', 
                color: '#2C2C2C', 
                marginBottom: '1.5rem',
                fontFamily: "'Playfair Display', serif",
                textAlign: 'center'
              }}>
                Edit Goal
              </h2>
              
              {/* タイトル */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7e7e7e',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Goal Title *
                </label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  placeholder="Enter your amazing goal"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '2px solid #f0f0f0',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontFamily: "'Playfair Display', serif",
                    transition: '0.2s all ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4d4dff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                  }}
                  maxLength={50}
                />
              </div>

              {/* サブタイトル */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7e7e7e',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Subtitle
                </label>
                <input
                  type="text"
                  value={editForm.subtitle || ''}
                  onChange={(e) => setEditForm({...editForm, subtitle: e.target.value})}
                  placeholder="My Goal"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #f0f0f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: "'Open Sans', sans-serif",
                    transition: '0.2s all ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4d4dff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                  }}
                  maxLength={30}
                />
              </div>

              {/* 説明 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7e7e7e',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Description
                </label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  placeholder="Describe your journey to success..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '2px solid #f0f0f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: "'Open Sans', sans-serif",
                    resize: 'vertical',
                    lineHeight: '1.5',
                    transition: '0.2s all ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4d4dff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                  }}
                  maxLength={200}
                />
              </div>

              {/* カテゴリと期限 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    color: '#7e7e7e',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}>
                    Category
                  </label>
                  <select
                    value={editForm.category || 'WORK'}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #f0f0f0',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontFamily: "'Open Sans', sans-serif",
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="WORK">仕事</option>
                    <option value="LEARNING">学習</option>
                    <option value="HEALTH">健康</option>
                    <option value="PERSONAL">個人</option>
                    <option value="CAREER">キャリア</option>
                    <option value="CREATIVE">創作</option>
                  </select>
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    color: '#7e7e7e',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={editForm.deadline || ''}
                    onChange={(e) => setEditForm({...editForm, deadline: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #f0f0f0',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontFamily: "'Open Sans', sans-serif",
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* ボタンテキスト */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7e7e7e',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Action Button Text
                </label>
                <input
                  type="text"
                  value={editForm.buttonText || ''}
                  onChange={(e) => setEditForm({...editForm, buttonText: e.target.value})}
                  placeholder="Start working"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #f0f0f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: "'Open Sans', sans-serif",
                    transition: '0.2s all ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4d4dff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                  }}
                  maxLength={30}
                />
              </div>

              {/* 画像選択セクション */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7e7e7e',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Goal Image
                </label>
                
                {/* 画像選択ボタン */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditShowImageSelector(!editShowImageSelector)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: editShowImageSelector ? '#4d4dff' : '#f8f9fa',
                      color: editShowImageSelector ? 'white' : '#666',
                      border: '2px solid ' + (editShowImageSelector ? '#4d4dff' : '#e9ecef'),
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontFamily: "'Open Sans', sans-serif",
                      cursor: 'pointer',
                      transition: '0.2s all ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    🎨 プリセット画像から選択
                  </button>
                  
                  <label style={{
                    cursor: 'pointer',
                    padding: '0.75rem 1.5rem',
                    background: '#f0f8ff',
                    border: '2px solid #e6f3ff',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: "'Open Sans', sans-serif",
                    transition: '0.2s all ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    📷 画像をアップロード
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files[0]) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditForm(prev => ({
                              ...prev,
                              images: [reader.result as string]
                            }));
                            setEditSelectedPresetImage(null);
                          };
                          reader.readAsDataURL(files[0]);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                
                {/* プリセット画像セレクター */}
                {editShowImageSelector && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    {PRESET_IMAGES.map((preset) => (
                      <div
                        key={preset.id}
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: editSelectedPresetImage === preset.url ? '3px solid #4d4dff' : '3px solid transparent',
                          transition: '0.2s all ease'
                        }}
                        onClick={() => {
                          setEditSelectedPresetImage(preset.url);
                          setEditForm(prev => ({
                            ...prev,
                            images: [preset.url]
                          }));
                        }}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                          color: 'white',
                          padding: '0.5rem',
                          fontSize: '0.75rem',
                          fontFamily: "'Open Sans', sans-serif"
                        }}>
                          {preset.name}
                        </div>
                        {editSelectedPresetImage === preset.url && (
                          <div style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            width: '24px',
                            height: '24px',
                            background: '#4d4dff',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px'
                          }}>
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 選択された画像のプレビュー */}
                {editForm.images && editForm.images.length > 0 && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#666',
                      marginBottom: '0.5rem',
                      fontFamily: "'Open Sans', sans-serif"
                    }}>
                      選択された画像:
                    </div>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={editForm.images[0]}
                        alt="Goal visual"
                        style={{
                          width: '200px',
                          height: '150px',
                          objectFit: 'cover',
                          borderRadius: '6px'
                        }}
                      />
                      <button
                        onClick={() => {
                          setEditForm(prev => ({ ...prev, images: [] }));
                          setEditSelectedPresetImage(null);
                        }}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          background: '#ff4757',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '1rem',
                marginTop: '2rem'
              }}>
                <button
                  onClick={() => {
                    setEditingGoal(null);
                    setEditForm({});
                    setEditShowImageSelector(false);
                    setEditSelectedPresetImage(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#666',
                    cursor: 'pointer',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '0.9rem',
                    transition: '0.2s all ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveGoalEdit}
                  disabled={!editForm.title?.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: editForm.title?.trim() 
                      ? 'linear-gradient(135deg, #4d4dff, #9333ea)' 
                      : '#ccc',
                    color: 'white',
                    cursor: editForm.title?.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: '0.2s all ease'
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 目標追加フォーム */}
        {showAddForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '2rem'
            }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '300', 
                color: '#2C2C2C', 
                marginBottom: '1.5rem',
                fontFamily: "'Playfair Display', serif",
                textAlign: 'center'
              }}>
                Create New Goal
              </h2>
              
              {/* タイトル */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7e7e7e',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Goal Title *
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                  placeholder="Enter your amazing goal"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '2px solid #f0f0f0',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontFamily: "'Playfair Display', serif",
                    transition: '0.2s all ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4d4dff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                  }}
                  maxLength={50}
                />
              </div>

              {/* サブタイトル */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7e7e7e',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Subtitle
                </label>
                <input
                  type="text"
                  value={newGoal.subtitle}
                  onChange={(e) => setNewGoal({...newGoal, subtitle: e.target.value})}
                  placeholder="My Goal"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #f0f0f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: "'Open Sans', sans-serif",
                    transition: '0.2s all ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4d4dff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                  }}
                  maxLength={30}
                />
              </div>

              {/* 説明 */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7e7e7e',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Description
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                  placeholder="Describe your journey to success..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    border: '2px solid #f0f0f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: "'Open Sans', sans-serif",
                    resize: 'vertical',
                    lineHeight: '1.5',
                    transition: '0.2s all ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4d4dff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                  }}
                  maxLength={200}
                />
              </div>

              {/* カテゴリと期限 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    color: '#7e7e7e',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}>
                    Category
                  </label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #f0f0f0',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontFamily: "'Open Sans', sans-serif",
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="WORK">仕事</option>
                    <option value="LEARNING">学習</option>
                    <option value="HEALTH">健康</option>
                    <option value="PERSONAL">個人</option>
                    <option value="CAREER">キャリア</option>
                    <option value="CREATIVE">創作</option>
                  </select>
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    color: '#7e7e7e',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={newGoal.deadline}
                    onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px solid #f0f0f0',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontFamily: "'Open Sans', sans-serif",
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* ボタンテキスト */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7e7e7e',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Action Button Text
                </label>
                <input
                  type="text"
                  value={newGoal.buttonText}
                  onChange={(e) => setNewGoal({...newGoal, buttonText: e.target.value})}
                  placeholder="Start working"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #f0f0f0',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: "'Open Sans', sans-serif",
                    transition: '0.2s all ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4d4dff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                  }}
                  maxLength={30}
                />
              </div>

              {/* 画像選択セクション */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontFamily: "'Open Sans', sans-serif",
                  fontSize: '12px',
                  color: '#7e7e7e',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Goal Image
                </label>
                
                {/* 画像選択ボタン */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowImageSelector(!showImageSelector)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: showImageSelector ? '#4d4dff' : '#f8f9fa',
                      color: showImageSelector ? 'white' : '#666',
                      border: '2px solid ' + (showImageSelector ? '#4d4dff' : '#e9ecef'),
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontFamily: "'Open Sans', sans-serif",
                      cursor: 'pointer',
                      transition: '0.2s all ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    🎨 プリセット画像から選択
                  </button>
                  
                  <label style={{
                    cursor: 'pointer',
                    padding: '0.75rem 1.5rem',
                    background: '#f0f8ff',
                    border: '2px solid #e6f3ff',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: "'Open Sans', sans-serif",
                    transition: '0.2s all ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    📷 画像をアップロード
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        handleNewGoalImageSelect(e);
                        setSelectedPresetImage(null);
                      }}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                
                {/* プリセット画像セレクター */}
                {showImageSelector && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    {PRESET_IMAGES.map((preset) => (
                      <div
                        key={preset.id}
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: selectedPresetImage === preset.url ? '3px solid #4d4dff' : '3px solid transparent',
                          transition: '0.2s all ease'
                        }}
                        onClick={() => {
                          setSelectedPresetImage(preset.url);
                          setNewGoal(prev => ({
                            ...prev,
                            images: [preset.url]
                          }));
                        }}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover'
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                          color: 'white',
                          padding: '0.5rem',
                          fontSize: '0.75rem',
                          fontFamily: "'Open Sans', sans-serif"
                        }}>
                          {preset.name}
                        </div>
                        {selectedPresetImage === preset.url && (
                          <div style={{
                            position: 'absolute',
                            top: '0.5rem',
                            right: '0.5rem',
                            width: '24px',
                            height: '24px',
                            background: '#4d4dff',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px'
                          }}>
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 選択された画像のプレビュー */}
                {newGoal.images.length > 0 && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#666',
                      marginBottom: '0.5rem',
                      fontFamily: "'Open Sans', sans-serif"
                    }}>
                      選択された画像:
                    </div>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={newGoal.images[0]}
                        alt="Goal visual"
                        style={{
                          width: '200px',
                          height: '150px',
                          objectFit: 'cover',
                          borderRadius: '6px'
                        }}
                      />
                      <button
                        onClick={() => {
                          setNewGoal(prev => ({ ...prev, images: [] }));
                          setSelectedPresetImage(null);
                        }}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          background: '#ff4757',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
                
                {/* ビデオアップロード（別セクション） */}
                <div style={{ marginTop: '1rem' }}>
                  <label style={{
                    cursor: 'pointer',
                    padding: '0.5rem 1rem',
                    background: '#f0f8ff',
                    border: '2px solid #e6f3ff',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontFamily: "'Open Sans', sans-serif",
                    transition: '0.2s all ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    🎥 動画を追加 (オプション)
                    <input
                      type="file"
                      multiple
                      accept="video/*"
                      onChange={handleNewGoalVideoSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {newGoal.videos.length > 0 && (
                    <span style={{
                      marginLeft: '1rem',
                      fontSize: '0.8rem',
                      color: '#666',
                      fontFamily: "'Open Sans', sans-serif"
                    }}>
                      {newGoal.videos.length} 動画
                    </span>
                  )}
                </div>
                
                {/* ビデオプレビュー */}
                {newGoal.videos.length > 0 && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                    gap: '0.5rem',
                    marginTop: '0.5rem'
                  }}>
                    {newGoal.videos.map((video, index) => (
                      <div key={`vid-${index}`} style={{ position: 'relative' }}>
                        <video
                          src={video}
                          style={{
                            width: '100%',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '4px'
                          }}
                          muted
                        />
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: 'white',
                          fontSize: '12px',
                          pointerEvents: 'none'
                        }}>
                          ▶️
                        </div>
                        <button
                          onClick={() => removeNewGoalVideo(index)}
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-5px',
                            width: '16px',
                            height: '16px',
                            background: '#ff4757',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '10px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '1rem',
                marginTop: '2rem'
              }}>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewGoal({
                      title: '',
                      subtitle: '',
                      description: '',
                      category: 'WORK',
                      deadline: '',
                      buttonText: '',
                      images: [],
                      videos: []
                    });
                    setSelectedPresetImage(null);
                    setShowImageSelector(false);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#666',
                    cursor: 'pointer',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '0.9rem',
                    transition: '0.2s all ease'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={addGoal}
                  disabled={!newGoal.title.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '6px',
                    background: newGoal.title.trim() 
                      ? 'linear-gradient(135deg, #4d4dff, #9333ea)' 
                      : '#ccc',
                    color: 'white',
                    cursor: newGoal.title.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: '0.2s all ease'
                  }}
                >
                  Create Goal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 完了した目標のセクション */}
        {completedGoals.length > 0 && (
          <div style={{ 
            marginTop: '2rem',
            textAlign: 'center' 
          }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: '300', 
              color: '#2C2C2C', 
              marginBottom: '1rem',
              fontFamily: "'Playfair Display', serif"
            }}>
              Completed Goals
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.5rem',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.05))',
                    border: '2px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    position: 'relative',
                    transition: '0.3s all ease',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.15)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    width: '24px',
                    height: '24px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    ✓
                  </div>
                  
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: '600',
                    color: '#2C2C2C',
                    marginBottom: '0.5rem',
                    fontFamily: "'Playfair Display', serif",
                    paddingRight: '2rem'
                  }}>
                    {goal.title}
                  </h3>
                  
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    marginBottom: '1rem',
                    fontFamily: "'Open Sans', sans-serif",
                    lineHeight: '1.4'
                  }}>
                    {goal.description}
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#059669',
                      fontFamily: "'Open Sans', sans-serif",
                      fontWeight: '600',
                      letterSpacing: '1px',
                      textTransform: 'uppercase'
                    }}>
                      {getCategoryName(goal.category)}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      fontFamily: "'Open Sans', sans-serif"
                    }}>
                      100% Complete
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GoalsCarousel;