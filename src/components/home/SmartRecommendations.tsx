import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Lightbulb, 
  TrendingUp, 
  Target, 
  BookOpen,
  Clock,
  Brain,
  Zap,
  ArrowRight,
  X,
  Sparkles
} from 'lucide-react';
import { useNotebookStore } from '../../store/useNotebookStore';

interface Recommendation {
  id: string;
  type: 'productivity' | 'organization' | 'habit' | 'exploration';
  title: string;
  description: string;
  action: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  priority: 'high' | 'medium' | 'low';
  actionCallback?: () => void;
}

const SmartRecommendations: React.FC = () => {
  const { 
    notesData, 
    setViewMode, 
    setShowMindMap, 
    addNoteToSubFolder,
    selectedSubFolder 
  } = useNotebookStore();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<string[]>([]);

  // すべてのノートを取得
  const allNotes = useMemo(() => {
    return Object.values(notesData).flat();
  }, [notesData]);

  // generateRecommendations function moved above useEffect to avoid declaration errors
  const generateRecommendations = useCallback(() => {
    const newRecommendations: Recommendation[] = [];
    const now = new Date();
    const today = now.toDateString();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 今日作成されたノート
    const todayNotes = allNotes.filter(note => 
      new Date(note.createdAt).toDateString() === today
    );

    // 最近編集されたノート
    const recentNotes = allNotes.filter(note => 
      new Date(note.updatedAt) >= threeDaysAgo
    );

    // 今日のポモドーロセッション
    const todayPomodoros = parseInt(localStorage.getItem('pomodoro-session-count') || '0');

    // 今日のフォーカスアイテム
    const todayFocus = JSON.parse(localStorage.getItem('todays-focus') || '[]');
    const completedFocus = todayFocus.filter((item: any) => item.completed).length;

    // 生産性レコメンデーション
    if (todayPomodoros === 0) {
      newRecommendations.push({
        id: 'start-pomodoro',
        type: 'productivity',
        title: 'ポモドーロタイマーを開始',
        description: '25分の集中時間で生産性を向上させましょう',
        action: 'タイマーを開始する',
        icon: Clock,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        priority: 'high',
        actionCallback: () => setViewMode('dashboard')
      });
    }

    if (todayFocus.length === 0) {
      newRecommendations.push({
        id: 'set-focus',
        type: 'organization',
        title: '今日のフォーカスを設定',
        description: '今日の重要なタスクを3つまで設定しましょう',
        action: 'フォーカスを設定する',
        icon: Target,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        priority: 'high',
        actionCallback: () => {
          // フォーカスセクションへスクロール
          setTimeout(() => {
            const focusElement = document.querySelector('[data-focus-section]');
            if (focusElement) {
              focusElement.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        }
      });
    }

    // 組織化レコメンデーション
    if (todayNotes.length === 0 && recentNotes.length === 0) {
      newRecommendations.push({
        id: 'create-note',
        type: 'habit',
        title: '新しいノートを作成',
        description: 'アイデアや学んだことを記録する習慣を始めましょう',
        action: 'ノートを作成する',
        icon: BookOpen,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        priority: 'medium',
        actionCallback: () => {
          if (selectedSubFolder) {
            addNoteToSubFolder(selectedSubFolder, 'rich');
            setViewMode('notes');
          }
        }
      });
    }

    // 探索レコメンデーション
    if (allNotes.length > 10) {
      newRecommendations.push({
        id: 'explore-mindmap',
        type: 'exploration',
        title: 'マインドマップで探索',
        description: 'ノート間の関係性を視覚的に確認しましょう',
        action: 'マインドマップを開く',
        icon: Brain,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        priority: 'medium',
        actionCallback: () => {
          setShowMindMap(true);
          setViewMode('notes');
        }
      });
    }

    // 習慣形成レコメンデーション
    if (completedFocus === todayFocus.length && todayFocus.length > 0) {
      newRecommendations.push({
        id: 'celebrate-completion',
        type: 'productivity',
        title: '素晴らしい達成！',
        description: '今日のフォーカスをすべて完了しました。新しい目標を設定しませんか？',
        action: '新しい目標を設定',
        icon: Sparkles,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        priority: 'low',
        actionCallback: () => {
          // 次の日のフォーカス設定を促す
          alert('明日のフォーカスを考えてみましょう！');
        }
      });
    }

    // 時間ベースのレコメンデーション
    const hour = now.getHours();
    if (hour >= 9 && hour <= 11 && todayPomodoros < 2) {
      newRecommendations.push({
        id: 'morning-productivity',
        type: 'productivity',
        title: '朝の集中時間',
        description: '午前中は集中力が高い時間です。重要なタスクに取り組みましょう',
        action: '集中時間を開始',
        icon: TrendingUp,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        priority: 'medium',
        actionCallback: () => setViewMode('dashboard')
      });
    }

    // 週末のレビューレコメンデーション
    if (now.getDay() === 0 || now.getDay() === 6) { // 土日
      const weekNotes = allNotes.filter(note => 
        new Date(note.updatedAt) >= weekAgo
      );
      
      if (weekNotes.length > 0) {
        newRecommendations.push({
          id: 'weekly-review',
          type: 'organization',
          title: '週間レビュー',
          description: `今週は${weekNotes.length}個のノートを作成・編集しました。振り返ってみませんか？`,
          action: 'ノートを確認する',
          icon: BookOpen,
          color: 'text-indigo-600 dark:text-indigo-400',
          bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
          priority: 'low',
          actionCallback: () => setViewMode('notes')
        });
      }
    }

    // 優先度順にソート
    newRecommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    setRecommendations(newRecommendations.slice(0, 3)); // 最大3件
  }, [allNotes, setViewMode, setShowMindMap, addNoteToSubFolder, selectedSubFolder]);

  // レコメンデーションを生成
  useEffect(() => {
    generateRecommendations();
  }, [allNotes, generateRecommendations]);

  // 却下されたレコメンデーションを読み込み
  useEffect(() => {
    const dismissed = JSON.parse(localStorage.getItem('dismissed-recommendations') || '[]');
    setDismissedRecommendations(dismissed);
  }, []);

  const dismissRecommendation = (id: string) => {
    const newDismissed = [...dismissedRecommendations, id];
    setDismissedRecommendations(newDismissed);
    localStorage.setItem('dismissed-recommendations', JSON.stringify(newDismissed));
    
    setRecommendations(prev => prev.filter(rec => rec.id !== id));
  };

  const handleRecommendationAction = (recommendation: Recommendation) => {
    if (recommendation.actionCallback) {
      recommendation.actionCallback();
    }
    // アクションを実行したレコメンデーションは自動的に却下
    dismissRecommendation(recommendation.id);
  };

  // 却下されていないレコメンデーションのみ表示
  const visibleRecommendations = recommendations.filter(
    rec => !dismissedRecommendations.includes(rec.id)
  );

  if (visibleRecommendations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              スマート推奨
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AIによる生産性向上提案
            </p>
          </div>
        </div>
        
        <div className="text-center py-6">
          <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            現在のところ新しい推奨事項はありません
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            活動を続けると新しい提案が表示されます
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
          <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            スマート推奨
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            AIによる生産性向上提案
          </p>
        </div>
      </div>

      {/* レコメンデーションリスト */}
      <div className="space-y-4">
        {visibleRecommendations.map((recommendation) => {
          const IconComponent = recommendation.icon;
          return (
            <div
              key={recommendation.id}
              className={`group relative p-4 rounded-lg border border-gray-200 dark:border-gray-600 ${recommendation.bgColor} hover:shadow-md transition-all`}
            >
              {/* 却下ボタン */}
              <button
                onClick={() => dismissRecommendation(recommendation.id)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start space-x-3">
                {/* アイコン */}
                <div className="flex-shrink-0 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <IconComponent className={`w-5 h-5 ${recommendation.color}`} />
                </div>

                {/* コンテンツ */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {recommendation.title}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      recommendation.priority === 'high' 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : recommendation.priority === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {recommendation.priority === 'high' ? '高' : 
                       recommendation.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {recommendation.description}
                  </p>
                  
                  {/* アクションボタン */}
                  <button
                    onClick={() => handleRecommendationAction(recommendation)}
                    className={`inline-flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${recommendation.color.replace('text-', 'text-').replace('dark:', '')} hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm`}
                  >
                    <span>{recommendation.action}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* フッター */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          推奨事項は活動パターンに基づいて生成されます
        </p>
      </div>
    </div>
  );
};

export default SmartRecommendations;